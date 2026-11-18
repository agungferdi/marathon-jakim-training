import { addDays, fromKey, toKey } from './dates';
import { ZONES, type PaceSet, type ZoneKey } from './zones';

// ───────────────────────────── Types ─────────────────────────────

export type SessionType = 'rest' | 'easy' | 'speed' | 'lsd' | 'tempoLong' | 'test' | 'race' | 'past';

export type PhaseKey = 'leadin' | 'rebuild' | 'base' | 'build' | 'specific' | 'taper';

export interface Segment {
  label: string;
  km: number;
  zone: ZoneKey;
  detail?: string;
  /** Repeated efforts: distances of each rep, with `off` km of recovery between. */
  reps?: { on: number[]; off: number; offZone?: ZoneKey };
  /** Strides: number of strides (each ≈ 0.1 km). */
  count?: number;
  /** Overrides the zone's pace text (race-day segments). */
  paceText?: string;
  /** Overrides the zone's sec/km (race-day segments). */
  secPerKm?: number;
}

export interface Session {
  date: string;
  week: number;
  phase: PhaseKey | null;
  type: SessionType;
  /** Label shown in a calendar square. */
  short: string;
  title: string;
  km: number;
  minutes: number;
  segments: Segment[];
  purpose: string;
  notes: string[];
  paceSet: PaceSet;
  stats?: { label: string; value: string }[];
  splits?: { at: string; clock: string; pace: string }[];
}

type Draft = Pick<Session, 'type' | 'short' | 'title' | 'segments' | 'purpose'> & {
  notes?: string[];
  stats?: Session['stats'];
  /** Use this km instead of summing segments (past races). */
  kmOverride?: number;
  minutesOverride?: number;
};

export interface Phase {
  key: PhaseKey;
  name: string;
  blurb: string;
}

export const PHASES: Record<PhaseKey, Phase> = {
  leadin: {
    key: 'leadin',
    name: 'Lead-in',
    blurb: 'Three and a half weeks after JRF. Short easy runs only, getting back into the five-day rhythm.',
  },
  rebuild: {
    key: 'rebuild',
    name: 'Rebuild',
    blurb:
      'Five runs a week, mostly easy. Strides, fartlek and hills wake your legs up. Long runs climb back to 18 km.',
  },
  base: {
    key: 'base',
    name: 'Base',
    blurb:
      'Aerobic volume grows. The first proper intervals and tempos arrive, and every second long run gets a block at race pace.',
  },
  build: {
    key: 'build',
    name: 'Build',
    blurb:
      'Tempo runs get longer and Thursday becomes a medium-long run. Long runs reach 30 km. Ramadan falls in this phase.',
  },
  specific: {
    key: 'specific',
    name: 'Race-specific',
    blurb:
      'The biggest weeks. Race-pace blocks grow to 20–22 km inside 28–30 km tempo long runs. Half-marathon test on 11 April.',
  },
  taper: {
    key: 'taper',
    name: 'Taper',
    blurb: 'Volume drops about 25%, then 40%, but you keep some speed. Arrive at Monas fresh, not rusty.',
  },
};

// ───────────────────────────── Key dates ─────────────────────────────

export const PLAN_START = '2026-11-18';
export const BLOCK_START = '2026-11-23'; // week 1
export const RACE_DATE = '2027-06-13';
const WEEK0_MONDAY = new Date(2026, 10, 16);
export const TOTAL_WEEKS = 29;

/** Approximate. Exact start depends on the moon sighting. */
const RAMADAN = { from: '2027-02-08', to: '2027-03-09' };

// ───────────────────────────── Builders ─────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const times = (n: number, km: number) => Array<number>(n).fill(km);

const seg = (label: string, km: number, zone: ZoneKey, detail?: string): Segment => ({ label, km, zone, detail });

const wu = (km: number) => seg('Warm-up', km, 'easy', 'Easy jog, then 2–3 min of leg swings and drills.');
const cd = (km: number) => seg('Cool-down', km, 'easy', 'Easy jog. Let your HR come right down.');

const strides = (n: number): Segment => ({
  label: `${n} × 20 s strides`,
  km: r2(n * 0.1),
  zone: 'strides',
  count: n,
  detail: 'Quick, tall and relaxed. Not a sprint. Walk or jog back to full recovery.',
});

const reps = (label: string, on: number[], off: number, zone: ZoneKey, detail: string, offZone?: ZoneKey): Segment => ({
  label,
  km: r2(sum(on) + (on.length - 1) * off),
  zone,
  detail,
  reps: { on, off, offZone },
});

// ── Base runs (Tue / Thu / Sat)

