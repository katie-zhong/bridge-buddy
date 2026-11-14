import { useEffect, useRef, useState } from 'react';
import { go, when, MATERIALS, type CourseBridge, type Mark, type Plank } from './ui';
import { TrollArt, type Mood } from './Troll';

const W = 900, ROW = 176, TOP = 96, X0 = 238, X1 = 662, DECK = 60;
const rowY = (i: number) => TOP + i * ROW;

// Stable pseudo-random numbers so decorations and rot sit in the same place on every render.
const rand = (seed: number) => { const x = Math.sin(seed * 99.17) * 43758.5453; return x - Math.floor(x); };

export const rotWord = (p: Plank) => (p.rot === 2 ? 'Rotten' : p.rot === 1 ? 'Starting to rot' : '');
const describe = (p: Plank) => [MATERIALS[p.level], rotWord(p), p.open ? `${p.open} gap${p.open === 1 ? '' : 's'} flagged` : ''].filter(Boolean).join(', ');

function Decor({ theme, y, side }: { theme: string; y: number; side: 1 | -1 }) {
  const base = side === 1 ? 20 : 700;
  return (
    <g aria-hidden>
      {Array.from({ length: 7 }, (_, k) => {
        const x = base + rand(y + k * 3 + side) * 170, dy = (rand(y + k * 7) - 0.5) * 120, yy = y + (Math.abs(dy) < 44 ? Math.sign(dy || 1) * 50 : dy);
        if (theme === 'rocks') return <ellipse key={k} cx={x} cy={yy} rx={9 + rand(k) * 9} ry={6 + rand(k + 1) * 5} fill={k % 2 ? '#b9bcb4' : '#a3a79e'} />;
        if (theme === 'garden') return <g key={k}><circle cx={x} cy={yy} r={11 + rand(k) * 6} fill="#5fa46a" /><circle cx={x - 4} cy={yy - 4} r={5} fill="#7cbb82" /></g>;
        return <g key={k}><circle cx={x} cy={yy} r="4.5" fill={['#f6d365', '#f4a9a0', '#fff'][k % 3]} /><circle cx={x} cy={yy} r="1.8" fill="#e59a3c" /></g>;
      })}
    </g>
  );
}

function PlankArt({ p, x, y, w, i }: { p: Plank; x: number; y: number; w: number; i: number }) {
  const pad = 5, n = Math.max(2, Math.round((w - 2 * pad) / 22)), bw = (w - 2 * pad) / n; // a visible gap between lectures
  return (
    <g className={`mat mat-${p.level} rot-${p.rot}`}>
      {Array.from({ length: n }, (_, k) => {
        const jig = p.level === 0 ? (rand(i * 13 + k) - 0.5) * 8 : 0; // driftwood is uneven
        return <rect key={k} className="board" x={x + pad + k * bw + 0.5} y={y - DECK / 2 + jig} width={bw - 1} height={DECK - (p.level === 0 ? Math.abs(jig) : 0)} rx={p.level >= 2 ? 2 : 4} />;
      })}
      {p.level === 2 && <path className="seam" d={`M${x + 3} ${y} H${x + w - 3}`} />}
      {p.level === 3 && [0, 1, 2, 3].map((k) => <circle key={k} className="rivet" cx={x + (k % 2 ? w - 9 : 9)} cy={y + (k < 2 ? -DECK / 2 + 8 : DECK / 2 - 8)} r="2.6" />)}
      {p.level === 4 && <path className="shine" d={`M${x + 8} ${y - 14} L${x + w - 8} ${y - 20}`} />}
      {p.rot > 0 && Array.from({ length: p.rot === 2 ? 7 : 4 }, (_, k) => (
        <circle key={k} className="moss" cx={x + 8 + rand(i * 5 + k) * (w - 16)} cy={y - DECK / 2 + 8 + rand(i * 9 + k * 2) * (DECK - 16)} r={4 + rand(k + i) * 6} />
      ))}
      {p.rot === 2 && <path className="bite" d={`M${x + w * 0.3} ${y - DECK / 2 - 2} l${w * 0.12} 16 l${w * 0.14} -16 Z M${x + w * 0.55} ${y + DECK / 2 + 2} l${w * 0.1} -18 l${w * 0.13} 18 Z`} />}
      {p.open > 0 && <g><circle className="hole" cx={x + w / 2} cy={y} r="13" /><text className="holeq" x={x + w / 2} y={y + 5} textAnchor="middle">?</text></g>}
    </g>
  );
}

