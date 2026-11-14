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

/** The course as a bridge to the next exam. One plank per idea taught so far.
 *  The scene is a line drawing (SVG); the planks are real buttons laid over it in frosted
 *  glass, so the arch and railing show through them, blurred. State is shown by fill AND
 *  outline style AND icon, never by colour alone. */
export function Bridge({ planks, examLabel, examIn, mood }: { planks: Plank[]; examLabel: string; examIn: string; mood: Mood }) {
  const open = (p: Plank) => go(`/lecture/${p.lecture_id}?t=${p.t_start}`);
  const posts = Array.from({ length: 23 }, (_, i) => 108 + i * 27.5);
  return (
    <div className="bridgewrap" role="group" aria-label={`Your bridge to ${examLabel}, ${examIn}`}>
      <svg viewBox="0 0 820 300" className="bridge" aria-hidden="true">
        {/* soft haze behind the deck so the glass has something to frost */}
        <ellipse className="haze" cx="250" cy="120" rx="110" ry="14" />
        <ellipse className="haze" cx="470" cy="116" rx="90" ry="12" />
        <ellipse className="haze" cx="640" cy="122" rx="70" ry="12" />
        {/* water: a few hairlines */}
        <path className="ln soft ripple" d="M150 256 h70 M300 270 h120 M520 258 h90 M210 284 h60 M600 282 h70" />
        <path className="ln soft" d="M0 238 H820" />
        {/* banks */}
        <path className="ln" d="M0 152 C40 140 84 144 124 162 L132 238" />
        <path className="ln" d="M820 152 C780 140 736 144 696 162 L688 238" />
        {/* arch */}
        <path className="ln" d="M70 128 H750 M114 238 Q410 54 706 238" />
        <path className="ln soft" d="M70 128 V238 M750 128 V238" />
        {/* railing posts: they show through the glass, blurred */}
        <path className="ln post" d={posts.map((x) => `M${x} 88 V136`).join(' ')} />
        <path className="ln soft" d="M96 92 H724" />
        {/* the troll under the arch */}
        <g transform="translate(366 164) scale(.72)"><TrollArt mood={mood} /></g>
        {/* start post and exam marker */}
        <path className="ln" d="M50 152 V96" />
        <text x="50" y="86" textAnchor="middle" className="sign">Week 1</text>
        <path className="ln" d="M770 152 V58" />
        <rect x="676" y="58" width="94" height="26" fill="var(--ink)" />
        <text x="723" y="75" textAnchor="middle" className="sign light">{examLabel}</text>
        <text x="723" y="48" textAnchor="middle" className="sign small">{examIn}</text>
      </svg>
      <div className="deck">
        {planks.map((p) => (
          <button key={p.lecture_id + p.concept} className={`plank ${p.state}`} title={`${p.title}: ${WORDS[p.state]}`}
            aria-label={`${p.title}: ${WORDS[p.state]}`} onClick={() => open(p)}>
            {p.state === 'proven' && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>
        ))}
      </div>
    </div>
  );
}
