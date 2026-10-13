// idea.json tags feed RepoHQ's Ideas page filters (SKILL.md "tags"). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTags } = require('../bin/idea-publish');

test('tags are lowercased, deduplicated and capped at 8', () => {
  assert.deepEqual(
    normalizeTags([' Fun ', 'consumer', 'fun', 'One-Time', 'reach:viral', 'AI', 'pets', 'gifts', 'social', 'extra']),
    ['fun', 'consumer', 'one-time', 'reach:viral', 'ai', 'pets', 'gifts', 'social'],
  );
});

test('commas become spaces; blanks, non-strings and non-arrays are dropped', () => {
  assert.deepEqual(normalizeTags(['a,b', '', '  ', null, 7]), ['a b']);
  assert.deepEqual(normalizeTags('fun'), []);
  assert.deepEqual(normalizeTags(undefined), []);
});
