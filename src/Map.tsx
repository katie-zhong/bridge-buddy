import { useEffect, useRef, useState } from 'react';
import { go, when, MATERIALS, type CourseBridge, type Mark, type Plank } from './ui';
import { MaterialIcon, MaterialPlank, PlankIcon, TrollArt, type Mood } from './Troll';

// Painted in the shared style (see the bridgeway-design skill): flat shapes with the `paint`
// filters from PaintDefs, a lighter and a deeper wash of one hue, no dark outlines.

// Stable pseudo-random numbers, so scenery sits in the same place on every render.
const rand = (seed: number) => { const x = Math.sin(seed * 99.17) * 43758.5453; return x - Math.floor(x); };
const f1 = (n: number) => n.toFixed(1);

export const rotWord = (p: Plank) => (p.rot === 2 ? 'Rotten' : p.rot === 1 ? 'Starting to rot' : '');

function summary(c: CourseBridge) {
  return {
    level: c.planks.length ? Math.min(...c.planks.map((p) => p.level)) : 0,
    rotting: c.planks.filter((p) => p.rot > 0).length,
    gaps: c.planks.filter((p) => p.open > 0).length,
  };
}
const summaryWords = (c: CourseBridge) => {
  const s = summary(c);
  return [`${c.planks.length} lecture${c.planks.length === 1 ? '' : 's'}`, `weakest plank: ${MATERIALS[s.level].toLowerCase()}`, s.rotting ? `${s.rotting} rotting` : '', s.gaps ? `${s.gaps} gap${s.gaps === 1 ? '' : 's'}` : ''].filter(Boolean);
};

