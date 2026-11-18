import { useState } from 'react';
import { daysBetween, fmtDuration, fmtLong, fromKey } from '../plan/dates';
import { PHASES, RACE_DATE, WEEK_SUMMARIES, type PhaseKey, type Session } from '../plan/plan';
import { EffortProfile } from './EffortProfile';

const PHASE_ORDER: PhaseKey[] = ['leadin', 'rebuild', 'base', 'build', 'specific', 'taper'];
const MAX_KM = Math.max(...WEEK_SUMMARIES.map((w) => w.km));

interface HeroProps {
  today: Date;
  currentWeek: number;
  upNext: { session: Session; isToday: boolean } | null;
  onOpen: (key: string) => void;
  onPickWeek: (week: number) => void;
}

export function Hero({ today, currentWeek, upNext, onOpen, onPickWeek }: HeroProps) {
  const daysToGo = daysBetween(today, fromKey(RACE_DATE));

  return (
    <header className="hero">
      <div className="wrap hero__top">
        <div className="hero__intro">
          <p className="hero__kicker">Road to JAKIM 2027</p>
          <h1 className="hero__title">From 4:06:52 to&nbsp;under&nbsp;3:50.</h1>
          <p className="hero__lead">
            A 29-week block for the Jakarta International Marathon on Sunday 13 June 2027. Five runs a week: base runs
            on Tuesday, Thursday and Saturday, speed on Wednesday, and the long run on Sunday.
          </p>
          {daysToGo > 0 && (
            <p className="hero__count">
              <span className="hero__countnum">{daysToGo}</span> days to the start line at Monas
            </p>
          )}
          {daysToGo === 0 && <p className="hero__count">Race day. Start at 5:32 and be patient.</p>}
        </div>

        {upNext && (
          <section className="upnext" aria-label={upNext.isToday ? 'Today’s session' : 'Next session'}>
            <p className="upnext__when">
              {upNext.isToday ? 'Today' : 'Next run'}, {fmtLong(fromKey(upNext.session.date), false)}
            </p>
            <h2 className="upnext__title">{upNext.session.title}</h2>
            <p className="upnext__meta">
              About {fmtDuration(upNext.session.minutes)}. {upNext.session.purpose.split('. ')[0]}.
            </p>
            <EffortProfile segments={upNext.session.segments} />
            <button className="btn btn--sun" onClick={() => onOpen(upNext.session.date)}>
              Open session
            </button>
          </section>
        )}
      </div>

      <Skyline currentWeek={currentWeek} onPickWeek={onPickWeek} />
    </header>
  );
}

function Skyline({ currentWeek, onPickWeek }: { currentWeek: number; onPickWeek: (w: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = WEEK_SUMMARIES.length;
  const tip = hover === null ? null : WEEK_SUMMARIES[hover];

  return (
    <section className="wrap skyline" aria-label="Weekly volume across the block">
      <div className="skyline__head">
        <h2 className="skyline__title">The block, week by week</h2>
        <p className="skyline__note">
          Each bar is one week’s distance. The solid part is the Sunday long run. Select a week to open it in the
          calendar.
        </p>
      </div>

      <div className="skyline__plot">
        <div className="skyline__bars" onPointerLeave={() => setHover(null)}>
          {WEEK_SUMMARIES.map((w) => {
            const long = w.longRun.km;
            const rest = Math.max(w.km - long, 0);
            const isNow = w.week === currentWeek;
            return (
              <button
                key={w.week}
                className={`skyline__bar ${isNow ? 'is-now' : ''}`}
                style={
                  {
                    '--c': `var(--ph-${w.phase})`,
                    '--h': `${(w.km / MAX_KM) * 100}%`,
                    '--i': w.week,
                  } as React.CSSProperties
                }
                onPointerEnter={() => setHover(w.week)}
                onFocus={() => setHover(w.week)}
                onBlur={() => setHover(null)}
                onClick={() => onPickWeek(w.week)}
                aria-label={`Week ${w.week}, ${PHASES[w.phase].name}, ${w.km} km. Long run ${long} km.${isNow ? ' This week.' : ''}`}
              >
                <span className="skyline__stack">
                  <span className="skyline__rest" style={{ flexGrow: rest }} />
                  <span className="skyline__long" style={{ flexGrow: long }} />
                </span>
                {isNow && <span className={`skyline__now ${w.week < n / 2 ? 'is-left' : 'is-right'}`}>This week</span>}
              </button>
            );
          })}
          <div className="skyline__sun" aria-hidden="true">
            <span>13 Jun</span>
          </div>

          {tip && (
            <div
              className="skyline__tip"
              role="presentation"
              style={{ left: `clamp(110px, ${((tip.week + 0.5) / (n + 2.2)) * 100}%, calc(100% - 110px))` }}
            >
              <strong>{tip.km} km</strong>
              <span>
                Week {tip.week}, {PHASES[tip.phase].name}
                {tip.down ? ' (lighter week)' : ''}
              </span>
              <span>Sunday: {tip.longRun.title}</span>
            </div>
          )}
        </div>

        <ol className="skyline__phases" aria-label="Phases">
          {PHASE_ORDER.map((p) => {
            const count = WEEK_SUMMARIES.filter((w) => w.phase === p).length;
            return (
              <li key={p} style={{ flexGrow: count, '--c': `var(--ph-${p})` } as React.CSSProperties}>
                {PHASES[p].name}
              </li>
            );
          })}
          <li className="skyline__phases-race">Race</li>
        </ol>
      </div>
    </section>
  );
}
