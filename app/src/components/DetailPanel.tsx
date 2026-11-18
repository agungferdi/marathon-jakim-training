import { useEffect, useRef } from 'react';
import { addDays, fmtClock, fmtDuration, fmtLong, fromKey, toKey } from '../plan/dates';
import { PHASES, getSession, weekOf, type Session } from '../plan/plan';
import { ZONES } from '../plan/zones';
import { Chevron } from './Calendar';
import { EffortProfile } from './EffortProfile';

const TYPE_NAME: Record<Session['type'], string> = {
  rest: 'Rest',
  easy: 'Base run',
  speed: 'Speed',
  lsd: 'Long slow distance',
  tempoLong: 'Tempo long run',
  test: 'Test',
  race: 'Race day',
  past: 'Past race',
};

interface Props {
  dateKey: string;
  done: boolean;
  onToggleDone: () => void;
  onNavigate: (key: string) => void;
  onClose: () => void;
}

export function DetailPanel({ dateKey, done, onToggleDone, onNavigate, onClose }: Props) {
  const s = getSession(dateKey)!;
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevKey = toKey(addDays(fromKey(dateKey), -1));
  const nextKey = toKey(addDays(fromKey(dateKey), 1));
  const hasPrev = !!getSession(prevKey);
  const hasNext = !!getSession(nextKey);

  // Focus in on open, back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [dateKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(prevKey);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(nextKey);
      if (e.key === 'Tab' && panelRef.current) {
        // keep focus inside the dialog
        const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), summary, [href]');
        if (!f.length) return;
        const firstEl = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPrev, hasNext, prevKey, nextKey, onClose, onNavigate]);

  const wk = weekOf(dateKey);
  const isRest = s.type === 'rest';
  const mpKm = s.segments
    .filter((x) => x.zone === 'mp' && !x.secPerKm)
    .reduce((a, x) => a + (x.reps ? x.reps.on.reduce((p, q) => p + q, 0) : x.km), 0);

  return (
    <div className="panel-layer">
      <div className="panel-backdrop" onClick={onClose} />
      <div
        className={`panel t-${s.type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        ref={panelRef}
      >
        <div className="panel__bar">
          <button className="btn btn--icon" onClick={() => onNavigate(prevKey)} disabled={!hasPrev} aria-label="Previous day">
            <Chevron dir="left" />
          </button>
          <p className="panel__date">{fmtLong(fromKey(dateKey))}</p>
          <button className="btn btn--icon" onClick={() => onNavigate(nextKey)} disabled={!hasNext} aria-label="Next day">
            <Chevron dir="right" />
          </button>
          <button className="btn btn--icon panel__close" onClick={onClose} ref={closeRef} aria-label="Close">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="panel__body">
          <p className="panel__type">
            <span className="panel__dot" />
            {TYPE_NAME[s.type]}
            {s.phase && wk ? `, week ${wk.week} of 29 (${PHASES[s.phase].name})` : ''}
          </p>
          <h2 className="panel__title" id="panel-title">
            {s.title}
          </h2>

          {!isRest && (
            <dl className="panel__stats">
              <div>
                <dt>Distance</dt>
                <dd>
                  {s.km}
                  <small> km</small>
                </dd>
              </div>
              <div>
                <dt>{s.type === 'past' ? 'Time' : s.type === 'race' ? 'Target time' : 'Time, roughly'}</dt>
                <dd>
                  {s.type === 'past'
                    ? s.stats?.[0].value
                    : s.type === 'race'
                      ? fmtClock(s.minutes * 60)
                      : fmtDuration(s.minutes)}
                </dd>
              </div>
              {mpKm > 0 && (
                <div>
                  <dt>At race pace</dt>
                  <dd>
                    {mpKm}
                    <small> km</small>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {s.segments.length > 0 && (
            <>
              <EffortProfile segments={s.segments} tall />
              <ol className="segs">
                {s.segments.map((seg, i) => {
                  const z = ZONES[seg.zone];
                  return (
                    <li key={i} className="seg">
                      <span className="seg__swatch" style={{ background: z.color }} />
                      <div className="seg__main">
                        <p className="seg__label">
                          {seg.label}
                          {!seg.reps && !seg.count && !seg.label.includes('km') && (
                            <span className="seg__km">{seg.km} km</span>
                          )}
                        </p>
                        <p className="seg__target">
                          {seg.paceText ?? `${z.pace[s.paceSet]}${/\d/.test(z.pace[s.paceSet]) ? ' /km' : ''}`}
                          {s.type !== 'race' && !['strides', 'hills'].includes(seg.zone) && <> with HR {z.hr}</>}
                        </p>
                        {seg.detail && <p className="seg__detail">{seg.detail}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {s.stats && (
            <dl className="panel__racestats">
              {s.stats.map((x) => (
                <div key={x.label}>
                  <dt>{x.label}</dt>
                  <dd>{x.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {s.splits && (
            <table className="splits">
              <caption>Checkpoints for 3:48 on the official course</caption>
              <thead>
                <tr>
                  <th scope="col">Checkpoint</th>
                  <th scope="col">Clock</th>
                  <th scope="col">Pace</th>
                </tr>
              </thead>
              <tbody>
                {s.splits.map((x) => (
                  <tr key={x.at}>
                    <th scope="row">{x.at}</th>
                    <td>{x.clock}</td>
                    <td>{x.pace} /km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="panel__h">{s.type === 'past' ? 'What it tells us' : 'Why this session'}</h3>
          <p className="panel__purpose">{s.purpose}</p>

          {s.notes.length > 0 && (
            <>
              <h3 className="panel__h">{s.type === 'past' ? 'From the data' : 'Coach’s notes'}</h3>
              <ul className="panel__notes">
                {s.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}

          {wk && s.type !== 'past' && (
            <div className="panel__week">
              <h3 className="panel__h">This week</h3>
              <p>
                {wk.focus} {wk.km} km in total.
              </p>
            </div>
          )}
        </div>

        {!isRest && s.type !== 'past' && (
          <div className="panel__foot">
            <button className={`btn ${done ? 'btn--done' : 'btn--ink'}`} aria-pressed={done} onClick={onToggleDone}>
              {done ? 'Done' : 'Mark as done'}
            </button>
            <span className="panel__hint">Use the arrow keys to move between days.</span>
          </div>
        )}
      </div>
    </div>
  );
}
