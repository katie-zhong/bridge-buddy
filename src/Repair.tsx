import { useEffect, useState } from 'react';
import { api, go, stamp, useAsync, AnswerBox, LevelDial, Modal, OfflineNote, ReadAloud, Tutor, type Level, type Mark, type User } from './ui';
import { Troll } from './Troll';

/** Mend one gap: see the source, get an explanation at the level you choose, then answer Norbu's riddle. */
export function Repair({ id, user, onClose }: { id: string; user: User; onClose: () => void }) {
  const mark = useAsync<Mark>(() => api(`/marks/${id}`), [id]);
  const [level, setLevel] = useState<Level>(user.settings.level || 'example');
  const [explain, setExplain] = useState<{ text: string; ai: string; ai_error?: string } | null>(null);
  const [riddle, setRiddle] = useState<{ question: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ passed: boolean; feedback: string; note_line: string | null; ai: string; ai_error?: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async (l: Level) => {
    setBusy('explain'); setError('');
    try { setExplain(await api(`/marks/${id}/explain`, 'POST', { level: l })); } catch (e: any) { setError(e.message); }
    setBusy('');
  };
  useEffect(() => { if (mark.data && mark.data.status !== 'repaired') load(level); }, [mark.data?.id]); // eslint-disable-line

  const askRiddle = async () => {
    setBusy('riddle'); setError('');
    try { setRiddle(await api(`/marks/${id}/riddle`, 'POST')); } catch (e: any) { setError(e.message); }
    setBusy('');
  };
  const check = async () => {
    setBusy('check'); setError('');
    try { setResult(await api(`/marks/${id}/answer`, 'POST', { question: riddle!.question, answer })); } catch (e: any) { setError(e.message); }
    setBusy('');
  };

  const m = mark.data;
  return (
    <Modal title="Mend this gap" onClose={onClose}>
      {mark.error && <p className="error">{mark.error}</p>}
      {m && (
        <div className="repair">
          <section>
            <p className="step">1 · What was said</p>
            <blockquote>
              {m.around!.map((s) => <p key={s.id} className={s.id === m.segment_id ? 'hit' : 'dim'}><span className="time">{stamp(s.t_start)}</span> {s.text}</p>)}
            </blockquote>
            <div className="between">
              <button className="ghost small" onClick={() => go(`/lecture/${m.lecture_id}?t=${m.t_start}`)}>Open in the lecture ›</button>
              <ReadAloud text={m.seg_text || ''} />
            </div>
            {m.body && <p className="yours">Your {m.kind === 'question' ? 'question' : 'note'}: {m.body}</p>}
          </section>

          {m.status === 'repaired' ? (
            <section className="done"><Troll size={72} /><p><strong>Already mended.</strong> {m.note_line}</p></section>
          ) : (
            <>
              <section>
                <div className="between wrap">
                  <p className="step">2 · Norbu explains</p>
                  <LevelDial value={level} onChange={(l) => { setLevel(l); load(l); }} />
                </div>
                {busy === 'explain' && <p className="muted">Norbu is thinking…</p>}
                {explain && busy !== 'explain' && (
                  <>
                    <Tutor text={explain.text} />
                    <ReadAloud text={explain.text} />
                    {explain.ai === 'offline' && <OfflineNote error={explain.ai_error} />}
                    <p className="fine stuck">Still stuck? <button className="link" onClick={() => go(`/community?about=ta&mark=${id}`)}>Email your TA about this moment</button></p>
                  </>
                )}
              </section>

              <section>
                <p className="step">3 · Answer the troll's riddle to cross</p>
                {!riddle && <button className="primary" disabled={!!busy} onClick={askRiddle}>{busy === 'riddle' ? 'Thinking of one…' : "I'm ready for the riddle"}</button>}
                {riddle && (
                  <div className="riddle">
                    <div className="riddleq"><Troll mood={result?.passed ? 'happy' : 'think'} size={56} /><p>{riddle.question}</p></div>
                    {!result?.passed && (
                      <>
                        <AnswerBox value={answer} onChange={setAnswer} placeholder="Your answer, in your own words. Spelling does not matter." />
                        <button className="primary" disabled={!!busy || !answer.trim()} onClick={check}>{busy === 'check' ? 'Checking…' : 'Check my answer'}</button>
                      </>
                    )}
                    {result && (
                      <div className={`verdict ${result.passed ? 'pass' : 'retry'}`} role="status">
                        <p><strong>{result.passed ? 'Gap mended.' : 'Not across yet.'}</strong> {result.feedback}</p>
                        {result.passed && <p>Added to your notes: <em>{result.note_line}</em></p>}
                        {result.ai === 'offline' && result.ai_error && <OfflineNote error={result.ai_error} />}
                        {result.passed && <button className="primary" onClick={onClose}>Back to the map</button>}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
