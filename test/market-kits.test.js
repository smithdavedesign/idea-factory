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

test('s3Sign: a presigned GET for the media bucket is deterministic and carries the SigV4 query', () => {
  const io = require('../lib/market-io.js');
  const cfg = { endpoint: 'https://store.example', bucket: 'botchelor-media', region: 'us-east-1' };
  const args = { method: 'GET', key: 'marketing/reels/a b.mp4', cfg, keyId: 'AKID', secretKey: 'SECRET', presignSeconds: 3600, now: new Date('2026-11-11T20:00:00Z') };
  const a = io.s3Sign(args).url;
  const u = new URL(a);
  assert.equal(u.pathname, '/botchelor-media/marketing/reels/a%20b.mp4');
  assert.equal(u.searchParams.get('X-Amz-Credential'), 'AKID/20261111/us-east-1/s3/aws4_request');
  assert.equal(u.searchParams.get('X-Amz-Expires'), '3600');
  assert.match(u.searchParams.get('X-Amz-Signature'), /^[0-9a-f]{64}$/);
  assert.equal(io.s3Sign(args).url, a);
  assert.notEqual(io.s3Sign({ ...args, secretKey: 'OTHER' }).url, a);
  const put = io.s3Sign({ ...args, method: 'PUT', presignSeconds: 0, payloadHash: 'abc' });
  assert.match(put.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKID\/20261111\/us-east-1\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
});
