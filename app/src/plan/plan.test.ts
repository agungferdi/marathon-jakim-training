import { describe, expect, it } from 'vitest';
import { addDays, fromKey, toKey } from './dates';
import { BLOCK_START, PLAN_START, RACE_DATE, SESSIONS, TOTAL_WEEKS, WEEK_SUMMARIES, getSession, raceSplits } from './plan';

const planDays = () => [...SESSIONS.values()].filter((s) => s.type !== 'past');

describe('training block', () => {
  it('ends with the race on Sunday 13 June 2027', () => {
    const race = getSession(RACE_DATE)!;
    expect(race.type).toBe('race');
    expect(fromKey(RACE_DATE).getDay()).toBe(0);
    expect(race.week).toBe(TOTAL_WEEKS);
    expect(WEEK_SUMMARIES).toHaveLength(TOTAL_WEEKS + 1);
  });

  it('has a session for every day from the plan start to race day', () => {
    for (let d = fromKey(PLAN_START); toKey(d) <= RACE_DATE; d = addDays(d, 1)) {
      expect(getSession(toKey(d)), toKey(d)).toBeDefined();
    }
    expect(getSession(toKey(addDays(fromKey(RACE_DATE), 1)))).toBeUndefined();
  });

  it('week 1 starts on Monday 23 November 2026', () => {
    expect(WEEK_SUMMARIES[1].monday).toBe(BLOCK_START);
  });

  it('keeps Monday and Friday as rest days, and runs 5 days a week', () => {
    for (const s of planDays()) {
      const dow = fromKey(s.date).getDay();
      if (dow === 1 || dow === 5) expect(s.type, s.date).toBe('rest');
      else expect(s.type, s.date).not.toBe('rest');
    }
  });

  it('puts speed work on Wednesdays from week 1, and long runs on Sundays', () => {
    for (const s of planDays()) {
      const dow = fromKey(s.date).getDay();
      if (dow === 3 && s.week >= 1) expect(s.type, s.date).toBe('speed');
      if (dow === 0) expect(['lsd', 'tempoLong', 'test', 'race']).toContain(s.type);
    }
  });

  it('alternates LSD and tempo long runs every other week', () => {
    for (const w of WEEK_SUMMARIES.slice(1)) {
      const t = w.longRun.type;
      if (t === 'test' || t === 'race') continue;
      expect(t, `week ${w.week}`).toBe(w.week % 2 === 1 ? 'lsd' : 'tempoLong');
    }
  });

  it('builds the tempo long run to 30 km and never goes past 32 km', () => {
    const longs = WEEK_SUMMARIES.map((w) => w.longRun).filter((s) => s.type !== 'race');
    expect(Math.max(...longs.filter((s) => s.type === 'tempoLong').map((s) => s.km))).toBe(30);
    expect(Math.max(...longs.map((s) => s.km))).toBeLessThanOrEqual(32);
  });

  it('never raises weekly volume by more than 20% week to week', () => {
    for (let i = 2; i < WEEK_SUMMARIES.length - 1; i++) {
      const prev = WEEK_SUMMARIES[i - 1].km;
      const cur = WEEK_SUMMARIES[i].km;
      // after a lighter week, compare against the last normal week instead
      const ref = WEEK_SUMMARIES[i - 1].down ? WEEK_SUMMARIES[i - 2].km : prev;
      expect(cur / ref, `week ${i}: ${ref} -> ${cur}`).toBeLessThanOrEqual(1.2);
    }
  });

  it('race plan finishes under 3:50 with a buffer', () => {
    const finish = raceSplits().at(-1)!.sec;
    expect(finish).toBeLessThan(3 * 3600 + 50 * 60 - 60);
    expect(finish).toBeGreaterThan(3 * 3600 + 45 * 60);
  });

  it('prints the weekly volume', () => {
    const rows = WEEK_SUMMARIES.map(
      (w) => `W${String(w.week).padStart(2)} ${w.monday} ${w.phase.padEnd(9)} ${String(w.km).padStart(5)} km  long: ${w.longRun.title}`,
    );
    console.log(rows.join('\n'));
  });
});
