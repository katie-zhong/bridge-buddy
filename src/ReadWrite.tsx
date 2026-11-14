import { useEffect, useRef, useState } from 'react';
import { api, Modal, ReadAloud, type ReadWrite, type RwColour } from './ui';

// Read&Write's highlighters, each with a fixed meaning and a symbol so colour is never the only cue.
const PENS: { key: RwColour; label: string; mark: string }[] = [
  { key: 'key', label: 'Key idea', mark: '★' },
  { key: 'term', label: 'Word to learn', mark: 'Aa' },
  { key: 'example', label: 'Example', mark: 'e.g.' },
  { key: 'question', label: 'Ask about', mark: '?' },
];

// Lines stay lines (summary headings, bullets); each line splits into sentences. Common
// abbreviations ("vs.", "e.g.") do not end a sentence.
const ABBR = /\b(vs|e\.g|i\.e|etc|approx|Dr|Prof)\./g;
const lines = (text: string) =>
  text.replace(/[#*_`]/g, '').split('\n').map((l) => l.replace(/^\s*[-•]\s+/, '').trim()).filter(Boolean)
    .map((l) => (l.replace(ABBR, '$1\u2024').match(/[^.!?]+[.!?]*/g) || []).map((x) => x.replace(/\u2024/g, '.').trim()).filter((x) => x.length > 1));

/**
 * Mock of Texthelp Read&Write, for students whose registered accommodations include a licence.
 * Opens the generated notes (summary, mended-plank lines, own notes) with highlighters, read
 * aloud and "collect highlights". Highlights are saved per lecture.
 */
export function ReadWritePanel({ lectureId, rw, parts, onSaved, onAddToNotes, onClose }: {
  lectureId: string; rw: ReadWrite; parts: { title: string; text: string }[];
  onSaved: (highlights: Record<string, RwColour>) => void; onAddToNotes: (text: string) => void; onClose: () => void;
}) {
  const [pen, setPen] = useState<RwColour | 'erase'>('key');
  const [marks, setMarks] = useState<Record<string, RwColour>>(rw.highlights);
  const [collected, setCollected] = useState(false);
  const [saveError, setSaveError] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      api(`/lectures/${lectureId}/readwrite`, 'PUT', { highlights: marks }).then(() => { setSaveError(''); onSaved(marks); }, (e) => setSaveError(e instanceof Error ? e.message : 'Not saved'));
    }, 400);
    return () => clearTimeout(t);
  }, [marks, lectureId]); // eslint-disable-line react-hooks/exhaustive-deps

  const paint = (s: string) => setMarks((m) => {
    const next = { ...m };
    if (pen === 'erase' || next[s] === pen) delete next[s]; else next[s] = pen;
    return next;
  });
  const all = parts.map((p) => p.text).join(' ');
  const groups = PENS.map((p) => ({ ...p, items: Object.entries(marks).filter(([, c]) => c === p.key).map(([s]) => s) })).filter((g) => g.items.length);
  const collectedText = groups.map((g) => `${g.label}:\n${g.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n');

  return (
    <Modal title="Read&Write" onClose={onClose}>
      <div className="rwbar" role="toolbar" aria-label="Read&Write tools">
        <div className="rwpens" role="radiogroup" aria-label="Highlighter">
          {PENS.map((p) => (
            <button key={p.key} role="radio" aria-checked={pen === p.key} className={`rwpen ${p.key} ${pen === p.key ? 'on' : ''}`} onClick={() => setPen(p.key)}>
              <span aria-hidden>{p.mark}</span> {p.label}
            </button>
          ))}
          <button role="radio" aria-checked={pen === 'erase'} className={`rwpen erase ${pen === 'erase' ? 'on' : ''}`} onClick={() => setPen('erase')}>Eraser</button>
        </div>
        <div className="actions">
          <ReadAloud text={all} />
          <button className="ghost small" aria-pressed={collected} onClick={() => setCollected(!collected)}>Collect highlights</button>
        </div>
      </div>
      <p className="fine">Demo of the Texthelp toolbar. Tap a sentence to highlight it.{saveError && <span className="error"> {saveError}</span>}</p>

      {collected ? (
        <div className="rwcollect">
          {!groups.length && <p className="muted">Nothing highlighted yet.</p>}
          {groups.map((g) => (
            <section key={g.key}>
              <h3><span className={`rwchip ${g.key}`} aria-hidden>{g.mark}</span> {g.label}</h3>
              <ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </section>
          ))}
          {groups.length > 0 && <button className="primary" onClick={() => { onAddToNotes(collectedText); setCollected(false); }}>Add to my notes</button>}
        </div>
      ) : (
        <div className="rwdoc">
          {parts.map((p) => (
            <section key={p.title}>
              <h3>{p.title}</h3>
              {lines(p.text).map((line, li) => (
                <p key={li}>
                  {line.map((s, i) => {
                    const c = marks[s];
                    const pen = PENS.find((x) => x.key === c);
                    return (
                      <button key={i} className={`rwsent ${c || ''}`} onClick={() => paint(s)} aria-label={pen ? `${s} (highlighted: ${pen.label})` : undefined}>
                        {pen && <span className="rwtag" aria-hidden>{pen.mark}</span>}{s}
                      </button>
                    );
                  })}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
