import { useEffect, useRef, useState } from 'react';
import { addDays, fmtClock, fmtDuration, fmtLong, fromKey, toKey } from '../plan/dates';
import { PHASES, getSession, weekOf, type Session } from '../plan/plan';
import { ZONES } from '../plan/zones';
import { Chevron } from './Calendar';
import { EffortProfile } from './EffortProfile';
import { RUNLOG_FORM_ID, RunLog, StatusIcon } from './RunLog';
import { asPlanned, checkRun, isLoggable, type RunLog as Entry } from '../log/log';

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
  log?: Entry;
  onSave: (entry: Entry) => void;
  onRemove: () => void;
  onNavigate: (key: string) => void;
  onClose: () => void;
}

export function DetailPanel({ dateKey, log, onSave, onRemove, onNavigate, onClose }: Props) {
  const s = getSession(dateKey)!;
  // Which day's form is open, and whether it was opened by "Mark as done".
  const [editing, setEditing] = useState<{ key: string; justMarked: boolean } | null>(null);
  const isEditing = editing?.key === dateKey;
  const stopEditing = () => setEditing(null);
  // The last run deleted from this panel, so it can be restored with Undo.
  const [deleted, setDeleted] = useState<{ key: string; entry: Entry } | null>(null);
  const deleteRun = () => {
    if (log) setDeleted({ key: dateKey, entry: log });
    onRemove();
    stopEditing();
  };
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
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (isEditing) setEditing(null);
        else onClose();
      }
      if (!inField && e.key === 'ArrowLeft' && hasPrev) onNavigate(prevKey);
      if (!inField && e.key === 'ArrowRight' && hasNext) onNavigate(nextKey);
      if (e.key === 'Tab' && panelRef.current) {
        // keep focus inside the dialog
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), summary, [href], input:not([type="radio"]), input[type="radio"]:checked, textarea',
        );
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
  }, [hasPrev, hasNext, prevKey, nextKey, onClose, onNavigate, isEditing]);

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

          {isLoggable(s) && (
            <RunLog
              key={`${dateKey}-${isEditing}`}
              session={s}
              log={log}
              editing={isEditing}
              justMarked={!!editing?.justMarked}
              onSave={(entry) => {
                onSave(entry);
                stopEditing();
              }}
              onRemove={deleteRun}
            />
          )}

          {s.segments.length > 0 && (
            <>
              {log && !isEditing && <h3 className="panel__h">The plan</h3>}
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

        {isLoggable(s) && (
          <div className="panel__foot">
            {/* Distinct keys: React must not turn the clicked "Mark as done" button into the form's submit
                button, or the browser treats that same click as a submit and closes the form at once. */}
            {isEditing ? (
              <>
                <button key="save" type="submit" form={RUNLOG_FORM_ID} className="btn btn--ink">
                  Save run
                </button>
                <button key="cancel" type="button" className="btn btn--ghost" onClick={stopEditing}>
                  Cancel
                </button>
              </>
            ) : log ? (
              <>
                <button key="edit" type="button" className="btn btn--ghost" onClick={() => setEditing({ key: dateKey, justMarked: false })}>
                  Edit run
                </button>
                <span className="panel__doneflag">
                  <StatusIcon ok={checkRun(s, log).onPlan} />
                  Done
                </span>
                <button
                  key="delete"
                  type="button"
                  className="btn btn--icon panel__delete"
                  onClick={deleteRun}
                  aria-label="Delete this run"
                  title="Delete this run"
                >
                  <TrashIcon />
                </button>
              </>
            ) : deleted?.key === dateKey ? (
              <>
                <button
                  key="undo"
                  type="button"
                  className="btn btn--ink"
                  onClick={() => {
                    onSave(deleted.entry);
                    setDeleted(null);
                  }}
                >
                  Undo
                </button>
                <span className="panel__hint panel__hint--always" role="status">
                  Run deleted.
                </span>
                <button key="mark-after-delete" type="button" className="btn btn--ghost panel__after" onClick={() => setDeleted(null)}>
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <button
                  key="mark"
                  type="button"
                  className="btn btn--ink"
                  onClick={() => {
                    onSave(asPlanned(s));
                    setEditing({ key: dateKey, justMarked: true });
                  }}
                >
                  Mark as done
                </button>
                <span className="panel__hint">Saves the planned distance and time. You can adjust them next.</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 4.5h11M6.5 4.5V3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5M4 4.5l.6 8.4a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.4M6.8 7v4.5M9.2 7v4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
