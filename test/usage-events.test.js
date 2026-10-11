// The system-log events RepoHQ's Agents page reads for Claude Pro usage (Idea pipeline and Claude Pro
// cards): a capacity event when the subscription can't take the work. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('the subscription not taking the work is logged as claude/capacity (info, not an alert)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'events-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-'));
  // A missing Claude Code counts as "can't take it" (capacityFailure), so no model is ever called here.
  const script = `require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'claude.js'))}).claudeTask('x', { cwd: ${JSON.stringify(cwd)}, tools: [], model: 'opus', fallback: false })
    .then((r) => console.log(JSON.stringify({ ok: r.ok, reason: r.reason })))`;
  const out = JSON.parse(execFileSync(process.execPath, ['-e', script], { env: { ...process.env, SYSTEM_EVENTS_DIR: dir, CLAUDE_BIN: path.join(cwd, 'no-claude') }, encoding: 'utf8' }).trim());
  assert.equal(out.ok, false);
  const events = fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(events.length, 1);
  assert.equal(events[0].system, 'idea-factory');
  assert.equal(events[0].component, 'claude');
  assert.equal(events[0].event, 'capacity');
  assert.equal(events[0].status, 'info');
  assert.match(events[0].message, /Claude subscription couldn't take the work: Claude Code not found/);
  assert.deepEqual(events[0].data, { model: 'opus', fallback: false });
});
