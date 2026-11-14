import { useState } from 'react';
import { api, go, stamp, useAsync, when, AnswerBox, OfflineNote, type Card, type Recall } from './ui';
import { Troll } from './Troll';

interface Data { recalls: Recall[]; done: Recall[]; cards: Card[]; now: number }

function RecallCheck({ r, early, onDone }: { r: Recall; early: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(!early);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; feedback: string; early: boolean; ai: string; ai_error?: string } | null>(null);
  const check = async () => { setBusy(true); try { setResult(await api(`/recalls/${r.id}/answer`, 'POST', { answer })); } finally { setBusy(false); } };
  return (
    <div className="card riddlecard">
      <p className="muted">{r.lecture.split(':')[0]} · <button className="time" onClick={() => go(`/lecture/${r.lecture_id}?t=${r.t_start}`)}>{stamp(r.t_start)}</button> · {early ? `due ${when(r.due_at)}` : 'due now'}</p>
      {!open ? <button className="ghost" onClick={() => setOpen(true)}>Try it early (practice only)</button> : (
        <>
          <div className="riddleq"><Troll mood={result?.passed ? 'happy' : 'think'} size={52} /><p>{r.question}</p></div>
          {!result && <><AnswerBox value={answer} onChange={setAnswer} placeholder="From memory, in your own words" /><button className="primary" disabled={busy || !answer.trim()} onClick={check}>{busy ? 'Checking…' : 'Check'}</button></>}
          {result && (
            <div className={`verdict ${result.passed ? 'pass' : 'retry'}`} role="status">
              <p><strong>{result.passed ? (result.early ? 'Right.' : 'Proven. This plank is solid.') : 'Not this time.'}</strong> {result.feedback}</p>
              <p className="fine">{result.passed ? (result.early ? 'This was early practice, so the real check still comes on its due date.' : '') : "I'll ask again in 2 days."}</p>
              {result.ai === 'offline' && result.ai_error && <OfflineNote error={result.ai_error} />}
              <button className="ghost" onClick={onDone}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Flashcards({ cards, now, reload }: { cards: Card[]; now: number; reload: () => void }) {
  const due = cards.filter((c) => c.due_at <= now);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const card = due[0];
  const review = async (ok: boolean) => { await api(`/cards/${card.id}/review`, 'POST', { ok }); setFlipped(false); reload(); };
  const add = async (e: React.FormEvent) => { e.preventDefault(); await api('/cards', 'POST', { front, back }); setFront(''); setBack(''); reload(); };
  return (
    <section>
      <h2>Flashcards <span className="muted">{due.length} ready · {cards.length} total</span></h2>
      {card ? (
        <div className="card flash">
          <button className="face" onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Show question' : 'Show answer'}>
            <small>{flipped ? 'Answer' : 'Question'} · tap to flip</small>
            <p>{flipped ? card.back : card.front}</p>
          </button>
          {flipped && <div className="actions"><button className="ghost" onClick={() => review(false)}>Again soon</button><button className="primary" onClick={() => review(true)}>I knew it</button></div>}
        </div>
      ) : <p className="muted">{cards.length ? 'No cards are due. They come back on a spaced schedule.' : 'No cards yet. Mending a plank makes one, or use "Make flashcards" in a lecture.'}</p>}
      <details className="card">
        <summary>Write your own card</summary>
        <form onSubmit={add} className="stack">
          <label>Front<input value={front} onChange={(e) => setFront(e.target.value)} /></label>
          <label>Back<textarea rows={2} value={back} onChange={(e) => setBack(e.target.value)} /></label>
          <button className="primary" disabled={!front.trim() || !back.trim()}>Add card</button>
        </form>
      </details>
      {cards.length > 0 && (
        <details className="card">
          <summary>All cards</summary>
          <ul className="cardlist">{cards.map((c) => (
            <li key={c.id}><span><strong>{c.front}</strong><small>{c.back}</small></span>
              <button className="ghost small" onClick={async () => { await api(`/cards/${c.id}`, 'DELETE'); reload(); }}>Remove</button></li>
          ))}</ul>
        </details>
      )}
    </section>
  );
}

export function Practice({ reload }: { reload: () => void }) {
  const { data, error, reload: refresh } = useAsync<Data>(() => api('/practice'), []);
  if (error) return <main className="page"><p className="error">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;
  const again = () => { refresh(); reload(); };
  const due = data.recalls.filter((r) => r.due_at <= data.now);
  const later = data.recalls.filter((r) => r.due_at > data.now);
  const proven = data.done.filter((r) => r.passed).length;
  return (
    <main className="page narrow">
      <h1>Practice</h1>
      <p className="lede">A plank is only proven when you still know it a week later. That is what Bridgeway measures, not how often you open the app.</p>
      <section>
        <h2>Week-later riddles <span className="muted">{due.length} due · {later.length} coming · {proven} proven</span></h2>
        {!data.recalls.length && <p className="muted">Nothing scheduled yet. Mend a plank and its riddle comes back here after 7 days.</p>}
        {due.map((r) => <RecallCheck key={r.id} r={r} early={false} onDone={again} />)}
        {later.map((r) => <RecallCheck key={r.id} r={r} early onDone={again} />)}
      </section>
      <Flashcards cards={data.cards} now={data.now} reload={again} />
    </main>
  );
}