/** Top-down map: one bridge per course across the same river, one plank per lecture. */
export function BridgeMap({ courses, open, mood, onAdd }: { courses: CourseBridge[]; open: Mark[]; mood: Mood; onAdd: (courseId: string) => void }) {
  const [tip, setTip] = useState<{ c: number; i: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const H = TOP + (courses.length - 1) * ROW + 96;
  const show = (c: number, i: number) => { clearTimeout(timer.current); setTip({ c, i }); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 260); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const bank = (side: 1 | -1) => {
    let d = `M${side === 1 ? 0 : W} 0`;
    const edge = side === 1 ? X0 + 14 : X1 - 14;
    d += ` H${edge}`;
    for (let y = 0; y < H; y += 44) d += ` Q${edge + side * (y % 88 ? 14 : -10)} ${y + 22} ${edge} ${y + 44}`;
    return `${d} H${side === 1 ? 0 : W} Z`;
  };
  const active = tip && courses[tip.c]?.planks[tip.i];
  const trollY = courses.length > 1 ? (rowY(0) + rowY(1)) / 2 : rowY(0) + 70;

  return (
    <div className="mapwrap" onMouseLeave={hide}>
      <svg viewBox={`0 0 ${W} ${H}`} className="map" role="group" aria-label="Your bridges, one per course">
        <defs>
          <linearGradient id="river" x1="0" x2="1"><stop offset="0" stopColor="#6fbcc6" /><stop offset=".5" stopColor="#8fd0d6" /><stop offset="1" stopColor="#6fbcc6" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#river)" />
        <path className="ripple" d={Array.from({ length: 9 }, (_, k) => `M${300 + rand(k) * 280} ${30 + rand(k + 20) * (H - 60)} q10 -5 20 0 t20 0`).join(' ')} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" />
        <path d={bank(1)} fill="#9ccf96" /><path d={bank(-1)} fill="#9ccf96" />
        <path d={bank(1)} fill="none" stroke="#7fb87c" strokeWidth="5" /><path d={bank(-1)} fill="none" stroke="#7fb87c" strokeWidth="5" />

        {/* Norbu on a rock in the river */}
        <ellipse cx={X0 + 212} cy={trollY + 26} rx="44" ry="24" fill="#a9a698" /><ellipse cx={X0 + 212} cy={trollY + 22} rx="36" ry="18" fill="#bfbcae" />
        <g transform={`translate(${X0 + 176} ${trollY - 40}) scale(.6)`}><TrollArt mood={mood} /></g>

        {courses.map((c, ci) => {
          const y = rowY(ci), n = Math.max(c.planks.length, 1), w = (X1 - X0) / n;
          return (
            <g key={c.id} className={`course theme-${c.theme}`}>
              <Decor theme={c.theme} y={y} side={1} /><Decor theme={c.theme} y={y} side={-1} />
              {/* paths leading to the bridge */}
              <rect x="150" y={y - 20} width={X0 - 146} height="40" rx="14" fill="#e6d7b4" /><rect x={X1 - 4} y={y - 20} width="96" height="40" rx="14" fill="#e6d7b4" />
              {/* course sign */}
              <rect x="22" y={y - 26} width="132" height="52" rx="12" fill="#fff8ea" stroke="#8a6f52" strokeWidth="3" />
              <text x="88" y={y - 2} textAnchor="middle" className="msign">{c.code}</text>
              <text x="88" y={y + 16} textAnchor="middle" className="msub">{c.planks.length} lectures</text>
              {/* exam flag */}
              <rect x="776" y={y - 40} width="6" height="72" rx="3" fill="#8a6f52" />
              <path d={`M782 ${y - 38} H880 l-11 15 l11 15 H782 Z`} className="flagfill" />
              <text x="826" y={y - 18} textAnchor="middle" className="msign light">{c.exam_label}</text>
              <text x="826" y={y + 24} textAnchor="middle" className="msub">{when(c.exam_at)}</text>
              {/* deck: the planks are the bridge */}
              {c.planks.map((p, i) => (
                <g key={p.lecture_id} className={`mplank ${tip?.c === ci && tip.i === i ? 'on' : ''}`} role="button" tabIndex={0}
                  aria-label={`${p.title}: ${describe(p)}`} onMouseEnter={() => show(ci, i)} onFocus={() => show(ci, i)} onClick={() => show(ci, i)}
                  onKeyDown={(e) => { if (e.key === 'Enter') go(`/renovate/${p.lecture_id}`); if (e.key === 'Escape') setTip(null); }}>
                  <rect className="hit" x={X0 + i * w} y={y - DECK / 2 - 6} width={w} height={DECK + 12} />
                  <PlankArt p={p} x={X0 + i * w} y={y} w={w} i={ci * 20 + i} />
                </g>
              ))}
              <path className="rail" d={`M${X0 - 6} ${y - DECK / 2 - 3} H${X1 + 6} M${X0 - 6} ${y + DECK / 2 + 3} H${X1 + 6}`} />
              {[X0 - 8, X1 + 8].map((x) => [-1, 1].map((s) => <circle key={`${x}${s}`} cx={x} cy={y + s * (DECK / 2 + 3)} r="6.5" className="post" />))}
              {/* add a plank */}
              <g className="addplank" role="button" tabIndex={0} aria-label={`Add a lecture to ${c.code}`} onClick={() => onAdd(c.id)} onKeyDown={(e) => e.key === 'Enter' && onAdd(c.id)}>
                <title>Add a lecture to {c.code}</title>
                <rect x={X1 + 26} y={y - 17} width="34" height="34" rx="9" />
                <path d={`M${X1 + 43} ${y - 8} v16 M${X1 + 35} ${y} h16`} />
              </g>
            </g>
          );
        })}
      </svg>

      {active && tip && (() => {
        const n = courses[tip.c].planks.length, w = (X1 - X0) / n;
        const left = ((X0 + tip.i * w + w / 2) / W) * 100, top = ((rowY(tip.c) + DECK / 2 + 8) / H) * 100;
        const gap = open.find((m) => m.lecture_id === active.lecture_id);
        return (
          <div className="plantip" style={{ left: `${Math.min(82, Math.max(18, left))}%`, top: `${top}%` }} role="dialog" aria-label={active.title}
            onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hide}>
            <strong>{active.title}</strong>
            <small>{when(active.held_at)} · {active.mine ? 'added by you' : `from ${active.source}`}</small>
            <p className="chipsrow">
              <span className={`tag mat-tag m${active.level}`}>{MATERIALS[active.level]}</span>
              {active.rot > 0 && <span className="tag rot">{rotWord(active)} · {active.newer} lectures since you were here</span>}
              {active.open > 0 && <span className="tag gap">{active.open} gap{active.open === 1 ? '' : 's'} flagged</span>}
            </p>
            <div className="actions">
              <button className="primary small" onClick={() => go(`/renovate/${active.lecture_id}`)}>
                {active.level < MATERIALS.length - 1 ? `Renovate to ${MATERIALS[active.level + 1].toLowerCase()}` : 'Practise again'}
              </button>
              {gap && <button className="ghost small" onClick={() => go(`/repair/${gap.id}`)}>Mend gap</button>}
              <button className="ghost small" onClick={() => go(`/lecture/${active.lecture_id}`)}>Open lecture</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
