// Builds run in their own processes (bin/idea-build-job.js), so several run at once: at most
// policy.build.concurrency.max, and a new one only while Docker and the Mac have the memory for it.
// David's call on 2026-10-13: no daily or weekly caps on builds, only how many run at once, "so we
// don't break the computer". Each running build has a slot file (.builds/slot-<slug>.json) with its
// process id. The tick counts the live ones; a slot whose process is gone is a build that died, and the
// tick records it as failed. A finished build leaves a result file for the next tick to log and commit.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULTS = { max: 3, reserveForRequests: 1, reserveMemoryMb: 2000, minFreeMemoryPct: 10, retryAfterHours: 24, hungAfterHours: 6 };
// RepoHQ's factory sandbox names its containers repohq-sbx-<id>-worker (and -egress).
const SANDBOX_WORKER = /^repohq-sbx-.+-worker$/;

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 });

/** policy.build.concurrency with the defaults filled in. */
function settings(policy) {
  return { ...DEFAULTS, ...(policy?.build?.concurrency || {}) };
}

/** True while pid is a running build job, not a reused pid that now belongs to something else. */
function isJob(pid, exec = run) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { return /idea-build-job\.js/.test(exec('ps', ['-p', String(pid), '-o', 'command='])); } catch { return false; }
}

/** True while pid runs at all (the tick tests, whose jobs run in-process). */
function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

const slotFile = (dir, slug) => path.join(dir, `slot-${slug}.json`);

/** The slots in dir: {live, stale}, each {slug, milestone, kind, pid, startedAt, requestId}. */
function readSlots(dir, { running = isJob } = {}) {
  const live = [];
  const stale = [];
  let names = [];
  try { names = fs.readdirSync(dir).filter((f) => /^slot-.+\.json$/.test(f)); } catch { return { live, stale }; }
  for (const f of names) {
    let slot;
    try { slot = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    (running(slot.pid) ? live : stale).push(slot);
  }
  return { live, stale };
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
  fs.renameSync(`${file}.tmp`, file);
}

function writeSlot(dir, slot) { writeJson(slotFile(dir, slot.slug), slot); }
function removeSlot(dir, slug) { fs.rmSync(slotFile(dir, slug), { force: true }); }

/** A finished build's result, one file each, so two builds never write the same file. */
function writeResult(dir, result) {
  writeJson(path.join(dir, `done-${result.slug}-${Date.now()}-${process.pid}.json`), result);
}

/** The results waiting, oldest first. Each file is removed as it's read. */
function takeResults(dir) {
  let names = [];
  try { names = fs.readdirSync(dir).filter((f) => /^done-.+\.json$/.test(f)); } catch { return []; }
  const out = [];
  for (const f of names) {
    try { out.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { /* half-written: skipped */ }
    fs.rmSync(path.join(dir, f), { force: true });
  }
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** `memory_pressure -Q` ("System-wide memory free percentage: 24%") → 24, or null. */
function parseFreePct(text) {
  const m = String(text).match(/free percentage:\s*(\d+)%/);
  return m ? Number(m[1]) : null;
}

/** A docker stats size ("499.3MiB", "1.2GiB", "800kB") → MiB, or null. */
function parseMiB(text) {
  const m = String(text).trim().match(/^([\d.]+)\s*([KMGT]?i?B)$/i);
  if (!m) return null;
  const scale = { B: 1 / 1048576, K: 1 / 1024, M: 1, G: 1024, T: 1048576 }[m[2][0].toUpperCase()] ?? null;
  return scale == null ? null : Number(m[1]) * scale;
}

/** How much memory the Mac and Docker have right now. A probe that fails leaves its field null. */
function probe(exec = run) {
  const p = { hostFreePct: null, dockerTotalMb: null, containers: null };
  try { p.hostFreePct = parseFreePct(exec('memory_pressure', ['-Q'])); } catch { /* not macOS */ }
  try {
    const bytes = Number(String(exec('docker', ['info', '--format', '{{.MemTotal}}'])).trim());
    p.dockerTotalMb = bytes > 0 ? Math.round(bytes / 1048576) : null;
  } catch { /* Docker down */ }
  try {
    p.containers = String(exec('docker', ['stats', '--no-stream', '--format', '{{.Name}}\t{{.MemUsage}}'])).split('\n').filter(Boolean).map((line) => {
      const [name, usage = ''] = line.split('\t');
      return { name, mb: Math.round(parseMiB(usage.split('/')[0]) ?? 0) };
    });
  } catch { /* Docker down */ }
  return p;
}

const gb = (mb) => (mb / 1024).toFixed(1);

/**
 * How many builds may start now (pure). At most cfg.max run at once (`running` counts this pipeline's
 * builds, `pending` the ones started this tick, whose sandboxes aren't up yet). Each needs
 * cfg.reserveMemoryMb free in Docker, where every sandbox already running counts at least that much (a
 * build's memory grows, so one that just started isn't judged by its first minute), and none starts while
 * the Mac has under cfg.minFreeMemoryPct of its memory free. Builds the pipeline starts by itself leave
 * cfg.reserveForRequests slots for the ones David asks for.
 * → {requests, automatic, reason, autoReason}: how many of each may start, and why not when 0.
 */
function capacity({ running, pending = 0, cfg, probe: p }) {
  const open = Math.max(0, cfg.max - running);
  let room = open;
  let reason = open ? null : `${running} builds are running (the limit is ${cfg.max})`;
  if (open && p.hostFreePct != null && p.hostFreePct < cfg.minFreeMemoryPct) {
    room = 0;
    reason = `the Mac has ${p.hostFreePct}% of its memory free, and a build needs ${cfg.minFreeMemoryPct}%`;
  } else if (open && p.dockerTotalMb && p.containers) {
    const committed = p.containers.reduce((sum, c) => sum + (SANDBOX_WORKER.test(c.name) ? Math.max(c.mb, cfg.reserveMemoryMb) : c.mb), 0) + pending * cfg.reserveMemoryMb;
    const free = p.dockerTotalMb - committed;
    const fits = Math.max(0, Math.floor(free / cfg.reserveMemoryMb));
    if (fits < room) {
      room = fits;
      reason = `Docker has ${gb(Math.max(0, free))} GB to spare, and a build needs ${gb(cfg.reserveMemoryMb)} GB (${running} running)`;
    }
  } else if (open && running > 0) {
    room = 0;
    reason = "Docker's memory couldn't be read, so builds run one at a time";
  }
  const automatic = Math.max(0, Math.min(room, cfg.max - cfg.reserveForRequests - running));
  const autoReason = automatic ? null : room ? `the last ${cfg.reserveForRequests === 1 ? 'slot is' : `${cfg.reserveForRequests} slots are`} kept for builds David asks for` : reason;
  return { requests: room, automatic, reason, autoReason };
}

/** Whether the pipeline may start a build of this idea by itself (pure): not within cfg.retryAfterHours of its last failed or closed one. */
function retryDue(state, cfg, now) {
  const b = state.build || {};
  if (!['failed', 'closed'].includes(b.status) || !b.at) return true;
  return now - new Date(b.at) >= cfg.retryAfterHours * 3_600_000;
}

module.exports = { DEFAULTS, settings, isJob, isAlive, readSlots, writeSlot, removeSlot, writeResult, takeResults, parseFreePct, parseMiB, probe, capacity, retryDue };
