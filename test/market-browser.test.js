// The marketing loop's browser and video kit, as launchd runs them (lib/market-io.js): bun on PATH for browse's
// server, the server in its own process group, real error text, and the crowd clone's dependencies put back.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
function fresh(env) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; process.env[k] = v; }
  delete require.cache[require.resolve('../lib/market-io')];
  const io = require('../lib/market-io');
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  delete require.cache[require.resolve('../lib/market-io')];
  return io;
}

test('browse runs with bun on PATH (launchd has no ~/.bun/bin) and its state file, in its own process group', () => {
  const dir = tmp('browse-');
  fs.mkdirSync(path.join(dir, 'bun', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bun', 'bin', 'bun'), '#!/bin/sh\necho bun-ran\n', { mode: 0o755 });
  // A stand-in for gstack's browse CLI: it fails the way the real one did when bun wasn't on PATH.
  const fake = path.join(dir, 'browse');
  fs.writeFileSync(fake, '#!/bin/sh\ncommand -v bun >/dev/null || { echo "[browse] Executable not found in \\$PATH: \\"bun\\"" >&2; exit 1; }\nbun\necho "state=$BROWSE_STATE_FILE"\necho "pgid=$(ps -o pgid= -p $$ | tr -d " ")"\n', { mode: 0o755 });
  const state = path.join(dir, 'm', 'browse.json');
  const io = fresh({ GSTACK_BROWSE: fake, BUN_INSTALL: path.join(dir, 'bun'), MARKET_BROWSE_STATE: state });
  const launchdPath = '/Users/x/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
  assert.equal(io.browseEnv({ PATH: launchdPath }).PATH, `${launchdPath}:${path.join(dir, 'bun', 'bin')}`);
  assert.equal(io.browseEnv({ PATH: `${io.BUN_BIN}:/usr/bin` }).PATH, `${io.BUN_BIN}:/usr/bin`);
  assert.equal(io.browseEnv({ PATH: '/usr/bin' }).BROWSE_STATE_FILE, state);

  const savedPath = process.env.PATH;
  process.env.PATH = '/usr/bin:/bin';
  try {
    const r = io.browse(['status']);
    assert.equal(r.ok, true, r.err);
    assert.match(r.out, /bun-ran/);
    assert.match(r.out, new RegExp(`state=${state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const mine = spawnSync('ps', ['-o', 'pgid=', '-p', String(process.pid)], { encoding: 'utf8' }).stdout.trim();
    assert.notEqual(r.out.match(/pgid=(\d+)/)[1], mine, 'browse should not share our process group');
  } finally { process.env.PATH = savedPath; }
});

test('browseError reports what browse said instead of always blaming "No active page"', () => {
  const io = require('../lib/market-io');
  assert.equal(io.browseError({ out: '', err: 'Error: No active page. Use "browse goto <url>" first.' }), 'it has no page open ("No active page")');
  assert.equal(io.browseError({ out: '', err: '[browse] Starting server...\n[browse] Executable not found in $PATH: "bun"\n' }), '[browse] Starting server... [browse] Executable not found in $PATH: "bun"');
  assert.equal(io.browseError({ out: '', err: '' }), 'no output');
});

test('ensureCrowdDeps installs the crowd clone\'s dependencies only when playwright-core is gone', () => {
  const repo = tmp('crowd-');
  const log = path.join(repo, 'npm.log');
  const npm = path.join(tmp('npm-'), 'npm');
  // A stand-in npm: records its arguments and installs a playwright-core.
  fs.writeFileSync(npm, `#!/bin/sh\necho "$@" >> ${JSON.stringify(log)}\nmkdir -p node_modules/playwright-core\necho '{"name":"playwright-core","main":"index.js"}' > node_modules/playwright-core/package.json\necho 'module.exports={}' > node_modules/playwright-core/index.js\n`, { mode: 0o755 });
  const io = fresh({ NPM_BIN: npm });
  process.env.NPM_BIN = npm;
  try {
    assert.equal(io.ensureCrowdDeps(repo), true);
    assert.equal(fs.readFileSync(log, 'utf8').trim(), 'ci --ignore-scripts --no-audit --no-fund');
    assert.equal(io.ensureCrowdDeps(repo), false);
    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1, 'npm ran again with the dependencies in place');
  } finally { delete process.env.NPM_BIN; }
});

test('ensureCrowdDeps says so when npm ci fails', () => {
  const repo = tmp('crowd-');
  const npm = path.join(tmp('npm-'), 'npm');
  fs.writeFileSync(npm, '#!/bin/sh\necho "npm ERR! missing lockfile" >&2\nexit 1\n', { mode: 0o755 });
  process.env.NPM_BIN = npm;
  try {
    const io = require('../lib/market-io');
    assert.throws(() => io.ensureCrowdDeps(repo), /dependencies are missing and npm ci failed: npm ERR! missing lockfile/);
  } finally { delete process.env.NPM_BIN; }
});