const easy = (km: number, opts: { strides?: number; day?: 'tue' | 'thu' | 'sat' } = {}): Draft => {
  const n = opts.strides ?? 0;
  const segments: Segment[] = [seg('Easy running', r2(km - n * 0.1), 'easy')];
  if (n) segments.push(strides(n));

  const mediumLong = opts.day === 'thu' && km >= 11;
  let purpose: string;
  if (mediumLong) {
    purpose =
      'Your second-longest run of the week. It extends endurance without the cost of a long run, and it’s a big part of why km 30–42 will feel different this time.';
  } else if (opts.day === 'sat') {
    purpose = 'Short and easy, the day before the long run. Loosen up. Don’t add fatigue.';
  } else {
    purpose =
      'Aerobic base. Easy running builds the engine (capillaries, mitochondria, fat-burning) that stops the fade you had at km 33. Easy days are what make the hard days possible.';
  }
  if (n) purpose += ' The strides at the end keep your legs quick without costing recovery.';

  return {
    type: 'easy',
    short: mediumLong ? 'Medium-long' : 'Base',
    title: mediumLong ? `Medium-long base run, ${km} km` : `Base run, ${km} km`,
    segments,
    purpose,
  };
};

// ── Wednesday speed sessions

const speed = (short: string, title: string, purpose: string, segments: Segment[], notes: string[] = []): Draft => ({
  type: 'speed',
  short,
  title,
  purpose,
  segments,
  notes,
});

const P_INTERVAL =
  'Intervals raise your VO₂max, the ceiling of your aerobic engine. A higher ceiling makes 5:27/km a smaller fraction of your maximum, so it feels easier for longer.';
const P_TEMPO =
  'Threshold running pushes back the point where lactate builds up faster than you can clear it. This is the single most useful speed session for a marathoner.';
const P_HILLS =
  'Hills build power in your calves, glutes and hips with less pounding than flat speedwork. That strength holds your stride together late in the race.';
const P_FARTLEK =
  'Unstructured speed. It reintroduces faster running gently and teaches you to change gear and recover while still moving.';
const P_REPS =
  'Short, fast reps with full recovery. They sharpen running economy and form, so race pace costs less energy.';

// ── Sunday long runs

const LONG_FUEL =
  'Fuel like race day: a gel (or ~25 g of carbs) every 30–35 min from minute 40, with water. Your gut needs training as much as your legs.';
const HEAT =
  'Start by 05:00 to beat the heat. On a hot, humid morning, go by HR, not pace. Slowing down is correct, not a failure.';

const lsd = (km: number, title?: string): Draft => {
  const notes = [HEAT];
  if (km >= 20) notes.push(LONG_FUEL, 'Plan a loop past water every 5–6 km, or carry a bottle.');
  return {
    type: 'lsd',
    short: 'LSD',
    title: title ?? `Long slow distance, ${km} km`,
    segments: [seg('Easy long run', km, 'long', 'Even and patient from the first km to the last.')],
    purpose:
      km >= 28
        ? 'Time on your feet at an easy effort. Runs this long teach your muscles to burn fat and spare glycogen, and that is what holds off the wall at km 30–35.'
        : 'The backbone of marathon fitness: more capillaries, more mitochondria, better fat-burning, and tougher legs and tendons. Slow is the point.',
    notes,
  };
};

const tlr = (segments: Segment[], extraNotes: string[] = [], titleSuffix = ''): Draft => {
  const km = r2(sum(segments.map((s) => s.km)));
  const mpKm = sum(
    segments.filter((s) => s.zone === 'mp').map((s) => (s.reps ? sum(s.reps.on) : s.km)),
  );
  return {
    type: 'tempoLong',
    short: 'Tempo long',
    title: `Tempo long run, ${km} km${titleSuffix}`,
    segments,
    purpose: `${mpKm} km at goal marathon pace inside a long run. It teaches your body and brain exactly what 5:27/km feels like on tired legs, so on race day the pace is a habit, not a guess.`,
    notes: [
      'Treat it as a race rehearsal: the same shoes, breakfast and gels you’ll use on 13 June.',
      'The marathon-pace target is 5:20–5:27 on the watch with HR 165–175. If HR climbs past 178 in the heat, ease off. HR is the ceiling, not pace.',
      'Don’t race it. Finishing like you could have done more is the goal.',
      LONG_FUEL,
      ...extraNotes,
    ],
  };
};

const mpRun = (label: string, km: number) => seg(label, km, 'mp', 'Goal race pace. Smooth, relaxed, metronomic.');
const longEasy = (label: string, km: number) => seg(label, km, 'long');

// ── Rest days

const STRENGTH =
  'Optional 20–25 min of strength and mobility: 3 × 12 squats, 3 × 10 lunges per leg, 3 × 15 single-leg calf raises, 3 × 12 glute bridges, 3 × 40 s plank. Strong hips and calves keep your form together after km 30.';

