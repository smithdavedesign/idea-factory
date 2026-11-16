// The X poster reads the new post's URL off the profile, which can lag behind the post: #51 (2026-11-16) was logged
// with #46's URL from four hours earlier. newPostUrl only accepts a post whose text is ours.
const test = require('node:test');
const assert = require('node:assert/strict');
const { newPostUrl } = require('../lib/market-io');

const text = "December's lead on Botchelor: Nell, a museum night guard. Five suitors, roses every Sunday.\n\nMade an original character? This invite puts them straight on an audition date with her (first come):\nhttps://botchelor.com/casting/invite/WXyLIVKw80\n\nI built it; the dates are AI.";
const older = { url: 'https://x.com/botchelorLLC/status/2122132603184767189', pinned: false, text: 'Botchelor\n@botchelorLLC\n·\n4h\nI built botchelor, an AI blind-date show.' };
const ours = {
  url: 'https://x.com/botchelorLLC/status/2122202394755039438',
  pinned: false,
  // As the profile shows it: the header first, a curly apostrophe, the link shortened.
  text: 'Botchelor\n@botchelorLLC\n·\n2m\nDecember’s lead on Botchelor: Nell, a museum night guard. Five suitors, roses every Sunday.\n\nMade an original character? botchelor.com/casting/inv…',
};

test('the newest post is taken only when it is ours', () => {
  assert.equal(newPostUrl([ours, older], text), ours.url);
  assert.equal(newPostUrl([older, ours], text), ours.url, 'found below an older post');
});

test("nothing when ours isn't on the profile yet, so the caller never logs another post's URL", () => {
  assert.equal(newPostUrl([older], text), '');
  assert.equal(newPostUrl([], text), '');
  assert.equal(newPostUrl(undefined, text), '');
});

test('a pinned copy, a post with no status link, or an empty text never match', () => {
  assert.equal(newPostUrl([{ ...ours, pinned: true }, older], text), '');
  assert.equal(newPostUrl([{ ...ours, url: 'https://x.com/botchelorLLC' }], text), '');
  assert.equal(newPostUrl([ours], ''), '');
});
