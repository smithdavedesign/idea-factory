// The research runner must use the Claude Pro subscription and nothing personal. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspect, guard, cleanEnv, ALLOWED_TOOLS } = require('../bin/idea-research');

const init = (over = {}) => ({ type: 'system', subtype: 'init', apiKeySource: 'none', mcp_servers: [], tools: ['WebSearch', 'Write'], model: 'm', ...over });

test('the subscription login passes; any API-key auth is refused', () => {
  assert.equal(guard(inspect([init()])), null);
  assert.match(guard(inspect([init({ apiKeySource: 'ANTHROPIC_API_KEY' })])), /API-key auth/);
  assert.match(guard(inspect([init({ apiKeySource: 'apiKeyHelper' })])), /API-key auth/);
});

test('MCP servers or claude.ai connectors in the run are refused', () => {
  assert.match(guard(inspect([init({ mcp_servers: [{ name: 'claude.ai Gmail', status: 'connected' }] })])), /MCP/);
  assert.match(guard(inspect([init({ tools: ['WebSearch', 'mcp__claude_ai_Gmail__get_thread'] })])), /MCP/);
});

test('API credentials never reach Claude Code', () => {
  const saved = { ...process.env };
  Object.assign(process.env, { ANTHROPIC_API_KEY: 'sk-x', ANTHROPIC_AUTH_TOKEN: 't', ANTHROPIC_BASE_URL: 'http://x' });
  try {
    const env = cleanEnv();
    for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) assert.equal(env[k], undefined, k);
    assert.equal(env.ENABLE_CLAUDEAI_MCP_SERVERS, 'false');
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});

test('tools: web research, writes only in drafts/, and only the publish script and the context lookup', () => {
  assert.ok(ALLOWED_TOOLS.includes('WebSearch') && ALLOWED_TOOLS.includes('WebFetch'));
  assert.ok(ALLOWED_TOOLS.filter((t) => /^(Write|Edit)\(/.test(t)).every((t) => t.includes('/idea-factory/drafts/')));
  const bash = ALLOWED_TOOLS.filter((t) => t.startsWith('Bash'));
  assert.equal(bash.length, 2);
  assert.ok(bash.every((t) => /idea-publish\.js:\*\)$|bin\/context:\*\)$/.test(t)), bash.join(' '));
  assert.ok(!ALLOWED_TOOLS.includes('Bash'), 'unrestricted Bash');
});

test('the context wrapper never lets a cloud model see work or financial data', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'bin', 'context'), 'utf8');
  assert.match(src, /--classes" \]; then skip=1/);
  assert.match(src, /search\) args\+=\("--classes" "public,personal"\)/);
});
