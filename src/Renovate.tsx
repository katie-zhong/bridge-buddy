import { useState } from 'react';
import { api, go, useAsync, AnswerBox, Modal, OfflineNote, MATERIALS } from './ui';
import { Troll } from './Troll';

interface Practice { lecture: { id: string; title: string }; level: number; need: number; done: number; problems: { id: string; question: string }[] }
interface Result { passed: boolean; feedback: string; model_answer: string | null; done: number; need: number; renovated: boolean; level: number; bridge_level: number | null; ai: string; ai_error?: string }

function Confetti() {
  return <div className="confetti" aria-hidden>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.12}s`, background: ['#eeb84f', '#4f9a6a', '#c8553d', '#6fbcc6'][i % 4] }} />)}</div>;
}

/** Renovate a plank: answer the practice problems for that lecture and it is rebuilt in a stronger material. */
export function Renovate({ id, onClose }: { id: string; onClose: () => void }) {
  const practice = useAsync<Practice>(() => api<Practice>(`/lectures/${id}/practice`), [id]);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const p = practice.data;
  const problem = p?.problems[0];

  const check = async () => {
    if (!problem) return;
    setBusy(true); setError('');
    try { setResult(await api<Result>(`/problems/${problem.id}/answer`, 'POST', { answer })); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    setBusy(false);
  };
  const next = () => { setResult(null); setAnswer(''); practice.reload(); };

  return (
    <Modal title={p ? `Renovate: ${p.lecture.title.split(':')[0]}` : 'Renovate'} onClose={onClose}>
      {practice.error && <p className="error">{practice.error}</p>}
      {!p && !practice.error && <p className="muted">Fetching the practice problems…</p>}
      {p && result?.renovated && (
        <div className="renodone">
          {result.bridge_level != null && <Confetti />}
          <Troll mood="happy" size={150} />
          <h3>{MATERIALS[result.level - 1]} → {MATERIALS[result.level]}</h3>
          <p>{result.bridge_level != null ? `Every plank on this bridge is now ${MATERIALS[result.bridge_level].toLowerCase()} or better.` : 'Plank rebuilt. It will hold for longer now.'}</p>
          <div className="actions center">
            <button className="primary" onClick={onClose}>Back to the map</button>
            {result.level < MATERIALS.length - 1 && <button className="ghost" onClick={next}>Renovate again</button>}
          </div>
        </div>
      )}
      {p && !result?.renovated && (
        <div className="repair">
          <p className="progress">
            <span className={`tag mat-tag m${p.level}`}>{MATERIALS[p.level]}</span>
            {p.level < MATERIALS.length - 1 && <> → <span className={`tag mat-tag m${p.level + 1}`}>{MATERIALS[p.level + 1]}</span></>}
            <span className="muted"> {result ? result.done : p.done} of {p.need} solved</span>
          </p>
          {!problem && <p className="muted">This lecture has no transcript yet, so there is nothing to practise.</p>}
          {problem && (
            <>
              <div className="riddleq"><Troll mood={result?.passed ? 'happy' : 'think'} size={60} /><p>{problem.question}</p></div>
              {!result?.passed && (
                <>
                  <AnswerBox value={answer} onChange={setAnswer} placeholder="Your answer. Spelling does not matter." />
                  <div className="actions">
                    <button className="primary" disabled={busy || !answer.trim()} onClick={check}>{busy ? 'Checking…' : 'Check'}</button>
                    <button className="ghost" onClick={() => go(`/lecture/${p.lecture.id}`)}>Look at the lecture first</button>
                  </div>
                </>
              )}
              {result && (
                <div className={`verdict ${result.passed ? 'pass' : 'retry'}`} role="status">
                  <p><strong>{result.passed ? 'Right.' : 'Not yet.'}</strong> {result.feedback}</p>
                  {result.model_answer && <p className="fine">Model answer: {result.model_answer}</p>}
                  {result.ai === 'offline' && result.ai_error && <OfflineNote error={result.ai_error} />}
                  {result.passed && <button className="primary" onClick={next}>Next problem</button>}
                </div>
              )}
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