const monday = (phase: PhaseKey): Draft => ({
  type: 'rest',
  short: 'Rest',
  title: 'Rest day',
  segments: [],
  purpose: 'No running. Recovery is when Sunday’s long run actually turns into fitness.',
  notes:
    phase === 'taper'
      ? ['Gentle mobility only this phase: 10–15 min of stretching or foam rolling. No new exercises.']
      : [STRENGTH],
});

const friday = (): Draft => ({
  type: 'rest',
  short: 'Rest',
  title: 'Rest day',
  segments: [],
  purpose: 'Full rest before the weekend. Sleep 7–8 hours, drink well and eat normally, with carbs.',
  notes: ['Saturday is short and easy, and Sunday is the key run of the week. Arrive at both rested.'],
});

// ── Race day

interface PacingBlock {
  fromKm: number;
  toKm: number;
  sec: number;
  label: string;
  detail: string;
}

export const RACE_PACING: PacingBlock[] = [
  {
    fromKm: 0,
    toKm: 5,
    sec: 332,
    label: 'Km 0–5: settle in',
    detail: 'Let people go. Keep HR under 170. At JRF you averaged 189 here, and that decided the race.',
  },
  {
    fromKm: 5,
    toKm: 30,
    sec: 325,
    label: 'Km 5–30: lock in',
    detail: 'Metronome. Water at every station, and pour some on your head and neck.',
  },
  {
    fromKm: 30,
    toKm: 42.195,
    sec: 320,
    label: 'Km 30–finish: race',
    detail: 'If you feel good, squeeze down to 5:15–5:20. If not, just hold 5:27. This is where the training shows.',
  },
];

const CHECKPOINTS = [5, 10, 15, 20, 21.0975, 25, 30, 35, 40, 42.195];

export function raceSplits() {
  return CHECKPOINTS.map((at) => {
    let t = 0;
    for (const b of RACE_PACING) {
      const km = Math.max(0, Math.min(at, b.toKm) - b.fromKm);
      t += km * b.sec;
    }
    const block = RACE_PACING.find((b) => at > b.fromKm && at <= b.toKm)!;
    return { at, sec: t, paceSec: block.sec };
  });
}

function raceDay(): Draft {
  return {
    type: 'race',
    short: 'JAKIM',
    title: 'Jakarta International Marathon',
    segments: RACE_PACING.map((b) => ({
      label: b.label,
      km: r2(b.toKm - b.fromKm),
      zone: 'mp' as const,
      detail: b.detail,
      secPerKm: b.sec,
      paceText: `${Math.floor(b.sec / 60)}:${String(b.sec % 60).padStart(2, '0')} /km`,
    })),
    purpose:
      'Sub 3:50. The plan below finishes around 3:48 on the official distance, giving you a 2-minute buffer for heat, crowds and water stations.',
    notes: [
      'Pace by the official km markers, not your watch. Your watch read 43.0 km at JRF, so its pace will flatter you by about 5 s/km.',
      'Gels: one every 30–35 min from minute 35, about 7 in total, always with water.',
      'Night before: carb-heavy dinner by 19:00, kit laid out, bib pinned, in bed by 21:00.',
      'Race morning: up at 02:30, breakfast by 02:45 (about 100 g carbs: rice or bread, banana, honey), at Monas by 03:15. Check the official 2027 flag-off time once it’s published.',
      'Nothing new on race day: no new shoes, gels or breakfast.',
    ],
  };
}

// ───────────────────────────── The block ─────────────────────────────

interface WeekDef {
  phase: PhaseKey;
  focus: string;
  down?: boolean;
  tue: Draft | null;
  wed: Draft;
  thu: Draft;
  sat: Draft;
  sun: Draft;
}

