import { useState } from 'react';
import { useWidth } from '../useWidth';
import { fmtPace } from '../plan/dates';
import { RACE_PACING } from '../plan/plan';
import { JRF_SPLITS } from '../plan/races';

const H = 280;
const PAD = { top: 18, right: 92, bottom: 34, left: 46 };
const Y_MIN = 280; // 4:40 (faster, top)
const Y_MAX = 420; // 7:00 (slower, bottom)
const TICKS = [285, 315, 345, 375, 405];
const X_MAX = 43;

const planSecAt = (km: number) => RACE_PACING.find((b) => km - 0.5 < b.toKm)?.sec ?? RACE_PACING.at(-1)!.sec;

/** JRF 2026 pace per km against the JAKIM pacing plan. One axis: pace. */
export function PaceChart() {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const narrow = W < 520;
  const pad = { ...PAD, right: narrow ? 16 : PAD.right };

  const x = (km: number) => pad.left + (km / X_MAX) * (W - pad.left - pad.right);
  const y = (sec: number) => pad.top + ((sec - Y_MIN) / (Y_MAX - Y_MIN)) * (H - pad.top - pad.bottom);

  const jrfPath = JRF_SPLITS.map((p, i) => `${i ? 'L' : 'M'}${x(p.km - 0.5)},${y(p.sec)}`).join(' ');
  const planPath = RACE_PACING.map(
    (b) => `M${x(b.fromKm)},${y(b.sec)} L${x(Math.min(b.toKm, 42.195))},${y(b.sec)}`,
  ).join(' ');

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const km = ((e.clientX - r.left) / r.width) * X_MAX;
    setHover(Math.min(43, Math.max(1, Math.ceil(km))));
  };

  const h = hover ? JRF_SPLITS[hover - 1] : null;
  const wall = JRF_SPLITS[32];

  return (
    <figure className="chart">
      <figcaption className="chart__cap">
        <span className="chart__title">Pace per km: JRF 2026 against the JAKIM plan</span>
        <span className="chart__legend">
          <span className="lg lg--jrf">JRF 2026, what happened</span>
          <span className="lg lg--plan">JAKIM 2027, the plan</span>
        </span>
      </figcaption>

      <div className="chart__plot" ref={ref}>
        <svg width={W} height={H} role="img" aria-label="Line chart. JRF pace started at 4:53 to 5:12 per km, slowed through the 5:40s after km 20, and dropped to 6:16 to 6:52 from km 33. The JAKIM plan holds 5:32 for 5 km, 5:25 to km 30, then 5:20.">
          {TICKS.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={pad.left - 8} y={y(t) + 4} textAnchor="end">
                {fmtPace(t)}
              </text>
            </g>
          ))}
          {[0, 10, 20, 30, 40].map((k) => (
            <text key={k} className="chart__tick" x={x(k)} y={H - 12} textAnchor="middle">
              {k === 0 ? 'Start' : `${k} km`}
            </text>
          ))}
          <line className="chart__axis" x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} />

          <path className="chart__plan" d={planPath} />
          <path className="chart__jrf" d={jrfPath} />

          {/* annotation: the wall */}
          <circle className="chart__mark" cx={x(wall.km - 0.5)} cy={y(wall.sec)} r={4.5} />
          <text className="chart__note" x={x(wall.km - 0.5) - 8} y={y(wall.sec) + 22} textAnchor="end">
            Km 33: out of fuel
          </text>

          {!narrow && (
            <>
              <text className="chart__direct" x={x(43) + 8} y={y(JRF_SPLITS[42].sec) + 4}>
                JRF
              </text>
              <text className="chart__direct" x={x(42.195) + 8} y={y(320) + 4}>
                Plan
              </text>
            </>
          )}

          {h && (
            <g className="chart__cross" pointerEvents="none">
              <line x1={x(h.km - 0.5)} x2={x(h.km - 0.5)} y1={pad.top} y2={H - pad.bottom} />
              <circle className="chart__dot chart__dot--jrf" cx={x(h.km - 0.5)} cy={y(h.sec)} r={4.5} />
              {h.km <= 42 && <circle className="chart__dot chart__dot--plan" cx={x(h.km - 0.5)} cy={y(planSecAt(h.km))} r={4.5} />}
            </g>
          )}

          <rect
            x={pad.left}
            y={pad.top}
            width={W - pad.left - pad.right}
            height={H - pad.top - pad.bottom}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {h && (
          <div
            className="chart__tip"
            style={{ left: Math.min(Math.max(x(h.km - 0.5), 90), W - 90), top: 4 }}
            role="presentation"
          >
            <span className="chart__tipkm">Km {h.km}</span>
            <span className="tiprow tiprow--jrf">
              <strong>{fmtPace(h.sec)} /km</strong> JRF, HR {h.hr}
            </span>
            {h.km <= 42 && (
              <span className="tiprow tiprow--plan">
                <strong>{fmtPace(planSecAt(h.km))} /km</strong> plan
              </span>
            )}
          </div>
        )}
      </div>

      <details className="chart__table">
        <summary>Show the numbers</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Km</th>
              <th scope="col">JRF pace</th>
              <th scope="col">JRF HR</th>
              <th scope="col">Plan pace</th>
            </tr>
          </thead>
          <tbody>
            {JRF_SPLITS.map((p) => (
              <tr key={p.km}>
                <th scope="row">{p.km}</th>
                <td>{fmtPace(p.sec)}</td>
                <td>{p.hr}</td>
                <td>{p.km <= 42 ? fmtPace(planSecAt(p.km)) : 'Finish'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
