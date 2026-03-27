import { platform } from 'node:os';
import { jsonResponse, parseJsonBody, matchRoute } from '../middleware.js';

export async function handleLaunch(method, pathname, req, res, url, ctx) {
  const { projectPath } = ctx;
  let params;

  // POST /api/launch
  if (method === 'POST' && pathname === '/api/launch') {
    const { getProcessManager } = await import('../process.js');
    const { broadcast } = await import('../index.js');
    const body = await parseJsonBody(req);
    const { taskId, command, engine } = body;
    if (taskId == null || !command) {
      jsonResponse(res, 400, { error: 'Missing taskId or command' });
      return true;
    }
    const pm = getProcessManager();
    const result = pm.launchProcess(projectPath, taskId, command, engine || 'claude', broadcast);
    jsonResponse(res, 200, result);
    return true;
  }

  // POST /api/launch/terminal — open task in a new terminal tab
  if (method === 'POST' && pathname === '/api/launch/terminal') {
    const body = await parseJsonBody(req);
    const { taskId, command, engine, title } = body;
    if (!command) {
      jsonResponse(res, 400, { error: 'Missing command' });
      return true;
    }
    const eng = engine || 'claude';
    const tabTitle = title || `Task ${taskId}`;
    const os = platform();

    try {
      const cliName = eng === 'claude' ? 'claude' : eng === 'codex' ? 'codex' : 'cursor-agent';

      if (os === 'win32') {
        // Open in Windows Terminal new tab — interactive claude with initial prompt
        const { spawn: spawnProc } = await import('node:child_process');
        spawnProc('wt', [
          '-w', '0', 'nt',
          '--title', tabTitle, '--suppressApplicationTitle',
          '-d', projectPath,
          '--', 'pwsh', '-NoExit', '-Command', `${cliName} --dangerously-skip-permissions '${command.replace(/'/g, "''")}'`,
        ], {
          cwd: projectPath,
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else if (os === 'darwin') {
        const fullCmd = `cd "${projectPath}" && ${cliName} "${command.replace(/"/g, '\\"')}"`;
        const { execFile: ef } = await import('node:child_process');
        ef('osascript', ['-e', `tell app "Terminal" to do script "${fullCmd.replace(/"/g, '\\"')}"`], { timeout: 5000 });
      } else {
        const fullCmd = `cd "${projectPath}" && ${cliName} "${command.replace(/"/g, '\\"')}"; exec bash`;
        const { spawn: spawnProc } = await import('node:child_process');
        spawnProc('x-terminal-emulator', ['-e', `bash -c '${fullCmd}'`], {
          detached: true, stdio: 'ignore',
        }).unref();
      }
      jsonResponse(res, 200, { ok: true });
    } catch (err) {
      jsonResponse(res, 500, { error: err.message });
    }
    return true;
  }

  // GET /api/launch
  if (method === 'GET' && pathname === '/api/launch') {
    const { getProcessManager } = await import('../process.js');
    const pm = getProcessManager();
    jsonResponse(res, 200, pm.listProcesses());
    return true;
  }

  // GET /api/launch/output — get all buffered output (for reconnecting clients)
  if (method === 'GET' && pathname === '/api/launch/output') {
    const { getProcessManager } = await import('../process.js');
    const pm = getProcessManager();
    jsonResponse(res, 200, pm.getAllOutput());
    return true;
  }

  // DELETE /api/launch/:pid
  params = matchRoute(method, pathname, 'DELETE', '/api/launch/:pid');
  if (params) {
    const { getProcessManager } = await import('../process.js');
    const pm = getProcessManager();
    const pid = parseInt(params.pid, 10);
    if (isNaN(pid)) {
      jsonResponse(res, 400, { error: 'Invalid PID' });
      return true;
    }
    const killed = pm.killProcess(pid);
    if (killed) {
      jsonResponse(res, 200, { ok: true });
    } else {
      jsonResponse(res, 404, { error: 'Process not found' });
    }
    return true;
  }

  return false;
}
