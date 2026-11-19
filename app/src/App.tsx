import { useCallback, useMemo, useState } from 'react';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { DetailPanel } from './components/DetailPanel';
import { Hero } from './components/Hero';
import { RaceDayPlan, Reasoning, ZonesTable } from './components/Sections';
import { addDays, fromKey, toKey } from './plan/dates';
import { CALENDAR_RANGE, PLAN_START, RACE_DATE, WEEK_SUMMARIES, getSession, weekOf } from './plan/plan';
import { useLog } from './log/useLog';

/** `?today=2027-03-03` lets you preview the app on another date. */
function resolveToday(): Date {
  const p = new URLSearchParams(window.location.search).get('today');
  if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) return fromKey(p);
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const clampMonth = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), 1);
  if (m < CALENDAR_RANGE.first) return CALENDAR_RANGE.first;
  if (m > CALENDAR_RANGE.last) return CALENDAR_RANGE.last;
  return m;
};

export default function App() {
  const today = useMemo(resolveToday, []);
  const todayKey = toKey(today);
  const [month, setMonth] = useState(() => clampMonth(todayKey < PLAN_START ? fromKey(PLAN_START) : today));
  const [selected, setSelected] = useState<string | null>(null);
  const { logs, save, remove, restore } = useLog();

  const currentWeek = weekOf(todayKey)?.week ?? -1;

  const upNext = useMemo(() => {
    const t = getSession(todayKey);
    if (t && t.type !== 'rest' && t.type !== 'past') return { session: t, isToday: true };
    let d = fromKey(todayKey < PLAN_START ? PLAN_START : todayKey);
    for (let i = 0; i < 7; i++) {
      d = addDays(d, 1);
      const s = getSession(toKey(d));
      if (s && s.type !== 'rest') return { session: s, isToday: false };
    }
    return null;
  }, [todayKey]);

  const open = useCallback((key: string) => {
    setSelected(key);
    setMonth(clampMonth(fromKey(key)));
  }, []);

  const pickWeek = useCallback((week: number) => {
    setMonth(clampMonth(fromKey(WEEK_SUMMARIES[week].monday)));
    document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <Hero today={today} currentWeek={currentWeek} upNext={upNext} onOpen={open} onPickWeek={pickWeek} />
      <main className="wrap main">
        <Calendar month={month} today={today} selected={selected} logs={logs} onMonth={setMonth} onOpen={open} />
        <Dashboard
          logs={logs}
          today={today}
          currentWeek={currentWeek}
          firstKey={upNext?.session.date ?? null}
          onOpen={open}
          onPickWeek={pickWeek}
          onRestore={restore}
        />
        <Reasoning />
        <ZonesTable />
        <RaceDayPlan onOpen={open} />
      </main>
      <footer className="wrap foot">
        <p>
          Built from HM Malioboro Run 2026 and JRF 2026 Marathon GPX data. Training plans carry injury risk: if
          something hurts for more than two runs in a row, skip the hard sessions and get it checked. Race on{' '}
          {fromKey(RACE_DATE).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </footer>
      {selected && (
        <DetailPanel
          dateKey={selected}
          log={logs[selected]}
          onSave={(entry) => save(selected, entry)}
          onRemove={() => remove(selected)}
          onNavigate={open}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
