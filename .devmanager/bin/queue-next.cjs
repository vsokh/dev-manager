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

// src/cli/queue-next.ts
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

// src/cli/queue-next.ts
var devmanagerDir = requireDevManagerDir();
var stateFile = path2.join(devmanagerDir, "state.json");
var projectRoot = path2.dirname(devmanagerDir);
var raw;
try {
  raw = fs2.readFileSync(stateFile, "utf-8");
} catch (err) {
  console.error(`Error reading ${stateFile}: ${err.message}`);
  process.exit(1);
}
var state;
try {
  state = JSON.parse(raw);
} catch (err) {
  console.error(`Error parsing ${stateFile}: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(state.queue) || state.queue.length === 0) {
  console.log("QUEUE_EMPTY=true");
  process.exit(0);
}
var queueItem = state.queue[0];
var taskId = queueItem.task;
var task = Array.isArray(state.tasks) ? state.tasks.find((t) => t.id === taskId) : null;
console.log(`TASK_ID=${taskId}`);
console.log(`TASK_NAME=${task ? task.name : queueItem.taskName || ""}`);
console.log(`TASK_FULL=${task && task.fullName ? task.fullName : task ? task.name : queueItem.taskName || ""}`);
console.log(`TASK_GROUP=${task && task.group ? task.group : ""}`);
var notes = queueItem.notes || "";
var notesOneLine = notes.replace(/\r?\n/g, "\\n");
console.log(`NOTES=${notesOneLine}`);
var notesFile = path2.join(devmanagerDir, "notes", `${taskId}.md`);
var hasNotes = fs2.existsSync(notesFile);
console.log(`HAS_NOTES=${hasNotes ? "yes" : "no"}`);
var hasBranch = false;
var branchName = "";
try {
  const branchOutput = (0, import_node_child_process.execSync)(`git branch --list "task-${taskId}-*"`, {
    cwd: projectRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  if (branchOutput) {
    const branches = branchOutput.split("\n").map((b) => b.replace(/^[\s*]+/, "").trim()).filter(Boolean);
    if (branches.length > 0) {
      hasBranch = true;
      branchName = branches[0];
    }
  }
} catch {
}
console.log(`HAS_BRANCH=${hasBranch ? "yes" : "no"}`);
if (hasBranch) {
  console.log(`BRANCH=${branchName}`);
}
var worktreeDir = path2.join(devmanagerDir, "worktrees", `task-${taskId}`);
var hasWorktree = fs2.existsSync(worktreeDir);
console.log(`HAS_WORKTREE=${hasWorktree ? "yes" : "no"}`);
if (task && task.autoApprove) {
  console.log("AUTO_APPROVE=yes");
}
console.log(`QUEUE_REMAINING=${state.queue.length}`);
