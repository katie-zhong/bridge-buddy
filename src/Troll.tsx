export type Mood = 'idle' | 'happy' | 'think';
/** An idea inside a lecture: untouched, flagged (a hole), or mended. `proven` is kept for the icon set. */
export type PlankState = 'plain' | 'gap' | 'mended' | 'proven';

/**
 * Painterly look, defined once for the whole app (rendered in main.tsx).
 * - `paint`: soft wobbly edges plus pigment granulation, for small shapes (planks, Norbu).
 * - `paint-wide`: a looser wobble for scenery (hills, cliffs, water).
 * - `woodgrain`: thin streaks laid over a plank's base colour.
 */
export function PaintDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>
        <filter id="paint" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="3" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2.6" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8" result="speck" />
          <feColorMatrix in="speck" values=".3 0 0 0 .76  .3 0 0 0 .76  .3 0 0 0 .76  0 0 0 0 1" result="pigment" />
          <feBlend in="shape" in2="pigment" mode="multiply" result="tinted" />
          <feComposite in="tinted" in2="shape" operator="in" />
        </filter>
        <filter id="paint-wide" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="5" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="7" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="2" result="speck" />
          <feColorMatrix in="speck" values=".22 0 0 0 .82  .22 0 0 0 .82  .22 0 0 0 .82  0 0 0 0 1" result="pigment" />
          <feBlend in="shape" in2="pigment" mode="multiply" result="tinted" />
          <feComposite in="tinted" in2="shape" operator="in" />
        </filter>
        <pattern id="woodgrain" width="72" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 3.5 Q18 1.5 36 4 T72 3.5 M0 9 Q22 11.5 40 8.5 T72 9.5 M10 12.5 Q30 11 52 12.8" fill="none" stroke="#5c3b1e" strokeWidth=".9" strokeLinecap="round" opacity=".45" />
        </pattern>
      </defs>
    </svg>
  );
}

// Every plank is wood. Its stain says where it is in the repair: bare, patched, sealed.
const WOOD: Record<Exclude<PlankState, 'gap'>, { base: string; light: string }> = {
  plain: { base: '#d6ae7b', light: '#e8c99c' },
  mended: { base: '#e3a94c', light: '#f2c877' },
  proven: { base: '#6fa77c', light: '#8fc096' },
};

