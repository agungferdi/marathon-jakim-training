import { useMemo, useRef, useState } from 'react';
import { addDays, fmtClock, fmtPace, fmtShort, fmtWeekday, fromKey, toKey } from '../plan/dates';
import {
  checkRun,
  dueSessions,
  fmtKm,
  recentEasyPace,
  weeklyTotals,
  type LogBook,
} from '../log/log';
import { StatusIcon } from './RunLog';
import { WeeklyChart } from './WeeklyChart';

interface Props {
  logs: LogBook;
  today: Date;
  currentWeek: number;
  /** the session to point at when nothing is logged yet */
  firstKey: string | null;
  onOpen: (key: string) => void;
  onPickWeek: (week: number) => void;
  onRestore: (raw: unknown) => number;
}

const SHOW = 8;

export function Dashboard({ logs, today, currentWeek, firstKey, onOpen, onPickWeek, onRestore }: Props) {
  const todayKey = toKey(today);
  const [showAll, setShowAll] = useState(false);

  const data = useMemo(() => {
    const due = dueSessions(logs, todayKey);
    const logged = due.filter((s) => logs[s.date]);
    const onPlan = logged.filter((s) => checkRun(s, logs[s.date]).onPlan).length;
    const totals = weeklyTotals(logs);
    const runKm = logged.reduce((a, s) => a + logs[s.date].km, 0);
    const plannedKm = due.reduce((a, s) => a + s.km, 0);
    const week = currentWeek >= 0 ? totals[currentWeek] : null;
    const easyPace = recentEasyPace(logs, todayKey, toKey(addDays(today, -27)));
    return { due, logged, onPlan, totals, runKm, plannedKm, week, easyPace };
  }, [logs, todayKey, today, currentWeek]);

  const rows = [...data.due].reverse();
  const visible = showAll ? rows : rows.slice(0, SHOW);
  const hasLogs = data.logged.length > 0;

  return (
    <section className="block" id="log" aria-labelledby="log-title">
      <div className="block__head">
        <h2 className="block__title" id="log-title">
          Your training log
        </h2>
        <p className="block__lead">
          Every run you mark as done lands here, checked against the plan. Open a day in the calendar to log or edit it.
        </p>
      </div>

      <dl className="dash">
        <div className="dash__stat">
          <dt>Runs done</dt>
          <dd>
            {data.logged.length}
            <small> of {data.due.length}</small>
          </dd>
          <p>{hasLogs ? `${data.onPlan} on plan` : 'due so far'}</p>
        </div>
        <div className="dash__stat">
          <dt>Distance run</dt>
          <dd>
            {fmtKm(Math.round(data.runKm * 10) / 10)}
            <small> km</small>
          </dd>
          <p>of {fmtKm(Math.round(data.plannedKm * 10) / 10)} km planned so far</p>
        </div>
        <div className="dash__stat">
          <dt>This week</dt>
          <dd>
            {data.week ? fmtKm(data.week.run) : '–'}
            <small> km</small>
          </dd>
          <p>{data.week ? `of ${fmtKm(data.week.planned)} km planned` : 'The block hasn’t started'}</p>
        </div>
        <div className="dash__stat">
          <dt>Base-run pace</dt>
          <dd>
            {data.easyPace ? fmtPace(data.easyPace) : '–'}
            {data.easyPace && <small> /km</small>}
          </dd>
          <p>average over the last 4 weeks</p>
        </div>
      </dl>

      <WeeklyChart totals={data.totals} currentWeek={currentWeek} onPickWeek={onPickWeek} />

      <h3 className="dash__h">Runs so far</h3>
      {hasLogs ? (
        <>
          <div className="tablewrap">
            <table className="runs">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Session</th>
                  <th scope="col" className="num">
                    Distance
                  </th>
                  <th scope="col" className="num">
                    Time
                  </th>
                  <th scope="col" className="num">
                    Pace
                  </th>
                  <th scope="col">Against the plan</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const l = logs[s.date];
                  const c = l ? checkRun(s, l) : null;
                  const d = fromKey(s.date);
                  return (
                    <tr key={s.date} className={l ? '' : 'is-missed'}>
                      <th scope="row">
                        <button className="runs__day" onClick={() => onOpen(s.date)}>
                          {fmtWeekday(d)} {fmtShort(d)}
                        </button>
                      </th>
                      <td>{s.title}</td>
                      <td className="num">
                        {l ? `${fmtKm(l.km)} km` : '–'}
                        <span className="runs__plan">of {fmtKm(s.km)}</span>
                      </td>
                      <td className="num">{l ? fmtClock(l.sec) : '–'}</td>
                      <td className="num">{l ? fmtPace(l.sec / l.km) : '–'}</td>
                      <td>
                        {c ? (
                          <span className={`runs__check ${c.onPlan ? 'is-on' : 'is-off'}`}>
                            <StatusIcon ok={c.onPlan} />
                            {c.tag}
                          </span>
                        ) : (
                          <span className="runs__missed">Not logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > SHOW && (
            <button className="btn btn--ghost dash__more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${rows.length} runs`}
            </button>
          )}
        </>
      ) : (
        <div className="dash__empty">
          <p>
            No runs logged yet. After a run, open the day in the calendar and press <strong>Mark as done</strong>. It
            saves the planned distance and time, and you can change them to what you actually ran.
          </p>
          {firstKey && (
            <button className="btn btn--ink" onClick={() => onOpen(firstKey)}>
              Open {firstKey === todayKey ? 'today’s' : 'the next'} session
            </button>
          )}
        </div>
      )}

      <Backup logs={logs} onRestore={onRestore} />
    </section>
  );
}

function Backup({ logs, onRestore }: { logs: LogBook; onRestore: (raw: unknown) => number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const count = Object.keys(logs).length;

  const download = () => {
    const body = JSON.stringify({ app: 'jakim-2027-plan', version: 1, exportedAt: new Date().toISOString(), runs: logs }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jakim-2027-log-${toKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`Downloaded ${count} ${count === 1 ? 'run' : 'runs'}.`);
  };

  const restore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const n = onRestore(json && typeof json === 'object' && 'runs' in json ? json.runs : json);
      setMsg(n ? `Restored ${n} ${n === 1 ? 'run' : 'runs'} from the backup.` : 'That file has no runs from this plan.');
    } catch {
      setMsg('That file isn’t a training-log backup. Choose a .json file downloaded from this page.');
    }
  };

  return (
    <div className="dash__backup">
      <p>
        Your log is saved in this browser only. Download a backup now and then, so you can restore it after clearing
        your browser or on another device.
      </p>
      <div className="dash__backupbtns">
        <button className="btn btn--ghost" onClick={download} disabled={!count}>
          Download backup
        </button>
        <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          Restore from backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
      </div>
      <p className="dash__msg" role="status">
        {msg}
      </p>
    </div>
  );
}
