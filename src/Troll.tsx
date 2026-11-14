import { useState } from 'react';
import { go, type Plank } from './ui';

export type Mood = 'idle' | 'happy' | 'think';
export type PlankState = Plank['state'];

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

/** Norbu: a small furry bridge troll with tall ears and a one-tooth smile (a full toothy grin when you get it right). Drawn in a 120 x 120 box. */
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
      {/* the mouth: a closed smile with one tooth (like the first NorBu) by default; the open, toothy
          grin is saved for a riddle answered well (mood "happy") */}
      {happy ? (
        <>
          <path d="M40 67 Q60 73 80 67 Q60 92 40 67 Z" fill="#5a2f33" />
          <path d={teeth(43, 77, 68, 1.3, 8, 4.6)} fill="#fff" />
        </>
      ) : think ? (
        <path d="M52 73 Q60 70 68 74" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <>
          <path d="M44 69 Q60 80 76 69" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M49.6 74.4 L52.4 66.8 L55.6 75.4 Z" fill="#fffaf0" />
        </>
      )}
    </g>
  );
}

export function Troll({ mood, size = 96 }: { mood?: Mood; size?: number }) {
  return <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Norbu the bridge troll" className="trollsvg"><TrollArt mood={mood} /></svg>;
}

const WORDS = { plain: 'sound', gap: 'missing, tap to mend', mended: 'patched, recall check pending', proven: 'proven by delayed recall' };

/** The course as a painted stone arch to the next exam. Each idea is one wooden plank on the deck. */
export function Bridge({ planks, examLabel, examIn, mood }: { planks: Plank[]; examLabel: string; examIn: string; mood: Mood }) {
  const [tip, setTip] = useState<number | null>(null);
  const W = 1000, H = 290, deck = 118, x0 = 110, x1 = W - 110, gap = 6;
  const n = Math.max(planks.length, 1);
  const pw = (x1 - x0 - gap * (n - 1)) / n;
  const tipPlank = tip == null ? null : planks[tip];
  const tipX = tip == null ? 0 : Math.min(Math.max(x0 + tip * (pw + gap) + pw / 2, 100), W - 100);
  const tipW = tipPlank ? Math.min(260, tipPlank.title.length * 7.6 + 32) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bridge" role="group" aria-label={`Your bridge to ${examLabel}`} onMouseLeave={() => setTip(null)}>
      <rect width={W} height={H} fill="#e8f2ee" />
      {/* river */}
      <g filter="url(#paint-wide)">
        <path d={`M0 ${H - 72} C300 ${H - 82} 600 ${H - 62} ${W} ${H - 76} V${H} H0Z`} fill="#9fcfcf" />
        <path d={`M0 ${H - 40} C400 ${H - 50} 700 ${H - 30} ${W} ${H - 44} V${H} H0Z`} fill="#7fb8bb" />
      </g>
      <path className="ripple" d={`M180 ${H - 50} q14 -6 28 0 M620 ${H - 30} q14 -6 28 0 M800 ${H - 56} q10 -5 20 0`} stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* banks */}
      <g filter="url(#paint-wide)">
        <path d={`M0 150 C50 136 100 140 150 162 L170 ${H} H0Z`} fill="#a7c98f" />
        <path d={`M${W} 150 C${W - 50} 136 ${W - 100} 140 ${W - 150} 162 L${W - 170} ${H} H${W}Z`} fill="#a7c98f" />
        <path d={`M0 180 C40 172 90 176 140 190 L150 ${H} H0Z`} fill="#94bd7d" opacity=".7" />
      </g>
      {/* stone arch */}
      <g filter="url(#paint)">
        <path d={`M80 ${deck + 8} H${W - 80} V${H - 60} H${W - 130} Q${W / 2} 70 130 ${H - 60} H80Z`} fill="#d9d1c0" />
        <path d={`M80 ${deck + 8} H${W - 80} V${deck + 24} H80Z`} fill="#c7bfad" />
      </g>
      <path d={`M150 ${deck + 50} h40 M230 ${deck + 40} h34 M${W - 260} ${deck + 42} h34 M${W - 190} ${deck + 52} h40 M100 ${deck + 90} h30 M${W - 130} ${deck + 90} h30`} stroke="#b5ad9b" strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
      {/* Norbu on a rock under the arch */}
      <g filter="url(#paint)"><ellipse cx={W / 2} cy={H - 46} rx="70" ry="14" fill="#a39d8e" /></g>
      <g transform={`translate(${W / 2 - 48} ${H - 150}) scale(.8)`}><TrollArt mood={mood} /></g>
      {/* the planks are the deck */}
      {planks.map((p, i) => {
        const open = () => go(`/lecture/${p.lecture_id}?t=${p.t_start}`);
        return (
          <g key={p.lecture_id + p.concept} className={`plank ${p.state}`} role="link" tabIndex={0} aria-label={`${p.title}: ${WORDS[p.state]}`}
            transform={`translate(${x0 + i * (pw + gap) + pw / 2} ${deck - 13})`} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()}
            onMouseEnter={() => setTip(i)} onFocus={() => setTip(i)} onBlur={() => setTip(null)}>
            <PlankArt state={p.state} len={pw} h={26} />
            <rect className="ring" x={-pw / 2 - 3} y="-16" width={pw + 6} height="32" rx="7" />
          </g>
        );
      })}
      {/* start sign and exam flag */}
      <g filter="url(#paint)">
        <rect x="46" y="96" width="5" height="60" rx="2" fill="#a08a66" />
        <rect x="16" y="72" width="66" height="28" rx="8" fill="#fffdf7" />
        <rect x={W - 52} y="56" width="5" height="100" rx="2" fill="#a08a66" />
        <path d={`M${W - 48} 58 H${W - 150} l12 15 l-12 15 H${W - 48}Z`} fill="#d6684d" />
      </g>
      <text x="49" y="91" textAnchor="middle" className="sign">Week 1</text>
      <text x={W - 96} y="78" textAnchor="middle" className="sign light">{examLabel}</text>
      <text x={W - 50} y="178" textAnchor="middle" className="sign small">{examIn}</text>
      {/* hover / focus label */}
      {tipPlank && (
        <g className="planktip" aria-hidden>
          <rect x={tipX - tipW / 2} y={deck - 74} width={tipW} height="34" rx="10" />
          <path d={`M${tipX - 7} ${deck - 41} l7 8 l7 -8Z`} />
          <text x={tipX} y={deck - 52} textAnchor="middle">{tipPlank.title}</text>
        </g>
      )}
    </svg>
  );
}
