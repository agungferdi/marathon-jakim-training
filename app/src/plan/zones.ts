// Training zones for Agung, anchored on:
//  - HM Malioboro 2026: 1:52:34 for ~21.1 km  -> current fitness ~VDOT 39-40 (marathon equivalent ~3:55)
//  - Highest recorded HR: 196 bpm (HM Malioboro). Zones use that as the working max.
//  - Goal: sub 3:50 at JAKIM -> 5:27/km on the official distance (~5:20 on a GPS watch that reads long).
// Paces are for cool-ish mornings. In Jakarta heat, run by HR first and let pace slip 10-20 s/km.

export type ZoneKey =
  | 'recovery'
  | 'easy'
  | 'long'
  | 'mp'
  | 'hmp'
  | 'threshold'
  | 'interval'
  | 'rep'
  | 'strides'
  | 'hills';

export type PaceSet = 'foundation' | 'sharpening';

export interface Zone {
  key: ZoneKey;
  name: string;
  /** pace range text per pace set, /km */
  pace: Record<PaceSet, string>;
  /** midpoint seconds per km, used for duration estimates */
  sec: Record<PaceSet, number>;
  hr: string;
  feel: string;
  /** 0-1, used for the height of the effort profile */
  intensity: number;
  color: string;
}

export const MAX_HR = 196;

export const ZONES: Record<ZoneKey, Zone> = {
  recovery: {
    key: 'recovery',
    name: 'Jog recovery',
    pace: { foundation: '6:45–7:30', sharpening: '6:45–7:30' },
    sec: { foundation: 425, sharpening: 425 },
    hr: 'under 145',
    feel: 'Shuffle. Let your breathing settle before the next rep.',
    intensity: 0.22,
    color: 'var(--z-recovery)',
  },
  easy: {
    key: 'easy',
    name: 'Easy',
    pace: { foundation: '6:10–6:40', sharpening: '6:05–6:35' },
    sec: { foundation: 385, sharpening: 380 },
    hr: '140–155',
    feel: 'You can talk in full sentences. If you can’t, slow down.',
    intensity: 0.4,
    color: 'var(--z-easy)',
  },
  long: {
    key: 'long',
    name: 'Long run',
    pace: { foundation: '6:05–6:35', sharpening: '6:00–6:30' },
    sec: { foundation: 380, sharpening: 375 },
    hr: '145–158',
    feel: 'Comfortable and patient. HR may drift up late. That’s fine to about 160.',
    intensity: 0.46,
    color: 'var(--z-long)',
  },
  mp: {
    key: 'mp',
    name: 'Marathon pace',
    pace: { foundation: '5:20–5:27', sharpening: '5:20–5:27' },
    sec: { foundation: 324, sharpening: 324 },
    hr: '165–175',
    feel: 'Controlled and rhythmic. You could hold this for hours, but you’re focused.',
    intensity: 0.64,
    color: 'var(--z-mp)',
  },
  hmp: {
    key: 'hmp',
    name: 'Half-marathon pace',
    pace: { foundation: '5:10–5:15', sharpening: '5:03–5:10' },
    sec: { foundation: 312, sharpening: 306 },
    hr: '172–180',
    feel: 'Comfortably hard. Short phrases only.',
    intensity: 0.72,
    color: 'var(--z-hmp)',
  },
  threshold: {
    key: 'threshold',
    name: 'Threshold (tempo)',
    pace: { foundation: '5:00–5:10', sharpening: '4:52–5:02' },
    sec: { foundation: 305, sharpening: 297 },
    hr: '176–184',
    feel: 'Hard but steady. You’re working, not straining.',
    intensity: 0.8,
    color: 'var(--z-threshold)',
  },
  interval: {
    key: 'interval',
    name: 'Interval (≈5K pace)',
    pace: { foundation: '4:38–4:46', sharpening: '4:28–4:38' },
    sec: { foundation: 282, sharpening: 273 },
    hr: '184–192 by the end of each rep',
    feel: 'Hard. Breathing is heavy. Each rep should feel the same, never all-out.',
    intensity: 0.9,
    color: 'var(--z-interval)',
  },
  rep: {
    key: 'rep',
    name: 'Repetition (speed)',
    pace: { foundation: '4:20–4:28', sharpening: '4:12–4:20' },
    sec: { foundation: 264, sharpening: 256 },
    hr: 'not useful (reps are too short)',
    feel: 'Fast and smooth with good form. Full recovery between reps.',
    intensity: 0.97,
    color: 'var(--z-rep)',
  },
  strides: {
    key: 'strides',
    name: 'Strides',
    pace: { foundation: 'about mile pace', sharpening: 'about mile pace' },
    sec: { foundation: 600, sharpening: 600 }, // each ~0.1 km stride + walk-back ≈ 1 min
    hr: 'ignore',
    feel: '20 seconds quick, tall and relaxed. Not a sprint. Walk back.',
    intensity: 1,
    color: 'var(--z-strides)',
  },
  hills: {
    key: 'hills',
    name: 'Hill reps',
    pace: { foundation: 'by effort', sharpening: 'by effort' },
    sec: { foundation: 330, sharpening: 330 },
    hr: 'ignore',
    feel: 'Strong drive up a steady slope (a flyover ramp works). Jog back down.',
    intensity: 0.94,
    color: 'var(--z-hills)',
  },
};

export const ZONE_ORDER: ZoneKey[] = [
  'easy',
  'long',
  'mp',
  'hmp',
  'threshold',
  'interval',
  'rep',
  'strides',
  'hills',
  'recovery',
];

export const GOAL = {
  label: 'Sub 3:50',
  goalSec: 3 * 3600 + 50 * 60,
  distanceKm: 42.195,
  /** official-distance pace for 3:49:59 */
  paceSec: (3 * 3600 + 49 * 60 + 59) / 42.195,
  lastMarathon: '4:06:52',
};
