#!/usr/bin/env node
// youtube-auth.js — sign the marketing loop in to the product's YouTube channel, once (David 2026-11-11: "add it to the
// overall marketing automation"). Afterwards bin/idea-market.js uploads each day's video kit as a Short by itself.
//
//   node bin/youtube-auth.js [scope]      scope defaults to vault/botchelor
//
// Needs, in the keychain: <scope>/YOUTUBE_CLIENT_ID and <scope>/YOUTUBE_CLIENT_SECRET, from a Google Cloud OAuth client
// of type "Desktop app" in a project with "YouTube Data API v3" enabled. Its consent screen must be "In production"
// (unverified is fine for our own channel: Google shows a warning you click through); in "Testing" the refresh token
// dies after 7 days. This opens the browser, you pick the Google account and then the channel (a Brand Account shows
// up as its own choice), and it stores <scope>/YOUTUBE_REFRESH_TOKEN. Nothing is printed but the channel's name.
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const io = require('../lib/market-io');

const scope = process.argv[2] || 'vault/botchelor';
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

async function main() {
  const id = io.secret(`${scope}/YOUTUBE_CLIENT_ID`);
  const sec = io.secret(`${scope}/YOUTUBE_CLIENT_SECRET`);
  if (!id || !sec) throw new Error(`store ${scope}/YOUTUBE_CLIENT_ID and ${scope}/YOUTUBE_CLIENT_SECRET first (~/ai-stack/bin/secrets add ${scope.replace(/^vault\//, '')} YOUTUBE_CLIENT_ID)`);
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/cb') { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end(ok ? 'Signed in. You can close this tab.' : `Sign-in failed: ${u.searchParams.get('error') || 'state mismatch'}`);
      server.close();
      ok ? resolve({ code: u.searchParams.get('code'), redirect: `http://127.0.0.1:${port}/cb` }) : reject(new Error(u.searchParams.get('error') || 'state mismatch'));
    });
    let port;
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: id, redirect_uri: `http://127.0.0.1:${port}/cb`, response_type: 'code', scope: SCOPES.join(' '),
        access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
      }).toString();
      console.log('Opening Google sign-in in the browser. Pick the Botchelor channel when it asks which account.');
      execFileSync('open', [url.toString()]);
    });
    setTimeout(() => { server.close(); reject(new Error('no answer from the browser in 10 minutes')); }, 10 * 60_000).unref();
  });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: sec, code: code.code, code_verifier: verifier, redirect_uri: code.redirect, grant_type: 'authorization_code' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.refresh_token) throw new Error(`Google gave no refresh token (${j.error || r.status})`);
  io.storeSecret(`${scope}/YOUTUBE_REFRESH_TOKEN`, j.refresh_token);
  const ch = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: `Bearer ${j.access_token}` } })).json();
  console.log(`Stored ${scope}/YOUTUBE_REFRESH_TOKEN for the channel "${ch.items?.[0]?.snippet?.title || '(none found: was a channel picked?)'}".`);
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
