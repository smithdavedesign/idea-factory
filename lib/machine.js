// machine.js — get the Mac ready for a sandboxed build (David's call, 2026-10-31: "really push the PC" at night).
//
// ensureDocker: on 2026-10-30 at 22:24 botchelor's go-live couldn't start because Docker Desktop wasn't
// running, and nothing started it. Now a build starts it (`docker desktop start`, else `open -a Docker`) and
// waits for the engine. Docker's own "start at login" and its memory cap are GUI settings (ai-stack CLAUDE.md:
// editing settings-store.json gets clobbered), so they aren't touched here.
//
// freeOllama: on a 16 GB Mac a warm local model (about 6 GB, kept 70 min by LiteLLM's keep_alive) and a
// build's sandbox don't fit together; swap ran 12.9 of 14 GB. A build asks Ollama to unload its idle models
// first (keep_alive 0, the same request media-gen makes); the next local request loads them again.
const { execFileSync } = require('child_process');

const run = (cmd, args, timeout = 30_000) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dockerUp(exec = run) {
  try { exec('docker', ['info', '--format', '{{.ServerVersion}}']); return true; } catch { return false; }
}

/** Docker's engine answering: started if it isn't, waited for up to `waitMs`. → {ok, started, reason}. */
async function ensureDocker({ exec = run, waitMs = 180_000, pollMs = 5_000, wait = sleep } = {}) {
  if (dockerUp(exec)) return { ok: true, started: false };
  let how = null;
  try { exec('docker', ['desktop', 'start', '--detach'], 60_000); how = 'docker desktop start'; } catch {
    try { exec('open', ['-a', 'Docker']); how = 'open -a Docker'; } catch { return { ok: false, started: false, reason: "Docker isn't running and couldn't be started" }; }
  }
  for (let waited = 0; waited < waitMs; waited += pollMs) {
    await wait(pollMs);
    if (dockerUp(exec)) return { ok: true, started: true, how };
  }
  return { ok: false, started: true, how, reason: `Docker was started (${how}) but its engine didn't answer within ${Math.round(waitMs / 1000)}s` };
}

/** Unloads the models Ollama has loaded. → names unloaded ([] if none, or Ollama is down). */
async function freeOllama({ base = process.env.OLLAMA_HOST_URL || 'http://127.0.0.1:11434', fetchFn = globalThis.fetch } = {}) {
  if (!fetchFn) return [];
  try {
    const ps = await (await fetchFn(`${base}/api/ps`, { signal: AbortSignal.timeout(5_000) })).json();
    const names = (ps.models || []).map((m) => m.name || m.model).filter(Boolean);
    for (const model of names) {
      await fetchFn(`${base}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, keep_alive: 0 }), signal: AbortSignal.timeout(30_000) }).catch(() => {});
    }
    return names;
  } catch { return []; }
}

module.exports = { ensureDocker, freeOllama, dockerUp };
