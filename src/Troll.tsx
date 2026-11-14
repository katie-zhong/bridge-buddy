import { go, type Plank } from './ui';

export type Mood = 'idle' | 'happy' | 'think';

/** NorBu: ugly-cute on purpose. Drawn in a 120 x 120 box. */
export function TrollArt({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <g className={`troll ${mood}`}>
      {/* ears */}
      <path d="M22 52 C2 38 0 62 6 70 C12 76 22 72 28 66 Z" fill="#7fae74" stroke="#2d4a37" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M98 52 C118 36 122 60 115 69 C109 76 98 72 92 66 Z" fill="#7fae74" stroke="#2d4a37" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 60 C12 56 18 58 21 62" fill="none" stroke="#c9856f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 59 C107 55 102 58 99 62" fill="none" stroke="#c9856f" strokeWidth="2.5" strokeLinecap="round" />
      {/* feet */}
      <ellipse cx="44" cy="111" rx="13" ry="6.5" fill="#5f8f5c" stroke="#2d4a37" strokeWidth="2.5" />
      <ellipse cx="78" cy="111" rx="13" ry="6.5" fill="#5f8f5c" stroke="#2d4a37" strokeWidth="2.5" />
      {/* body */}
      <path d="M60 20 C92 20 100 46 98 70 C97 96 84 110 60 110 C36 110 23 96 22 70 C20 46 28 20 60 20 Z" fill="#7fae74" stroke="#2d4a37" strokeWidth="2.5" />
      <ellipse cx="60" cy="90" rx="22" ry="15" fill="#a9cd97" opacity=".8" />
      {/* horns and hair */}
      <path d="M38 27 C34 16 38 10 42 9 C43 16 45 21 48 24 Z" fill="#f1e6c9" stroke="#2d4a37" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M82 27 C87 17 84 10 80 9 C78 16 76 21 72 24 Z" fill="#f1e6c9" stroke="#2d4a37" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M52 22 C52 12 56 6 58 4 C58 11 60 14 61 17 C63 11 66 8 69 7 C67 14 68 18 68 22 Z" fill="#c8553d" stroke="#2d4a37" strokeWidth="2.2" strokeLinejoin="round" />
      {/* eyes: deliberately uneven */}
      {mood === 'happy' ? (
        <>
          <path d="M34 52 Q45 40 56 52" fill="none" stroke="#2d4a37" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M67 52 Q75 43 84 52" fill="none" stroke="#2d4a37" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy="50" r="12" fill="#fffaf0" stroke="#2d4a37" strokeWidth="2.5" />
          <circle cx="76" cy="51" r="8.5" fill="#fffaf0" stroke="#2d4a37" strokeWidth="2.5" />
          <circle className="pupil" cx={mood === 'think' ? 48 : 47} cy={mood === 'think' ? 45 : 51} r="4.5" fill="#23302b" />
          <circle className="pupil" cx={mood === 'think' ? 78 : 75} cy={mood === 'think' ? 47 : 52} r="3.5" fill="#23302b" />
        </>
      )}
      {/* nose */}
      <ellipse cx="61" cy="64" rx="8" ry="6.5" fill="#5f8f5c" stroke="#2d4a37" strokeWidth="2.2" />
      {/* mouth with one snaggle tooth */}
      {mood === 'think'
        ? <path d="M50 82 Q60 78 70 83" fill="none" stroke="#2d4a37" strokeWidth="3" strokeLinecap="round" />
        : <path d={mood === 'happy' ? 'M40 76 Q60 100 82 76 Q60 84 40 76 Z' : 'M42 78 Q60 92 80 78'} fill={mood === 'happy' ? '#7a2e2a' : 'none'} stroke="#2d4a37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      <path d="M49 82 L52 73 L56 84 Z" fill="#fffaf0" stroke="#2d4a37" strokeWidth="1.8" strokeLinejoin="round" />
      {/* freckles */}
      <circle cx="30" cy="66" r="1.6" fill="#5f8f5c" /><circle cx="35" cy="70" r="1.6" fill="#5f8f5c" /><circle cx="88" cy="67" r="1.6" fill="#5f8f5c" />
    </g>
  );
}

export function Troll({ mood, size = 96 }: { mood?: Mood; size?: number }) {
  return <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="NorBu the bridge troll" className="trollsvg"><TrollArt mood={mood} /></svg>;
}

const WORDS = { plain: 'no gaps flagged', gap: 'gap to repair', mended: 'mended, recall check pending', proven: 'proven by delayed recall' };

/** The course as a bridge to the next exam. One plank per idea taught so far. */
export function Bridge({ planks, examLabel, examIn, mood }: { planks: Plank[]; examLabel: string; examIn: string; mood: Mood }) {
  const x0 = 96, x1 = 724, gap = 4;
  const w = planks.length ? (x1 - x0 - gap * (planks.length - 1)) / planks.length : 0;
  return (
    <svg viewBox="0 0 820 300" className="bridge" role="group" aria-label={`Your bridge to ${examLabel}`}>
      <defs>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--river)" /><stop offset="1" stopColor="var(--river-deep)" /></linearGradient>
      </defs>
      {/* river */}
      <rect x="0" y="232" width="820" height="68" fill="url(#water)" />
      <path className="ripple" d="M150 252 q14 -7 28 0 t28 0 M330 274 q14 -7 28 0 t28 0 M560 256 q14 -7 28 0 t28 0 M250 286 q10 -5 20 0 M640 282 q12 -6 24 0" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
      {/* banks */}
      <path d="M0 150 C40 138 84 142 124 160 L136 300 L0 300 Z" fill="var(--bank)" />
      <path d="M820 150 C780 138 736 142 696 160 L684 300 L820 300 Z" fill="var(--bank)" />
      {/* troll on a rock under the arch */}
      <ellipse cx="410" cy="262" rx="62" ry="13" fill="var(--stone-dark)" />
      <g transform="translate(362 158) scale(.8)"><TrollArt mood={mood} /></g>
      {/* stone arch */}
      <path d="M70 126 H750 V238 H706 Q410 54 114 238 H70 Z" fill="var(--stone)" stroke="var(--stone-dark)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M130 150 h34 M190 142 h30 M590 142 h30 M650 150 h34 M92 178 h28 M700 178 h28 M96 208 h22 M704 208 h22 M300 136 h36 M480 136 h36" stroke="var(--stone-dark)" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
      {/* deck */}
      <rect x="70" y="122" width="680" height="7" rx="3" fill="var(--stone-dark)" />
      {planks.map((p, i) => (
        <g key={p.lecture_id + p.concept} className={`plank ${p.state}`} role="link" tabIndex={0}
          aria-label={`${p.title}: ${WORDS[p.state]}`}
          onClick={() => go(`/lecture/${p.lecture_id}?t=${p.t_start}`)}
          onKeyDown={(e) => e.key === 'Enter' && go(`/lecture/${p.lecture_id}?t=${p.t_start}`)}>
          <title>{`${p.title}: ${WORDS[p.state]}`}</title>
          <rect x={x0 + i * (w + gap)} y="100" width={w} height="22" rx="4" />
          {p.state === 'proven' && <path d={`M${x0 + i * (w + gap) + w / 2 - 6} 111 l4 5 l8 -9`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
      {/* start post and exam flag */}
      <path d="M50 150 V92" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      <rect x="18" y="74" width="66" height="24" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" />
      <text x="51" y="91" textAnchor="middle" className="sign">Week 1</text>
      <path d="M770 150 V60" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      <path d="M770 62 H676 l12 15 l-12 15 H770 Z" fill="var(--clay)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="729" y="83" textAnchor="middle" className="sign light">{examLabel}</text>
      <text x="760" y="176" textAnchor="middle" className="sign small">{examIn}</text>
    </svg>
  );
}
