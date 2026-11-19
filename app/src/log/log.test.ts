import { describe, expect, it } from 'vitest';
import { SESSIONS, type Session } from '../plan/plan';
import {
  asPlanned,
  checkRun,
  dueSessions,
  fmtKm,
  fromDoneFlags,
  parseRange,
  plannedSec,
  recentEasyPace,
  sanitize,
  weeklyTotals,
} from './log';

const all = [...SESSIONS.values()];
const first = (type: Session['type'], from = '2026-11-18') => all.find((s) => s.type === type && s.date >= from)!;

describe('run log', () => {
  it('parses pace ranges', () => {
    expect(parseRange('6:10–6:40')).toEqual([370, 400]);
    expect(parseRange('about mile pace')).toBeNull();
  });

  it('formats distance without trailing zeros', () => {
    expect(fmtKm(10)).toBe('10');
    expect(fmtKm(10.2)).toBe('10.2');
    expect(fmtKm(10.25)).toBe('10.25');
    expect(fmtKm(10.199999)).toBe('10.2');
  });

  it('a run logged exactly as planned is on plan, for every session in the block', () => {
    for (const s of all) {
      if (s.type === 'rest' || s.type === 'past' || s.type === 'race') continue;
      const c = checkRun(s, asPlanned(s));
      expect(c.onPlan, `${s.date} ${s.title}: ${c.lines.map((l) => l.text).join(' / ')}`).toBe(true);
    }
  });

  it('flags an easy run that was too fast, with the reason', () => {
    const s = first('easy');
    const c = checkRun(s, { km: s.km, sec: Math.round(s.km * 330) }); // 5:30/km
    expect(c.onPlan).toBe(false);
    expect(c.tag).toBe('Too fast');
    expect(c.headline).toMatch(/easy/i);
  });

  it('allows easy runs to drift a little slower in the heat', () => {
    const s = first('easy');
    const hi = parseRange('6:10–6:40')![1];
    expect(checkRun(s, { km: s.km, sec: Math.round(s.km * (hi + 10)) }).onPlan).toBe(true);
    expect(checkRun(s, { km: s.km, sec: Math.round(s.km * (hi + 30)) }).tag).toBe('Slow');
  });

  it('flags short runs and a high heart rate', () => {
    const s = first('lsd');
    const short = checkRun(s, { km: s.km * 0.6, sec: Math.round(s.km * 0.6 * 380) });
    expect(short.tag).toBe('Short');
    expect(short.headline).toMatch(/cut short/i);
    const hr = checkRun(s, { ...asPlanned(s), hr: 168 });
    expect(hr.onPlan).toBe(false);
    expect(hr.lines.find((l) => l.key === 'hr')?.ok).toBe(false);
  });

  it('judges the race against 3:50', () => {
    const race = first('race');
    expect(checkRun(race, { km: 42.4, sec: 3 * 3600 + 48 * 60 }).headline).toMatch(/under 3:50/i);
    expect(checkRun(race, { km: 42.4, sec: 3 * 3600 + 58 * 60 }).headline).not.toMatch(/under 3:50/i);
  });

  it('planned time is whole minutes except on race day', () => {
    expect(plannedSec(first('easy')) % 60).toBe(0);
    expect(plannedSec(first('race'))).toBe(3 * 3600 + 48 * 60 + 7);
  });

  it('keeps only valid entries for real sessions', () => {
    const s = first('easy');
    const out = sanitize({
      [s.date]: { km: '10.2', sec: 3870, hr: 152, feel: 'easy', notes: '  humid  ' },
      '2026-11-23': { km: 8, sec: 2900 }, // a Monday rest day
      '2030-01-01': { km: 8, sec: 2900 },
      [first('speed').date]: { km: -1, sec: 10 },
    });
    expect(out).toEqual({ [s.date]: { km: 10.2, sec: 3870, hr: 152, feel: 'easy', notes: 'humid' } });
  });

  it('turns old done flags into as-planned runs', () => {
    const s = first('speed');
    expect(fromDoneFlags({ [s.date]: true, '2026-11-23': true })).toEqual({ [s.date]: asPlanned(s) });
  });

  it('counts due runs, weekly totals and recent base-run pace', () => {
    const tue = '2026-11-24';
    const wed = '2026-11-25';
    const logs = { [tue]: { km: 8, sec: 8 * 380 }, [wed]: { km: 9, sec: 9 * 330 } };
    const due = dueSessions(logs, '2026-11-25');
    expect(due.at(-1)!.date).toBe(wed); // logged today counts
    expect(due.every((s) => s.type !== 'rest')).toBe(true);
    const w1 = weeklyTotals(logs)[1];
    expect(w1.run).toBe(17);
    expect(w1.runsDone).toBe(2);
    expect(w1.runsPlanned).toBe(5);
    expect(recentEasyPace(logs, '2026-11-25', '2026-10-29')).toBe(380);
  });
});
