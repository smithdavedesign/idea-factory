// secret-scan.js — find credentials in a build's patch before it's committed (bin/idea-build.js).
//
// Two kinds of hit, on added lines only:
//   - credential-shaped strings (the formats secret scanners like GitGuardian flag), fake or not:
//     a fixture written as a literal turns a PR's checks red just like a real key;
//   - the real secrets on this Mac (the build's Claude token, LiteLLM's key, the factory env), by exact value.
// Findings name the file, line and kind, never the value, so they're safe to log and to show a model.
const fs = require('fs');
const os = require('os');
const path = require('path');

const PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{16,}/],
  ['OpenAI key', /\bsk-(?!ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Slack token', /\bxox[abposr]-[A-Za-z0-9-]{20,}/],
  ['Slack webhook', /hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{20,}/],
  ['Stripe key', /\b[rs]k_live_[A-Za-z0-9]{20,}/],
  ['Google API key', /\bAIza[A-Za-z0-9_-]{35}/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['connection string with a password', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s:@/'"]+:[^\s@/'"]{6,}@/],
];

/**
 * Findings in a unified diff (git diff output), added lines only (pure).
 * `known`: real secret values; values shorter than 12 characters are ignored.
 */
function scanPatch(patch, { known = [] } = {}) {
  const secrets = known.filter((k) => typeof k === 'string' && k.length >= 12);
  const findings = [];
  let file = null;
  let line = 0;
  for (const raw of String(patch).split('\n')) {
    const header = raw.match(/^diff --git a\/.+? b\/(.+)$/);
    if (header) { file = header[1]; continue; }
    if (raw.startsWith('+++ ') || raw.startsWith('--- ')) continue;
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { line = Number(hunk[1]); continue; }
    if (raw.startsWith('+')) {
      const text = raw.slice(1);
      for (const [kind, re] of PATTERNS) if (re.test(text)) findings.push({ file, line, kind });
      if (secrets.some((s) => text.includes(s))) findings.push({ file, line, kind: 'a real secret from this Mac' });
      line++;
    } else if (!raw.startsWith('-') && !raw.startsWith('\\')) {
      line++;
    }
  }
  return findings;
}

/** "test/redact.test.js:8 (Anthropic key)", one per line, at most `max` (pure). */
function formatFindings(findings, max = 20) {
  const lines = findings.slice(0, max).map((f) => `${f.file}:${f.line} (${f.kind})`);
  if (findings.length > max) lines.push(`… and ${findings.length - max} more`);
  return lines.join('\n');
}

/** Values from KEY=value files, unquoted. */
function envValues(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').map((l) => l.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/)?.[1]?.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  } catch { return []; }
}

/** The real secrets a build could leak: the given extras plus the factory env and LiteLLM's key. Never logged. */
function knownSecrets(extra = [], home = os.homedir()) {
  return [...extra, ...envValues(path.join(home, '.repohq-factory', 'env')), ...envValues(path.join(home, 'ai-stack', 'litellm', '.env'))]
    .filter((v) => typeof v === 'string' && v.length >= 12);
}

module.exports = { scanPatch, formatFindings, knownSecrets, PATTERNS };