/** One plank, centred on (0, 0). A gap is the hole where the plank should be. */
export function PlankArt({ state, len, h = 16 }: { state: PlankState; len: number; h?: number }) {
  const x = -len / 2, y = -h / 2;
  if (state === 'gap') {
    return (
      <g className="plankart">
        <rect className="hit" x={x} y={y} width={len} height={h} rx="4" />
        <rect x={x + 1} y={y + 1} width={len - 2} height={h - 2} rx="4" fill="#c8553d14" stroke="#c8553d" strokeWidth="1.4" strokeDasharray="5 4" />
        <text y={h * 0.3} textAnchor="middle" className="hole" fontSize={h * 0.85}>?</text>
      </g>
    );
  }
  const w = WOOD[state];
  return (
    <g className="plankart">
      <rect className="hit" x={x} y={y} width={len} height={h} rx="4" />
      <g filter="url(#paint)">
        <rect x={x} y={y} width={len} height={h} rx="4" fill={w.base} />
        <rect x={x + 2} y={y + 1.5} width={len - 4} height={h * 0.38} rx="3" fill={w.light} opacity=".7" />
        <rect x={x} y={y} width={len} height={h} rx="4" fill="url(#woodgrain)" />
        <ellipse cx={x + len * 0.68} cy={y + h * 0.58} rx={h * 0.22} ry={h * 0.14} fill="#7a5532" opacity=".35" />
      </g>
      {state === 'mended' && (
        // the repair: a short batten nailed across the crack
        <g filter="url(#paint)">
          <rect x={-h * 0.45} y={y - 1.5} width={h * 0.9} height={h + 3} rx="2" fill="#f6dfae" />
          <circle cx="0" cy={y + 2.6} r="1.3" fill="#8a6a45" /><circle cx="0" cy={-y - 2.6} r="1.3" fill="#8a6a45" />
        </g>
      )}
      {state === 'proven' && <path d={`M${-h * 0.36} 0 l${h * 0.25} ${h * 0.28} l${h * 0.5} ${-h * 0.56}`} fill="none" stroke="#fffaf0" strokeWidth={h * 0.17} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
}

/** A plank as an inline icon, for legends and lists. Decorative: say the state in text next to it. */
export function PlankIcon({ state, size = 34 }: { state: PlankState; size?: number }) {
  return (
    <svg className="plankicon" viewBox="-20 -11 40 22" width={size} height={size * 0.55} aria-hidden>
      <PlankArt state={state} len={36} h={15} />
    </svg>
  );
}

// A lecture's block, from weakest to strongest. Same painterly treatment as the idea planks above:
// soft wobbly edges, a lighter wash on top, no dark outlines.
const MATERIAL: { base: string; light: string; grain: boolean; seam: string }[] = [
  { base: '#cdb894', light: '#e3d4b6', grain: true, seam: '#7a553224' },   // driftwood
  { base: '#b4824d', light: '#cf9f6a', grain: true, seam: '#5c3b1e30' },   // oak
  { base: '#b7bcc0', light: '#d6d9db', grain: false, seam: '#f1f3f4aa' },  // stone
  { base: '#74828f', light: '#98a5b0', grain: false, seam: '#c5cfd855' },  // iron
  { base: '#e4b940', light: '#f6dc8a', grain: false, seam: '#fff2b866' },  // gold
];
const f1 = (n: number) => n.toFixed(1);
const MOSS = ['#7a9e4e', '#668a3f', '#8bab5a'];
type Corner = [number, number];

/**
 * One lecture's block, centred on (0, 0) with its outer edge up. By default a rectangle `len` by
 * `h`; give `poly` (outer-left, outer-right, inner-right, inner-left) for a wedge in an arch.
 * `level` is the material (0 to 4), `rot` is 0 sound, 1 starting to rot (moss), 2 rotten (moss and
 * bites out of the edges), `open` is a missing piece (a dashed hole for a flag not yet mended), and
 * `gone` leaves the stone out altogether (only the dashed hole), and `joints` adds seams across it
 * so a long block reads as boards or masonry.
 */
export function MaterialBlock({ level, rot = 0, open = false, gone = false, len, h, poly, joints = 0 }: { level: number; rot?: 0 | 1 | 2; open?: boolean; gone?: boolean; len: number; h: number; poly?: Corner[]; joints?: number }) {
  const m = MATERIAL[Math.min(Math.max(level, 0), MATERIAL.length - 1)];
  const hl = len / 2, hh = h / 2;
  const [o0, o1, i1, i0] = poly ?? [[-hl, -hh], [hl, -hh], [hl, hh], [-hl, hh]];
  const lerp = (a: Corner, b: Corner, t: number): Corner => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const pts = (...q: Corner[]) => q.map((c) => `${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
  const outer = (f: number) => lerp(o0, o1, f), inner = (f: number) => lerp(i0, i1, f);
  const at = (f: number, d: number) => lerp(outer(f), inner(f), d); // along the block, d deep (0 outer edge, 1 inner)
  const mossAt = rot === 2 ? [0.2, 0.5, 0.78] : rot === 1 ? [0.35, 0.72] : [];
  const u = Math.min(h, 24); // moss and bites stay small even on a big stone
  const mossR = u * (rot === 2 ? 0.34 : 0.26);
  if (gone) {
    return (
      <g className="plankart">
        <polygon className="hit" points={pts(o0, o1, i1, i0)} />
        <polygon points={pts(at(0.06, 0.07), at(0.94, 0.07), at(0.94, 0.93), at(0.06, 0.93))} fill="#fff6f1" fillOpacity=".4" stroke="#c8553d" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />
        <text x={at(0.5, 0.5)[0]} y={at(0.5, 0.5)[1] + h * 0.27} textAnchor="middle" className="hole" fontSize={h * 0.8}>?</text>
      </g>
    );
  }
  return (
    <g className="plankart">
      <polygon className="hit" points={pts(o0, o1, i1, i0)} />
      <g filter="url(#paint)">
        <polygon points={pts(o0, o1, i1, i0)} fill={m.base} stroke={m.base} strokeWidth="2" strokeLinejoin="round" />
        <polygon points={pts(o0, o1, at(1, 0.36), at(0, 0.36))} fill={m.light} opacity=".75" />
        {m.grain && <polygon points={pts(o0, o1, i1, i0)} fill="url(#woodgrain)" />}
        {level === 0 && <ellipse cx={at(0.3, 0.62)[0]} cy={at(0.3, 0.62)[1]} rx={h * 0.2} ry={h * 0.13} fill="#8a6f48" opacity=".35" />}
        {level === 2 && <path d={`M${at(0.36, 0.04).join(' ')} L${at(0.44, 0.4).join(' ')} L${at(0.39, 0.62).join(' ')} L${at(0.47, 0.96).join(' ')}`} fill="none" stroke="#9a9fa4" strokeWidth={Math.max(1, h * 0.05)} strokeLinecap="round" strokeLinejoin="round" />}
        {level === 3 && [0.07, 0.93].flatMap((f) => [0.22, 0.78].map((d) => <circle key={`${f}${d}`} cx={at(f, d)[0]} cy={at(f, d)[1]} r={Math.max(1.4, h * 0.07)} fill="#c5cfd8" />))}
        {level === 4 && <path d={`M${at(0.14, 0.26).join(' ')} L${at(0.58, 0.18).join(' ')}`} stroke="#fff7d6" strokeWidth={h * 0.12} strokeLinecap="round" opacity=".85" />}
        {Array.from({ length: joints }, (_, j) => {
          const f = (j + 1) / (joints + 1), a = outer(f), b = inner(f);
          return <path key={j} d={`M${a.join(' ')} L${b.join(' ')}`} stroke={m.seam} strokeWidth={Math.max(1.4, h * 0.04)} strokeLinecap="round" />;
        })}
        {mossAt.map((f, i) => <ellipse key={i} cx={at(f, [0.16, 0.7, 0.4, 0.84, 0.25][i % 5])[0]} cy={at(f, [0.16, 0.7, 0.4, 0.84, 0.25][i % 5])[1]} rx={mossR * 1.4} ry={mossR} fill={MOSS[i % 3]} opacity=".9" />)}
        {rot === 2 && [0.28, 0.7].map((f, i) => {
          const c = i ? at(f, 1) : at(f, 0), t = i ? -1 : 1;
          return <path key={f} d={`M${f1(c[0] - u * 0.4)} ${f1(c[1])} l${f1(u * 0.4)} ${f1(t * u * 0.5)} l${f1(u * 0.4)} ${f1(-t * u * 0.5)}Z`} fill="#d3e7e3" />;
        })}
      </g>
      {open && (
        <g>
          <polygon points={pts(at(0.26, 0.16), at(0.74, 0.16), at(0.74, 0.84), at(0.26, 0.84))} fill="#e9f4f1" stroke="#c8553d" strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" />
          <text x={at(0.5, 0.5)[0]} y={at(0.5, 0.5)[1] + h * 0.27} textAnchor="middle" className="hole" fontSize={h * 0.8}>?</text>
        </g>
      )}
    </g>
  );
}

/** A plain rectangular block, for icons and the overview. */
export function MaterialPlank({ level, rot = 0, open = false, len, h = 16 }: { level: number; rot?: 0 | 1 | 2; open?: boolean; len: number; h?: number }) {
  return <MaterialBlock level={level} rot={rot} open={open} len={len} h={h} />;
}

/** A material plank as a small inline icon, for legends and lists. Decorative: say it in text too. */
export function MaterialIcon({ level, rot = 0, size = 34 }: { level: number; rot?: 0 | 1 | 2; size?: number }) {
  return (
    <svg className="plankicon" viewBox="-20 -11 40 22" width={size} height={size * 0.55} aria-hidden>
      <MaterialPlank level={level} rot={rot} len={36} h={15} />
    </svg>
  );
}

const FUR = '#86bd94', FUR_DEEP = '#5f9f74', FUR_LIGHT = '#a9d6b2', FACE = '#b5e3bd', INK = '#26352d', EAR = '#a6dcae';

// A row of pointed teeth along a shallow arc. `dir` 1 hangs them down, -1 points them up.
function teeth(x0: number, x1: number, y: number, dip: number, n: number, len: number, dir = 1) {
  const edge = (x: number) => { const t = (x - x0) / (x1 - x0); return y + 4 * dip * t * (1 - t); };
  const step = (x1 - x0) / n;
  let d = `M${x0} ${edge(x0).toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step, b = a + step;
    d += ` L${(a + step / 2).toFixed(1)} ${(edge(a + step / 2) + dir * len).toFixed(1)} L${b.toFixed(1)} ${edge(b).toFixed(1)}`;
  }
  return `${d} Q${(x0 + x1) / 2} ${y + 2 * dip} ${x0} ${edge(x0).toFixed(1)} Z`;
}

/**
 * Norbu: a small furry bridge troll, green all over, with tall ears. Drawn in a 120 x 120 box.
 * Resting, two fangs show. After a win (mood "happy") the mouth opens far too wide and every
 * tooth is on display.
 */
export function TrollArt({ mood = 'idle' }: { mood?: Mood }) {
  const happy = mood === 'happy', think = mood === 'think';
  return (
    <g className={`troll ${mood}`}>
      <ellipse cx="60" cy="115" rx="27" ry="4" fill="#000" opacity=".12" />
      <g filter="url(#paint)">
      {/* ears */}
      <g className="ear-l">
        <path d="M40 38 C29 26 26 9 33 2 C43 7 52 20 55 33 Z" fill={FUR} />
        <path d="M41 32 C34 23 32 13 35 8 C41 12 47 21 50 30 Z" fill={EAR} />
      </g>
      <g className="ear-r">
        <path d="M80 38 C91 26 94 9 87 2 C77 7 68 20 65 33 Z" fill={FUR} />
        <path d="M79 32 C86 23 88 13 85 8 C79 12 73 21 70 30 Z" fill={EAR} />
      </g>
      {/* body, arms and feet */}
      <ellipse cx="47" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <ellipse cx="73" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <path d="M38 84 C36 100 44 111 60 111 C76 111 84 100 82 84 Z" fill={FUR_DEEP} />
      <ellipse cx="60" cy="98" rx="13" ry="10" fill={FUR_LIGHT} opacity=".75" />
      <ellipse cx="35" cy="92" rx="6" ry="9" fill={FUR} transform={happy ? 'rotate(150 35 92) translate(0 6)' : 'rotate(18 35 92)'} />
      <ellipse cx="85" cy="92" rx="6" ry="9" fill={FUR} transform={happy ? 'rotate(-150 85 92) translate(0 6)' : 'rotate(-18 85 92)'} />
      {/* fluffy head */}
      <path d="M60 24 C83 24 98 39 99 56 L106 54 L101 61 L107 65 L99 68 C94 82 79 90 60 90 C41 90 26 82 21 68 L13 65 L19 61 L14 54 L21 56 C22 39 37 24 60 24 Z" fill={FUR} />
      <path d="M52 26 L56 19 L60 25 L64 19 L68 26 Z" fill={FUR} />
      {/* watercolour shading: light from the top left, a deeper wash low on the right */}
      <path d="M30 44 C36 31 50 26 62 27 C48 32 38 40 33 52 Z" fill={FUR_LIGHT} opacity=".8" />
      <path d="M99 60 C96 77 82 88 62 90 C80 84 92 72 96 56 Z" fill={FUR_DEEP} opacity=".55" />
      <path d="M44 30 l2 -4 M70 28 l2 -4 M84 38 l3 -3 M36 38 l-2 -3" stroke={FUR_DEEP} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <ellipse cx="60" cy="60" rx="31" ry="24" fill={FACE} />
      <ellipse cx="52" cy="50" rx="18" ry="9" fill="#fff" opacity=".28" />
      </g>
      {happy ? (
        <>
          {/* eyes a little too wide */}
          <circle cx="45" cy="50" r="9.5" fill="#fff" /><circle cx="75" cy="50" r="9.5" fill="#fff" />
          <circle cx="45" cy="50" r="3.2" fill={INK} /><circle cx="75" cy="50" r="3.2" fill={INK} />
          {/* and far too many teeth */}
          <path d="M31 62 Q60 68 89 62 Q84 86 60 87 Q36 86 31 62 Z" fill="#4a2228" />
          <path d={teeth(33, 87, 62.5, 1.4, 11, 7)} fill="#fff" />
          <path d={teeth(37, 83, 82, 1.6, 9, 6, -1)} fill="#fff" />
        </>
      ) : (
        <>
          <circle cx="46" cy="55" r="9" fill={INK} /><circle cx="74" cy="55" r="9" fill={INK} />
          <circle cx={think ? 49 : 43} cy={think ? 50.5 : 51.5} r="3.1" fill="#fff" />
          <circle cx={think ? 77 : 71} cy={think ? 50.5 : 51.5} r="3.1" fill="#fff" />
          <circle cx={think ? 44 : 49} cy="58.5" r="1.4" fill="#fff" opacity=".8" />
          <circle cx={think ? 72 : 77} cy="58.5" r="1.4" fill="#fff" opacity=".8" />
          {think && <path d="M65 42 Q74 37 84 42" fill="none" stroke={FUR_DEEP} strokeWidth="3" strokeLinecap="round" />}
          <ellipse cx="60" cy="63" rx="2.6" ry="1.8" fill={FUR_DEEP} />
          <path d={think ? 'M50 74 Q60 71 70 75' : 'M47 71 Q60 80 73 71'} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          {/* two fangs always show */}
          <path d={think ? 'M53 73.4 L55 78.5 L57.4 72.6 Z M63 72.7 L65.4 78.2 L67.4 73.9 Z' : 'M51 73.6 L53.6 79.8 L56.2 76 Z M63.8 76 L66.4 79.8 L69 73.6 Z'} fill="#fff" stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        </>
      )}
    </g>
  );
}

export function Troll({ mood, size = 96 }: { mood?: Mood; size?: number }) {
  return <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Norbu the bridge troll" className="trollsvg"><TrollArt mood={mood} /></svg>;
}
