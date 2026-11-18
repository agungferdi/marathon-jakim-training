import type { Segment } from '../plan/plan';
import { ZONES, type ZoneKey } from '../plan/zones';

interface Block {
  km: number;
  zone: ZoneKey;
}

function toBlocks(segments: Segment[]): Block[] {
  const out: Block[] = [];
  for (const s of segments) {
    if (s.count) {
      for (let i = 0; i < s.count; i++) {
        out.push({ km: 0.06, zone: 'strides' });
        out.push({ km: 0.04, zone: 'recovery' });
      }
    } else if (s.reps) {
      s.reps.on.forEach((on, i) => {
        out.push({ km: on, zone: s.zone });
        if (i < s.reps!.on.length - 1) out.push({ km: s.reps!.off, zone: s.reps!.offZone ?? 'recovery' });
      });
    } else {
      out.push({ km: s.km, zone: s.zone });
    }
  }
  return out;
}

/**
 * The shape of a session: width = distance, height = intensity.
 * Decorative summary of the segment list printed next to it, so it's hidden from screen readers.
 */
export function EffortProfile({ segments, tall = false }: { segments: Segment[]; tall?: boolean }) {
  const blocks = toBlocks(segments);
  if (!blocks.length) return null;
  return (
    <div className={`effort ${tall ? 'effort--tall' : ''}`} aria-hidden="true">
      {blocks.map((b, i) => (
        <span
          key={i}
          className="effort__block"
          style={{
            flexGrow: b.km,
            height: `${Math.round(ZONES[b.zone].intensity * 100)}%`,
            background: ZONES[b.zone].color,
          }}
        />
      ))}
    </div>
  );
}
