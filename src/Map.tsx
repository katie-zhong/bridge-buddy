import { useEffect, useRef, useState } from 'react';
import { go, when, MATERIALS, type CourseBridge, type Mark, type Plank } from './ui';
import { MaterialBlock, MaterialIcon, PlankIcon, TrollArt, type Mood } from './Troll';
import {
  P, bez, bezPath, blob, f1, frameAt, layBlocks, offsetLine, quadAt, rand, splitEven,
  Bush, Cabin, Cloud, Flowers, LilyPads, Log, Reeds, Rock, TreeSide, TreeTop, type Pt,
} from './Scenery';

// Painted in the shared style (see the bridgeway-design skill): flat shapes under the `paint`
// filters from PaintDefs, a lighter and a deeper wash of one hue, no dark outlines.

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

const FLAG = { meadow: '#d6684d', garden: '#8a6bb8', rocks: '#4a89a8' } as Record<string, string>;

// ================================ the forest, seen from above ================================
const W = 960, H = 640;
const LAKES = [
  { cx: 235, cy: 168, rx: 170, ry: 80, tilt: -5, seed: 1.2, bend: -24 },
  { cx: 712, cy: 252, rx: 176, ry: 86, tilt: 4, seed: 3.4, bend: 22 },
  { cx: 345, cy: 462, rx: 185, ry: 88, tilt: -3, seed: 5.1, bend: -20 },
  { cx: 800, cy: 540, rx: 112, ry: 58, tilt: 2, seed: 7.7, bend: 16 },
];
const POND = LAKES[3]; // no bridge: Norbu's own pond
const half = (l: { rx: number }) => l.rx + 34; // a bridge runs a little past the shore each side
const rotPt = (l: { cx: number; cy: number; tilt: number }, dx: number): Pt => {
  const a = (l.tilt * Math.PI) / 180;
  return P(l.cx + dx * Math.cos(a), l.cy + dx * Math.sin(a));
};
const ends = LAKES.map((l) => ({ a: rotPt(l, -half(l)), b: rotPt(l, half(l)) }));

// The water is one system: rivers run in, through the lakes, and out of the map.
const RIVERS: Pt[][] = [
  [P(60, -30), P(90, 50), P(150, 100), P(205, 150)],     // down into the first lake
  [P(240, 235), P(235, 310), P(290, 360), P(325, 405)],  // first lake to the third
  [P(790, 170), P(800, 95), P(880, 40), P(940, -30)],    // second lake up to the edge
  [P(745, 330), P(775, 400), P(790, 455), P(800, 500)],  // second lake down to the pond
  [P(800, 590), P(690, 640), P(480, 630), P(330, 590)],  // pond west along the bottom
  [P(300, 545), P(298, 568), P(312, 582), P(330, 590)],  // third lake joins it
  [P(330, 590), P(220, 600), P(100, 640), P(-30, 665)],  // and leaves the map
];

// Trails link the bridges and run off the edges.
const TRAILS = [
  { from: ends[0].b, to: ends[1].a, bend: [0, 40] },
  { from: ends[1].b, to: P(975, 312), bend: [10, 24] },
  { from: ends[0].a, to: P(-15, 150), bend: [-10, 22] },
  { from: ends[2].a, to: P(-15, 540), bend: [-24, 10] },
  { from: ends[2].b, to: P(471, 232), bend: [30, -24] },
].map((t) => ({ ...t, c: P((t.from.x + t.to.x) / 2 + t.bend[0], (t.from.y + t.to.y) / 2 + t.bend[1]) }));
const trailPath = (t: (typeof TRAILS)[number]) => `M${f1(t.from.x)} ${f1(t.from.y)} Q${f1(t.c.x)} ${f1(t.c.y)} ${f1(t.to.x)} ${f1(t.to.y)}`;
const TRAIL_POINTS = TRAILS.flatMap((t) => Array.from({ length: 16 }, (_, i) => quadAt(t.from, t.c, t.to)(i / 15)));
const WATER_POINTS = RIVERS.flatMap((r) => Array.from({ length: 18 }, (_, i) => bez(r, i / 17)));

