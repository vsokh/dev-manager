#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/merge-safe.ts
var fs2 = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);
var import_node_child_process = require("node:child_process");

// src/cli/find-devmanager.ts
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);
function findDevManagerDir(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, ".devmanager");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      return null;
    }
    dir = parent;
  }
}
function requireDevManagerDir() {
  const dir = findDevManagerDir(process.cwd());
  if (!dir) {
    console.error("Error: Could not find .devmanager/ in current directory or any parent.");
    process.exit(1);
  }
  return dir;
}

// src/cli/merge-safe.ts
var args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node .devmanager/bin/merge-safe.cjs <taskId>");
  process.exit(1);
}
var taskId = parseInt(args[0], 10);
if (isNaN(taskId)) {
  console.error(`Error: Invalid task ID "${args[0]}" \u2014 must be a number.`);
  process.exit(1);
}
var devmanagerDir = requireDevManagerDir();
var projectRoot = path2.dirname(devmanagerDir);
var lockFile = path2.join(devmanagerDir, "merge.lock");
var worktreeRelative = `.devmanager/worktrees/task-${taskId}`;
var worktreeAbsolute = path2.join(projectRoot, worktreeRelative);
function git(cmd, cwd) {
  return (0, import_node_child_process.execSync)(cmd, {
    cwd: cwd || projectRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}
function fail(reason, extraInfo) {
  console.log(`MERGE_FAILED=${reason}`);
  if (extraInfo.conflictFiles) {
    console.log(`CONFLICT_FILES=${extraInfo.conflictFiles}`);
  }
  console.log(`LOCK_RELEASED=yes`);
  console.log(`WORKTREE=${worktreeRelative}`);
  if (extraInfo.branch) {
    console.log(`BRANCH=${extraInfo.branch}`);
  }
  process.exit(1);
}
function getConflictFiles(cwd) {
  try {
    const output = git("git diff --name-only --diff-filter=U", cwd);
    return output.split("\n").filter(Boolean).join(", ");
  } catch {
    return "";
  }
}
function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
  }
}
var branchName = "";
try {
  const branchOutput = git(`git branch --list "task-${taskId}-*"`);
  if (!branchOutput) {
    fail("no_branch", {});
  }
  const branches = branchOutput.split("\n").map((b) => b.replace(/^[\s*]+/, "").trim()).filter(Boolean);
  if (branches.length === 0) {
    fail("no_branch", {});
  }
  branchName = branches[0];
} catch {
  fail("no_branch", {});
}
if (!fs2.existsSync(worktreeAbsolute)) {
  fail("no_worktree", { branch: branchName });
}
function acquireLock() {
  const LOCK_TIMEOUT_MS = 6e4;
  const LOCK_STALE_MS = 10 * 60 * 1e3;
  const POLL_INTERVAL_MS = 2e3;
  const startTime = Date.now();
  while (fs2.existsSync(lockFile)) {
    try {
      const lockStat = fs2.statSync(lockFile);
      const lockAge = Date.now() - lockStat.mtimeMs;
      if (lockAge > LOCK_STALE_MS) {
        const lockContent = fs2.readFileSync(lockFile, "utf-8").trim();
        console.error(`Warning: Stale merge lock (${Math.round(lockAge / 1e3)}s old, task ${lockContent}). Taking over.`);
        break;
      }
    } catch {
      break;
    }
    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      const lockContent = fs2.readFileSync(lockFile, "utf-8").trim();
      console.error(`Error: Merge lock held by task ${lockContent} for over 60s.`);
      console.log(`MERGE_FAILED=lock_timeout`);
      console.log(`LOCK_RELEASED=no`);
      console.log(`WORKTREE=${worktreeRelative}`);
      console.log(`BRANCH=${branchName}`);
      process.exit(1);
    }
    sleep(POLL_INTERVAL_MS);
  }
  fs2.writeFileSync(lockFile, String(taskId), "utf-8");
}
function releaseLock() {
  try {
    if (fs2.existsSync(lockFile)) {
      fs2.unlinkSync(lockFile);
    }
  } catch {
  }
}
acquireLock();
try {
  try {
    git("git rebase master", worktreeAbsolute);
  } catch {
    const conflictFiles = getConflictFiles(worktreeAbsolute);
    if (conflictFiles) {
      try {
        git("git rebase --abort", worktreeAbsolute);
      } catch {
      }
      releaseLock();
      fail("rebase_conflict", { branch: branchName, conflictFiles });
    }
    releaseLock();
    fail("git_error", { branch: branchName });
  }
  try {
    git(`git merge ${branchName} --no-edit`, projectRoot);
  } catch {
    const conflictFiles = getConflictFiles(projectRoot);
    if (conflictFiles) {
      try {
        git("git merge --abort", projectRoot);
      } catch {
      }
      releaseLock();
      fail("merge_conflict", { branch: branchName, conflictFiles });
    }
    releaseLock();
    fail("git_error", { branch: branchName });
  }
  let commitHash = "";
  try {
    commitHash = git("git rev-parse --short HEAD", projectRoot);
  } catch {
    commitHash = "unknown";
  }
  try {
    git(`git worktree remove ${worktreeRelative}`, projectRoot);
  } catch {
    try {
      git(`git worktree remove ${worktreeRelative} --force`, projectRoot);
    } catch {
      console.error(`Warning: Could not remove worktree ${worktreeRelative}`);
    }
  }
  try {
    git(`git branch -d ${branchName}`, projectRoot);
  } catch {
    try {
      git(`git branch -D ${branchName}`, projectRoot);
    } catch {
      console.error(`Warning: Could not delete branch ${branchName}`);
    }
  }
  console.log("MERGE_OK=yes");
  console.log(`COMMIT=${commitHash}`);
  console.log(`BRANCH=${branchName}`);
} finally {
  releaseLock();
}
