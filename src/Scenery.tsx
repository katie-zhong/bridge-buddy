// Geometry helpers and painted scenery for the map. Everything here is drawn the way the
// bridgeway-design skill says: flat shapes, a lighter and a deeper wash, no dark outlines.
// Wrap groups of these in `filter="url(#paint)"` (small things) or `paint-wide` (scenery).

export interface Pt { x: number; y: number }
export const P = (x: number, y: number): Pt => ({ x, y });
export const f1 = (n: number) => n.toFixed(1);

// Stable pseudo-random numbers, so scenery sits in the same place on every render.
export const rand = (seed: number) => { const x = Math.sin(seed * 99.17) * 43758.5453; return x - Math.floor(x); };

export const bez = (p: Pt[], t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
};
export const bezPath = (p: Pt[]) => `M${f1(p[0].x)} ${f1(p[0].y)} C${f1(p[1].x)} ${f1(p[1].y)} ${f1(p[2].x)} ${f1(p[2].y)} ${f1(p[3].x)} ${f1(p[3].y)}`;
export const quadAt = (a: Pt, c: Pt, b: Pt) => (t: number): Pt => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
};

/** A lake outline: an ellipse with a gentle, repeatable wobble, smoothed through its midpoints. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, grow = 1, n = 30) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 2.1) + 0.04 * Math.sin(8 * a + seed * 0.7);
    return [cx + Math.cos(a) * rx * k * grow, cy + Math.sin(a) * ry * k * grow];
  });
  const mid = (a: number[], b: number[]) => `${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[n - 1], pts[0])}`;
  for (let i = 0; i < n; i++) d += ` Q${f1(pts[i][0])} ${f1(pts[i][1])} ${mid(pts[i], pts[(i + 1) % n])}`;
  return `${d}Z`;
}

// ---- laying blocks along a curve --------------------------------------------------------
type Curve = (t: number) => Pt;

/** Parameter values that cut a curve into `n` pieces of equal length. */
export function splitEven(f: Curve, n: number, samples = 240): number[] {
  const len = [0];
  let prev = f(0);
  for (let i = 1; i <= samples; i++) {
    const p = f(i / samples);
    len.push(len[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const out = [0];
  for (let k = 1; k <= n; k++) {
    const target = (len[samples] * k) / n;
    let i = 1;
    while (i < samples && len[i] < target) i++;
    const span = len[i] - len[i - 1] || 1;
    out.push((i - 1 + (target - len[i - 1]) / span) / samples);
  }
  return out;
}

/** Position and direction of a curve at t. `nx, ny` point to the outside (the left of travel). */
export function frameAt(f: Curve, t: number) {
  const e = 0.002, a = f(Math.max(0, t - e)), b = f(Math.min(1, t + e));
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const tx = (b.x - a.x) / d, ty = (b.y - a.y) / d;
  return { p: f(t), tx, ty, nx: ty, ny: -tx };
}

export type Poly = [number, number][];
export interface Block { x: number; y: number; angle: number; len: number; poly: Poly }

/**
 * Cuts a curve into `n` blocks of equal length, each `h` thick. A block is drawn around its own
 * centre, turned to follow the curve; `poly` is its outline (outer-left, outer-right, inner-right,
 * inner-left), so on an arch the blocks are wedges and the joints really point at the centre.
 */
export function layBlocks(f: Curve, n: number, h: number, gap = 3): Block[] {
  if (n < 1) return [];
  const ts = splitEven(f, n);
  return Array.from({ length: n }, (_, k) => {
    const c = frameAt(f, (ts[k] + ts[k + 1]) / 2);
    const toLocal = (t: number, side: 1 | -1): [number, number] => {
      const b = frameAt(f, t);
      const px = b.p.x + side * b.nx * (h / 2) - c.p.x, py = b.p.y + side * b.ny * (h / 2) - c.p.y;
      // local x runs along the curve, local y points inward (to the right of travel)
      return [px * c.tx + py * c.ty, -px * c.ty + py * c.tx];
    };
    const o0 = toLocal(ts[k], 1), o1 = toLocal(ts[k + 1], 1), i1 = toLocal(ts[k + 1], -1), i0 = toLocal(ts[k], -1);
    const nudge = (q: [number, number], dir: 1 | -1): [number, number] => [q[0] + dir * gap / 2, q[1]];
    const poly: Poly = [nudge(o0, 1), nudge(o1, -1), nudge(i1, -1), nudge(i0, 1)];
    return { x: c.p.x, y: c.p.y, angle: (Math.atan2(c.ty, c.tx) * 180) / Math.PI, len: (Math.hypot(o1[0] - o0[0], o1[1] - o0[1]) + Math.hypot(i1[0] - i0[0], i1[1] - i0[1])) / 2, poly };
  });
}

/** A polyline running `d` to the outside of a curve (negative d = inside). */
export function offsetLine(f: Curve, d: number, steps = 56) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const b = frameAt(f, i / steps);
    return `${i ? 'L' : 'M'}${f1(b.p.x + b.nx * d)} ${f1(b.p.y + b.ny * d)}`;
  }).join(' ');
}

