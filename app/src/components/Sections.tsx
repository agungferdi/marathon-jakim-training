import { RACE_DATE, raceSplits } from '../plan/plan';
import { fmtClock, fmtPace } from '../plan/dates';
import { MAX_HR, ZONES, ZONE_ORDER } from '../plan/zones';
import { PaceChart } from './PaceChart';

export function Reasoning() {
  return (
    <section className="block" aria-labelledby="why-title">
      <div className="block__head">
        <h2 className="block__title" id="why-title">
          Why the plan looks like this
        </h2>
        <p className="block__lead">
          Built from your two October races. The 17 minutes come mostly from pacing and fuelling, plus about 5 minutes
          of new fitness.
        </p>
      </div>

      <PaceChart />

      <div className="why">
        <article>
          <h3>You started at 10K effort</h3>
          <p>
            Km 2–11 at JRF averaged HR 188–190, about 96% of your 196 max. Your first 10 km (50:57) were no slower than
            the first 10 km of your half marathon (50:40). Every tempo long run here practises holding 5:20–5:27 with HR
            under 175, so the right pace feels like a habit.
          </p>
        </article>
        <article>
          <h3>The wall arrived at km 33</h3>
          <p>
            Pace dropped from 5:50 to 6:41 and cadence fell from 178 to 165, while HR went down, not up. That points to
            fuel and leg endurance, not your heart and lungs. Long runs build to 32 km, Thursdays become medium-long
            runs, and every run over 20 km rehearses gels.
          </p>
        </article>
        <article>
          <h3>Your half marathon says 3:55 today</h3>
          <p>
            1:52:34 converts to roughly a 3:55 marathon. Intervals and tempo runs on Wednesdays lift that by about 5
            minutes, and better pacing closes the rest. The half-marathon test on 11 April checks the maths: 1:47–1:49
            means you’re on track.
          </p>
        </article>
      </div>
    </section>
  );
}

export function ZonesTable() {
  return (
    <section className="block" aria-labelledby="zones-title">
      <div className="block__head">
        <h2 className="block__title" id="zones-title">
          Your paces and heart rate
        </h2>
        <p className="block__lead">
          Heart-rate ranges use {MAX_HR} bpm, the highest you hit at HM Malioboro. Paces step up from week 10 as you
          get fitter. In Jakarta heat, follow heart rate and let pace slip 10–20 s/km.
        </p>
      </div>
      <div className="tablewrap">
        <table className="zones">
          <thead>
            <tr>
              <th scope="col">Zone</th>
              <th scope="col">Weeks 0–9</th>
              <th scope="col">Weeks 10–29</th>
              <th scope="col">Heart rate</th>
              <th scope="col">How it feels</th>
            </tr>
          </thead>
          <tbody>
            {ZONE_ORDER.filter((k) => k !== 'recovery').map((k) => {
              const z = ZONES[k];
              const unit = (p: string) => (/\d/.test(p) ? `${p} /km` : p);
              return (
                <tr key={k}>
                  <th scope="row">
                    <span className="zones__swatch" style={{ background: z.color }} />
                    {z.name}
                  </th>
                  <td className="num">{unit(z.pace.foundation)}</td>
                  <td className="num">{unit(z.pace.sharpening)}</td>
                  <td className="num">{z.hr}</td>
                  <td>{z.feel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RaceDayPlan({ onOpen }: { onOpen: (key: string) => void }) {
  const splits = raceSplits();
  const finish = splits.at(-1)!;
  const show = splits.filter((s) => [10, 21.0975, 30, 42.195].includes(s.at));
  return (
    <section className="block raceday" aria-labelledby="race-title">
      <div className="block__head">
        <h2 className="block__title" id="race-title">
          Race day, 13 June 2027
        </h2>
        <p className="block__lead">
          Slower than you want for 5 km, then steady, then whatever you have left. The plan finishes in{' '}
          {fmtClock(finish.sec)}, a two-minute buffer under 3:50.
        </p>
      </div>
      <div className="raceday__track">
        {show.map((s) => (
          <div key={s.at} className="raceday__cp">
            <span className="raceday__at">
              {s.at === 42.195 ? 'Finish' : s.at === 21.0975 ? 'Halfway' : `${s.at} km`}
            </span>
            <span className="raceday__clock">{fmtClock(s.sec)}</span>
            <span className="raceday__pace">{fmtPace(s.paceSec)} /km</span>
          </div>
        ))}
      </div>
      <button className="btn btn--ink" onClick={() => onOpen(RACE_DATE)}>
        Open the full race plan
      </button>
    </section>
  );
}
