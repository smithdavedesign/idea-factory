// The daily video kit never cuts a date that already has a kit folder, even one made by hand (lib/market-io.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('madeKitEpisodes + newestClip skip dates that already have a kit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kits-'));
  const A = '4c6e9916-37e3-4bdf-9fba-239935193122';
  const B = '11111111-2222-3333-4444-555555555555';
  fs.mkdirSync(path.join(dir, 'posts', 'made-by-hand'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'posts', 'made-by-hand', 'checklist.md'), `Episode: https://botchelor.com/episodes/${A.toUpperCase()}\n`);
  fs.mkdirSync(path.join(dir, 'posts', 'no-checklist'));
  fs.writeFileSync(path.join(dir, '2026-11-11-a.txt'), `https://botchelor.com/episodes/${A}\n`);
  fs.writeFileSync(path.join(dir, '2026-11-10-b.txt'), `https://botchelor.com/episodes/${B}\n`);
  process.env.CLIPS_DIR = dir;
  delete require.cache[require.resolve('../lib/market-io')];
  const io = require('../lib/market-io');
  const made = io.madeKitEpisodes();
  assert.deepEqual([...made], [A]);
  assert.equal(io.newestClip(made).episode, B);
  assert.equal(io.newestClip(new Set([A, B])), null);
  delete process.env.CLIPS_DIR;
  delete require.cache[require.resolve('../lib/market-io')];
});
