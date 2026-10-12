// lib/claude.js exit-code wording. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

test('exitReason: killed-by-signal codes say what happened', () => {
  const { exitReason } = require('../lib/claude');
  assert.match(exitReason(143), /SIGTERM/);
  assert.match(exitReason(137), /SIGKILL/);
  assert.equal(exitReason(1), 'exit 1');
});
