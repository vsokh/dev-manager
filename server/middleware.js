import { readFile, mkdir, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// --- Shared HTTP helpers ---

function jsonResponse(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      resolve(buf);
    });
    req.on('error', reject);
  });
}

async function parseJsonBody(req) {
  const buf = await parseBody(req);
  if (buf.length === 0) return {};
  return JSON.parse(buf.toString('utf-8'));
}

// --- File system helpers ---

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function dirExists(dirPath) {
  try {
    const s = await stat(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// --- Path safety ---

/**
 * Resolve path segments under a base directory. Returns the resolved path,
 * or null if the result escapes the base (path traversal).
 */
function safePath(base, ...segments) {
  const resolved = resolve(base, ...segments);
  const resolvedBase = resolve(base);
  if (!resolved.startsWith(resolvedBase + sep) && resolved !== resolvedBase) {
    return null;
  }
  return resolved;
}

// --- Route matching ---

function matchRoute(method, pathname, routeMethod, routePattern) {
  if (method !== routeMethod) return null;
  const routeParts = routePattern.split('/');
  const pathParts = pathname.split('/');
  if (routeParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (routeParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// --- New helpers ---

// Validate required fields in a request body. Returns error string or null.
function requireFields(body, ...fields) {
  const missing = fields.filter(f => !body[f] && body[f] !== 0 && body[f] !== false);
  if (missing.length > 0) return `Missing ${missing.join(', ')}`;
  return null;
}

// Read and parse a JSON file. Returns { data, stat } or null if file doesn't exist (ENOENT).
// Throws on other errors.
async function readJsonOrNull(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const fileStat = await stat(filePath);
    return { data, stat: fileStat };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Handle ENOENT errors: sends 404 response if ENOENT, rethrows otherwise.
// Returns true if handled (was ENOENT), false otherwise (rethrows).
function handleNotFound(res, err, message) {
  if (err.code === 'ENOENT') {
    jsonResponse(res, 404, { error: message });
    return true;
  }
  throw err;
}

export {
  jsonResponse,
  parseBody,
  parseJsonBody,
  ensureDir,
  fileExists,
  dirExists,
  safePath,
  matchRoute,
  requireFields,
  readJsonOrNull,
  handleNotFound,
};