const CABIN = P(618, 388);
const clear = (x: number, y: number, pad: number) =>
  Math.hypot(CABIN.x - x, CABIN.y - y) > pad + 46 &&
  !LAKES.some((l) => ((x - l.cx) / (l.rx + pad + 24)) ** 2 + ((y - l.cy) / (l.ry + pad + 24)) ** 2 < 1)
  && !WATER_POINTS.some((p) => Math.hypot(p.x - x, p.y - y) < pad + 38)
  && !TRAIL_POINTS.some((p) => Math.hypot(p.x - x, p.y - y) < pad + 14);

const FOREST = (() => {
  const trees: { x: number; y: number; r: number; kind: 'round' | 'pine'; tone: number }[] = [];
  for (let k = 0; k < 900 && trees.length < 175; k++) {
    const x = rand(k * 5 + 1) * W, y = rand(k * 5 + 2) * H, r = 11 + rand(k * 5 + 3) * 14;
    if (clear(x, y, r) && !trees.some((o) => Math.hypot(o.x - x, o.y - y) < (o.r + r) * 0.78)) trees.push({ x, y, r, kind: rand(k * 5 + 4) < 0.36 ? 'pine' : 'round', tone: k });
  }
  const spread = (count: number, seed: number, pad: number, gap: number, taken: { x: number; y: number }[]) => {
    const out: { x: number; y: number; r: number; n: number }[] = [];
    for (let k = 0; k < 600 && out.length < count; k++) {
      const x = rand(seed + k * 3) * W, y = rand(seed + k * 3 + 1) * H, r = 5 + rand(seed + k * 3 + 2) * 6;
      if (clear(x, y, pad) && ![...taken, ...out].some((o) => Math.hypot(o.x - x, o.y - y) < gap)) out.push({ x, y, r, n: k });
    }
    return out;
  };
  const used = trees.map((t) => ({ x: t.x, y: t.y }));
  const bushes = spread(46, 4000, 10, 30, used);
  const rocks = spread(16, 7000, 8, 34, [...used, ...bushes]);
  const flowers = spread(22, 9000, 8, 40, [...used, ...bushes, ...rocks]);
  return { trees, bushes, rocks, flowers };
})();