const WEEKS: WeekDef[] = [
  // ── Week 0: lead-in (starts Wed 18 Nov)
  {
    phase: 'leadin',
    focus: 'Easy running only. Get the legs moving again.',
    tue: null,
    wed: { ...easy(6, { strides: 4 }), short: 'Base + strides' },
    thu: easy(6, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(12, 'Easy long run, 12 km'),
  },
  // ── Rebuild
  {
    phase: 'rebuild',
    focus: 'Five runs, all controlled. Strides return.',
    tue: easy(6),
    wed: speed('Strides', 'Easy run + strides', 'A gentle first speed day. Strides wake up fast-twitch fibres and good form without any real fatigue.', [
      seg('Easy running', 5.4, 'easy'),
      strides(6),
      cd(0.6),
    ]),
    thu: easy(7, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(14),
  },
  {
    phase: 'rebuild',
    focus: 'First fartlek. First race-pace taste in the long run.',
    tue: easy(7, { strides: 4 }),
    wed: speed('Fartlek', 'Fartlek, 8 × 1 min', P_FARTLEK, [
      wu(2.5),
      reps('8 × 1 min hard / 1 min easy', times(8, 0.22), 0.15, 'interval', 'Hard means about 5K effort. The easy minute is a jog, not a walk.'),
      cd(2.5),
    ]),
    thu: easy(7, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 11), mpRun('Last 5 km at marathon pace', 5)]),
  },
  {
    phase: 'rebuild',
    focus: 'Hill strength. Long run to 18 km.',
    tue: easy(7),
    wed: speed('Hills', 'Hill repeats, 8 × 30 s', P_HILLS, [
      wu(3),
      reps('8 × 30 s uphill', times(8, 0.12), 0.12, 'hills', 'Strong drive up, jog slowly back down. Flyover ramps work well in Jakarta.'),
      cd(3),
    ]),
    thu: easy(8, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(18),
  },
  // ── Base
  {
    phase: 'base',
    focus: 'First real intervals. Race pace in two blocks on Sunday.',
    tue: easy(7, { strides: 4 }),
    wed: speed('Intervals', 'Intervals, 5 × 800 m', P_INTERVAL, [
      wu(2.5),
      reps('5 × 800 m at interval pace', times(5, 0.8), 0.4, 'interval', '400 m jog between reps.'),
      cd(2.5),
    ]),
    thu: easy(7, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([
      longEasy('Easy', 6),
      reps('2 × 4 km at marathon pace', [4, 4], 1, 'mp', '1 km easy between blocks.', 'long'),
      longEasy('Easy', 3),
    ]),
  },
  {
    phase: 'base',
    focus: 'First tempo. Long run to 20 km.',
    tue: easy(8),
    wed: speed('Tempo', 'Tempo, 2 × 3 km', P_TEMPO, [
      wu(2.5),
      reps('2 × 3 km at threshold', [3, 3], 0.5, 'threshold', '3 min easy jog between.'),
      cd(2),
    ]),
    thu: easy(9, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(20),
  },
  {
    phase: 'base',
    focus: 'Intervals with strides. 8 km at race pace on Sunday.',
    tue: easy(8, { strides: 6 }),
    wed: speed('Intervals', 'Intervals + strides, 5 × 1 km', P_INTERVAL + ' The strides afterwards practise fast, relaxed form on tired legs.', [
      wu(2.5),
      reps('5 × 1 km at interval pace', times(5, 1), 0.35, 'interval', '2 min jog between reps.'),
      strides(4),
      cd(2),
    ]),
    thu: easy(9, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 8), mpRun('Marathon pace', 8), longEasy('Easy', 4)]),
  },
  {
    phase: 'base',
    focus: 'Continuous tempo. Long run to 22 km.',
    tue: easy(8),
    wed: speed('Tempo', 'Continuous tempo, 6 km', P_TEMPO, [wu(3), seg('6 km at threshold', 6, 'threshold', 'One steady block. Even effort the whole way.'), cd(2)]),
    thu: easy(10, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(22),
  },
  {
    phase: 'base',
    focus: 'Lighter week. Fast 400s for form.',
    down: true,
    tue: easy(7),
    wed: speed('Reps + strides', 'Speed reps, 8 × 400 m', P_REPS, [
      wu(2.5),
      reps('8 × 400 m at repetition pace', times(8, 0.4), 0.4, 'rep', '400 m easy jog between. Full recovery.'),
      strides(4),
      cd(1.5),
    ]),
    thu: easy(8, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([
      longEasy('Easy', 6),
      reps('3 × 3 km at marathon pace', [3, 3, 3], 1, 'mp', '1 km easy between blocks.', 'long'),
      longEasy('Easy', 2),
    ]),
  },
  {
    phase: 'base',
    focus: 'Cruise intervals. Long run to 24 km.',
    tue: easy(9, { strides: 6 }),
    wed: speed('Tempo', 'Cruise intervals, 3 × 3 km', P_TEMPO + ' Breaking it into blocks lets you run more total time at threshold.', [
      wu(2),
      reps('3 × 3 km at threshold', [3, 3, 3], 0.35, 'threshold', '2 min jog between.'),
      cd(1.5),
    ]),
    thu: easy(10, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(24),
  },
  // ── Build
  {
    phase: 'build',
    focus: 'Paces step up from this week. 12 km at race pace.',
    tue: easy(9),
    wed: speed('Intervals', 'Intervals, 5 × 1.2 km', P_INTERVAL, [
      wu(2.5),
      reps('5 × 1.2 km at interval pace', times(5, 1.2), 0.4, 'interval', '2.5 min jog between reps.'),
      cd(2),
    ]),
    thu: easy(11, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 8), mpRun('Marathon pace', 12), longEasy('Easy', 2)]),
  },
  {
    phase: 'build',
    focus: 'Steady 8 km at half-marathon pace. Long run to 26 km.',
    tue: easy(9, { strides: 6 }),
    wed: speed('Tempo', 'Steady tempo, 8 km at half-marathon pace', 'A long, controlled effort just under threshold. It builds the ability to hold a strong rhythm for a long time.', [
      wu(2.5),
      seg('8 km at half-marathon pace', 8, 'hmp', 'Settle into it. The last 2 km should feel the same as the first 2.'),
      cd(2),
    ]),
    thu: easy(12, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(26),
  },
  {
    phase: 'build',
    focus: 'Lighter week. Ramadan likely starts.',
    down: true,
    tue: easy(8),
    wed: speed('Fartlek', 'Fartlek, 10 × 1 min + strides', P_FARTLEK, [
      wu(2),
      reps('10 × 1 min hard / 1 min easy', times(10, 0.22), 0.15, 'interval', 'Hard is about 5K effort. Keep moving in the easy minute.'),
      strides(4),
      cd(2),
    ]),
    thu: easy(9, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 6), mpRun('Marathon pace', 10), longEasy('Easy', 2)]),
  },
  {
    phase: 'build',
    focus: 'Intervals with strides. Long run 26 km.',
    tue: easy(9, { strides: 6 }),
    wed: speed('Intervals', 'Intervals + strides, 6 × 1 km', P_INTERVAL, [
      wu(2.5),
      reps('6 × 1 km at interval pace', times(6, 1), 0.35, 'interval', '2 min jog between reps.'),
      strides(4),
      cd(2),
    ]),
    thu: easy(12, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(26),
  },
  {
    phase: 'build',
    focus: 'Two long tempo blocks. 14 km at race pace.',
    tue: easy(10),
    wed: speed('Tempo', 'Tempo, 2 × 4 km', P_TEMPO, [
      wu(2.5),
      reps('2 × 4 km at threshold', [4, 4], 0.5, 'threshold', '3 min easy jog between.'),
      cd(2),
    ]),
    thu: easy(12, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 8), mpRun('Marathon pace', 14), longEasy('Easy', 2)]),
  },
  {
    phase: 'build',
    focus: 'Ladder intervals. Long run to 28 km.',
    tue: easy(10, { strides: 6 }),
    wed: speed('Intervals', 'Ladder, 400 to 1,600 m and back', P_INTERVAL + ' The ladder keeps it mentally fresh.', [
      wu(2.5),
      reps('400–800–1200–1600–1200–800–400 m', [0.4, 0.8, 1.2, 1.6, 1.2, 0.8, 0.4], 0.4, 'interval', '400 m jog between every rep.'),
      cd(2),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(28),
  },
  {
    phase: 'build',
    focus: 'Lighter week. Hills and 14 km at race pace in two blocks.',
    down: true,
    tue: easy(8),
    wed: speed('Hills', 'Hill repeats, 10 × 45 s', P_HILLS, [
      wu(3),
      reps('10 × 45 s uphill', times(10, 0.18), 0.18, 'hills', 'Strong drive up, slow jog down.'),
      strides(4),
      cd(2),
    ]),
    thu: easy(10, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([
      longEasy('Easy', 6),
      reps('2 × 7 km at marathon pace', [7, 7], 1, 'mp', '1 km easy between blocks.', 'long'),
      longEasy('Easy', 1),
    ]),
  },
  {
    phase: 'build',
    focus: 'Race pace into threshold. First 30 km run.',
    tue: easy(10, { strides: 6 }),
    wed: speed('MP + tempo', 'Marathon pace into tempo, 6 + 3 km', 'Marathon pace straight into threshold. It teaches you to lift the pace when you’re already tired, which is exactly what km 30+ asks of you.', [
      wu(2),
      mpRun('6 km at marathon pace', 6),
      seg('Float', 0.4, 'recovery', '2 min easy jog.'),
      seg('3 km at threshold', 3, 'threshold'),
      cd(1.5),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(30),
  },
  // ── Race-specific
  {
    phase: 'specific',
    focus: '18 km at race pace on Sunday. The real work starts.',
    tue: easy(10),
    wed: speed('Intervals', 'Intervals + strides, 5 × 1.2 km', P_INTERVAL, [
      wu(2.5),
      reps('5 × 1.2 km at interval pace', times(5, 1.2), 0.4, 'interval', '2.5 min jog between reps.'),
      strides(6),
      cd(2),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 6), mpRun('Marathon pace', 18), longEasy('Easy', 2)]),
  },
  {
    phase: 'specific',
    focus: '10 km at half-marathon pace. 30 km long run.',
    tue: easy(10, { strides: 6 }),
    wed: speed('Tempo', 'Tempo, 10 km at half-marathon pace', 'Your longest sustained hard effort. It builds the strength to hold race pace comfortably.', [
      wu(2),
      seg('10 km at half-marathon pace', 10, 'hmp', 'Even effort. No surges.'),
      cd(1.5),
    ]),
    thu: easy(14, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(30),
  },
  {
    phase: 'specific',
    focus: 'Lighter week, ending with the half-marathon test.',
    down: true,
    tue: easy(8),
    wed: speed('Reps + strides', 'Sharpener, 6 × 400 m', P_REPS + ' Kept short so you’re fresh for Sunday’s test.', [
      wu(2.5),
      reps('6 × 400 m at repetition pace', times(6, 0.4), 0.4, 'rep', '400 m easy jog between.'),
      strides(4),
      cd(1.5),
    ]),
    thu: easy(10, { day: 'thu' }),
    sat: { ...easy(4, { strides: 4, day: 'sat' }), title: 'Shakeout, 4 km', purpose: 'Just enough to feel loose for tomorrow’s test.' },
    sun: {
      type: 'test',
      short: 'HM test',
      title: 'Half-marathon test',
      segments: [
        wu(3),
        seg('21.1 km at race effort', 21.1, 'hmp', 'Start at 5:12, settle at 5:05–5:10, and race the last 5 km.'),
        cd(1),
      ],
      purpose:
        'A checkpoint. A local half marathon is ideal; a solo time trial on a flat loop works too. The result tells us whether sub 3:50 is on track or should be adjusted.',
      notes: [
        '1:47–1:49: right on track for sub 3:50.',
        'Under 1:46: you’re ahead of schedule, and 3:45 becomes a real conversation.',
        'Over 1:51: keep 3:50 as the goal, but plan to start the marathon at 5:30 and be patient.',
        'Pace the first 3 km more slowly than you want to. At Malioboro you went out at 4:25 and paid for it from km 7.',
        HEAT,
      ],
    },
  },
  {
    phase: 'specific',
    focus: 'Long cruise intervals. 32 km long run.',
    tue: easy(10, { strides: 6 }),
    wed: speed('Tempo', 'Cruise intervals, 4 × 2.5 km', P_TEMPO, [
      wu(2),
      reps('4 × 2.5 km at threshold', times(4, 2.5), 0.35, 'threshold', '2 min jog between.'),
      cd(1.5),
    ]),
    thu: easy(14, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: lsd(32),
  },
  {
    phase: 'specific',
    focus: '20 km at race pace inside 28 km.',
    tue: easy(10),
    wed: speed('Intervals', 'Intervals, 6 × 1 km', P_INTERVAL, [
      wu(2.5),
      reps('6 × 1 km at interval pace', times(6, 1), 0.35, 'interval', '2 min jog between reps.'),
      cd(2),
    ]),
    thu: easy(14, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 6), mpRun('Marathon pace', 20), longEasy('Easy', 2)]),
  },
  {
    phase: 'specific',
    focus: 'Peak volume week. Two 5 km tempos, 32 km long run.',
    tue: easy(10, { strides: 6 }),
    wed: speed('Tempo', 'Tempo, 2 × 5 km', P_TEMPO, [
      wu(2),
      reps('2 × 5 km at threshold', [5, 5], 0.5, 'threshold', '3 min easy jog between.'),
      cd(1.5),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(7, { day: 'sat' }),
    sun: lsd(32),
  },
  {
    phase: 'specific',
    focus: 'The 30 km tempo long run: first dress rehearsal.',
    tue: easy(10),
    wed: speed('Intervals', 'Intervals + strides, 5 × 1 km', P_INTERVAL + ' Kept moderate so Sunday gets your best.', [
      wu(2.5),
      reps('5 × 1 km at interval pace', times(5, 1), 0.35, 'interval', '2 min jog between reps.'),
      strides(4),
      cd(2),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr(
      [longEasy('Easy', 5), mpRun('Marathon pace', 22), longEasy('Easy', 3)],
      ['Dress rehearsal: wake at 02:30, eat your race breakfast, start at 04:00 like race day.'],
      ', dress rehearsal 1',
    ),
  },
  {
    phase: 'specific',
    focus: 'Absorb. A lighter week before the last big session.',
    down: true,
    tue: easy(8, { strides: 6 }),
    wed: speed('Tempo', 'Continuous tempo, 7 km', P_TEMPO, [wu(2.5), seg('7 km at threshold', 7, 'threshold'), cd(2)]),
    thu: easy(10, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(24),
  },
  {
    phase: 'specific',
    focus: 'Last big session: 30 km with 20 km at race pace.',
    tue: easy(10),
    wed: speed('Intervals', 'Intervals + strides, 4 × 1.2 km', P_INTERVAL, [
      wu(2.5),
      reps('4 × 1.2 km at interval pace', times(4, 1.2), 0.4, 'interval', '2.5 min jog between reps.'),
      strides(6),
      cd(2),
    ]),
    thu: easy(13, { day: 'thu' }),
    sat: easy(6, { day: 'sat' }),
    sun: tlr(
      [longEasy('Easy', 8), mpRun('Marathon pace', 20), longEasy('Easy', 2)],
      ['Final dress rehearsal. After this, the hard work is done. The taper is where it pays off.'],
      ', dress rehearsal 2',
    ),
  },
  // ── Taper
  {
    phase: 'taper',
    focus: 'Volume down about 25%. Keep the intensity.',
    tue: easy(9, { strides: 6 }),
    wed: speed('Tempo', 'Tempo, 2 × 3 km', P_TEMPO + ' In the taper it keeps you sharp without adding fatigue.', [
      wu(2.5),
      reps('2 × 3 km at threshold', [3, 3], 0.5, 'threshold', '3 min easy jog between.'),
      cd(2),
    ]),
    thu: easy(10, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: lsd(22),
  },
  {
    phase: 'taper',
    focus: 'Volume down about 40%. Race pace stays familiar.',
    tue: easy(8),
    wed: speed('MP rehearsal', 'Race-pace rehearsal, 3 × 2 km', 'Locks in the feel of 5:27/km while you freshen up.', [
      wu(2),
      reps('3 × 2 km at marathon pace', [2, 2, 2], 0.5, 'mp', '3 min easy jog between.'),
      strides(4),
      cd(1.5),
    ]),
    thu: easy(8, { day: 'thu' }),
    sat: easy(5, { day: 'sat' }),
    sun: tlr([longEasy('Easy', 6), mpRun('Marathon pace', 8), longEasy('Easy', 2)], [
      'The legs may feel flat this week. That’s normal in a taper. Trust the 29 weeks behind you.',
    ]),
  },
  {
    phase: 'taper',
    focus: 'Race week. Sleep, carbs, calm.',
    tue: easy(6, { strides: 4 }),
    wed: speed('MP rehearsal', 'Race-week tune-up', 'A short reminder of race pace. Nothing more.', [
      wu(2),
      mpRun('3 km at marathon pace', 3),
      strides(4),
      cd(1.5),
    ]),
    thu: easy(5, { day: 'thu' }),
    sat: {
      ...easy(3, { strides: 4, day: 'sat' }),
      title: 'Shakeout, 3 km',
      purpose: 'Loosen up the day before. Then feet up, pin your bib, and eat a carb-heavy dinner early.',
    },
    sun: raceDay(),
  },
];

// ── Past races (from the GPX files)

const PAST: Record<string, Draft> = {
  '2026-10-04': {
    type: 'past',
    short: 'HM 1:52',
    title: 'HM Malioboro Run 2026',
    segments: [],
    kmOverride: 21.46,
    minutesOverride: 112.6,
    purpose:
      'Your current fitness marker. 1:52:34 predicts about 3:55 for the marathon, so sub 3:50 needs better pacing plus a little more fitness. That’s realistic in 29 weeks.',
    stats: [
      { label: 'Time', value: '1:52:34' },
      { label: 'Avg pace', value: '5:15 /km' },
      { label: 'Avg HR', value: '179' },
      { label: 'Max HR', value: '196' },
      { label: 'First 10 km', value: '50:40' },
      { label: 'Start temperature', value: '29 °C' },
    ],
    notes: [
      'Went out at 4:25 and 4:32 for the first 2 km, with HR above 190 from km 3.',
      'Faded to 5:20–5:40 from km 7, then a strong finish (4:58 at km 18, 4:44 for the last 0.46 km).',
      'Max HR 196 here is what the training zones are built from.',
    ],
  },
  '2026-10-25': {
    type: 'past',
    short: 'FM 4:06',
    title: 'JRF 2026 Marathon',
    segments: [],
    kmOverride: 43.02,
    minutesOverride: 246.9,
    purpose:
      'The race this plan is built to fix. The first 10 km were as fast as your half marathon, and the bill came at km 33.',
    stats: [
      { label: 'Time', value: '4:06:52' },
      { label: 'Avg pace', value: '5:46 /km' },
      { label: 'Avg HR', value: '175' },
      { label: 'Max HR', value: '192' },
      { label: 'First 21 km', value: '≈ 1:51' },
      { label: 'Rest of the race', value: '≈ 2:16' },
    ],
    notes: [
      'Km 2–11 at 4:53–5:14 with HR 188–190, about 96% of max. That’s 10K race effort in a marathon.',
      'Km 33 onwards: pace fell to 6:16–6:52 and cadence dropped from 178 to about 165. Glycogen ran out.',
      'HR fell as you slowed (189 down to 161). Your legs and fuel gave out before your heart and lungs did. It’s fixable with pacing, longer long runs and fuelling.',
    ],
  },
};

// ───────────────────────────── Assembly ─────────────────────────────

function minutesFor(segments: Segment[], paceSet: PaceSet): number {
  let sec = 0;
  for (const s of segments) {
    const zoneSec = s.secPerKm ?? ZONES[s.zone].sec[paceSet];
    if (s.count) sec += s.count * 60;
    else if (s.reps) {
      const offSec = ZONES[s.reps.offZone ?? 'recovery'].sec[paceSet];
      sec += sum(s.reps.on) * zoneSec + (s.reps.on.length - 1) * s.reps.off * offSec;
    } else sec += s.km * zoneSec;
  }
  return sec / 60;
}

function inRamadan(key: string) {
  return key >= RAMADAN.from && key <= RAMADAN.to;
}

const RAMADAN_NOTE =
  'If you’re fasting for Ramadan (about 8 Feb–9 Mar 2027): run easy days before sahur or about an hour after iftar, and do Wednesday and Sunday after iftar with plenty of fluids. Cutting distance by 10–20% this month is fine.';

export const paceSetForWeek = (week: number): PaceSet => (week >= 10 ? 'sharpening' : 'foundation');

function finalize(draft: Draft, date: string, week: number, phase: PhaseKey | null): Session {
  const paceSet = paceSetForWeek(Math.max(week, 0));
  const km = draft.kmOverride ?? Math.round(sum(draft.segments.map((s) => s.km)) * 10) / 10;
  const notes = [...(draft.notes ?? [])];
  if (draft.type !== 'past' && draft.type !== 'rest' && inRamadan(date)) notes.push(RAMADAN_NOTE);
  const session: Session = {
    date,
    week,
    phase,
    type: draft.type,
    short: draft.short,
    title: draft.title,
    km,
    minutes: draft.minutesOverride ?? minutesFor(draft.segments, paceSet),
    segments: draft.segments,
    purpose: draft.purpose,
    notes,
    paceSet,
    stats: draft.stats,
  };
  if (draft.type === 'race') {
    session.splits = raceSplits().map((s) => ({
      at: s.at === 42.195 ? 'Finish' : s.at === 21.0975 ? 'Half' : `${s.at} km`,
      clock: fmtClockLocal(s.sec),
      pace: `${Math.floor(s.paceSec / 60)}:${String(s.paceSec % 60).padStart(2, '0')}`,
    }));
    session.minutes = raceSplits().at(-1)!.sec / 60;
  }
  return session;
}

function fmtClockLocal(totalSec: number) {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface WeekSummary {
  week: number;
  phase: PhaseKey;
  focus: string;
  down: boolean;
  monday: string;
  km: number;
  longRun: Session;
}

function build() {
  const sessions = new Map<string, Session>();
  const weeks: WeekSummary[] = [];

  WEEKS.forEach((w, i) => {
    const mon = addDays(WEEK0_MONDAY, i * 7);
    const days: (Draft | null)[] = [monday(w.phase), w.tue, w.wed, w.thu, friday(), w.sat, w.sun];
    let km = 0;
    days.forEach((draft, d) => {
      const key = toKey(addDays(mon, d));
      if (!draft || key < PLAN_START) return;
      const s = finalize(draft, key, i, w.phase);
      sessions.set(key, s);
      km += s.km;
    });
    weeks.push({
      week: i,
      phase: w.phase,
      focus: w.focus,
      down: !!w.down,
      monday: toKey(mon),
      km: Math.round(km * 10) / 10,
      longRun: sessions.get(toKey(addDays(mon, 6)))!,
    });
  });

  for (const [key, draft] of Object.entries(PAST)) sessions.set(key, finalize(draft, key, -1, null));

  return { sessions, weeks };
}

export const { sessions: SESSIONS, weeks: WEEK_SUMMARIES } = build();

export const getSession = (key: string) => SESSIONS.get(key);

export const weekOf = (key: string): WeekSummary | undefined => {
  const d = fromKey(key);
  return WEEK_SUMMARIES.find((w) => {
    const mon = fromKey(w.monday);
    return d >= mon && d < addDays(mon, 7);
  });
};

/** The first month the calendar can show (past races) and the last (race month). */
export const CALENDAR_RANGE = { first: new Date(2026, 9, 1), last: new Date(2027, 5, 1) };
