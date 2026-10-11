// sandbox.js — run a milestone build in RepoHQ's factory sandbox (Docker), not on the Mac.
//
// Talks JSON lines to RepoHQ's factory/bin/sandbox-session.ts (the deployed copy in
// ~/.repohq-factory/app, like bin/rate). The worker container has no mounts, no host environment
// and no credentials, and its only way out is the egress allowlist: package registries, plus
// api.anthropic.com for a build. So code the builder writes, installs or tests can't read the
// Mac's files or keys. What comes back is a patch, applied on the host.
const path = require('path');
const { spawn } = require('child_process');
const { createInterface } = require('readline');

const APP = process.env.FACTORY_APP || path.join(process.env.HOME, '.repohq-factory', 'app');

/** The command that starts a session: overridable for tests (IDEA_SANDBOX_CMD="node fake.js"). */
function sessionCommand() {
  if (process.env.IDEA_SANDBOX_CMD) {
    const [cmd, ...args] = process.env.IDEA_SANDBOX_CMD.split(' ').filter(Boolean);
    return { cmd, args };
  }
  return { cmd: path.join(APP, 'node_modules', '.bin', 'tsx'), args: [path.join(APP, 'factory', 'bin', 'sandbox-session.ts')] };
}

/**
 * Start a session. Returns { open, put, exec, patch, close }; every call resolves to the reply
 * ({ok, ...}). A failed reply throws, except exec, whose non-zero exit is a normal result.
 */
function startSession({ log = () => {} } = {}) {
  const { cmd, args } = sessionCommand();
  // The session is RepoHQ's own code on the host (it reads the factory config); the worker it starts gets none of this env.
  const child = spawn(cmd, args, { cwd: process.env.IDEA_SANDBOX_CMD ? undefined : APP, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
  const pending = new Map();
  let nextId = 0;
  let exited = null;
  createInterface({ input: child.stdout }).on('line', (line) => {
    let reply;
    try { reply = JSON.parse(line); } catch { return; }
    const p = pending.get(reply.id);
    if (p) { pending.delete(reply.id); p.resolve(reply); }
  });
  child.stderr.on('data', (d) => log(String(d).trim()));
  child.on('exit', (code) => {
    exited = code;
    for (const p of pending.values()) p.reject(new Error(`sandbox session exited (${code})`));
    pending.clear();
  });
  child.on('error', (e) => { for (const p of pending.values()) p.reject(e); pending.clear(); });

  const call = (op, body = {}) => new Promise((resolve, reject) => {
    if (exited !== null) return reject(new Error(`sandbox session exited (${exited})`));
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ id, op, ...body }) + '\n');
  });
  const must = async (op, body) => {
    const r = await call(op, body);
    if (!r.ok) throw new Error(`sandbox ${op}: ${r.error}`);
    return r;
  };

  return {
    open: (dir, { allowHosts = [], allowModels = [] } = {}) => must('open', { dir, allowHosts, allowModels }),
    put: (file, content) => must('put', { path: file, content }),
    /** → {code, output, timedOut, durationMs} */
    exec: (command, cmdArgs, { env = {}, cwd, timeoutMs } = {}) => must('exec', { cmd: command, args: cmdArgs, env, cwd, timeoutMs }),
    /** → host path of `git diff` against the clone's HEAD (node_modules excluded) */
    patch: async (exclude = []) => (await must('patch', { exclude })).file,
    close: async () => {
      if (exited === null) { try { await call('close'); } catch { /* exiting */ } }
      if (exited === null) child.kill('SIGTERM');
    },
  };
}

module.exports = { startSession, sessionCommand };
