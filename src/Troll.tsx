export type Mood = 'idle' | 'think' | 'grin';

const FUR = '#7fbf8f', FUR_DEEP = '#559a6c', FACE = '#b5e3bd', INK = '#26352d', EAR = '#a6dcae';

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
 * Noor: a small furry bridge troll, green all over, with tall ears. Drawn in a 120 x 120 box.
 * Resting, two little fangs show. After a win (`grin`) the mouth opens far too wide and
 * every tooth is on display.
 */
export function TrollArt({ mood = 'idle' }: { mood?: Mood }) {
  const grin = mood === 'grin', think = mood === 'think';
  return (
    <g className={`troll ${mood}`}>
      <ellipse cx="60" cy="115" rx="27" ry="4" fill="#000" opacity=".12" />
      <g className="ear-l">
        <path d="M40 38 C29 26 26 9 33 2 C43 7 52 20 55 33 Z" fill={FUR} />
        <path d="M41 32 C34 23 32 13 35 8 C41 12 47 21 50 30 Z" fill={EAR} />
      </g>
      <g className="ear-r">
        <path d="M80 38 C91 26 94 9 87 2 C77 7 68 20 65 33 Z" fill={FUR} />
        <path d="M79 32 C86 23 88 13 85 8 C79 12 73 21 70 30 Z" fill={EAR} />
      </g>
      <ellipse cx="47" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <ellipse cx="73" cy="110" rx="10" ry="5.5" fill={FUR_DEEP} />
      <path d="M38 84 C36 100 44 111 60 111 C76 111 84 100 82 84 Z" fill={FUR_DEEP} />
      <ellipse cx="60" cy="98" rx="13" ry="10" fill={FACE} opacity=".7" />
      <ellipse cx="35" cy="92" rx="6" ry="9" fill={FUR} transform={grin ? 'rotate(150 35 92) translate(0 6)' : 'rotate(18 35 92)'} />
      <ellipse cx="85" cy="92" rx="6" ry="9" fill={FUR} transform={grin ? 'rotate(-150 85 92) translate(0 6)' : 'rotate(-18 85 92)'} />
      <path d="M60 24 C83 24 98 39 99 56 L106 54 L101 61 L107 65 L99 68 C94 82 79 90 60 90 C41 90 26 82 21 68 L13 65 L19 61 L14 54 L21 56 C22 39 37 24 60 24 Z" fill={FUR} />
      <path d="M52 26 L56 19 L60 25 L64 19 L68 26 Z" fill={FUR} />
      <ellipse cx="60" cy="60" rx="31" ry="24" fill={FACE} />
      {grin ? (
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
  return <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Noor the bridge troll" className="trollsvg"><TrollArt mood={mood} /></svg>;
}
