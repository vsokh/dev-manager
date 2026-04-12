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

// src/cli/task-done.ts
var fs2 = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);

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

// src/cli/task-done.ts
var args = process.argv.slice(2);
function printUsage() {
  console.error("Usage: node .devmanager/bin/task-done.cjs <taskId> --commit <commitRef>");
  console.error("");
  console.error("Options:");
  console.error("  --commit <ref>   Git commit hash (required)");
  process.exit(1);
}
if (args.length === 0) {
  printUsage();
}
var taskId = parseInt(args[0], 10);
if (isNaN(taskId)) {
  console.error(`Error: Invalid task ID "${args[0]}" \u2014 must be a number.`);
  process.exit(1);
}
var commitRef = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--commit" && args[i + 1]) {
    commitRef = args[i + 1];
    i++;
  }
}
if (!commitRef) {
  console.error("Error: --commit <ref> is required.");
  printUsage();
}
var devmanagerDir = requireDevManagerDir();
var progressDir = path2.join(devmanagerDir, "progress");
fs2.mkdirSync(progressDir, { recursive: true });
var progressFile = path2.join(progressDir, `${taskId}.json`);
var today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var progressData = {
  status: "done",
  completedAt: today,
  commitRef
};
try {
  fs2.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), "utf-8");
} catch (err) {
  console.error(`Error writing ${progressFile}: ${err.message}`);
  process.exit(1);
}
console.log(`Done: Task ${taskId} marked as done.`);
console.log(`  completedAt: ${today}`);
console.log(`  commitRef: ${commitRef}`);
console.log(`  progress file: ${progressFile}`);