// ---- trees, bushes, rocks -----------------------------------------------------------------
const CANOPY = ['#7fb07a', '#6aa06c', '#8cba82'];

/** A tree seen from above. */
export function TreeTop({ x, y, r, kind, tone }: { x: number; y: number; r: number; kind: 'round' | 'pine'; tone: number }) {
  if (kind === 'pine') {
    const spikes = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2, b = ((i + 0.5) / 10) * Math.PI * 2;
      return `${f1(x + Math.cos(a) * r)},${f1(y + Math.sin(a) * r)} ${f1(x + Math.cos(b) * r * 0.6)},${f1(y + Math.sin(b) * r * 0.6)}`;
    }).join(' ');
    return (
      <g>
        <ellipse cx={x + r * 0.3} cy={y + r * 0.45} rx={r} ry={r * 0.8} fill="#3f6f52" opacity=".28" />
        <polygon points={spikes} fill="#4d8566" />
        <circle cx={x - r * 0.18} cy={y - r * 0.2} r={r * 0.42} fill="#7ab394" opacity=".75" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={x + r * 0.28} cy={y + r * 0.42} rx={r} ry={r * 0.82} fill="#4c7d58" opacity=".28" />
      <circle cx={x} cy={y} r={r} fill={CANOPY[tone % 3]} />
      <circle cx={x - r * 0.32} cy={y - r * 0.34} r={r * 0.55} fill="#a9d29a" opacity=".7" />
      <circle cx={x + r * 0.34} cy={y + r * 0.32} r={r * 0.5} fill="#4f8a5d" opacity=".4" />
    </g>
  );
}

export function Bush({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#6f9f5f" /><circle cx={x + r * 0.9} cy={y + r * 0.2} r={r * 0.75} fill="#7fb06c" /><circle cx={x - r * 0.8} cy={y + r * 0.3} r={r * 0.65} fill="#628f56" />
      <circle cx={x - r * 0.2} cy={y - r * 0.3} r={r * 0.4} fill="#a3cf8f" opacity=".7" />
      {r > 7 && <><circle cx={x + r * 0.5} cy={y - r * 0.5} r="2.2" fill="#f2a1a1" /><circle cx={x - r * 0.4} cy={y + r * 0.4} r="2" fill="#f6d365" /></>}
    </g>
  );
}

export function Rock({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <ellipse cx={x + 2} cy={y + r * 0.4} rx={r * 1.1} ry={r * 0.5} fill="#5b6a5c" opacity=".25" />
      <ellipse cx={x} cy={y} rx={r * 1.1} ry={r * 0.8} fill="#b4b6ae" />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.25} rx={r * 0.6} ry={r * 0.35} fill="#d3d4cc" opacity=".8" />
    </g>
  );
}

export function Flowers({ x, y, seed }: { x: number; y: number; seed: number }) {
  const col = ['#f6d365', '#f4a9a0', '#ffffff', '#c6a7e8'];
  return (
    <g>{Array.from({ length: 5 }, (_, i) => (
      <g key={i}><circle cx={x + (rand(seed + i) - 0.5) * 26} cy={y + (rand(seed + i + 9) - 0.5) * 16} r="3.2" fill={col[(seed + i) % 4]} /><circle cx={x + (rand(seed + i) - 0.5) * 26} cy={y + (rand(seed + i + 9) - 0.5) * 16} r="1.1" fill="#e59a3c" /></g>
    ))}</g>
  );
}

export function LilyPads({ x, y, seed }: { x: number; y: number; seed: number }) {
  return (
    <g>{Array.from({ length: 4 }, (_, i) => {
      const px = x + (rand(seed + i) - 0.5) * 60, py = y + (rand(seed + i + 4) - 0.5) * 26;
      return <g key={i}><ellipse cx={px} cy={py} rx="9" ry="5.5" fill="#6aa06c" />{i === 0 && <circle cx={px + 2} cy={py - 1} r="2.6" fill="#f4b6c2" />}</g>;
    })}</g>
  );
}

