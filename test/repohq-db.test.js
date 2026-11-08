'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../lib/repohq');

// The pipeline reads and writes the dashboard's database (repohq-prod), never the factory's sink (found 2026-11-08).
test('databaseUrl: IDEA_DATABASE_URL first, else the dashboard keychain item, never the factory one', () => {
  assert.equal(R.databaseUrl({ env: { IDEA_DATABASE_URL: 'postgres://override' }, exec: () => { throw new Error('not called'); } }), 'postgres://override');

  const asked = [];
  const exec = (cmd, args) => { asked.push(args[args.indexOf('-s') + 1]); return 'postgres://dashboard\n'; };
  assert.equal(R.databaseUrl({ env: {}, exec }), 'postgres://dashboard');
  assert.deepEqual(asked, ['vault/RepoHQ/DATABASE_URL']);
  assert.equal(R.DASHBOARD_DB_SERVICE, 'vault/RepoHQ/DATABASE_URL');
});

test('databaseUrl: a missing keychain item fails loudly instead of falling back', () => {
  const missing = () => { throw new Error('The specified item could not be found in the keychain.'); };
  assert.throws(() => R.databaseUrl({ env: {}, exec: missing }), /vault\/RepoHQ\/DATABASE_URL/);
  assert.throws(() => R.databaseUrl({ env: {}, exec: () => '  \n' }), /isn't in the keychain/);
});
