export type WebSocketFactory = (url: string) => MinimalWebSocket;

export type MinimalWebSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
};

export type StartCodexTurnInput = {
  url: string;
  timeoutMs: number;
  cwd: string;
  prompt: string;
  threadId?: string;
  threadSearch?: string;
  clientName: string;
  webSocketFactory?: WebSocketFactory;
};

export type CodexTurnResult = {
  status: string;
  threadId: string;
  turnId: string;
  finalText: string;
};

type JsonRecord = Record<string, unknown>;

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
};

type CompletedTurn = {
  status: string;
  finalText: string;
};

export async function startCodexTurn(input: StartCodexTurnInput): Promise<CodexTurnResult> {
  const client = await CodexRpcClient.connect({
    url: input.url,
    timeoutMs: input.timeoutMs,
    webSocketFactory: input.webSocketFactory
  });

  try {
    await client.request("initialize", {
      clientInfo: {
        name: input.clientName,
        version: "0.0.0"
      },
      capabilities: {
        experimentalApi: true
      }
    });

    const threadId = input.threadId ?? await findCodexThreadId(
      client,
      input.threadSearch ?? input.prompt
    );

    await client.request("thread/resume", {
      threadId,
      cwd: input.cwd
    });

    const turnStart = await client.request("turn/start", {
      threadId,
      cwd: input.cwd,
      input: [{
        type: "text",
        text: input.prompt
      }]
    });
    const turnId = extractNestedString(turnStart, ["turn", "id"], "Codex turn/start did not return a turn id.");
    const completed = await client.waitForTurn(turnId);

    return {
      status: completed.status,
      threadId,
      turnId,
      finalText: completed.finalText.trim()
    };
  } finally {
    client.close();
  }
}

export async function findCodexThreadId(
  client: Pick<CodexRpcClient, "request">,
  searchTerm: string
): Promise<string> {
  const list = await client.request("thread/list", {
    limit: 10,
    searchTerm,
    sortKey: "updated_at",
    sortDirection: "desc",
    archived: false,
    sourceKinds: []
  });
  const threads = extractThreadList(list);

  if (threads.length === 0) {
    throw new Error("Codex thread search found no matching thread.");
  }

  if (threads.length > 1) {
    throw new Error("Codex thread search matched multiple threads; pass --codex-thread-id.");
  }

  return extractString(threads[0], "id", "Codex thread search returned a thread without an id.");
}

class CodexRpcClient {
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private turnText = new Map<string, string>();
  private completedTurns = new Map<string, CompletedTurn>();
  private turnWaiters = new Map<string, PendingRequest[]>();

  private constructor(
    private readonly socket: MinimalWebSocket,
    private readonly timeoutMs: number
  ) {}

  static async connect(input: {
    url: string;
    timeoutMs: number;
    webSocketFactory?: WebSocketFactory;
  }): Promise<CodexRpcClient> {
    const factory = input.webSocketFactory ?? defaultWebSocketFactory;
    const socket = factory(input.url);
    const client = new CodexRpcClient(socket, input.timeoutMs);

    socket.onmessage = (event) => client.handleMessage(event.data);
    socket.onerror = () => client.rejectAll(new Error("Codex app-server WebSocket error."));
    socket.onclose = () => client.rejectAll(new Error("Codex app-server WebSocket closed."));

    await withTimeout(new Promise<void>((resolve) => {
      socket.onopen = () => resolve();
    }), input.timeoutMs, "Timed out connecting to Codex app-server.");

    return client;
  }

  request(method: string, params: JsonRecord): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;

    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    try {
      this.socket.send(JSON.stringify({ id, method, params }));
    } catch (error: unknown) {
      this.pending.delete(id);
      return Promise.reject(error);
    }

