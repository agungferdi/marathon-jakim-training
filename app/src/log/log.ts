// Runs you have logged, and how each one compares with the plan.
import { fmtPace } from '../plan/dates';
import { PLAN_START, SESSIONS, WEEK_SUMMARIES, type Session, type SessionType } from '../plan/plan';
import { GOAL, ZONES, type ZoneKey } from '../plan/zones';

export type Feel = 'easy' | 'ok' | 'hard';

export interface RunLog {
  /** distance actually run, km */
  km: number;
  /** moving time, seconds */
  sec: number;
  /** average heart rate */
  hr?: number;
  feel?: Feel;
  notes?: string;
}

export type LogBook = Record<string, RunLog>;

export const FEEL_NAME: Record<Feel, string> = { easy: 'Easy', ok: 'OK', hard: 'Hard' };

/** Sessions you can log: anything you run. */
export const isLoggable = (s?: Session): s is Session => !!s && s.type !== 'rest' && s.type !== 'past';

/** Planned duration in seconds, rounded to the minute (the race keeps its exact target). */
export const plannedSec = (s: Session) =>
  s.type === 'race' ? Math.round(s.minutes * 60) : Math.round(s.minutes) * 60;

export const asPlanned = (s: Session): RunLog => ({ km: s.km, sec: plannedSec(s) });

/** 10, 10.2, 10.25 */
export const fmtKm = (km: number) => String(Math.round(km * 100) / 100);

// ───────────────────────────── Checking a run against the plan ─────────────────────────────

export type LineKey = 'distance' | 'pace' | 'hr';

export interface CheckLine {
  key: LineKey;
  ok: boolean;
  /** one or two words for tables: "On plan", "Short", "Too fast" */
  tag: string;
  text: string;
}

export interface CheckResult {
  onPlan: boolean;
  headline: string;
  /** the tag of the first thing that's off, or "On plan" */
  tag: string;
  lines: CheckLine[];
}

/** Easy sessions are judged against a pace range; everything else against the planned average. */
const RANGE_ZONE: Partial<Record<SessionType, ZoneKey>> = { easy: 'easy', lsd: 'long' };
const HR_CAP: Partial<Record<SessionType, number>> = { easy: 155, lsd: 160 };
/** Allowed gap from the planned average pace, s/km. */
const PACE_TOLERANCE: Partial<Record<SessionType, number>> = { speed: 15, test: 10, tempoLong: 10, race: 8 };
/** Easy runs may drift this much slower than the range before we mention it (Jakarta heat). */
const HEAT_ALLOWANCE = 15;

export function parseRange(text: string): [number, number] | null {
  const m = text.match(/(\d+):(\d{2})\s*[–-]\s*(\d+):(\d{2})/);
  if (!m) return null;
  const [, a, b, c, d] = m.map(Number);
  return [a * 60 + b, c * 60 + d];
}

export function checkRun(s: Session, log: RunLog): CheckResult {
  const lines: CheckLine[] = [];

  // Distance
  const dKm = Math.round((log.km - s.km) * 100) / 100;
  const tol = Math.max(0.3, s.km * 0.05);
  if (Math.abs(dKm) <= tol) {
    lines.push({ key: 'distance', ok: true, tag: 'On plan', text: `${fmtKm(log.km)} km, as planned` });
  } else if (dKm < 0) {
    lines.push({
      key: 'distance',
      ok: false,
      tag: 'Short',
      text: `${fmtKm(log.km)} km, ${fmtKm(-dKm)} km short of the ${fmtKm(s.km)} km planned`,
    });
  } else {
    lines.push({
      key: 'distance',
      ok: false,
      tag: 'Long',
      text: `${fmtKm(log.km)} km, ${fmtKm(dKm)} km more than the ${fmtKm(s.km)} km planned`,
    });
  }

  // Pace
  const pace = log.sec / log.km;
  const zoneKey = RANGE_ZONE[s.type];
  const range = zoneKey ? parseRange(ZONES[zoneKey].pace[s.paceSet]) : null;
  if (zoneKey && range) {
    const [lo, hi] = range;
    const name = s.type === 'lsd' ? 'long-run' : 'easy';
    const rangeText = `${fmtPace(lo)}–${fmtPace(hi)}`;
    if (pace < lo - 3) {
      lines.push({
        key: 'pace',
        ok: false,
        tag: 'Too fast',
        text: `${fmtPace(pace)} /km, ${Math.round(lo - pace)} s/km faster than the ${name} range (${rangeText})`,
      });
    } else if (pace > hi + HEAT_ALLOWANCE) {
      lines.push({
        key: 'pace',
        ok: false,
        tag: 'Slow',
        text: `${fmtPace(pace)} /km, ${Math.round(pace - hi)} s/km slower than the ${name} range (${rangeText})`,
      });
    } else {
      lines.push({
        key: 'pace',
        ok: true,
        tag: 'On plan',
        text:
          pace > hi
            ? `${fmtPace(pace)} /km, just slower than the ${name} range (${rangeText}). Fine in the heat.`
            : `${fmtPace(pace)} /km, inside the ${name} range (${rangeText})`,
      });
    }
  } else {
    const target = s.type === 'race' ? GOAL.paceSec : plannedSec(s) / s.km;
    const tolSec = PACE_TOLERANCE[s.type] ?? 12;
    const diff = Math.round(pace - target);
    const avg = s.type === 'speed' ? ' average, warm-up and recoveries included' : ' average';
    if (Math.abs(diff) <= tolSec) {
      lines.push({
        key: 'pace',
        ok: true,
        tag: 'On plan',
        text: `${fmtPace(pace)} /km${avg}, close to the planned ${fmtPace(target)}`,
      });
    } else if (diff < 0) {
      lines.push({
        key: 'pace',
        ok: false,
        tag: 'Too fast',
        text: `${fmtPace(pace)} /km${avg}, ${-diff} s/km faster than the planned ${fmtPace(target)}`,
      });
    } else {
      lines.push({
        key: 'pace',
        ok: false,
        tag: 'Slow',
        text: `${fmtPace(pace)} /km${avg}, ${diff} s/km slower than the planned ${fmtPace(target)}`,
      });
    }
  }

  // Heart rate (only meaningful as an average on steady easy runs)
  const cap = HR_CAP[s.type];
  if (log.hr && cap) {
    lines.push(
      log.hr > cap
        ? { key: 'hr', ok: false, tag: 'HR high', text: `Average HR ${log.hr}, above the ${cap} cap for this run` }
        : { key: 'hr', ok: true, tag: 'On plan', text: `Average HR ${log.hr}, under the ${cap} cap` },
    );
  }

  const off = (key: LineKey, tag?: string) => lines.find((l) => l.key === key && !l.ok && (!tag || l.tag === tag));
  const onPlan = lines.every((l) => l.ok);
  const easyDay = !!zoneKey;
  const shortBy = s.km > 0 ? (s.km - log.km) / s.km : 0;

  let headline: string;
  if (s.type === 'race' && log.km >= 42) {
    headline =
      log.sec < GOAL.goalSec ? 'Under 3:50. That’s the goal, done.' : 'Race done. Rest, eat, and then we look at the splits.';
  } else if (onPlan) {
    headline = 'Right on plan.';
  } else if (off('distance', 'Short') && shortBy > 0.2) {
    headline = 'Cut short. One short run won’t matter. If it keeps happening, the plan may be asking too much.';
  } else if (easyDay && off('pace', 'Too fast')) {
    headline = 'Too quick for this run. Easy and long runs only build your base if they stay easy.';
  } else if (off('hr')) {
    headline = 'Heart rate ran high. Next time slow down until it settles, even if the pace feels slow.';
  } else if (easyDay && off('pace', 'Slow')) {
    headline = 'Slower than planned. Fine on a hot morning as long as your heart rate stayed easy.';
  } else if (off('pace', 'Too fast')) {
    headline = 'Faster than planned. Make sure the hard parts were controlled, not all-out.';
  } else if (off('pace', 'Slow')) {
    headline = 'Slower than planned. If it felt hard, run by effort and heart rate in the heat.';
  } else if (off('distance', 'Short')) {
    headline = 'A little short, but close enough.';
  } else {
    headline = 'Longer than planned. Keep any extra distance on easy days.';
  }

  return { onPlan, headline, tag: lines.find((l) => !l.ok)?.tag ?? 'On plan', lines };
}

