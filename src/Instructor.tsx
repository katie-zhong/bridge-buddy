import { useState } from 'react';
import { api, stamp, useAsync, type Home, type Post } from './ui';

interface Concept { concept: string; title: string; t_start: number; suppressed?: boolean; students?: number; share?: number; repaired?: number; questions?: { text: string; count: number }[] }
interface Problem { id: string; question: string; answer: string }
interface Data {
  lecture: { id: string; title: string }; class_size: number; min_group: number; demo: boolean; concepts: Concept[];
  problems: Problem[]; practice: { students: number; first_try: number } | null;
  segments: { id: string; idx: number; t_start: number; text: string; concept: string; students: number | null }[]; posts: Post[];
}

/** Instructor view. Aggregates only: no names, and nothing about groups smaller than the minimum. */
export function Instructor({ home }: { home: Home }) {
  const lectures = home.courses.flatMap((c) => c.planks.filter((p) => !p.mine).map((p) => ({ id: p.lecture_id, title: `${c.code} · ${p.title}`, held_at: p.held_at })))
    .sort((a, b) => b.held_at - a.held_at);
  const [id, setId] = useState(lectures[0]?.id);
  const { data, error, set } = useAsync<Data>(() => api<Data>(`/instructor/lectures/${id}`), [id]);
  const [pick, setPick] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ question: '', answer: '' });
  const [formError, setFormError] = useState('');
  if (home.user.role !== 'instructor') return <main className="page"><p className="muted">This page is for instructors.</p></main>;
  if (error) return <main className="page"><p className="error">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;

  const max = Math.max(1, ...data.segments.map((s) => s.students || 0));
  const hot = [...data.concepts].filter((c) => !c.suppressed).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const chosen = data.segments.find((s) => s.id === pick);
  const send = async (parent: string) => {
    const posts = await api<Post[]>(`/lectures/${id}/posts`, 'POST', { body: reply[parent], parent_id: parent });
    set({ ...data, posts }); setReply({ ...reply, [parent]: '' });
  };
  const addProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const problems = await api<Problem[]>(`/lectures/${id}/problems`, 'POST', draft);
      set({ ...data, problems }); setDraft({ question: '', answer: '' });
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not add the problem'); }
  };
  const removeProblem = async (pid: string) => set({ ...data, problems: await api<Problem[]>(`/problems/${pid}`, 'DELETE') });
  const roots = data.posts.filter((p) => !p.parent_id);

  return (
    <main className="page">
      <div className="between wrap">
        <h1>Where the class got lost</h1>
        <select value={id} onChange={(e) => { setId(e.target.value); setPick(null); }} aria-label="Lecture">
          {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>
      <p className="fine">Groups only, never names. Nothing is shown for fewer than {data.min_group} students.{data.demo ? ' Demo data: most of this class is a generated sample.' : ''}</p>

      <section className="card">
        <h2>Flags along the lecture <span className="muted">{data.class_size} students</span></h2>
        <div className="heat" role="list">
          {data.segments.map((s) => (
            <button key={s.id} role="listitem" className={`bar ${pick === s.id ? 'on' : ''}`} onClick={() => setPick(s.id)}
              aria-label={`${stamp(s.t_start)}: ${s.students ? `${s.students} students` : `fewer than ${data.min_group} students`}`}>
              <i style={{ height: `${s.students ? 12 + (88 * s.students) / max : 4}%` }} className={s.students && s.students / max > 0.66 ? 'hi' : ''} />
              {(s.idx % 2 === 0 || data.segments.length < 8) && <small>{stamp(s.t_start)}</small>}
            </button>
          ))}
        </div>
        {chosen
          ? <blockquote><p><span className="time">{stamp(chosen.t_start)}</span> {chosen.text}</p><p className="muted">{chosen.students ? `${chosen.students} students flagged or asked about this passage.` : `Fewer than ${data.min_group} students, so no count is shown.`}</p></blockquote>
          : <p className="muted">Select a bar to read what you were saying at that moment.</p>}
      </section>

      <div className="cols">
        <section className="card">
          <h2>By idea</h2>
          <table>
            <thead><tr><th>Idea</th><th>Flagged by</th><th>Gaps mended</th></tr></thead>
            <tbody>
              {data.concepts.map((c) => (
                <tr key={c.concept}>
                  <th scope="row">{c.title}<small>{stamp(c.t_start)}</small></th>
                  {c.suppressed ? <td colSpan={2} className="muted">Fewer than {data.min_group} students</td> : (
                    <><td><span className="meter"><i style={{ width: `${c.share}%` }} /></span>{c.share}%</td><td>{c.repaired}%</td></>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>What they asked</h2>
          {hot.filter((c) => c.questions?.length).slice(0, 3).map((c) => (
            <div key={c.concept} className="asked">
              <h3>{c.title}</h3>
              <ul>{c.questions?.map((q) => <li key={q.text}>"{q.text}" <span className="muted">×{q.count}</span></li>)}</ul>
            </div>
          ))}
          {!hot.some((c) => c.questions?.length) && <p className="muted">No questions from groups of {data.min_group} or more yet.</p>}
          {hot[0] && <p className="tip"><strong>One thing to try:</strong> open next class with two minutes on "{hot[0].title}". {hot[0].share}% of the class flagged it.</p>}
        </section>
      </div>

      <section className="card">
        <div className="between wrap">
          <h2>Practice problems</h2>
          <span className="muted">{data.practice ? `${data.practice.first_try}% right first try · ${data.practice.students} students` : `Fewer than ${data.min_group} students have practised`}</span>
        </div>
        <p className="fine">Students answer these to renovate this lecture's plank. Noor grades for understanding, using your model answer.</p>
        <ul className="problemlist">
          {data.problems.map((p) => (
            <li key={p.id}><span><strong>{p.question}</strong><small>{p.answer || 'Written by Noor from the transcript'}</small></span>
              <button className="ghost small" onClick={() => removeProblem(p.id)}>Remove</button></li>
          ))}
        </ul>
        <form onSubmit={addProblem} className="stack">
          <label>New problem<textarea rows={2} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></label>
          <label>Model answer<textarea rows={2} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} /></label>
          {formError && <p className="error" role="alert">{formError}</p>}
          <button className="primary" disabled={!draft.question.trim() || !draft.answer.trim()}>Add problem</button>
        </form>
      </section>

      <section className="card talk">
        <h2>Class discussion</h2>
        {!roots.length && <p className="muted">No posts on this lecture yet.</p>}
        {roots.map((p) => (
          <div key={p.id} className="post">
            <p className="who">{p.author}</p><p>{p.body}</p>
            {data.posts.filter((r) => r.parent_id === p.id).map((r) => <div key={r.id} className="post reply"><p className="who">{r.author}{r.instructor && <span className="tag proven">Instructor</span>}</p><p>{r.body}</p></div>)}
            <form className="between" onSubmit={(e) => { e.preventDefault(); if (reply[p.id]?.trim()) send(p.id); }}>
              <input value={reply[p.id] || ''} onChange={(e) => setReply({ ...reply, [p.id]: e.target.value })} placeholder="Reply to the class" aria-label="Reply" />
              <button className="primary small">Reply</button>
            </form>
          </div>
        ))}
      </section>
    </main>
  );
}
