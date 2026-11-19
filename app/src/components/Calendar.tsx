import { addDays, fmtClock, fmtLong, fmtMonth, fmtPace, mondayOf, sameMonth, toKey } from '../plan/dates';
import { checkRun, fmtKm, type LogBook, type RunLog } from '../log/log';
import { CALENDAR_RANGE, PHASES, getSession, weekOf, type Session } from '../plan/plan';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEGEND: { cls: string; label: string }[] = [
  { cls: 't-easy', label: 'Base run' },
  { cls: 't-speed', label: 'Speed' },
  { cls: 't-lsd', label: 'Long slow distance' },
  { cls: 't-tempoLong', label: 'Tempo long run' },
  { cls: 't-race', label: 'Race or test' },
  { cls: 't-rest', label: 'Rest' },
];

interface CalendarProps {
  month: Date;
  today: Date;
  selected: string | null;
  logs: LogBook;
  onMonth: (d: Date) => void;
  onOpen: (key: string) => void;
}

export function Calendar({ month, today, selected, logs, onMonth, onOpen }: CalendarProps) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = mondayOf(first);
  const rows: Date[] = [];
  for (let d = start; d <= last; d = addDays(d, 7)) rows.push(d);

  const prev = new Date(first.getFullYear(), first.getMonth() - 1, 1);
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  const canPrev = prev >= CALENDAR_RANGE.first;
  const canNext = next <= CALENDAR_RANGE.last;
  const todayKey = toKey(today);

  return (
    <section className="cal" id="calendar" aria-labelledby="cal-title">
      <div className="cal__head">
        <h2 className="cal__title" id="cal-title" aria-live="polite">
          {fmtMonth(first)}
        </h2>
        <div className="cal__nav">
          <button className="btn btn--ghost" onClick={() => onMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </button>
          <button className="btn btn--icon" onClick={() => onMonth(prev)} disabled={!canPrev} aria-label="Previous month">
            <Chevron dir="left" />
          </button>
          <button className="btn btn--icon" onClick={() => onMonth(next)} disabled={!canNext} aria-label="Next month">
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <ul className="cal__legend" aria-label="Session types">
        {LEGEND.map((l) => (
          <li key={l.cls} className={l.cls}>
            <span className="cal__swatch" />
            {l.label}
          </li>
        ))}
      </ul>

      <div className="cal__grid" role="grid" aria-labelledby="cal-title">
        <div className="cal__row cal__row--days" role="row">
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal__dow" role="columnheader">
              {d}
            </span>
          ))}
          <span className="cal__dow cal__dow--week" role="columnheader">
            Week
          </span>
        </div>

        {rows.map((mon) => {
          const wk = weekOf(toKey(mon));
          const empty = [0, 1, 2, 3, 4, 5, 6].every((i) => !getSession(toKey(addDays(mon, i))));
          return (
            <div className={`cal__row ${empty ? 'cal__row--empty' : ''}`} role="row" key={toKey(mon)}>
              {WEEKDAYS.map((_, i) => {
                const day = addDays(mon, i);
                const key = toKey(day);
                return (
                  <Cell
                    key={key}
                    day={day}
                    session={getSession(key)}
                    outside={!sameMonth(day, first)}
                    isToday={key === todayKey}
                    isPast={key < todayKey}
                    isSelected={key === selected}
                    log={logs[key]}
                    onOpen={onOpen}
                  />
                );
              })}
              <div className="cal__week" role="rowheader">
                {wk && (
                  <>
                    <strong>Week {wk.week}</strong>
                    <span>{PHASES[wk.phase].name}</span>
                    <span className="cal__weekkm">{wk.km} km</span>
                    {wk.down && <span className="cal__down">Lighter week</span>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface CellProps {
  day: Date;
  session?: Session;
  outside: boolean;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  log?: RunLog;
  onOpen: (key: string) => void;
}

function Cell({ day, session, outside, isToday, isPast, isSelected, log, onOpen }: CellProps) {
  const isDone = !!log && !!session;
  const onPlan = isDone ? checkRun(session!, log!).onPlan : true;
  const cls = [
    'cell',
    session ? `t-${session.type}` : 'cell--empty',
    outside && 'is-out',
    isToday && 'is-today',
    isPast && 'is-past',
    isSelected && 'is-selected',
    isDone && 'is-done',
    isDone && !onPlan && 'is-off',
  ]
    .filter(Boolean)
    .join(' ');

  const dateNum = (
    <span className="cell__date">
      {day.getDate()}
      {isToday && <span className="cell__today">Today</span>}
    </span>
  );

  if (!session) {
    return (
      <div role="gridcell" className="cell__wrap">
        <div className={cls}>{dateNum}</div>
      </div>
    );
  }

  const isRest = session.type === 'rest';
  const ran = log
    ? `, done: ${fmtKm(log.km)} km in ${fmtClock(log.sec)}, ${fmtPace(log.sec / log.km)} per km${onPlan ? ', on plan' : ', off plan'}`
    : '';
  const label = `${fmtLong(day)}. ${session.title}${isRest ? '' : `, ${session.km} km planned`}${ran}${isToday ? ', today' : ''}`;

  return (
    <div role="gridcell" className="cell__wrap">
      <button className={cls} onClick={() => onOpen(session.date)} aria-label={label}>
        {dateNum}
        {isDone && <Check off={!onPlan} />}
        <span className="cell__label">{session.short}</span>
        {!isRest && (
          <span className="cell__km">
            {log ? fmtKm(log.km) : formatKm(session.km)}
            <small>km</small>
          </span>
        )}
        {log && <span className="cell__pace">{fmtPace(log.sec / log.km)}<small> /km</small></span>}
      </button>
    </div>
  );
}

const formatKm = (km: number) => (Number.isInteger(km) ? String(km) : km.toFixed(1));

function Check({ off }: { off: boolean }) {
  return (
    <svg className="cell__check" viewBox="0 0 16 16" aria-hidden="true">
      {off ? (
        <path d="M8 3.5v5.5M8 12.2v.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