/** A tree seen from the side, `s` is roughly its height. (x, y) is where the trunk meets the ground. */
export function TreeSide({ x, y, s, kind, tone = 0 }: { x: number; y: number; s: number; kind: 'round' | 'pine'; tone?: number }) {
  if (kind === 'pine') {
    return (
      <g>
        <rect x={x - s * 0.05} y={y - s * 0.22} width={s * 0.1} height={s * 0.24} rx="2" fill="#a08a66" />
        <polygon points={`${x},${y - s} ${x + s * 0.26},${y - s * 0.58} ${x - s * 0.26},${y - s * 0.58}`} fill="#5f9a76" />
        <polygon points={`${x},${y - s * 0.78} ${x + s * 0.32},${y - s * 0.36} ${x - s * 0.32},${y - s * 0.36}`} fill="#528b6a" />
        <polygon points={`${x},${y - s * 0.56} ${x + s * 0.38},${y - s * 0.14} ${x - s * 0.38},${y - s * 0.14}`} fill="#4a8061" />
        <polygon points={`${x},${y - s} ${x - s * 0.1},${y - s * 0.74} ${x - s * 0.2},${y - s * 0.6} ${x - s * 0.26},${y - s * 0.58}`} fill="#8bc4a1" opacity=".55" />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - s * 0.06} y={y - s * 0.46} width={s * 0.12} height={s * 0.48} rx="2.5" fill="#a08a66" />
      <circle cx={x - s * 0.2} cy={y - s * 0.55} r={s * 0.25} fill="#6aa06c" />
      <circle cx={x + s * 0.21} cy={y - s * 0.56} r={s * 0.26} fill="#7fb07a" />
      <circle cx={x} cy={y - s * 0.74} r={s * 0.32} fill={CANOPY[tone % 3]} />
      <circle cx={x - s * 0.1} cy={y - s * 0.83} r={s * 0.17} fill="#b3d9a3" opacity=".7" />
      <circle cx={x + s * 0.17} cy={y - s * 0.62} r={s * 0.17} fill="#4f8a5d" opacity=".35" />
    </g>
  );
}

export function Reeds({ x, y, n = 7 }: { x: number; y: number; n?: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const dx = (i - n / 2) * 6 + (rand(x + i) - 0.5) * 4, hgt = 34 + rand(y + i * 3) * 26, lean = (rand(i + x) - 0.5) * 12;
        return <g key={i}><path d={`M${f1(x + dx)} ${y} q${f1(lean / 2)} ${-hgt / 2} ${f1(lean)} ${-hgt}`} stroke="#6f9f5f" strokeWidth="3" />{i % 3 === 0 && <ellipse cx={x + dx + lean} cy={y - hgt - 5} rx="3.2" ry="8" fill="#a07a52" stroke="none" />}</g>;
      })}
    </g>
  );
}

export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g opacity=".92">
      <ellipse cx={x} cy={y} rx={46 * s} ry={14 * s} fill="#fff" /><ellipse cx={x - 22 * s} cy={y - 8 * s} rx={22 * s} ry={14 * s} fill="#fff" /><ellipse cx={x + 14 * s} cy={y - 13 * s} rx={26 * s} ry={17 * s} fill="#fff" />
    </g>
  );
}

/** A little cabin seen from above: two roof halves, a ridge and a chimney. */
export function Cabin({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x + 6} cy={y + 16} rx="34" ry="14" fill="#4c7d58" opacity=".3" />
      <rect x={x - 30} y={y - 20} width="60" height="38" rx="4" fill="#d8b98a" />
      <rect x={x - 30} y={y - 20} width="60" height="19" rx="4" fill="#c4785a" />
      <rect x={x - 30} y={y - 1} width="60" height="19" rx="4" fill="#b2674b" />
      <rect x={x - 30} y={y - 3} width="60" height="4" fill="#e3a98c" opacity=".85" />
      <rect x={x + 12} y={y - 17} width="9" height="9" rx="1.5" fill="#9b958a" />
      <rect x={x + 13.5} y={y - 15.5} width="6" height="6" rx="1" fill="#5f5b54" />
    </g>
  );
}

/** A fallen log seen from above. */
export function Log({ x, y, a = 0, l = 36 }: { x: number; y: number; a?: number; l?: number }) {
  return (
    <g transform={`rotate(${a} ${x} ${y})`}>
      <ellipse cx={x + 2} cy={y + 5} rx={l / 2} ry="6" fill="#4c7d58" opacity=".25" />
      <rect x={x - l / 2} y={y - 6} width={l} height="12" rx="6" fill="#a2845e" />
      <rect x={x - l / 2 + 3} y={y - 4.5} width={l - 6} height="4" rx="2" fill="#c0a27a" opacity=".8" />
      <circle cx={x + l / 2 - 5} cy={y} r="4.4" fill="#d6b98c" /><circle cx={x + l / 2 - 5} cy={y} r="1.8" fill="#b6935f" />
    </g>
  );
}
