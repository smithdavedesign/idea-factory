// claude.js — run Claude Code headless on David's Claude subscription, isolated; free models as backup.
//
// Engines: "claude" (the subscription; always first) and "free" (Claude Code pointed at LiteLLM's free
// pool, used only when the subscription can't take the work: usage limit, rate limit, logged out).
// Coding a product from its PRD wants the strongest model, so this is the reverse of the factory's
// free-first routing (owner's decision, 2026-10-10).
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

/** LiteLLM key for the free-pool engine: factory env, then the ai-stack .env. */
function liteLLMKey() {
  if (process.env.FACTORY_LITELLM_KEY) return process.env.FACTORY_LITELLM_KEY;
  for (const [file, name] of [[path.join(process.env.HOME, '.repohq-factory', 'env'), 'FACTORY_LITELLM_KEY'], [path.join(process.env.HOME, 'ai-stack', 'litellm', '.env'), 'LITELLM_MASTER_KEY']]) {
    try {
      const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {}
  }
  return null;
}

const FREE_MODEL = process.env.IDEA_FREE_MODEL || 'free-agent';

/** Claude Code pointed at LiteLLM's free pool (the same wiring as the factory's M1 tier). */
function freeEnv() {
  const key = liteLLMKey();
  if (!key) return null;
  return {
    ANTHROPIC_BASE_URL: process.env.FACTORY_LITELLM_URL || 'http://localhost:4000',
    // Bearer token, not ANTHROPIC_API_KEY: outside --bare, Claude Code ignores an unapproved API key
    // and would send the subscription login to LiteLLM instead.
    ANTHROPIC_AUTH_TOKEN: key,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: FREE_MODEL, ANTHROPIC_SMALL_FAST_MODEL: FREE_MODEL,
    ANTHROPIC_DEFAULT_SONNET_MODEL: FREE_MODEL, ANTHROPIC_DEFAULT_OPUS_MODEL: FREE_MODEL,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

/** Failures that mean "the subscription can't take this now", not "the work failed": worth the free backup. */
function capacityFailure(reason) {
  return /usage limit|limit reached|rate.?limit|429|quota|credit|overloaded|529|not logged in|log in|login|authenticat|Claude Code not found/i.test(String(reason || ''));
}

function runClaude(prompt, { cwd, tools, timeoutMs = 20 * 60_000, system, addDirs = [], env = {}, engine = 'claude' }) {
  fs.mkdirSync(cwd, { recursive: true });
  const engineEnv = engine === 'free' ? freeEnv() : {};
  if (!engineEnv) return Promise.resolve({ code: -1, events: [], err: 'no LiteLLM key for the free engine' });
  const args = ['-p', prompt, '--model', engine === 'free' ? FREE_MODEL : MODEL,
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    '--permission-mode', 'dontAsk', ...(tools.length ? ['--allowedTools', ...tools] : []),
    ...(addDirs.length ? ['--add-dir', ...addDirs] : []),
    ...(system ? ['--append-system-prompt', system] : [])];
  return new Promise((resolve) => {
    if (!fs.existsSync(CLAUDE)) return resolve({ code: -1, events: [], err: `Claude Code not found at ${CLAUDE}` });
    const child = spawn(CLAUDE, args, { cwd, env: { ...cleanEnv(env), ...engineEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
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

/** The run must use the subscription (or, on the free engine, LiteLLM) and nothing personal; anything else is a hard stop. */
function guard(info, engine = 'claude') {
  if (engine === 'claude' && info.apiKeySource && info.apiKeySource !== 'none') return `Claude Code used API-key auth (${info.apiKeySource}), not the subscription`;
  if (engine === 'free' && info.model && !/free-agent|local/.test(info.model)) return `the free engine ran on ${info.model}, not the free pool`;
  if (info.mcpServers.length || info.mcpTools.length) return `MCP servers/connectors were loaded (${[...info.mcpServers, ...info.mcpTools].join(', ')})`;
  return null;
}

async function once(prompt, opts, engine) {
  const r = await runClaude(prompt, { ...opts, engine });
  const info = inspect(r.events);
  const bad = guard(info, engine);
  let reason = null;
  if (bad) reason = bad;
  else if (r.signal) reason = `timed out after ${Math.round((opts.timeoutMs || 20 * 60_000) / 60000)} min`;
  else if (r.code !== 0 || info.isError) reason = (info.result || r.err || `exit ${r.code}`).slice(0, 400); // e.g. usage limit reached
  return { ok: !reason, info, reason, engine };
}

/**
 * Run on the subscription; with `fallback: true`, retry on the free pool when the subscription
 * can't take it (capacityFailure). `engines: ['free', 'claude']` (the tier advisor rated the work
 * routine, and its policy is "act") starts on the free pool and moves up to Claude on any failure.
 * Returns {ok, info, reason, engine, primaryReason?}.
 */
async function claudeTask(prompt, opts) {
  const [firstEngine, secondEngine] = opts.engines || ['claude', 'free'];
  const first = await once(prompt, opts, firstEngine);
  if (first.ok || !opts.fallback || !secondEngine) return first;
  if (firstEngine === 'claude' && !capacityFailure(first.reason)) return first; // Claude failed on the work itself
  const second = await once(prompt, opts, secondEngine);
  return { ...second, primaryReason: first.reason };
}

module.exports = { runClaude, inspect, guard, cleanEnv, claudeTask, capacityFailure, freeEnv, CLAUDE, MODEL, FREE_MODEL };
