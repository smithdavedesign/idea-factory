// events.js — write to the shared system log (RepoHQ docs/logging.md): one JSON line per event in
// ~/.system-events/events.jsonl. The collector ships it to Neon and alerts Slack on failures.
// Best-effort: logging never breaks the thing it logs.
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = process.env.SYSTEM_EVENTS_DIR || path.join(os.homedir(), '.system-events');

function emit({ component, event, status = 'info', message = '', subject, data, durationMs, runId }) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const line = { ts: new Date().toISOString(), system: 'idea-factory', component, event, status,
      level: status === 'fail' ? 'error' : 'info', message: String(message).slice(0, 2000),
      ...(subject ? { subject } : {}), ...(data ? { data } : {}), ...(durationMs != null ? { durationMs } : {}), ...(runId ? { runId } : {}) };
    fs.appendFileSync(path.join(DIR, 'events.jsonl'), JSON.stringify(line) + '\n');
  } catch { /* best-effort */ }
}

module.exports = { emit };
