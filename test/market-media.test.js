// The picture each social post carries (lib/market-media.js): which one, from where, and what's recorded about it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

process.env.MARKET_MEDIA_TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-media-'));
const MM = require('../lib/market-media');
const io = require('../lib/market-io');

test('ogTags reads Open Graph tags in any attribute order, with entities, and falls back to Twitter tags', () => {
  const html = `<head><meta property="og:title" content="Botchelor: a blind-date show"/>
    <meta content="https://botchelor.com/opengraph-image?a=1&amp;b=2" property="og:image">
    <meta name='og:image:alt' content='Give your character a love life'>
    <meta name="twitter:description" content="Dates nobody steers &quot;live&quot;"></head>`;
  const t = MM.ogTags(html);
  assert.equal(t.title, 'Botchelor: a blind-date show');
  assert.equal(t.image, 'https://botchelor.com/opengraph-image?a=1&b=2');
  assert.equal(t.imageAlt, 'Give your character a love life');
  assert.equal(t.description, 'Dates nobody steers "live"');
  assert.equal(MM.ogTags('<meta name="twitter:image" content="/tw.png">').image, '/tw.png');
  assert.equal(MM.ogTags('<p>no tags</p>').image, null);
});

test('ogImageFrom makes the image absolute against the page and refuses non-http links', () => {
  assert.equal(MM.ogImageFrom('<meta property="og:image" content="/opengraph-image">', 'https://botchelor.com/?utm_source=x'), 'https://botchelor.com/opengraph-image');
  assert.equal(MM.ogImageFrom('<meta property="og:image" content="https://cdn.example/a.png">', 'https://botchelor.com/'), 'https://cdn.example/a.png');
  assert.equal(MM.ogImageFrom('<meta property="og:image" content="javascript:alert(1)">', 'https://botchelor.com/'), null);
  assert.equal(MM.ogImageFrom('', 'https://botchelor.com/'), null);
});

test('firstLink finds the post\'s link without trailing punctuation', () => {
  assert.equal(MM.firstLink('Watch it: https://botchelor.com/?utm_source=x&utm_content=x.'), 'https://botchelor.com/?utm_source=x&utm_content=x');
  assert.equal(MM.firstLink('no link here'), null);
});

test('kitNames and kitAlt read a kit\'s checklist heading; a cut has no pair', () => {
  assert.deepEqual(MM.kitNames('# Posting Sable Quist × Juniper Vale\n\nEpisode: …'), ['Sable Quist', 'Juniper Vale']);
  assert.deepEqual(MM.kitNames('# Posting the episode cut: Same line, three dates\n'), []);
  assert.deepEqual(MM.kitNames('no heading'), []);
  assert.match(MM.kitAlt('# Posting Sable Quist × Juniper Vale'), /blind date: Sable Quist × Juniper Vale\. AI characters/);
  assert.match(MM.kitAlt('# Posting the episode cut: Same line, three dates'), /episode cut: Same line, three dates/);
  assert.match(MM.kitAlt(''), /Botchelor/);
});

test('kitAbout picks the newest kit whose two characters the post names', () => {
  const kits = [
    { dir: '/k/2026-11-18-zz-cut-3', names: [] },
    { dir: '/k/2026-11-16-sable-juniper', names: ['Sable Quist', 'Juniper Vale'] },
    { dir: '/k/2026-11-12-barnaby-nell', names: ['Barnaby Thorne', 'Nell Abiodun'] },
  ];
  assert.equal(MM.kitAbout('Juniper Vale to Sable Quist, on their third date: "Forty-one hats."', kits).dir, '/k/2026-11-16-sable-juniper');
  assert.equal(MM.kitAbout('Barnaby Thorne × Sable Quist tonight', kits), null); // only one of a pair
  assert.equal(MM.kitAbout('', kits), null);
});

