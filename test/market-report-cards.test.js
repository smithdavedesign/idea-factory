// Report card posts (botchelor #1896; David 2026-11-20: "point the marketing loop at report cards"): which aired date
// a post features, the facts its draft gets, its link, and that its picture is the card.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-report-'));
process.env.SYSTEM_EVENTS_DIR = path.join(tmp, 'events'); // never the real system log
process.env.MARKET_MEDIA_TMP = path.join(tmp, 'media');
const M = require('../lib/market');
const MM = require('../lib/market-media');
const bin = require('../bin/idea-market');

const now = new Date('2026-11-20T18:00:00Z');
const ep = (id, more = {}) => ({ id, revealed: true, box_score: { chemistry: {} }, hidden: false, visibility: 'public', ...more });
const title = (a, b, g, end = 'just friends') => `${a} × ${b} got ${/^[AF]/.test(g) ? 'an' : 'a'} ${g} on their AI blind date (${end})`;

test('candidates: aired public dates with a box score, newest first, none a post featured in the last two weeks', () => {
  const feed = [ep('new', { revealed: false, box_score: undefined }), ep('a'), ep('b'), ep('priv', { visibility: 'private' }), ep('hid', { hidden: true }), ep('c'), ep('d')];
  const queue = { items: [
    { reportCard: { episodeId: 'b' }, createdAt: '2026-11-19T15:00:00Z' },
    { reportCard: { episodeId: 'c' }, createdAt: '2026-10-01T15:00:00Z' }, // long ago: may come round again
  ] };
  assert.deepEqual(M.reportCardCandidates(feed, queue, { now }), ['a', 'c', 'd']);
  assert.deepEqual(M.reportCardCandidates(feed, queue, { now, max: 1 }), ['a']);
  assert.deepEqual(M.reportCardCandidates(null, null, { now }), []);
});

test('grade: read off the card\'s og:title', () => {
  assert.equal(M.reportCardGrade(title('Ada', 'Bo', 'A-')), 'A-');
  assert.equal(M.reportCardGrade(title('Ada', 'Bo', 'F', 'a disaster')), 'F');
  assert.equal(M.reportCardGrade(title('Ada', 'Bo', 'B+')), 'B+');
  assert.equal(M.reportCardGrade('Ada × Bo: an AI blind date'), null);
});

test('pick: the most striking grade, newest among equals, never a card the post checks would refuse', () => {
  const cards = [
    { episodeId: '1', title: title('Ada', 'Bo', 'B-') },
    { episodeId: '2', title: title('Cy', 'Di', 'A') },
    { episodeId: '3', title: title('Chud the crusher', 'Nell', 'F') }, // BANNED name: skipped
    { episodeId: '4', title: title('Ed', 'Flo', 'D', 'a disaster') },
    { episodeId: '5', title: title('Gus', 'Hal', 'F'), quotes: ['He said Chud would hate it'] }, // a banned word in a quote
    { episodeId: '6', title: 'no grade here' },
  ];
  assert.equal(M.pickReportCard(cards).episodeId, '4');
  assert.equal(M.pickReportCard(cards.slice(0, 2)).episodeId, '2');
  assert.equal(M.pickReportCard([{ episodeId: 'x', title: title('Ada', 'Bo', 'B') }, { episodeId: 'y', title: title('Cy', 'Di', 'B') }]).episodeId, 'x');
  assert.equal(M.pickReportCard([cards[2], cards[5]]), null);
  assert.equal(M.pickReportCard([]), null);
});

test('quotes: the lines the page quotes, as plain text', () => {
  const html = '<ul><li><strong>Nell</strong><span>Would see them again</span><q>He actually remembered the <em>structural</em> joke &amp; I&#x27;d go again.</q></li></ul>' +
    '<blockquote class="report-quote"><span>Quote of the night</span><q>  You alphabetise\n your spices?  </q></blockquote><q></q>';
  assert.deepEqual(M.reportCardQuotes(html), ["He actually remembered the structural joke & I'd go again.", 'You alphabetise your spices?']);
  assert.deepEqual(M.reportCardQuotes(''), []);
});

test('the draft gets the card\'s facts and its tagged report card link; without a card, the usual angle and link', () => {
  const ctx = { dir: tmp, cfg: { site: 'https://botchelor.com', utm: { campaign: 'season1', medium: 'social' } }, launchLog: { posts: [] } };
  const ch = { id: 'x', kind: 'x', angle: 'A best line from a date.', reportCard: true, reportCardAngle: 'Feature the report card.' };
  const card = { episodeId: 'ep 1', title: title('Ada', 'Bo', 'F', 'a disaster'), description: 'Chemistry F · Attraction D · Trust C · Awkwardness F.', quotes: ['Never again.'] };
  const p = bin.draftPrompt(ctx, ch, { reportCard: card });
  assert.match(p, /Angle: Feature the report card\./);
  assert.match(p, /Headline: Ada × Bo got an F on their AI blind date \(a disaster\)/);
  assert.match(p, /Grades: Chemistry F · Attraction D/);
  assert.match(p, /quote it exactly if you use it: "Never again\."/);
  assert.ok(p.includes(`Include this exact link once, unchanged: ${M.utmLink(ctx.cfg, ch, '/episodes/ep%201/report-card')}`));
  assert.ok(p.includes('utm_source=x') && p.includes('utm_content=x'));
  const plain = bin.draftPrompt(ctx, ch, {});
  assert.match(plain, /Angle: A best line from a date\./);
  assert.doesNotMatch(plain, /report card/);
});

test('its picture is the card, even when the day\'s kit has the same two characters', () => {
  const kits = [{ dir: '/kits/2026-11-20-ada-bo', names: ['Ada', 'Bo'] }];
  const link = 'https://botchelor.com/episodes/e1/report-card?utm_source=bluesky';
  const body = `Ada × Bo got an F. ${link}`;
  assert.deepEqual(MM.imagePlan({ kind: 'bluesky', body, link, reportCard: { episodeId: 'e1' } }, { kits }), { source: 'og', page: link });
  assert.equal(MM.imagePlan({ kind: 'bluesky', body, link }, { kits }).source, 'kit'); // not a report card post: the kit, as before
});

test('the calendar turns report cards on for the daily short posts, each with its own angle', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ideas', 'botchelor', 'marketing.json'), 'utf8'));
  const on = real.channels.filter((c) => c.reportCard);
  assert.deepEqual(on.map((c) => c.id).sort(), ['bluesky', 'threads', 'x']);
  for (const c of on) assert.ok(c.reportCardAngle && c.reportCardAngle.length > 40, c.id);
});
