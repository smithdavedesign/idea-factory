// claude.js — run Claude Code headless on David's Claude Pro subscription, isolated.
//
// Shared by research, review and build. Guarantees, checked on every run:
//   - the subscription, never API credit: Anthropic API env vars are removed, and a run whose init
//     event reports any API-key auth source is refused;
//   - no personal context: no user settings, plugins, hooks, MCP servers or claude.ai connectors,
//     no skills, no session saved;
//   - only the tools the caller lists (permission mode dontAsk: everything else is denied).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CLAUDE = process.env.CLAUDE_BIN || path.join(process.env.HOME, '.local', 'bin', 'claude');
const MODEL = process.env.IDEA_CLAUDE_MODEL || 'sonnet';

function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX']) delete env[k];
  env.ENABLE_CLAUDEAI_MCP_SERVERS = 'false'; // no claude.ai connectors (Gmail, Drive, Notion…)
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
  env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${env.PATH || ''}`;
  return { ...env, ...extra };
}

function runClaude(prompt, { cwd, tools, timeoutMs = 20 * 60_000, system, addDirs = [], env = {} }) {
  fs.mkdirSync(cwd, { recursive: true });
  const args = ['-p', prompt, '--model', MODEL,
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    '--permission-mode', 'dontAsk', '--allowedTools', ...tools,
    ...(addDirs.length ? ['--add-dir', ...addDirs] : []),
    ...(system ? ['--append-system-prompt', system] : [])];
  return new Promise((resolve) => {
    if (!fs.existsSync(CLAUDE)) return resolve({ code: -1, events: [], err: `Claude Code not found at ${CLAUDE}` });
    const child = spawn(CLAUDE, args, { cwd, env: cleanEnv(env), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, events: [], err: e.message }); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const events = out.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      resolve({ code, signal, events, err: err.slice(-2000) });
    });
  });
}

/** What the run says about auth and isolation, from Claude Code's init and result events. */
function inspect(events) {
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') || {};
  const result = events.find((e) => e.type === 'result') || {};
  return {
    apiKeySource: init.apiKeySource ?? null,
    mcpServers: (init.mcp_servers || []).map((s) => s.name),
    mcpTools: (init.tools || []).filter((t) => t.startsWith('mcp__')),
    model: init.model ?? null,
    isError: !!result.is_error,
    result: typeof result.result === 'string' ? result.result : '',
    turns: result.num_turns ?? null,
    durationMs: result.duration_ms ?? null,
  };
}

/** The run must use the subscription and nothing personal; anything else is a hard stop. */
function guard(info) {
  if (info.apiKeySource && info.apiKeySource !== 'none') return `Claude Code used API-key auth (${info.apiKeySource}), not the Pro subscription`;
  if (info.mcpServers.length || info.mcpTools.length) return `MCP servers/connectors were loaded (${[...info.mcpServers, ...info.mcpTools].join(', ')})`;
  return null;
}

/** Run, then classify: {ok, info, reason}. A timeout, error, guard failure or non-zero exit is not ok. */
async function claudeTask(prompt, opts) {
  const r = await runClaude(prompt, opts);
  const info = inspect(r.events);
  const bad = guard(info);
  let reason = null;
  if (bad) reason = bad;
  else if (r.signal) reason = `timed out after ${Math.round((opts.timeoutMs || 20 * 60_000) / 60000)} min`;
  else if (r.code !== 0 || info.isError) reason = (info.result || r.err || `exit ${r.code}`).slice(0, 400); // e.g. usage limit reached
  return { ok: !reason, info, reason };
}

module.exports = { runClaude, inspect, guard, cleanEnv, claudeTask, CLAUDE, MODEL };