/** A lake outline: an ellipse with a gentle, repeatable wobble, smoothed through its midpoints. */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, grow = 1, n = 30) {
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

const FLAG = { meadow: '#d6684d', garden: '#8a6bb8', rocks: '#4a89a8' } as Record<string, string>;
const GREENS = ['#7fb07a', '#6aa06c', '#8cba82'];

// ---- the forest, seen from above ---------------------------------------------------------
const W = 960, H = 640;
const LAKES = [
  { cx: 235, cy: 168, rx: 170, ry: 80, tilt: -5, seed: 1.2 },
  { cx: 712, cy: 252, rx: 176, ry: 86, tilt: 4, seed: 3.4 },
  { cx: 345, cy: 462, rx: 185, ry: 88, tilt: -3, seed: 5.1 },
  { cx: 800, cy: 540, rx: 110, ry: 58, tilt: 2, seed: 7.7 },
];
const HALF = (l: { rx: number }) => l.rx + 34; // the bridge runs a little past the shore each side
const JUNCTION = { x: 482, y: 352 };

const rot = (l: { cx: number; cy: number; tilt: number }, dx: number) => {
  const a = (l.tilt * Math.PI) / 180;
  return { x: l.cx + dx * Math.cos(a), y: l.cy + dx * Math.sin(a) };
};
// Trails: from each bridge's near end to the crossroads, and from each far end off the map.
const TRAILS = [
  { from: rot(LAKES[0], HALF(LAKES[0])), to: JUNCTION, bend: [-10, 60] },
  { from: rot(LAKES[1], -HALF(LAKES[1])), to: JUNCTION, bend: [20, 40] },
  { from: rot(LAKES[2], HALF(LAKES[2])), to: JUNCTION, bend: [30, -30] },
  { from: rot(LAKES[0], -HALF(LAKES[0])), to: { x: -10, y: 120 }, bend: [-20, 30] },
  { from: rot(LAKES[1], HALF(LAKES[1])), to: { x: 970, y: 300 }, bend: [20, 30] },
  { from: rot(LAKES[2], -HALF(LAKES[2])), to: { x: -10, y: 520 }, bend: [-30, 20] },
].map((t) => ({ ...t, c: { x: (t.from.x + t.to.x) / 2 + t.bend[0], y: (t.from.y + t.to.y) / 2 + t.bend[1] } }));
const trailPath = (t: (typeof TRAILS)[number]) => `M${f1(t.from.x)} ${f1(t.from.y)} Q${f1(t.c.x)} ${f1(t.c.y)} ${f1(t.to.x)} ${f1(t.to.y)}`;
const TRAIL_POINTS = TRAILS.flatMap((t) => Array.from({ length: 14 }, (_, i) => {
  const s = i / 13, u = 1 - s;
  return { x: u * u * t.from.x + 2 * u * s * t.c.x + s * s * t.to.x, y: u * u * t.from.y + 2 * u * s * t.c.y + s * s * t.to.y };
}));

const TREES = (() => {
  const out: { x: number; y: number; r: number; g: string }[] = [];
  for (let k = 0; k < 420 && out.length < 120; k++) {
    const x = rand(k * 3 + 1) * W, y = rand(k * 3 + 2) * H, r = 12 + rand(k * 3 + 3) * 14;
    const inLake = LAKES.some((l) => ((x - l.cx) / (l.rx + r + 26)) ** 2 + ((y - l.cy) / (l.ry + r + 26)) ** 2 < 1);
    const onTrail = TRAIL_POINTS.some((p) => Math.hypot(p.x - x, p.y - y) < r + 20);
    const crowded = out.some((o) => Math.hypot(o.x - x, o.y - y) < (o.r + r) * 0.8);
    const atNorbu = Math.hypot(JUNCTION.x - x, JUNCTION.y - y) < r + 56;
    if (!inLake && !onTrail && !crowded && !atNorbu) out.push({ x, y, r, g: GREENS[k % 3] });
  }
  return out;
})();

function Tree({ x, y, r, g }: { x: number; y: number; r: number; g: string }) {
  return (
    <g>
      <ellipse cx={x + r * 0.28} cy={y + r * 0.42} rx={r} ry={r * 0.82} fill="#4c7d58" opacity=".28" />
      <circle cx={x} cy={y} r={r} fill={g} />
      <circle cx={x - r * 0.32} cy={y - r * 0.34} r={r * 0.55} fill="#a9d29a" opacity=".7" />
      <circle cx={x + r * 0.34} cy={y + r * 0.32} r={r * 0.5} fill="#4f8a5d" opacity=".4" />
    </g>
  );
}

function Lake({ cx, cy, rx, ry, seed, tilt }: (typeof LAKES)[number]) {
  return (
    <g transform={`rotate(${tilt} ${cx} ${cy})`}>
      <g filter="url(#paint-wide)">
        <path d={blob(cx, cy, rx, ry, seed, 1.12)} fill="#e6dcb9" />
        <path d={blob(cx, cy, rx, ry, seed)} fill="#9fcfcf" />
        <path d={blob(cx + 8, cy + 10, rx * 0.8, ry * 0.7, seed + 1)} fill="#7fb8bb" opacity=".8" />
        <path d={blob(cx - 22, cy - 18, rx * 0.5, ry * 0.4, seed + 2)} fill="#b9e0dc" opacity=".6" />
      </g>
      <path className="ripple" d={`M${cx - 90} ${cy + 34} q12 -6 24 0 t24 0 M${cx + 40} ${cy - 40} q10 -5 20 0 t20 0 M${cx + 70} ${cy + 46} q9 -4 18 0`} stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** The posts, rails and deck of one bridge. Its planks come in as children. */
function Bridge({ cx, cy, half, h, children }: { cx: number; cy: number; half: number; h: number; children: React.ReactNode }) {
  return (
    <g>
      <g filter="url(#paint)">
        <rect x={cx - half - 6} y={cy - h / 2 - 7} width={half * 2 + 12} height={Math.max(3.5, h * 0.18)} rx="2" fill="#a2845e" />
        <rect x={cx - half - 6} y={cy + h / 2 + 3} width={half * 2 + 12} height={Math.max(3.5, h * 0.18)} rx="2" fill="#a2845e" />
        {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => <circle key={`${sx}${sy}`} cx={cx + sx * (half + 4)} cy={cy + sy * (h / 2 + 5)} r={Math.max(4, h * 0.2)} fill="#8a6a45" />))}
      </g>
      {children}
    </g>
  );
}

/** The whole map: a forest with one lake and one bridge per course. Hover for the subject, click to open. */
export function ForestMap({ courses, mood, onOpen }: { courses: CourseBridge[]; mood: Mood; onOpen: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = courses.map((c, i) => ({ c, l: LAKES[i % LAKES.length] }));
  const tip = shown.find((s) => s.c.id === hover);
  return (
    <div className="mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="map" role="group" aria-label="Your bridges, one per course">
        <rect width={W} height={H} fill="#bfdba3" />
        <g filter="url(#paint-wide)">
          <path d={`M0 0 H${W} V120 C700 170 420 90 0 150Z`} fill="#b2d395" />
          <path d={`M0 ${H} H${W} V${H - 130} C600 ${H - 60} 300 ${H - 150} 0 ${H - 90}Z`} fill="#aacd8e" />
          <path d={`M${W} 330 C860 360 800 440 ${W} 470Z`} fill="#b6d79b" />
        </g>
        <g filter="url(#paint-wide)" fill="none" stroke="#ead9b0" strokeWidth="16" strokeLinecap="round">
          {TRAILS.map((t, i) => <path key={i} d={trailPath(t)} />)}
        </g>
        {shown.map(({ l }, i) => <Lake key={i} {...l} />)}
        <g filter="url(#paint)">{TREES.filter((_, i) => i % 2 === 0).map((t, i) => <Tree key={i} {...t} />)}</g>
        <g filter="url(#paint)">{TREES.filter((_, i) => i % 2 === 1).map((t, i) => <Tree key={i} {...t} />)}</g>

        {/* Norbu waits at the crossroads */}
        <g filter="url(#paint)"><ellipse cx={JUNCTION.x} cy={JUNCTION.y + 5} rx="36" ry="12" fill="#a39d8e" /></g>
        <g transform={`translate(${JUNCTION.x - 36} ${JUNCTION.y - 68}) scale(.6)`}><TrollArt mood={mood} /></g>

        {shown.map(({ c, l }) => {
          const half = HALF(l), n = Math.max(c.planks.length, 1), gap = 4, h = 22;
          const pw = (half * 2 - gap * (n - 1)) / n;
          const words = summaryWords(c);
          return (
            <g key={c.id} transform={`rotate(${l.tilt} ${l.cx} ${l.cy})`} className="bridgebtn" role="button" tabIndex={0}
              aria-label={`${c.code}, ${c.title}. ${words.join(', ')}. Open this bridge.`}
              onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}
              onClick={() => onOpen(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c.id); } }}>
              <rect className="glow" x={l.cx - half - 16} y={l.cy - 34} width={half * 2 + 32} height="68" rx="34" />
              <Bridge cx={l.cx} cy={l.cy} half={half} h={h}>
                {c.planks.map((p, i) => (
                  <g key={p.lecture_id} transform={`translate(${f1(l.cx - half + i * (pw + gap) + pw / 2)} ${l.cy})`}>
                    <MaterialPlank level={p.level} rot={p.rot} open={p.open > 0} len={pw} h={h} />
                  </g>
                ))}
              </Bridge>
              <rect className="hit" x={l.cx - half - 16} y={l.cy - 34} width={half * 2 + 32} height="68" />
            </g>
          );
        })}
      </svg>

      {tip && (
        <div className="plantip bridgetip" style={{ left: `${(tip.l.cx / W) * 100}%`, top: `${((tip.l.cy - tip.l.ry - 22) / H) * 100}%` }} role="status">
          <strong>{tip.c.code}</strong>
          <span>{tip.c.title}</span>
          <p className="chipsrow">
            {summaryWords(tip.c).map((w) => <span key={w} className="tag">{w}</span>)}
          </p>
          <small>{tip.c.exam_label} {when(tip.c.exam_at)} · click to open</small>
        </div>
      )}
    </div>
  );
}