test('imagePlan: kit covers for Shorts, Reels and posts about a kit; og:image for linked posts; nothing for Reddit', () => {
  const kits = [{ dir: '/k/2026-11-16-sable-juniper', names: ['Sable Quist', 'Juniper Vale'] }];
  const link = 'https://botchelor.com/?utm_source=bluesky';
  assert.deepEqual(MM.imagePlan({ kind: 'youtube', kitDir: '/k/a', body: 'x' }), { source: 'kit', kitDir: '/k/a' });
  assert.deepEqual(MM.imagePlan({ kind: 'instagram', kitDir: '/k/a', body: 'x' }), { source: 'kit', kitDir: '/k/a' });
  assert.equal(MM.imagePlan({ kind: 'youtube', body: 'no kit folder' }), null);
  assert.deepEqual(MM.imagePlan({ kind: 'bluesky', body: `Sable Quist and Juniper Vale again ${link}`, link }, { kits }), { source: 'kit', kitDir: '/k/2026-11-16-sable-juniper' });
  assert.deepEqual(MM.imagePlan({ kind: 'x', body: `A line from the show ${link}`, link }, { kits }), { source: 'og', page: link });
  assert.deepEqual(MM.imagePlan({ kind: 'threads', body: `more at ${link}` }, { kits }), { source: 'og', page: link }); // link from the text
  assert.equal(MM.imagePlan({ kind: 'discord', body: 'Welcome to the server.' }, { kits }), null);
  for (const kind of ['reddit', 'reddit-thread', 'reddit-help', 'video', 'hn']) assert.equal(MM.imagePlan({ kind, body: link, link }), null, kind);
  assert.equal(MM.imagePlan({ kind: 'bluesky', body: link, replyTo: { name: 't1_x' } }), null);
});

test('imageOutcome records what happened to the picture', () => {
  const kit = { source: 'kit', kitDir: '/k/2026-11-16-sable-juniper' };
  assert.equal(MM.imageOutcome(null, null, null, null), null);
  assert.deepEqual(MM.imageOutcome(kit, { file: 'c.jpg' }, null, { ok: true, how: 'thumbnail' }), { source: 'kit', kit: '2026-11-16-sable-juniper', ok: true, how: 'thumbnail' });
  const refused = MM.imageOutcome(kit, { file: 'c.jpg' }, null, { ok: false, error: 'YouTube refused the thumbnail (403)', verify: true });
  assert.equal(refused.ok, false);
  assert.equal(refused.verify, true);
  assert.match(MM.imageOutcome({ source: 'og', page: 'https://botchelor.com/' }, null, 'no og:image', null).error, /couldn't make the picture: no og:image/);
  assert.equal(MM.imageOutcome(kit, { file: 'c.jpg' }, null, undefined).ok, false);
});

test('blueskyEmbed: a link card for the page\'s own picture, an image with alt text for a kit cover', () => {
  const blob = { $type: 'blob', ref: { $link: 'x' }, mimeType: 'image/jpeg', size: 1 };
  const card = io.blueskyEmbed({ file: 'a.png', alt: 'alt', card: { uri: 'https://botchelor.com/?utm_source=bluesky', title: 'Botchelor', description: 'Blind dates' } }, blob);
  assert.equal(card.$type, 'app.bsky.embed.external');
  assert.equal(card.external.thumb, blob);
  assert.equal(card.external.uri, 'https://botchelor.com/?utm_source=bluesky');
  const img = io.blueskyEmbed({ file: 'c.jpg', alt: 'Cover of a Botchelor blind date', width: 1080, height: 1920 }, blob);
  assert.equal(img.$type, 'app.bsky.embed.images');
  assert.deepEqual(img.images[0], { image: blob, alt: 'Cover of a Botchelor blind date', aspectRatio: { width: 1080, height: 1920 } });
  assert.equal(io.blueskyEmbed({ file: 'c.jpg' }, null), null);
});

const ffmpeg = process.env.FFMPEG_BIN || (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const hasFfmpeg = spawnSync(ffmpeg, ['-version']).status === 0;

test('coverJpeg turns a kit\'s cover.png into a 1080×1920 JPEG under the size limit, and says when there is none', { skip: !hasFfmpeg && 'no ffmpeg' }, () => {
  const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  assert.equal(spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=1296x2304', '-frames:v', '1', path.join(kit, 'cover.png')]).status, 0);
  const out = MM.coverJpeg(kit, { maxBytes: 950_000 });
  assert.match(out, /\.jpg$/);
  assert.ok(fs.statSync(out).size <= 950_000);
  assert.ok(out.startsWith(process.env.MARKET_MEDIA_TMP));
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  assert.throws(() => MM.coverJpeg(empty), /no cover\.png or post\.mp4/);
});