// ───────────────────────────── Storage ─────────────────────────────

/** Keep only well-formed entries for real plan sessions. Used on load and on restore. */
export function sanitize(raw: unknown): LogBook {
  const out: LogBook = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isLoggable(SESSIONS.get(key)) || !v || typeof v !== 'object') continue;
    const e = v as Record<string, unknown>;
    const km = Number(e.km);
    const sec = Number(e.sec);
    if (!(km > 0 && km < 100 && sec > 0 && sec < 86_400)) continue;
    const entry: RunLog = { km, sec: Math.round(sec) };
    const hr = Number(e.hr);
    if (hr >= 60 && hr <= 230) entry.hr = Math.round(hr);
    if (e.feel === 'easy' || e.feel === 'ok' || e.feel === 'hard') entry.feel = e.feel;
    if (typeof e.notes === 'string' && e.notes.trim()) entry.notes = e.notes.trim().slice(0, 1000);
    out[key] = entry;
  }
  return out;
}

/** Older versions only stored "done" flags. Treat those as run as planned. */
export function fromDoneFlags(done: Record<string, unknown>): LogBook {
  const out: LogBook = {};
  for (const key of Object.keys(done)) {
    const s = SESSIONS.get(key);
    if (isLoggable(s)) out[key] = asPlanned(s);
  }
  return out;
}

// ───────────────────────────── Dashboard numbers ─────────────────────────────

/** Sessions that are due: everything before today, plus anything already logged. Oldest first. */
export function dueSessions(logs: LogBook, todayKey: string): Session[] {
  return [...SESSIONS.values()]
    .filter((s) => isLoggable(s) && s.date >= PLAN_START && (s.date < todayKey || !!logs[s.date]))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface WeekTotals {
  week: number;
  planned: number;
  run: number;
  runsPlanned: number;
  runsDone: number;
}

export function weeklyTotals(logs: LogBook): WeekTotals[] {
  const out: WeekTotals[] = WEEK_SUMMARIES.map((w) => ({
    week: w.week,
    planned: w.km,
    run: 0,
    runsPlanned: 0,
    runsDone: 0,
  }));
  for (const s of SESSIONS.values()) {
    if (!isLoggable(s) || s.week < 0) continue;
    const t = out[s.week];
    t.runsPlanned++;
    const l = logs[s.date];
    if (l) {
      t.runsDone++;
      t.run += l.km;
    }
  }
  for (const t of out) t.run = Math.round(t.run * 10) / 10;
  return out;
}

/** Distance-weighted average pace of logged base runs in the 28 days up to today. */
export function recentEasyPace(logs: LogBook, todayKey: string, fromKey28: string): number | null {
  let km = 0;
  let sec = 0;
  for (const [key, l] of Object.entries(logs)) {
    if (key > todayKey || key < fromKey28) continue;
    if (SESSIONS.get(key)?.type !== 'easy') continue;
    km += l.km;
    sec += l.sec;
  }
  return km ? sec / km : null;
}
