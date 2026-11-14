import { go, type Plank } from './ui';

export type Mood = 'idle' | 'happy' | 'think';
export type PlankState = Plank['state'];

/**
 * Painterly look, defined once for the whole app (rendered in main.tsx).
 * - `paint`: soft wobbly edges plus pigment granulation, for small shapes (planks, Noor).
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

const FUR = '#86bd94', FUR_DEEP = '#5f9f74', FUR_LIGHT = '#a9d6b2', FACE = '#fff4e4', INK = '#33423a', BLUSH = '#f4a9a0';

// A row of small pointed teeth hanging from the top edge of the grin.
function teeth(x0: number, x1: number, y: number, dip: number, n: number, len: number) {
  const top = (x: number) => { const t = (x - x0) / (x1 - x0); return y + 4 * dip * t * (1 - t); };
  const step = (x1 - x0) / n;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step, b = a + step;
    d += ` L${(a + step / 2).toFixed(1)} ${(top(a + step / 2) + len).toFixed(1)} L${b.toFixed(1)} ${top(b).toFixed(1)}`;
  }
  return `${d} Q${(x0 + x1) / 2} ${y + 2 * dip} ${x0} ${y} Z`;
}

/** Noor: a small furry bridge troll with tall ears and a toothy grin. Drawn in a 120 x 120 box. */
export function TrollArt({ mood = 'idle' }: { mood?: Mood }) {
  const happy = mood === 'happy', think = mood === 'think';
  return (
    <g className={`troll ${mood}`}>
      <ellipse cx="60" cy="115" rx="27" ry="4" fill="#000" opacity=".12" />
      <g filter="url(#paint)">
      {/* ears */}
      <g className="ear-l">
        <path d="M40 38 C29 26 26 9 33 2 C43 7 52 20 55 33 Z" fill={FUR} />
        <path d="M41 32 C34 23 32 13 35 8 C41 12 47 21 50 30 Z" fill={BLUSH} opacity=".85" />
      </g>
      <g className="ear-r">
        <path d="M80 38 C91 26 94 9 87 2 C77 7 68 20 65 33 Z" fill={FUR} />
        <path d="M79 32 C86 23 88 13 85 8 C79 12 73 21 70 30 Z" fill={BLUSH} opacity=".85" />
      </g>
      {/* body, arms and feet */}
      <ellipse cx="47" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <ellipse cx="73" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <path d="M38 84 C36 100 44 111 60 111 C76 111 84 100 82 84 Z" fill={FUR_DEEP} />
      <ellipse cx="60" cy="98" rx="13" ry="10" fill={FUR_LIGHT} opacity=".75" />
      <ellipse cx="35" cy="92" rx="6" ry="9" fill={FUR} transform="rotate(18 35 92)" />
      <ellipse cx="85" cy="92" rx="6" ry="9" fill={FUR} transform={happy ? 'rotate(-150 85 92) translate(0 6)' : 'rotate(-18 85 92)'} />
      {/* fluffy head */}
      <path d="M60 24 C83 24 98 39 99 56 L106 54 L101 61 L107 65 L99 68 C94 82 79 90 60 90 C41 90 26 82 21 68 L13 65 L19 61 L14 54 L21 56 C22 39 37 24 60 24 Z" fill={FUR} />
      <path d="M52 26 L56 19 L60 25 L64 19 L68 26 Z" fill={FUR} />
      {/* watercolour shading: light from the top left, a deeper wash low on the right */}
      <path d="M30 44 C36 31 50 26 62 27 C48 32 38 40 33 52 Z" fill={FUR_LIGHT} opacity=".8" />
      <path d="M99 60 C96 77 82 88 62 90 C80 84 92 72 96 56 Z" fill={FUR_DEEP} opacity=".55" />
      <path d="M44 30 l2 -4 M70 28 l2 -4 M84 38 l3 -3 M36 38 l-2 -3" stroke={FUR_DEEP} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <ellipse cx="60" cy="60" rx="31" ry="24" fill={FACE} />
      <ellipse cx="52" cy="50" rx="18" ry="9" fill="#fff" opacity=".45" />
      </g>
      {/* eyes */}
      {happy ? (
        <>
          <path d="M37 57 Q46 46 55 57" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M65 57 Q74 46 83 57" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="46" cy="55" r="9" fill={INK} />
          <circle cx="74" cy="55" r="9" fill={INK} />
          <circle cx={think ? 49 : 43} cy={think ? 50.5 : 51.5} r="3.1" fill="#fff" />
          <circle cx={think ? 77 : 71} cy={think ? 50.5 : 51.5} r="3.1" fill="#fff" />
          <circle cx={think ? 44 : 49} cy="58.5" r="1.4" fill="#fff" opacity=".8" />
          <circle cx={think ? 72 : 77} cy="58.5" r="1.4" fill="#fff" opacity=".8" />
          {think && <path d="M65 42 Q74 37 84 42" fill="none" stroke={FUR_DEEP} strokeWidth="3" strokeLinecap="round" />}
        </>
      )}
      <ellipse cx="33" cy="66" rx="5.5" ry="3.4" fill={BLUSH} opacity=".7" />
      <ellipse cx="87" cy="66" rx="5.5" ry="3.4" fill={BLUSH} opacity=".7" />
      <ellipse cx="60" cy="62.5" rx="2.6" ry="1.8" fill="#d98f80" />
      {/* the grin */}
      {think ? (
        <path d="M52 73 Q60 70 68 74" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <>
          <path d={happy ? 'M40 67 Q60 73 80 67 Q60 92 40 67 Z' : 'M41 68 Q60 74 79 68 Q60 86 41 68 Z'} fill="#5a2f33" />
          <path d={teeth(43, 77, happy ? 68 : 69, 1.3, 8, 4.6)} fill="#fff" />
        </>
      )}
      {/* the snaggletooth: one bottom tooth that pokes up over the lip, off-centre */}
      <path d={think ? 'M50.4 74.6 Q51 70 52.6 66.4 Q55 70 56.4 74.3 Z' : happy ? 'M48.6 78.6 Q49.2 72.6 51 67.2 Q53.4 72.4 54.6 78.3 Z' : 'M49.2 77.4 Q49.8 71.6 51.6 66.6 Q54 71.6 55.2 77.1 Z'} fill="#fffaf0" />
      <path d={think ? 'M52.6 66.4 Q55 70 56.4 74.3 L54.8 74.4 Z' : happy ? 'M51 67.2 Q53.4 72.4 54.6 78.3 L53.1 78.4 Z' : 'M51.6 66.6 Q54 71.6 55.2 77.1 L53.7 77.2 Z'} fill="#e6d6bc" />
    </g>
  );
}

