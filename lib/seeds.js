// Ideas David sends ("idea: …" on Slack or WhatsApp, or the New idea box on RepoHQ's Ideas page) are
// researched and reviewed as soon as the pipeline sees them, not at the next 09:00 run, and the verdict
// goes back to where he sent it. Rules in policy.json → research.seeded.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// RepoHQ's address (policy.repohqUrl): on David's Mac behind Tailscale since 2026-10-31, while Vercel is blocked.
const IDEAS_PAGE = `${require('../policy.json').repohqUrl || 'https://repohq.vercel.app'}/ideas`;
const SOURCES = ['slack', 'whatsapp', 'page'];

const minutesOf = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

/**
 * Whether this tick should research a queued seed now (pure). Not while the daily 09:00 run might be
 * researching (`quietStart`–`quietEnd`, local time), at most `maxPerDay` runs a local day, and
 * `retryMinutes` after a failed run (e.g. the subscription is at its usage limit). The seed stays
 * queued until a run records it, so nothing is lost.
 */
function seededDue({ queued, seeded = {}, now, rules }) {
  if (!queued) return { due: false, reason: 'no seeds queued' };
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= minutesOf(rules.quietStart) && mins < minutesOf(rules.quietEnd)) return { due: false, reason: 'daily research window' };
  const today = now.toLocaleDateString('en-CA');
  const runs = seeded.date === today ? seeded.runs || 0 : 0;
  if (runs >= rules.maxPerDay) return { due: false, reason: `${runs} seeded runs today (max ${rules.maxPerDay})` };
  if (seeded.lastFailAt && now.getTime() - new Date(seeded.lastFailAt).getTime() < rules.retryMinutes * 60_000) {
    return { due: false, reason: `last run failed; retrying ${rules.retryMinutes} min after it` };
  }
  return { due: true };
}

/** The day's run counter after one more run (pure). */
function countRun(seeded = {}, now, { failed = false } = {}) {
  const today = now.toLocaleDateString('en-CA');
  const runs = (seeded.date === today ? seeded.runs || 0 : 0) + 1;
  return { date: today, runs, ...(failed ? { lastFailAt: now.toISOString() } : {}) };
}

/** `--source slack|whatsapp|page` out of the CLI args; the rest is the idea text (pure). */
function parseSeedArgs(args) {
  const rest = [];
  let source = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source') { source = args[++i] ?? null; continue; }
    if (a.startsWith('--source=')) { source = a.slice('--source='.length); continue; }
    rest.push(a);
  }
  return { text: rest.join(' '), source: SOURCES.includes(String(source).toLowerCase()) ? String(source).toLowerCase() : null };
}

/** The reply David gets once his idea is researched (and reviewed, when that worked) (pure). */
function seedMessage({ idea, slug, review, reviewError, pageUrl }) {
  const name = String(idea.title || slug).split(' — ')[0];
  const lines = [`💡 Researched your idea: *${name}* (${slug})`];
  if (idea.oneLiner) lines.push(idea.oneLiner);
  if (review) {
    lines.push('');
    if (review.verdict === 'validate') {
      lines.push(`Review: *validate*, ${review.score}/10. ${review.summary || ''}`.trim());
      lines.push(pageUrl ? `Demand test page: ${pageUrl}` : 'Its demand-test page goes up at the next daily run (09:30).');
    } else {
      lines.push(`Review: *pass*, ${review.score}/10. ${review.summary || ''}`.trim());
      lines.push('Your call wins: you can still approve it or send it to a demand test.');
    }
  } else {
    lines.push('', `The review didn't run (${String(reviewError || 'unknown error').slice(0, 160)}); it's reviewed at 09:30.`);
  }
  lines.push(`Decide: ${IDEAS_PAGE}`);
  return lines.join('\n');
}

/**
 * Where to send it, from OpenClaw's own config: WhatsApp to the allowlisted owner number, Slack (and
 * the Ideas page, and seeds from before sources were recorded) to the alerts channel. Null if unknown.
 */
function notifyTarget(source, openclawConfig) {
  const ch = openclawConfig?.channels ?? {};
  if (source === 'whatsapp' && ch.whatsapp?.enabled !== false && ch.whatsapp?.allowFrom?.[0]) {
    return { channel: 'whatsapp', target: ch.whatsapp.allowFrom[0] };
  }
  const slack = ch.slack;
  const channel = slack && slack.enabled !== false ? (Object.keys(slack.channels ?? {})[0] || slack.defaultTo) : null;
  return channel ? { channel: 'slack', target: channel } : null;
}

function readOpenClawConfig(home = os.homedir()) {
  try { return JSON.parse(fs.readFileSync(path.join(home, '.openclaw', 'openclaw.json'), 'utf8')); } catch { return null; }
}

/** Send through OpenClaw (`openclaw message send`: no model in between). Throws on failure. */
function notify(source, message, { exec = execFileSync, config = readOpenClawConfig() } = {}) {
  const to = notifyTarget(source, config);
  if (!to) throw new Error('no Slack or WhatsApp target in ~/.openclaw/openclaw.json');
  exec('openclaw', ['message', 'send', '--channel', to.channel, '--target', to.target, '--message', message], { stdio: 'pipe', timeout: 60_000 });
  return to;
}

module.exports = { seededDue, countRun, parseSeedArgs, seedMessage, notifyTarget, notify, readOpenClawConfig, IDEAS_PAGE, SOURCES };
