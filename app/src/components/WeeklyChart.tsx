import { useState } from 'react';
import { useWidth } from '../useWidth';
import { PHASES, WEEK_SUMMARIES } from '../plan/plan';
import { fmtKm, type WeekTotals } from '../log/log';

const H = 230;
const PAD = { top: 34, right: 8, bottom: 30, left: 44 };

/** Rect with rounded top corners, anchored to the baseline. */
function bar(x: number, y: number, w: number, h: number, r = 3) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

interface Props {
  totals: WeekTotals[];
  currentWeek: number;
  onPickWeek: (week: number) => void;
}

/** Planned distance per week (dashed outline) against what you ran (solid). One axis: km. */
export function WeeklyChart({ totals, currentWeek, onPickWeek }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const narrow = W < 560;

  const top = Math.max(...totals.map((t) => Math.max(t.planned, t.run)));
  const yMax = Math.ceil(top / 20) * 20;
  const ticks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / totals.length;
  const y = (km: number) => PAD.top + plotH - (km / yMax) * plotH;
  const sx = (i: number) => PAD.left + i * slot;
  const planW = Math.max(4, slot * 0.72);
  const runW = Math.max(3, slot * 0.42);
  const labelEvery = narrow ? 7 : 4;

  const h = hover === null ? null : totals[hover];

  return (
    <figure className="chart">
      <figcaption className="chart__cap">
        <span className="chart__title">Distance per week: what you ran against the plan</span>
        <span className="chart__legend">
          <span className="lg lg--planned">Planned</span>
          <span className="lg lg--run">Run</span>
        </span>
      </figcaption>

      <div className="chart__plot" ref={ref}>
        <svg
          width={W}
          height={H}
          role="img"
          aria-label={`Bar chart of weekly distance for 30 weeks. Planned distance rises from ${totals[0].planned} km to a peak of ${top} km. The table below lists every week.`}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t ? 'chart__grid' : 'chart__axis'} x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
                {t ? `${t} km` : '0'}
              </text>
            </g>
          ))}

          {totals.map((t, i) => {
            const future = t.week > currentWeek;
            const isNow = t.week === currentWeek;
            const px = sx(i) + (slot - planW) / 2;
            const rx = sx(i) + (slot - runW) / 2;
            return (
              <g key={t.week} className={`wk ${future ? 'is-future' : ''} ${hover === i ? 'is-hover' : ''}`}>
                <path className="wk__planned" d={bar(px, y(t.planned), planW, y(0) - y(t.planned))} />
                {t.run > 0 && <path className="wk__run" d={bar(rx, y(t.run), runW, y(0) - y(t.run))} />}
                {isNow && (
                  <text className="chart__note" x={sx(i) + slot / 2} y={PAD.top - 12} textAnchor="middle">
                    This week
                  </text>
                )}
                {((t.week % labelEvery === 0 && t.week < totals.length - 3) || t.week === totals.length - 1) && (
                  <text className="chart__tick" x={sx(i) + slot / 2} y={H - 10} textAnchor="middle">
                    {t.week === totals.length - 1 ? 'Race' : `Wk ${t.week}`}
                  </text>
                )}
                <rect
                  x={sx(i)}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={() => setHover(i)}
                  onClick={() => onPickWeek(t.week)}
                />
              </g>
            );
          })}
        </svg>

        {h && (
          <div
            className="chart__tip"
            role="presentation"
            style={{ left: Math.min(Math.max(sx(hover!) + slot / 2, 95), W - 95), top: 0 }}
          >
            <span className="chart__tipkm">
              Week {h.week}, {PHASES[WEEK_SUMMARIES[h.week].phase].name}
            </span>
            <span className="tiprow tiprow--run">
              <strong>{fmtKm(h.run)} km</strong> run
            </span>
            <span className="tiprow tiprow--planned">
              <strong>{fmtKm(h.planned)} km</strong> planned
            </span>
            <span>
              {h.runsDone} of {h.runsPlanned} runs logged
            </span>
          </div>
        )}
      </div>

      <details className="chart__table">
        <summary>Show the numbers</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col">Phase</th>
              <th scope="col">Planned</th>
              <th scope="col">Run</th>
              <th scope="col">Runs logged</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.week}>
                <th scope="row">{t.week}</th>
                <td>{PHASES[WEEK_SUMMARIES[t.week].phase].name}</td>
                <td>{fmtKm(t.planned)} km</td>
                <td>{fmtKm(t.run)} km</td>
                <td>
                  {t.runsDone} of {t.runsPlanned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
