// The secret scan a build's patch passes before it's committed (lib/secret-scan.js). Run: npm test
// The fakes here are built at runtime, like the builder is told to: no credential-shaped literal in the source.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanPatch, formatFindings, knownSecrets } = require('../lib/secret-scan');

const filler = (n, chars = 'A1b2C3d4E5f6G7h8') => chars.repeat(Math.ceil(n / chars.length)).slice(0, n);
const FAKE = {
  anthropic: ['sk', 'ant', 'api03', filler(48)].join('-'),
  github: `gh${'p'}_${filler(36)}`,
  aws: `AK${'IA'}${filler(16, 'A1B2C3D4')}`,
  pem: `-----BEGIN RSA ${'PRIVATE'} KEY-----`,
  jwt: [`ey${'J'}${filler(20)}`, `ey${'J'}${filler(24)}`, filler(32)].join('.'),
  pg: `postgres://app:${filler(16)}@db.example.com/app`,
};

const diff = (file, startLine, lines) => [
  `diff --git a/${file} b/${file}`, 'index 000..111 100644', `--- a/${file}`, `+++ b/${file}`,
  `@@ -${startLine},2 +${startLine},${lines.length} @@`, ...lines,
].join('\n');

test('finds credential-shaped strings on added lines, with file and line, never the value', () => {
  const patch = [
    diff('test/redact.test.js', 5, [' const a = 1;', `+const KEY = '${FAKE.anthropic}';`, `-const OLD = '${FAKE.github}';`, ` // context`, `+const AWS = '${FAKE.aws}';`]),
    diff('src/db.js', 1, [`+const url = '${FAKE.pg}';`, `+const key = \`${FAKE.pem}\`;`, `+const t = '${FAKE.jwt}';`]),
  ].join('\n');
  const f = scanPatch(patch);
  assert.deepEqual(f, [
    { file: 'test/redact.test.js', line: 6, kind: 'Anthropic key' },
    { file: 'test/redact.test.js', line: 8, kind: 'AWS access key' },
    { file: 'src/db.js', line: 1, kind: 'connection string with a password' },
    { file: 'src/db.js', line: 2, kind: 'private key' },
    { file: 'src/db.js', line: 3, kind: 'JWT' },
  ]);
  assert.ok(!JSON.stringify(f).includes(filler(16)), 'findings never carry the value');
  assert.equal(formatFindings(f, 2), 'test/redact.test.js:6 (Anthropic key)\ntest/redact.test.js:8 (AWS access key)\n… and 3 more');
});

test('the runtime-built style the builder is told to use passes, and removed lines don\'t count', () => {
  const patch = diff('test/fake-secrets.js', 1, [
    "+export const anthropic = ['sk', 'ant', 'api03', filler(48)].join('-');",
    '+export const github = `gh${\'p\'}_${filler(36)}`;',
    `-const OLD = '${FAKE.anthropic}';`,
  ]);
  assert.deepEqual(scanPatch(patch), []);
});

test('real secrets from this Mac are found by exact value, short values ignored', () => {
  const real = `zz-${filler(30, 'q9w8e7r6')}`;
  const patch = diff('config.js', 10, [`+const token = '${real}';`, '+const x = "short";']);
  assert.deepEqual(scanPatch(patch, { known: [real, 'short'] }), [{ file: 'config.js', line: 10, kind: 'a real secret from this Mac' }]);
});

test('known secrets come from the factory env and LiteLLM\'s .env, plus the extras', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  fs.mkdirSync(path.join(home, '.repohq-factory'), { recursive: true });
  fs.mkdirSync(path.join(home, 'ai-stack', 'litellm'), { recursive: true });
  const a = filler(20, 'abcdef12');
  const b = filler(24, 'xyz98765');
  fs.writeFileSync(path.join(home, '.repohq-factory', 'env'), `FACTORY_LITELLM_KEY="${a}"\nSHORT=abc\n# comment\n`);
  fs.writeFileSync(path.join(home, 'ai-stack', 'litellm', '.env'), `LITELLM_MASTER_KEY=${b}\n`);
  const extra = filler(40, 'tok12345');
  assert.deepEqual(knownSecrets([extra], home), [extra, a, b]);
  assert.deepEqual(knownSecrets([], path.join(home, 'nope')), []);
});
