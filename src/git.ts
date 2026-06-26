import { execFileSync } from "node:child_process";

export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  role: string;
  review_priority: "high" | "medium" | "low";
  evidence?: string;
};

export type GitContext = {
  repositoryName: string;
  remoteUrl?: string;
  localPath?: string;
  baseBranch: string;
  workingBranch: string;
  baseCommit: string;
  headCommit: string;
  diffRange: string;
  changedFiles: ChangedFile[];
};

export type CollectGitContextOptions = {
  cwd: string;
  baseRef: string;
  headRef: string;
  includeLocalPath: boolean;
};

export function collectGitContext(options: CollectGitContextOptions): GitContext {
  const root = git(options.cwd, ["rev-parse", "--show-toplevel"]).trim();
  const baseCommit = git(root, ["rev-parse", "--verify", options.baseRef]).trim();
  const headCommit = git(root, ["rev-parse", "--verify", options.headRef]).trim();
  // V1 records and generates the exact endpoint diff. Three-dot PR semantics are deferred.
  const diffRange = `${baseCommit}..${headCommit}`;
  const changedFiles = parseNameStatus(git(root, [
    "diff",
    "-z",
    "--name-status",
    "--find-renames",
    diffRange
  ]));

  if (changedFiles.length === 0) {
    throw new Error(`No changed files found for ${diffRange}`);
  }

  const remoteUrl = optionalGit(root, ["remote", "get-url", "origin"]);
  const currentBranch = optionalGit(root, ["branch", "--show-current"]);

  return {
    repositoryName: repositoryNameFromRemote(remoteUrl) ?? repositoryNameFromPath(root),
    remoteUrl,
    localPath: options.includeLocalPath ? root : undefined,
    baseBranch: options.baseRef,
    workingBranch: currentBranch?.trim() || options.headRef,
    baseCommit,
    headCommit,
    diffRange,
    changedFiles
  };
}

function parseNameStatus(raw: string): ChangedFile[] {
  const parts = raw.split("\0").filter((part) => part.length > 0);
  const files: ChangedFile[] = [];

  for (let index = 0; index < parts.length;) {
    const statusCode = parts[index];
    const status = mapStatus(statusCode);
    index += 1;

    const previousPath = status === "renamed" ? parts[index] : undefined;
    if (status === "renamed") {
      index += 1;
    }

    const path = parts[index];
    index += 1;

    files.push({
      path,
      status,
      role: roleForStatus(status),
      review_priority: priorityForPath(path),
      ...(previousPath ? { evidence: `Renamed from ${previousPath}` } : {})
    });
  }

  return files;
}

function mapStatus(statusCode: string): ChangedFile["status"] {
  if (statusCode === "A") {
    return "added";
  }
  if (statusCode === "M") {
    return "modified";
  }
  if (statusCode === "D") {
    return "deleted";
  }
  if (statusCode.startsWith("R")) {
    return "renamed";
  }
  return "unknown";
}

function roleForStatus(status: ChangedFile["status"]): string {
  const labels: Record<ChangedFile["status"], string> = {
    added: "Added file in review range.",
    modified: "Modified file in review range.",
    deleted: "Deleted file in review range.",
    renamed: "Renamed file in review range.",
    unknown: "Changed file with unclassified git status."
  };
  return labels[status];
}

function priorityForPath(path: string): ChangedFile["review_priority"] {
  if (
    path.startsWith("src/") ||
    path.startsWith("schemas/") ||
    path.startsWith(".github/workflows/") ||
    path === "package.json" ||
    path === "package-lock.json" ||
    path === "tsconfig.json" ||
    path === "SECURITY.md"
  ) {
    return "high";
  }

  if (
    path.startsWith("tests/") ||
    path.startsWith("examples/") ||
    path.startsWith("docs/protocol/") ||
    path === "README.md" ||
    path === "AGENTS.md" ||
    path === "CLAUDE.md"
  ) {
    return "medium";
  }

  return "low";
}

function repositoryNameFromRemote(remoteUrl: string | undefined): string | undefined {
  if (!remoteUrl) {
    return undefined;
  }

  const httpsMatch = remoteUrl.match(/^https:\/\/[^/]+\/([^/]+\/[^/.]+)(?:\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  const sshMatch = remoteUrl.match(/^git@[^:]+:([^/]+\/[^/.]+)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  return undefined;
}

function repositoryNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? "unknown-repository";
}

function optionalGit(cwd: string, args: string[]): string | undefined {
  try {
    return git(cwd, args).trim();
  } catch {
    return undefined;
  }
}

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new Error(gitFailureMessage(args));
  }
}

function gitFailureMessage(args: string[]): string {
  if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
    return "Could not find a git repository.";
  }

  if (args[0] === "rev-parse" && args[1] === "--verify") {
    return "Could not resolve git ref.";
  }

  if (args[0] === "diff") {
    return "Could not read git diff.";
  }

  return "Git command failed.";
}
