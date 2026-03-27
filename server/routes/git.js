import { jsonResponse } from '../middleware.js';

export async function handleGit(method, pathname, req, res, url, ctx) {
  const { projectPath } = ctx;

  // GET /api/git/status — check for unpushed commits
  if (method === 'GET' && pathname === '/api/git/status') {
    try {
      const { execFile: ef } = await import('node:child_process');
      const run = (cmd, args) => new Promise((resolve, reject) => {
        ef(cmd, args, { cwd: projectPath, timeout: 10000 }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout.trim());
        });
      });

      const branch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      let unpushed = 0;
      let commits = [];
      try {
        const log = await run('git', ['log', '--oneline', `origin/${branch}..HEAD`]);
        if (log) {
          commits = log.split('\n').map(line => {
            const [hash, ...rest] = line.split(' ');
            return { hash, message: rest.join(' ') };
          });
          unpushed = commits.length;
        }
      } catch { /* no remote tracking branch */ }

      jsonResponse(res, 200, { branch, unpushed, commits });
    } catch (err) {
      jsonResponse(res, 200, { branch: null, unpushed: 0, error: err.message });
    }
    return true;
  }

  // POST /api/git/push — push to origin
  if (method === 'POST' && pathname === '/api/git/push') {
    try {
      const { execFile: ef } = await import('node:child_process');
      const result = await new Promise((resolve, reject) => {
        ef('git', ['push'], { cwd: projectPath, timeout: 60000 }, (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve((stdout + '\n' + stderr).trim());
        });
      });
      jsonResponse(res, 200, { ok: true, output: result });
    } catch (err) {
      jsonResponse(res, 400, { error: err.message });
    }
    return true;
  }

  return false;
}