export function Troll({ mood, size = 96 }: { mood?: Mood; size?: number }) {
  return <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Noor the bridge troll" className="trollsvg"><TrollArt mood={mood} /></svg>;
}

const WORDS = { plain: 'no gaps flagged', gap: 'missing, tap to mend', mended: 'mended, recall check pending', proven: 'proven by delayed recall' };

// The deck and the hand rope are both shallow curves between the two cliffs.
const DECK = { x0: 132, x1: 688, y: 152, sag: 30 }, ROPE = { x0: 118, x1: 702, y: 92, sag: 56 };
const curve = (c: typeof DECK, x: number) => { const t = (x - c.x0) / (c.x1 - c.x0); return c.y + 4 * c.sag * t * (1 - t); };
const path = (c: typeof DECK, dy = 0) => `M${c.x0} ${c.y + dy} Q${(c.x0 + c.x1) / 2} ${c.y + 2 * c.sag + dy} ${c.x1} ${c.y + dy}`;

/** The course as a rope bridge to the next exam. Each idea is one plank; a flagged idea is a hole. */
export function Bridge({ planks, examLabel, examIn, mood }: { planks: Plank[]; examLabel: string; examIn: string; mood: Mood }) {
  const n = Math.max(planks.length, 1);
  const step = (DECK.x1 - DECK.x0) / n;
  const posts = Array.from({ length: n + 1 }, (_, i) => DECK.x0 + i * step);
  return (
    <svg viewBox="0 0 820 330" className="bridge" role="group" aria-label={`Your bridge to ${examLabel}`}>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#cfe9ee" /><stop offset="1" stopColor="#f6f0dd" /></linearGradient>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7cc4c9" /><stop offset="1" stopColor="#4c9aa6" /></linearGradient>
        <linearGradient id="earth" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b79a78" /><stop offset="1" stopColor="#8c7359" /></linearGradient>
              </defs>
      <rect width="820" height="330" fill="url(#sky)" />
      <circle cx="640" cy="62" r="30" fill="#fff6d6" opacity=".9" />
      <g filter="url(#paint-wide)">
      <path d="M0 215 C90 150 190 170 280 205 C380 150 470 150 560 200 C650 160 740 165 820 205 V330 H0 Z" fill="#bcdcc0" />
      <path d="M0 240 C120 200 220 215 330 236 C450 205 560 210 660 234 C730 220 780 222 820 230 V330 H0 Z" fill="#a3cfaa" />
      {/* river */}
      <rect x="0" y="262" width="820" height="68" fill="url(#water)" />
      </g>
      <path className="ripple" d="M190 282 q14 -6 28 0 t28 0 M330 304 q14 -6 28 0 t28 0 M540 286 q14 -6 28 0 t28 0 M250 316 q10 -5 20 0 M610 310 q12 -5 24 0" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" />
      {/* Noor on a rock under the bridge */}
      <g filter="url(#paint)">
        <ellipse cx="410" cy="302" rx="70" ry="14" fill="#8f8a7c" />
        <ellipse cx="410" cy="297" rx="62" ry="11" fill="#aaa596" />
      </g>
      <g transform="translate(359 198) scale(.85)"><TrollArt mood={mood} /></g>
      {/* cliffs */}
      <g filter="url(#paint-wide)">
      <path d="M0 150 H150 C140 190 162 236 148 330 H0 Z" fill="url(#earth)" />
      <path d="M820 150 H670 C680 190 658 236 672 330 H820 Z" fill="url(#earth)" />
      <path d="M0 136 C60 128 116 132 158 148 C152 158 146 160 138 164 C96 150 50 150 0 158 Z" fill="#86bd7f" />
      <path d="M820 136 C760 128 704 132 662 148 C668 158 674 160 682 164 C724 150 770 150 820 158 Z" fill="#86bd7f" />
      </g>
      {/* far rope and hangers */}
      <path d={path(ROPE, -7)} fill="none" stroke="#b9a184" strokeWidth="3" strokeLinecap="round" />
      {posts.map((x) => <line key={x} x1={x} y1={curve(ROPE, x)} x2={x} y2={curve(DECK, x) + 4} stroke="#a68c6c" strokeWidth="2" />)}
      {/* the planks are the bridge */}
      {planks.map((p, i) => {
        const xa = posts[i], xb = posts[i + 1], ya = curve(DECK, xa), yb = curve(DECK, xb);
        const len = Math.hypot(xb - xa, yb - ya) - 5, angle = (Math.atan2(yb - ya, xb - xa) * 180) / Math.PI;
        const open = () => go(`/lecture/${p.lecture_id}?t=${p.t_start}`);
        return (
          <g key={p.lecture_id + p.concept} className={`plank ${p.state}`} role="link" tabIndex={0} aria-label={`${p.title}: ${WORDS[p.state]}`}
            transform={`translate(${(xa + xb) / 2} ${(ya + yb) / 2}) rotate(${angle})`} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()}>
            <title>{`${p.title}: ${WORDS[p.state]}`}</title>
            <PlankArt state={p.state} len={len} h={17} />
            <rect className="ring" x={-len / 2 - 3} y="-11.5" width={len + 6} height="23" rx="7" />
          </g>
        );
      })}
      {/* near rope, posts */}
      <path d={path(ROPE)} fill="none" stroke="#8a6f52" strokeWidth="4" strokeLinecap="round" />
      <path d="M118 92 L78 148 M702 92 L742 148" stroke="#8a6f52" strokeWidth="4" strokeLinecap="round" />
      <rect x="111" y="82" width="14" height="76" rx="5" fill="#9b7b58" /><rect x="695" y="82" width="14" height="76" rx="5" fill="#9b7b58" />
      <rect x="109" y="78" width="18" height="9" rx="4" fill="#7d6245" /><rect x="693" y="78" width="18" height="9" rx="4" fill="#7d6245" />
      {/* start sign and exam flag */}
      <rect x="40" y="112" width="6" height="34" rx="3" fill="#7d6245" />
      <rect x="10" y="88" width="68" height="28" rx="8" fill="#fff8ea" filter="url(#paint)" />
      <text x="44" y="107" textAnchor="middle" className="sign">Week 1</text>
      <rect x="793" y="52" width="6" height="96" rx="3" fill="#7d6245" />
      <path d="M794 58 H706 l11 16 l-11 16 H794 Z" fill="#c8553d" filter="url(#paint)" />
      <text x="756" y="79" textAnchor="middle" className="sign light">{examLabel}</text>
      <text x="760" y="182" textAnchor="middle" className="sign small">{examIn}</text>
    </svg>
  );
}