    return withTimeout(
      promise,
      this.timeoutMs,
      `Timed out waiting for Codex ${method}.`,
      () => this.pending.delete(id)
    );
  }

  waitForTurn(turnId: string): Promise<CompletedTurn> {
    const completed = this.completedTurns.get(turnId);
    if (completed) {
      return Promise.resolve(completed);
    }

    let pendingWaiter: PendingRequest | undefined;
    const promise = new Promise<CompletedTurn>((resolve, reject) => {
      pendingWaiter = { resolve: resolve as (value: unknown) => void, reject };
      const waiters = this.turnWaiters.get(turnId) ?? [];
      waiters.push(pendingWaiter);
      this.turnWaiters.set(turnId, waiters);
    });
    return withTimeout(
      promise,
      this.timeoutMs,
      "Timed out waiting for Codex turn completion.",
      () => {
        if (pendingWaiter) {
          this.removeTurnWaiter(turnId, pendingWaiter);
        }
      }
    );
  }

  close(): void {
    this.rejectAll(new Error("Codex app-server WebSocket closed."));
    this.socket.close();
  }

  private handleMessage(data: unknown): void {
    const message = parseJsonLine(String(data));
    if (!isRecord(message)) {
      return;
    }

    if (typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (isRecord(message.error)) {
        pending.reject(new Error(extractString(message.error, "message", "Codex JSON-RPC error.")));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.method === "string") {
      this.handleNotification(message.method, message.params);
    }
  }

  private handleNotification(method: string, params: unknown): void {
    if (!isRecord(params)) {
      return;
    }

    if (method === "item/agentMessage/delta") {
      const turnId = typeof params.turnId === "string" ? params.turnId : undefined;
      const delta = typeof params.delta === "string" ? params.delta : undefined;
      if (turnId && delta) {
        this.turnText.set(turnId, `${this.turnText.get(turnId) ?? ""}${delta}`);
      }
      return;
    }

    if (method === "item/completed" && isRecord(params.item)) {
      const turnId = typeof params.turnId === "string" ? params.turnId : undefined;
      const item = params.item;
      if (turnId && item.type === "agentMessage" && typeof item.text === "string") {
        this.turnText.set(turnId, item.text);
      }
      return;
    }

    if (method === "turn/completed" && isRecord(params.turn)) {
      const turnId = extractString(params.turn, "id", "Codex turn completed without an id.");
      const status = extractString(params.turn, "status", "Codex turn completed without a status.");
      const completed = {
        status,
        finalText: this.turnText.get(turnId) ?? ""
      };
      this.completedTurns.set(turnId, completed);

      const waiters = this.turnWaiters.get(turnId) ?? [];
      this.turnWaiters.delete(turnId);
      for (const waiter of waiters) {
        waiter.resolve(completed);
      }
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();

    for (const waiters of this.turnWaiters.values()) {
      for (const waiter of waiters) {
        waiter.reject(error);
      }
    }
    this.turnWaiters.clear();
  }

  private removeTurnWaiter(turnId: string, waiter: PendingRequest): void {
    const waiters = this.turnWaiters.get(turnId);
    if (!waiters) {
      return;
    }

    const remaining = waiters.filter((candidate) => candidate !== waiter);
    if (remaining.length === 0) {
      this.turnWaiters.delete(turnId);
    } else {
      this.turnWaiters.set(turnId, remaining);
    }
  }
}

function defaultWebSocketFactory(url: string): MinimalWebSocket {
  type WebSocketConstructor = new (url: string) => MinimalWebSocket;
  const WebSocketCtor = (globalThis as unknown as {
    WebSocket?: WebSocketConstructor;
  }).WebSocket;

  if (!WebSocketCtor) {
    throw new Error("WebSocket is not available in this Node.js runtime.");
  }

  return new WebSocketCtor(url);
}

function parseJsonLine(line: string): unknown | undefined {
  const trimmed = line.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout?: () => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function extractThreadList(value: unknown): JsonRecord[] {
  if (!isRecord(value)) {
    return [];
  }

  const raw = Array.isArray(value.data)
    ? value.data
    : Array.isArray(value.threads)
      ? value.threads
      : [];

  return raw.filter(isRecord);
}

function extractNestedString(value: unknown, path: string[], errorMessage: string): string {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) {
      throw new Error(errorMessage);
    }
    current = current[key];
  }

  if (typeof current !== "string") {
    throw new Error(errorMessage);
  }

  return current;
}

function extractString(value: JsonRecord, key: string, errorMessage: string): string {
  const found = value[key];
  if (typeof found !== "string") {
    throw new Error(errorMessage);
  }
  return found;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
