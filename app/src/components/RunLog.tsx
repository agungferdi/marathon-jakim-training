import { useEffect, useRef, useState } from 'react';
import { fmtClock, fmtPace } from '../plan/dates';
import type { Session } from '../plan/plan';
import { FEEL_NAME, asPlanned, checkRun, fmtKm, type Feel, type RunLog as Entry } from '../log/log';

export const RUNLOG_FORM_ID = 'runlog-form';

interface Props {
  session: Session;
  log?: Entry;
  editing: boolean;
  /** true right after "Mark as done", when the entry holds the planned numbers */
  justMarked: boolean;
  onSave: (entry: Entry) => void;
  onRemove: () => void;
}

export function RunLog({ session, log, editing, justMarked, onSave, onRemove }: Props) {
  if (editing) return <RunForm session={session} log={log} justMarked={justMarked} onSave={onSave} onRemove={onRemove} />;
  if (!log) return null;

  const result = checkRun(session, log);
  return (
    <section className={`runlog ${result.onPlan ? 'is-on' : 'is-off'}`} aria-labelledby="runlog-title">
      <h3 className="panel__h" id="runlog-title">
        Your run
      </h3>
      <p className="runlog__headline">
        <StatusIcon ok={result.onPlan} />
        {result.headline}
      </p>
      <dl className="runlog__stats">
        <div>
          <dt>Distance</dt>
          <dd>
            {fmtKm(log.km)}
            <small> km</small>
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{fmtClock(log.sec)}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>
            {fmtPace(log.sec / log.km)}
            <small> /km</small>
          </dd>
        </div>
        {log.hr && (
          <div>
            <dt>Avg HR</dt>
            <dd>{log.hr}</dd>
          </div>
        )}
      </dl>
      <ul className="runlog__lines">
        {result.lines.map((l) => (
          <li key={l.key} className={l.ok ? 'is-on' : 'is-off'}>
            <StatusIcon ok={l.ok} />
            <span>
              <span className="sr-only">{l.ok ? 'On plan: ' : 'Off plan: '}</span>
              {l.text}
            </span>
          </li>
        ))}
      </ul>
      {(log.feel || log.notes) && (
        <p className="runlog__notes">
          {log.feel && <strong>Felt {log.feel === 'ok' ? 'OK' : FEEL_NAME[log.feel].toLowerCase()}. </strong>}
          {log.notes}
        </p>
      )}
    </section>
  );
}

// ───────────────────────────── Form ─────────────────────────────

interface Fields {
  km: string;
  h: string;
  m: string;
  s: string;
  hr: string;
  feel: Feel | '';
  notes: string;
}

type Errors = Partial<Record<'km' | 'time' | 'hr' | 'pace', string>>;

const toFields = (e: Entry): Fields => ({
  km: fmtKm(e.km),
  h: String(Math.floor(e.sec / 3600)),
  m: String(Math.floor((e.sec % 3600) / 60)).padStart(2, '0'),
  s: String(e.sec % 60).padStart(2, '0'),
  hr: e.hr ? String(e.hr) : '',
  feel: e.feel ?? '',
  notes: e.notes ?? '',
});

const int = (v: string) => (v.trim() === '' ? 0 : /^\d+$/.test(v.trim()) ? Number(v) : NaN);

function parse(f: Fields): { entry?: Entry; errors: Errors } {
  const errors: Errors = {};
  const km = Number(f.km.replace(',', '.').trim());
  if (!f.km.trim() || !(km > 0)) errors.km = 'Enter the distance in km, like 10.2.';
  else if (km > 60) errors.km = 'That’s more than 60 km. Check the distance.';

  const [h, m, s] = [int(f.h), int(f.m), int(f.s)];
  const sec = h * 3600 + m * 60 + s;
  if ([h, m, s].some(Number.isNaN)) errors.time = 'Use whole numbers for hours, minutes and seconds.';
  else if (m > 59 || s > 59) errors.time = 'Minutes and seconds go up to 59.';
  else if (!(sec > 0)) errors.time = 'Enter how long the run took.';

  let hr: number | undefined;
  if (f.hr.trim()) {
    hr = int(f.hr);
    if (!(hr >= 60 && hr <= 230)) errors.hr = 'Heart rate should be between 60 and 230, or leave it empty.';
  }

  if (!errors.km && !errors.time) {
    const pace = sec / km;
    if (pace < 150 || pace > 900)
      errors.pace = `That works out to ${fmtPace(pace)} /km. Check the distance and time.`;
  }

  if (Object.keys(errors).length) return { errors };
  const entry: Entry = { km: Math.round(km * 100) / 100, sec };
  if (hr) entry.hr = hr;
  if (f.feel) entry.feel = f.feel;
  if (f.notes.trim()) entry.notes = f.notes.trim();
  return { entry, errors };
}