/** One course up close: its lake, its bridge, one plank per lecture. Hover a plank for the lecture. */
export function BridgeView({ course, open, mood }: { course: CourseBridge; open: Mark[]; mood: Mood }) {
  const [tip, setTip] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = (i: number) => { clearTimeout(timer.current); setTip(i); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 280); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const W2 = 960, H2 = 400, y = 196, x0 = 150, x1 = 810, gap = 7, h = 36;
  const n = Math.max(course.planks.length, 1), pw = (x1 - x0 - gap * (n - 1)) / n;
  const px = (i: number) => x0 + i * (pw + gap) + pw / 2;
  const active = tip == null ? null : course.planks[tip];
  const gapMark = active && open.find((m) => m.lecture_id === active.lecture_id);
  const flag = FLAG[course.theme] || FLAG.meadow;
  const trees = TREES.filter((t) => t.x < 120 || t.x > 840).slice(0, 26).map((t, i) => ({ ...t, y: (t.y / H) * H2 * 0.95 + (i % 3) * 4 }));

  return (
    <div className="mapwrap" onMouseLeave={hide}>
      <svg viewBox={`0 0 ${W2} ${H2}`} className="map" role="group" aria-label={`${course.code}: your bridge to ${course.exam_label}`}>
        <rect width={W2} height={H2} fill="#bfdba3" />
        <g filter="url(#paint-wide)">
          <path d={`M0 0 H${W2} V70 C640 110 320 50 0 90Z`} fill="#b2d395" />
          <path d={`M0 ${H2} H${W2} V${H2 - 60} C640 ${H2 - 20} 320 ${H2 - 80} 0 ${H2 - 40}Z`} fill="#aacd8e" />
        </g>
        <Lake cx={W2 / 2} cy={y + 6} rx={350} ry={128} seed={2.3} tilt={0} />
        <g filter="url(#paint)">{trees.map((t, i) => <Tree key={i} {...t} />)}</g>

        {/* Norbu on a rock under the bridge */}
        <g filter="url(#paint)"><ellipse cx={W2 / 2} cy={y + 78} rx="52" ry="15" fill="#a39d8e" /></g>
        <g transform={`translate(${W2 / 2 - 48} ${y + 8}) scale(.8)`}><TrollArt mood={mood} /></g>

        <Bridge cx={(x0 + x1) / 2} cy={y} half={(x1 - x0) / 2 + 4} h={h}>
          {course.planks.map((p, i) => (
            <g key={p.lecture_id} className="plank" role="button" tabIndex={0} transform={`translate(${f1(px(i))} ${y})`}
              aria-label={`${p.title}: ${[MATERIALS[p.level], rotWord(p), p.open ? `${p.open} gap flagged` : ''].filter(Boolean).join(', ')}. Press Enter to renovate.`}
              onMouseEnter={() => show(i)} onFocus={() => show(i)} onClick={() => show(i)}
              onKeyDown={(e) => { if (e.key === 'Enter') go(`/renovate/${p.lecture_id}`); if (e.key === 'Escape') setTip(null); }}>
              <MaterialPlank level={p.level} rot={p.rot} open={p.open > 0} len={pw} h={h} />
              <rect className="ring" x={-pw / 2 - 3} y={-h / 2 - 4} width={pw + 6} height={h + 8} rx="8" />
            </g>
          ))}
        </Bridge>

        {/* course sign and exam flag */}
        <g filter="url(#paint)">
          <rect x="60" y={y - 18} width="5" height="62" rx="2" fill="#a08a66" />
          <rect x="22" y={y - 52} width="82" height="34" rx="9" fill="#fffdf7" />
          <rect x="893" y={y - 70} width="5" height="116" rx="2" fill="#a08a66" />
          <path d={`M897 ${y - 68} H795 l12 16 l-12 16 H897Z`} fill={flag} />
        </g>
        <text x="63" y={y - 30} textAnchor="middle" className="sign">{course.code}</text>
        <text x="846" y={y - 46} textAnchor="middle" className="sign light">{course.exam_label}</text>
        <text x="896" y={y + 64} textAnchor="middle" className="sign small">{when(course.exam_at)}</text>
      </svg>

      {active && tip != null && (
        <div className="plantip below" style={{ left: `${Math.min(84, Math.max(16, (px(tip) / W2) * 100))}%`, top: `${((y + h / 2 + 16) / H2) * 100}%` }}
          role="dialog" aria-label={active.title} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hide}>
          <strong>{active.title}</strong>
          <small>{when(active.held_at)} · {active.mine ? 'added by you' : `from ${active.source}`}</small>
          <p className="chipsrow">
            <span className="tag">{MATERIALS[active.level]}</span>
            {active.rot > 0 && <span className="tag">{rotWord(active)} · {active.newer} lectures since you were here</span>}
            {active.open > 0 && <span className="tag">{active.open} gap{active.open === 1 ? '' : 's'} flagged</span>}
          </p>
          <div className="actions">
            <button className="primary small" onClick={() => go(`/renovate/${active.lecture_id}`)}>
              {active.level < MATERIALS.length - 1 ? `Renovate to ${MATERIALS[active.level + 1].toLowerCase()}` : 'Practise again'}
            </button>
            {gapMark && <button className="ghost small" onClick={() => go(`/repair/${gapMark.id}`)}>Mend gap</button>}
            <button className="ghost small" onClick={() => go(`/lecture/${active.lecture_id}`)}>Open lecture</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <ul className="legend">
      {MATERIALS.map((m, i) => <li key={m}><MaterialIcon level={i} /><span>{m}</span></li>)}
      <li><MaterialIcon level={0} rot={2} /><span>Rotting</span></li>
      <li><PlankIcon state="gap" /><span>Gap flagged</span></li>
    </ul>
  );
}
