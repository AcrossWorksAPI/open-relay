import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { collectGitContext } from "../src/git";

test("collects repository commits and changed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    mkdirSync(join(repo, "src"));
    writeFileSync(join(repo, "src", "index.ts"), "export const value = 1;\n", "utf8");
    writeFileSync(join(repo, "README.md"), "# Repo\n\nUpdated.\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "add source");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false
    });

    assert.equal(context.baseCommit, base);
    assert.equal(context.headCommit, head);
    assert.equal(context.diffRange, `${base}..${head}`);
    assert.equal(context.localPath, undefined);
    assert.deepEqual(context.changedFiles.map((file) => file.path).sort(), [
      "README.md",
      "src/index.ts"
    ]);
    assert.equal(
      context.changedFiles.find((file) => file.path === "src/index.ts")?.review_priority,
      "high"
    );
    assert.equal(
      context.changedFiles.find((file) => file.path === "README.md")?.review_priority,
      "medium"
    );
    assert.match(
      context.changedFiles.find((file) => file.path === "src/index.ts")?.evidence ?? "",
      /^Diff stats: \+\d+ -\d+\.$/
    );
    assert.match(
      context.changedFiles.find((file) => file.path === "README.md")?.evidence ?? "",
      /^Diff stats: \+\d+ -\d+\.$/
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("maps deleted and renamed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "old.txt"), "old\n", "utf8");
    writeFileSync(join(repo, "delete.txt"), "delete\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    renameSync(join(repo, "old.txt"), join(repo, "new.txt"));
    rmSync(join(repo, "delete.txt"));
    git(repo, "add", "-A");
    git(repo, "commit", "-m", "rename and delete");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: true
    });

    assert.equal(context.localPath, realpathSync(repo));
    assert.deepEqual(context.changedFiles, [
      {
        path: "delete.txt",
        status: "deleted",
        role: "Deleted file in review range.",
        review_priority: "low",
        evidence: "Diff stats: +0 -1."
      },
      {
        path: "new.txt",
        status: "renamed",
        role: "Renamed file in review range.",
        review_priority: "low",
        evidence: "Renamed from old.txt. Diff stats: +0 -0."
      }
    ]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("records binary diff stats as changed-file evidence", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, ".gitattributes"), "*.bin binary\n", "utf8");
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    writeFileSync(join(repo, "image.bin"), Buffer.from([0, 1, 2, 3, 4]));
    git(repo, "add", ".");
    git(repo, "commit", "-m", "add binary");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false
    });

    assert.equal(context.changedFiles[0]?.path, "image.bin");
    assert.equal(context.changedFiles[0]?.evidence, "Diff stats: binary file.");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("throws when the diff has no changed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const head = git(repo, "rev-parse", "HEAD").trim();

    assert.throws(() => collectGitContext({
      cwd: repo,
      baseRef: head,
      headRef: head,
      includeLocalPath: false
    }), /No changed files found/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("keeps non-ascii paths from nul-delimited name-status output", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    writeFileSync(join(repo, "cafe-accent-\u00e9.txt"), "accent\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "add accented path");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false
    });

    assert.equal(context.changedFiles[0]?.path, "cafe-accent-\u00e9.txt");
    assert.equal(context.changedFiles[0]?.evidence, "Diff stats: +1 -0.");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("continues without diff-stat evidence when numstat collection fails", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    writeFileSync(join(repo, "README.md"), "# Repo\n\nUpdated.\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "update readme");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false,
      gitRunner: (cwd, args) => {
        if (args[0] === "diff" && args.includes("--numstat")) {
          throw new Error("synthetic numstat failure");
        }
        return git(cwd, ...args);
      }
    });

    assert.deepEqual(context.changedFiles, [{
      path: "README.md",
      status: "modified",
      role: "Modified file in review range.",
      review_priority: "medium"
    }]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("keeps name-status collection strict when changed-file collection fails", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    writeFileSync(join(repo, "README.md"), "# Repo\n\nUpdated.\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "update readme");
    const head = git(repo, "rev-parse", "HEAD").trim();

    assert.throws(() => collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false,
      gitRunner: (cwd, args) => {
        if (args[0] === "diff" && args.includes("--name-status")) {
          throw new Error("Could not read git diff.");
        }
        return git(cwd, ...args);
      }
    }), /Could not read git diff/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function createRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), "open-relay-git-"));
  git(repo, "init", "--initial-branch", "main");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Open Relay Test");
  git(repo, "remote", "add", "origin", "https://github.com/AcrossWorksAPI/open-relay.git");
  return repo;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}