function RunForm({
  session,
  log,
  justMarked,
  onSave,
  onRemove,
}: Omit<Props, 'editing'>) {
  const [f, setF] = useState<Fields>(() => toFields(log ?? asPlanned(session)));
  const [showErrors, setShowErrors] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    firstRef.current?.focus({ preventScroll: true });
    firstRef.current?.select();
  }, []);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const { entry, errors } = parse(f);
  const preview = entry ? checkRun(session, entry) : null;
  const err = showErrors ? errors : {};

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry) onSave(entry);
    else setShowErrors(true);
  };

  return (
    <section className="runlog runlog--form" aria-labelledby="runlog-title" ref={sectionRef}>
      <h3 className="panel__h" id="runlog-title">
        Log your run
      </h3>
      <p className="runlog__intro">
        {justMarked
          ? 'Saved with the planned distance and time. Change anything that was different.'
          : 'Change anything that was different from what you saved.'}
      </p>

      <form id={RUNLOG_FORM_ID} className="runform" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="rl-km">Distance</label>
          <div className="field__row">
            <input
              id="rl-km"
              ref={firstRef}
              className="field__input field__input--km"
              inputMode="decimal"
              autoComplete="off"
              value={f.km}
              onChange={set('km')}
              aria-invalid={!!err.km}
              aria-describedby={err.km ? 'rl-km-err' : undefined}
            />
            <span className="field__unit">km</span>
            <span className="field__plan">Plan: {fmtKm(session.km)} km</span>
          </div>
          {err.km && (
            <p className="field__err" id="rl-km-err">
              {err.km}
            </p>
          )}
        </div>

        <fieldset className="field" aria-describedby={err.time ? 'rl-time-err' : undefined}>
          <legend>Time</legend>
          <div className="field__row">
            <input
              className="field__input field__input--num"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Hours"
              value={f.h}
              onChange={set('h')}
              aria-invalid={!!err.time}
            />
            <span className="field__unit">h</span>
            <input
              className="field__input field__input--num"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Minutes"
              value={f.m}
              onChange={set('m')}
              aria-invalid={!!err.time}
            />
            <span className="field__unit">min</span>
            <input
              className="field__input field__input--num"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Seconds"
              value={f.s}
              onChange={set('s')}
              aria-invalid={!!err.time}
            />
            <span className="field__unit">s</span>
          </div>
          {err.time && (
            <p className="field__err" id="rl-time-err">
              {err.time}
            </p>
          )}
        </fieldset>

        <div className="field">
          <label htmlFor="rl-hr">
            Average heart rate <span className="field__opt">optional</span>
          </label>
          <div className="field__row">
            <input
              id="rl-hr"
              className="field__input field__input--num"
              inputMode="numeric"
              autoComplete="off"
              value={f.hr}
              onChange={set('hr')}
              aria-invalid={!!err.hr}
              aria-describedby={err.hr ? 'rl-hr-err' : undefined}
            />
            <span className="field__unit">bpm</span>
          </div>
          {err.hr && (
            <p className="field__err" id="rl-hr-err">
              {err.hr}
            </p>
          )}
        </div>

        <fieldset className="field">
          <legend>
            How it felt <span className="field__opt">optional</span>
          </legend>
          <div className="feel">
            {(Object.keys(FEEL_NAME) as Feel[]).map((k) => (
              <label key={k} className="feel__opt">
                <input
                  type="radio"
                  name="feel"
                  value={k}
                  checked={f.feel === k}
                  onChange={() => setF((p) => ({ ...p, feel: k }))}
                  onClick={() => f.feel === k && setF((p) => ({ ...p, feel: '' }))}
                />
                <span>{FEEL_NAME[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="rl-notes">
            Notes <span className="field__opt">optional</span>
          </label>
          <textarea
            id="rl-notes"
            className="field__input field__input--notes"
            rows={3}
            value={f.notes}
            onChange={set('notes')}
            placeholder="Weather, how the legs felt, gels taken"
          />
        </div>

        <div className="runform__preview" aria-live="polite">
          {preview && entry ? (
            <>
              <p className="runform__pace">
                <span>Pace</span>
                <strong>{fmtPace(entry.sec / entry.km)}</strong>
                <span>/km</span>
              </p>
              <p className={`runlog__headline ${preview.onPlan ? 'is-on' : 'is-off'}`}>
                <StatusIcon ok={preview.onPlan} />
                {preview.headline}
              </p>
            </>
          ) : (
            <p className="runform__wait">{errors.pace ?? 'Pace shows up once distance and time are filled in.'}</p>
          )}
        </div>
      </form>

      {log && (
        <button type="button" className="runlog__remove" onClick={onRemove}>
          Remove this run and mark the day as not done
        </button>
      )}
    </section>
  );
}

export function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <svg className={`status ${ok ? 'status--on' : 'status--off'}`} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" />
      {ok ? (
        <path d="M4.5 8.3l2.3 2.3 4.7-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4v5M8 11.6v.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
