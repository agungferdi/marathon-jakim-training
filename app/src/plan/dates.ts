// All dates are local calendar days, keyed as YYYY-MM-DD. Never parse keys with
// `new Date('YYYY-MM-DD')` — that is UTC and shifts the day in some timezones.

export const toKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const daysBetween = (a: Date, b: Date): number =>
  Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );

/** Monday of the week containing `d`. */
export const mondayOf = (d: Date): Date => addDays(d, -((d.getDay() + 6) % 7));

export const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

const WD_LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const MONTH_LONG = new Intl.DateTimeFormat('en-GB', { month: 'long' });

/** "Sunday 13 June 2027" (or without the year). */
export const fmtLong = (d: Date, withYear = true) =>
  `${WD_LONG.format(d)} ${d.getDate()} ${MONTH_LONG.format(d)}${withYear ? ' ' + d.getFullYear() : ''}`;
export const fmtMonth = (d: Date) => MONTH.format(d);
export const fmtShort = (d: Date) => SHORT.format(d);
export const fmtWeekday = (d: Date) => WEEKDAY.format(d);

/** 5:27 style from seconds per km. */
export const fmtPace = (secPerKm: number) => {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** h:mm:ss or m:ss */
export const fmtClock = (totalSec: number) => {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** "about 1 h 05 min" style duration */
export const fmtDuration = (minutes: number) => {
  const m = Math.round(minutes / 5) * 5 || Math.round(minutes);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};
