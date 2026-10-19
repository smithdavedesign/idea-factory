// A feature build's prompts and its acceptance check (bin/idea-build.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../bin/idea-build');

const item = { title: 'Comparison pages', acceptance: ['three /vs/ pages render', 'each is in sitemap.xml'] };

test('the acceptance check reviews against every criterion and only writes its verdict', () => {
  const p = B.acceptancePrompt(item);
  assert.match(p, /you are not building it/);
  assert.match(p, /1\. three \/vs\/ pages render\n2\. each is in sitemap\.xml/);
  assert.match(p, /Don't change any file except \.acceptance\.json/);
});

test('a verdict passes only when every criterion is met; anything unreadable fails', () => {
  assert.equal(B.parseAcceptance('{"verdict":"pass","met":["a"],"unmet":[]}').verdict, 'pass');
  assert.equal(B.parseAcceptance('{"verdict":"pass","unmet":["a"]}').verdict, 'fail');
  assert.deepEqual(B.parseAcceptance('{"verdict":"fail","unmet":[{"criterion":"a","why":"no test"}]}').unmet, [{ criterion: 'a', why: 'no test' }]);
  assert.match(B.parseAcceptance('').unmet[0].why, /no readable/);
});

test('the fix round lists what is missing', () => {
  assert.match(B.acceptanceFixPrompt([{ criterion: 'a', why: 'no test' }]), /1\. a: no test/);
});

test('a feature build is asked for one feature, a growth build for one change', () => {
  const exp = { hypothesis: 'h', metric: 'visit', baseline: 1, target: 50, windowDays: 14 };
  assert.match(B.growthPrompt('t', { exp: { ...exp, kind: 'feature' }, task: 'T' }), /Build one feature from the weekly plan/);
  assert.match(B.growthPrompt('t', { exp: { ...exp, kind: 'seo' }, task: 'T' }), /Make one change, to test one idea/);
});