/** One bridge from above: stone ends, a rail on each side, a shadow on the water, and one block per lecture. */
function OverviewBridge({ c, lakeIndex, hovered }: { c: CourseBridge; lakeIndex: number; hovered: boolean }) {
  const l = LAKES[lakeIndex % 3], e = ends[lakeIndex % 3];
  const f = quadAt(e.a, P((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2 + l.bend), e.b);
  const h = 22, side = h / 2 + 6;
  const blocks = layBlocks(f, c.planks.length, h, 2.5);
  const spine = offsetLine(f, 0);
  const posts = splitEven(f, 10).map((t) => frameAt(f, t));
  const capAngle = (t: number) => (Math.atan2(frameAt(f, t).ty, frameAt(f, t).tx) * 180) / Math.PI;
  return (
    <>
      <path d={spine} fill="none" stroke="#fffbe8" strokeWidth={h + 36} strokeLinecap="round" className="glow" opacity={hovered ? 0.85 : 0} />
      <g filter="url(#paint)">
        <path d={spine} transform="translate(4 9)" fill="none" stroke="#3f7f8c" strokeWidth={h + 10} strokeLinecap="round" opacity=".3" />
        {[0, 1].map((i) => (
          <g key={i} transform={`translate(${f1(i ? e.b.x : e.a.x)} ${f1(i ? e.b.y : e.a.y)}) rotate(${f1(capAngle(i))})`}>
            <rect x={i ? -10 : -16} y={-(h / 2 + 10)} width="26" height={h + 20} rx="10" fill="#d7cdb5" />
            <rect x={i ? -6 : -12} y={-(h / 2 + 7)} width="18" height={h * 0.45} rx="6" fill="#ece4cf" opacity=".85" />
          </g>
        ))}
        {[side, -side].map((d) => <path key={d} d={offsetLine(f, d)} fill="none" stroke="#a2845e" strokeWidth="3.4" strokeLinecap="round" />)}
        {[side, -side].flatMap((d) => posts.map((q, i) => <circle key={`${d}${i}`} cx={q.p.x + q.nx * d} cy={q.p.y + q.ny * d} r="3.6" fill="#8a6a45" />))}
      </g>
      {blocks.map((b, i) => (
        <g key={c.planks[i].lecture_id} transform={`translate(${f1(b.x)} ${f1(b.y)}) rotate(${f1(b.angle)})`}>
          <MaterialBlock level={c.planks[i].level} rot={c.planks[i].rot} open={c.planks[i].open > 0} len={b.len} h={h} poly={b.poly} joints={Math.max(0, Math.round(b.len / 30) - 1)} />
        </g>
      ))}
      <g filter="url(#paint)" pointerEvents="none">
        <path d={offsetLine(f, 2)} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".18" />
        {[h / 2 - 1.5, -h / 2 + 1.5].map((d) => <path key={d} d={offsetLine(f, d)} fill="none" stroke="#3c3a30" strokeWidth="3" strokeLinecap="round" opacity=".1" />)}
      </g>
      <path d={spine} className="hit" fill="none" stroke="transparent" strokeWidth={h + 36} strokeLinecap="round" />
    </>
  );
}

/** The whole map: a forest with a river system, a lake and a bridge per course. Hover for the subject, click to open. */
export function ForestMap({ courses, mood, onOpen }: { courses: CourseBridge[]; mood: Mood; onOpen: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = courses.map((c, i) => ({ c, i, l: LAKES[i % 3] }));
  const tip = shown.find((s) => s.c.id === hover);
  const rivers = RIVERS.map(bezPath);
  return (
    <div className="mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="map" role="group" aria-label="Your bridges, one per course">
        <rect width={W} height={H} fill="#bfdba3" />
        <g filter="url(#paint-wide)">
          <path d={`M0 0 H${W} V120 C700 170 420 90 0 150Z`} fill="#b2d395" />
          <path d={`M0 ${H} H${W} V${H - 110} C600 ${H - 50} 300 ${H - 140} 0 ${H - 80}Z`} fill="#aacd8e" />
          <path d={`M${W} 330 C860 360 800 440 ${W} 470Z`} fill="#b6d79b" />
          <path d="M0 300 C70 280 110 330 60 380 C30 410 0 400 0 400Z" fill="#b2d395" />
        </g>
        <g filter="url(#paint-wide)" fill="none" stroke="#ead9b0" strokeWidth="16" strokeLinecap="round">
          {TRAILS.map((t, i) => <path key={i} d={trailPath(t)} />)}
        </g>

        {/* water: sandy shores first, then the rivers and lakes on top, so they run together */}
        <g filter="url(#paint-wide)">
          <g fill="none" stroke="#e6dcb9" strokeWidth="52" strokeLinecap="round">{rivers.map((d, i) => <path key={i} d={d} />)}</g>
          {LAKES.map((l, i) => <path key={i} d={blob(l.cx, l.cy, l.rx, l.ry, l.seed, 1.12)} fill="#e6dcb9" />)}
          <g fill="none" stroke="#9fcfcf" strokeWidth="34" strokeLinecap="round">{rivers.map((d, i) => <path key={i} d={d} />)}</g>
          <g fill="none" stroke="#b9e0dc" strokeWidth="12" strokeLinecap="round" opacity=".6">{rivers.map((d, i) => <path key={i} d={d} />)}</g>
          {LAKES.map((l, i) => (
            <g key={i}>
              <path d={blob(l.cx, l.cy, l.rx, l.ry, l.seed)} fill="#9fcfcf" />
              <path d={blob(l.cx + 8, l.cy + 10, l.rx * 0.8, l.ry * 0.7, l.seed + 1)} fill="#7fb8bb" opacity=".8" />
              <path d={blob(l.cx - 22, l.cy - 18, l.rx * 0.5, l.ry * 0.4, l.seed + 2)} fill="#b9e0dc" opacity=".6" />
            </g>
          ))}
        </g>
        <path className="ripple" d={LAKES.map((l) => `M${l.cx - 80} ${l.cy + 30} q12 -6 24 0 t24 0 M${l.cx + 30} ${l.cy - 34} q10 -5 20 0 t20 0`).join(' ')} stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g filter="url(#paint)"><LilyPads x={LAKES[0].cx - 70} y={LAKES[0].cy + 40} seed={3} /><LilyPads x={LAKES[2].cx + 90} y={LAKES[2].cy + 44} seed={11} /><LilyPads x={POND.cx - 40} y={POND.cy - 18} seed={21} /></g>

        <g filter="url(#paint)">
          {FOREST.flowers.map((p, i) => <Flowers key={i} x={p.x} y={p.y} seed={p.n} />)}
          {FOREST.rocks.map((p, i) => <Rock key={i} x={p.x} y={p.y} r={p.r} />)}
          {FOREST.bushes.map((p, i) => <Bush key={i} x={p.x} y={p.y} r={p.r} />)}
          <Cabin x={CABIN.x} y={CABIN.y} /><Log x={520} y={96} a={-18} /><Log x={92} y={300} a={24} l={30} /><Log x={880} y={430} a={70} />
        </g>
        <g filter="url(#paint)">{FOREST.trees.filter((_, i) => i % 2 === 0).map((t, i) => <TreeTop key={i} {...t} />)}</g>
        <g filter="url(#paint)">{FOREST.trees.filter((_, i) => i % 2 === 1).map((t, i) => <TreeTop key={i} {...t} />)}</g>

        {/* Norbu has a pond of his own */}
        <g filter="url(#paint)"><ellipse cx={POND.cx} cy={POND.cy + 8} rx="40" ry="13" fill="#a39d8e" /></g>
        <g transform={`translate(${POND.cx - 36} ${POND.cy - 62}) scale(.6)`}><TrollArt mood={mood} /></g>

        {shown.map(({ c, i }) => (
          <g key={c.id} className="bridgebtn" role="button" tabIndex={0}
            aria-label={`${c.code}, ${c.title}. ${summaryWords(c).join(', ')}. Open this bridge.`}
            onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}
            onClick={() => onOpen(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c.id); } }}>
            <OverviewBridge c={c} lakeIndex={i} hovered={hover === c.id} />
            <title>{`${c.code}: ${c.title}`}</title>
          </g>
        ))}
      </svg>

      {tip && (
        <div className="plantip bridgetip" style={{ left: `${(tip.l.cx / W) * 100}%`, top: `${((tip.l.cy - tip.l.ry - 30) / H) * 100}%` }} role="status">
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

// ================================ one bridge, seen from the front ================================
const W2 = 960, H2 = 450, WATER = 336;
const ARCH = { cx: 480, cy: WATER, rx: 335, ry: 176, h: 58 };
const arch = (t: number): Pt => ({ x: ARCH.cx - ARCH.rx * Math.cos(Math.PI * t), y: ARCH.cy - ARCH.ry * Math.sin(Math.PI * t) });
const mirrorY = (d: number) => `translate(0 ${2 * d}) scale(1 -1)`;
const HILL_PINES = Array.from({ length: 34 }, (_, i) => ({ x: 10 + i * 28 + rand(i) * 14, y: 306 + rand(i + 50) * 16, s: 26 + rand(i + 90) * 22, pine: rand(i + 30) < 0.6 }));

/**
 * One course up close, from the front: the arch IS the bridge, built from one block per lecture.
 * Hover a block for the lecture. A missing block is a flag you have not mended yet.
 */
export function BridgeView({ course, open, mood }: { course: CourseBridge; open: Mark[]; mood: Mood }) {
  const [tip, setTip] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = (i: number) => { clearTimeout(timer.current); setTip(i); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 280); };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Each lecture is a run of wedge-shaped stones in one material, so the arch is a real curve.
  const per = Math.max(1, Math.round(14 / Math.max(course.planks.length, 1)));
  const blocks = layBlocks(arch, course.planks.length * per, ARCH.h, 3);
  const mid = (i: number) => blocks[i * per + Math.floor(per / 2)];
  const flag = FLAG[course.theme] || FLAG.meadow;
  const active = tip == null ? null : course.planks[tip];
  const activeBlock = tip == null ? null : mid(tip);
  const gapMark = active && open.find((m) => m.lecture_id === active.lecture_id);
  const rail = ARCH.h / 2 + 26;
  const posts = splitEven(arch, 12).map((t) => frameAt(arch, t));
  const below = activeBlock ? activeBlock.y < 235 : true;

  const drawBlocks = (interactive: boolean) => course.planks.map((p, i) => {
    const stones = blocks.slice(i * per, i * per + per).map((b, k) => (
      <g key={k} transform={`translate(${f1(b.x)} ${f1(b.y)}) rotate(${f1(b.angle)})`}>
        <MaterialBlock level={p.level} rot={p.rot} gone={p.open > 0 && k === Math.floor(per / 2)} len={b.len} h={ARCH.h} poly={b.poly} />
        {interactive && <polygon className="ring" points={b.poly.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ')} />}
      </g>
    ));
    if (!interactive) return <g key={p.lecture_id}>{stones}</g>;
    return (
      <g key={p.lecture_id} className="plank" role="button" tabIndex={0}
        aria-label={`${p.title}: ${[MATERIALS[p.level], rotWord(p), p.open ? `${p.open} gap flagged` : ''].filter(Boolean).join(', ')}. Press Enter to renovate.`}
        onMouseEnter={() => show(i)} onFocus={() => show(i)} onClick={() => show(i)}
        onKeyDown={(e) => { if (e.key === 'Enter') go(`/renovate/${p.lecture_id}`); if (e.key === 'Escape') setTip(null); }}>
        {stones}
      </g>
    );
  });

  return (
    <div className="mapwrap" onMouseLeave={hide}>
      <svg viewBox={`0 0 ${W2} ${H2}`} className="map" role="group" aria-label={`${course.code}: your bridge to ${course.exam_label}`}>
        {/* sky, sun, clouds and far hills */}
        <rect width={W2} height={H2} fill="#d6ecec" />
        <g filter="url(#paint-wide)">
          <rect y="150" width={W2} height="190" fill="#e6f2e0" />
          <circle cx="760" cy="92" r="34" fill="#fff4cf" />
          <Cloud x={170} y={74} /><Cloud x={470} y={46} s={0.8} /><Cloud x={640} y={118} s={0.7} />
          <path d={`M0 ${WATER - 40} C150 ${WATER - 100} 300 ${WATER - 66} 460 ${WATER - 80} S800 ${WATER - 110} 960 ${WATER - 62} V${WATER} H0Z`} fill="#bcd9b0" />
          <path d={`M0 ${WATER - 18} C200 ${WATER - 62} 380 ${WATER - 36} 560 ${WATER - 54} S840 ${WATER - 56} 960 ${WATER - 30} V${WATER} H0Z`} fill="#a6cd9d" />
        </g>
        <g filter="url(#paint)">{HILL_PINES.map((t, i) => <TreeSide key={i} x={t.x} y={t.y} s={t.s} kind={t.pine ? 'pine' : 'round'} tone={i} />)}</g>
        <path d="M150 90 q6 -14 12 0 q6 -14 12 0 M690 150 q5 -11 10 0 q5 -11 10 0" stroke="#7c8a86" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />

        {/* the river, with the arch mirrored in it */}
        <g filter="url(#paint-wide)">
          <rect y={WATER} width={W2} height={H2 - WATER} fill="#9fcfcf" />
          <path d={`M0 ${WATER + 40} C260 ${WATER + 22} 560 ${WATER + 56} 960 ${WATER + 34} V${H2} H0Z`} fill="#8cc2c4" />
          <path d={`M0 ${WATER + 88} C300 ${WATER + 74} 600 ${WATER + 100} 960 ${WATER + 80} V${H2} H0Z`} fill="#7fb8bb" />
        </g>
        <g filter="url(#paint)" opacity=".14"><g transform={mirrorY(WATER)}>{drawBlocks(false)}</g></g>
        <path className="ripple" d={`M200 ${WATER + 30} q14 -6 28 0 t28 0 M640 ${WATER + 24} q12 -5 24 0 t24 0 M430 ${WATER + 66} q14 -6 28 0 t28 0 M300 ${WATER + 96} q12 -5 24 0 M720 ${WATER + 84} q12 -5 24 0 t24 0`} stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g filter="url(#paint)"><LilyPads x={300} y={WATER + 56} seed={5} /><LilyPads x={650} y={WATER + 70} seed={13} /></g>

        {/* the banks, with stone footings where the arch meets the ground */}
        <g filter="url(#paint-wide)">
          <path d={`M0 ${WATER - 80} C70 ${WATER - 88} 130 ${WATER - 56} 170 ${WATER - 14} C192 ${WATER + 10} 184 ${WATER + 64} 150 ${H2} H0Z`} fill="#a8cc90" />
          <path d={`M0 ${WATER - 40} C60 ${WATER - 40} 110 ${WATER - 18} 150 ${WATER + 18} C170 ${WATER + 40} 160 ${WATER + 80} 128 ${H2} H0Z`} fill="#94bd7d" opacity=".75" />
          <path d={`M${W2} ${WATER - 80} C${W2 - 70} ${WATER - 88} ${W2 - 130} ${WATER - 56} ${W2 - 170} ${WATER - 14} C${W2 - 192} ${WATER + 10} ${W2 - 184} ${WATER + 64} ${W2 - 150} ${H2} H${W2}Z`} fill="#a8cc90" />
          <path d={`M${W2} ${WATER - 40} C${W2 - 60} ${WATER - 40} ${W2 - 110} ${WATER - 18} ${W2 - 150} ${WATER + 18} C${W2 - 170} ${WATER + 40} ${W2 - 160} ${WATER + 80} ${W2 - 128} ${H2} H${W2}Z`} fill="#94bd7d" opacity=".75" />
        </g>
        <g filter="url(#paint)">
          {[[120, 0], [840, 1]].map(([x, i]) => (
            <g key={i}><path d={`M${x - 40} ${WATER - 12} L${x + 40} ${WATER - 12} L${x + 46} ${WATER + 30} L${x - 46} ${WATER + 30} Z`} fill="#cfc6b2" /><path d={`M${x - 40} ${WATER - 12} L${x + 40} ${WATER - 12} L${x + 42} ${WATER + 4} L${x - 42} ${WATER + 4} Z`} fill="#e6dfcd" opacity=".85" /></g>
          ))}
          {[[24, 292, 74, 'round'], [64, 304, 60, 'pine'], [100, 316, 44, 'round'], [28, 326, 40, 'pine'], [930, 292, 76, 'pine'], [892, 306, 58, 'round'], [858, 318, 44, 'pine'], [934, 330, 42, 'round']].map(([x, y, s, k], i) => (
            <TreeSide key={i} x={x as number} y={y as number} s={s as number} kind={k as 'round' | 'pine'} tone={i} />
          ))}
          <Bush x={150} y={WATER - 4} r={9} /><Bush x={812} y={WATER - 2} r={9} /><Rock x={186} y={WATER + 24} r={8} /><Rock x={778} y={WATER + 28} r={9} />
          <Reeds x={196} y={WATER + 58} /><Reeds x={770} y={WATER + 66} n={6} />
        </g>

        {/* Norbu on a rock in the river, under the arch */}
        <g filter="url(#paint)"><ellipse cx={ARCH.cx} cy={WATER + 66} rx="58" ry="15" fill="#a39d8e" /></g>
        <g transform={`translate(${ARCH.cx - 52} ${WATER - 36}) scale(.86)`}><TrollArt mood={mood} /></g>

        {/* the bridge: every block is a lecture, and together they are the arch */}
        <g>{drawBlocks(true)}</g>
        <g filter="url(#paint)">
          <path d={offsetLine(arch, rail)} fill="none" stroke="#a2845e" strokeWidth="6" strokeLinecap="round" />
          <path d={offsetLine(arch, rail - 18)} fill="none" stroke="#b5976d" strokeWidth="3.2" strokeLinecap="round" />
          {posts.map((q, i) => <path key={i} d={`M${f1(q.p.x + q.nx * (ARCH.h / 2 - 2))} ${f1(q.p.y + q.ny * (ARCH.h / 2 - 2))} L${f1(q.p.x + q.nx * rail)} ${f1(q.p.y + q.ny * rail)}`} stroke="#8f7150" strokeWidth="5" strokeLinecap="round" />)}
        </g>

        {/* course sign and exam flag */}
        <g filter="url(#paint)">
          <rect x="58" y="214" width="5" height="68" rx="2" fill="#a08a66" />
          <rect x="20" y="186" width="82" height="34" rx="9" fill="#fffdf7" />
          <rect x="898" y="170" width="5" height="116" rx="2" fill="#a08a66" />
          <path d="M900 174 H798 l12 16 l-12 16 H900Z" fill={flag} />
        </g>
        <text x="61" y="208" textAnchor="middle" className="sign">{course.code}</text>
        <text x="850" y="196" textAnchor="middle" className="sign light">{course.exam_label}</text>
        <text x="850" y="232" textAnchor="middle" className="sign small">{when(course.exam_at)}</text>
      </svg>

      {active && activeBlock && tip != null && (
        <div className={`plantip${below ? ' below' : ''}`}
          style={{ left: `${Math.min(84, Math.max(16, (activeBlock.x / W2) * 100))}%`, top: `${((activeBlock.y + (below ? ARCH.h / 2 + 18 : -ARCH.h / 2 - 16)) / H2) * 100}%` }}
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
