import { useState } from 'react';
import { api, stamp, useAsync, type Home, type Post } from './ui';

interface Concept { concept: string; title: string; t_start: number; suppressed?: boolean; students?: number; share?: number; repaired?: number; first_try?: number | null; recall?: number | null; questions?: { text: string; count: number }[] }
interface Data {
  lecture: { id: string; title: string }; class_size: number; min_group: number; demo: boolean; concepts: Concept[];
  segments: { id: string; idx: number; t_start: number; text: string; concept: string; students: number | null }[]; posts: Post[];
}

/** Instructor view. Aggregates only: no names, and nothing about groups smaller than the minimum. */
export function Instructor({ home }: { home: Home }) {
  const lectures = home.lectures.filter((l) => !l.owner_id);
  const [id, setId] = useState(lectures[0]?.id);
  const { data, error, set } = useAsync<Data>(() => api(`/instructor/lectures/${id}`), [id]);
  const [pick, setPick] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  if (home.user.role !== 'instructor') return <main className="page"><p className="muted">This page is for instructors.</p></main>;
  if (error) return <main className="page"><p className="error">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;

  const max = Math.max(1, ...data.segments.map((s) => s.students || 0));
  const hot = [...data.concepts].filter((c) => !c.suppressed).sort((a, b) => b.share! - a.share!);
  const chosen = data.segments.find((s) => s.id === pick);
  const send = async (parent: string) => {
    const posts = await api<Post[]>(`/lectures/${id}/posts`, 'POST', { body: reply[parent], parent_id: parent });
    set({ ...data, posts }); setReply({ ...reply, [parent]: '' });
  };
  const roots = data.posts.filter((p) => !p.parent_id);

  return (
    <main className="page">
      <div className="between wrap">
        <div><p className="eyebrow">{home.course.code} · class view</p><h1>Where the class got lost</h1></div>
        <select value={id} onChange={(e) => { setId(e.target.value); setPick(null); }} aria-label="Lecture">
          {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>
      <p className="lede">Each bar is a passage of your lecture. Taller means more students flagged it or asked about it. You see groups, never individuals, and nothing below {data.min_group} students.</p>
      {data.demo && <p className="fine">Demo data: most of this class is a generated sample, so the app has something to show before a pilot.</p>}

      <section className="card">
        <h2>Flags along the lecture <span className="muted">{data.class_size} students</span></h2>
        <div className="heat" role="list">
          {data.segments.map((s) => (
            <button key={s.id} role="listitem" className={`bar ${pick === s.id ? 'on' : ''}`} onClick={() => setPick(s.id)}
              aria-label={`${stamp(s.t_start)}: ${s.students ? `${s.students} students` : `fewer than ${data.min_group} students`}`}>
              <i style={{ height: `${s.students ? 12 + (88 * s.students) / max : 4}%` }} className={s.students && s.students / max > 0.66 ? 'hi' : ''} />
              {s.idx % 2 === 0 && <small>{stamp(s.t_start)}</small>}
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
            <thead><tr><th>Idea</th><th>Flagged by</th><th>Riddle right first try</th><th>Right a week later</th></tr></thead>
            <tbody>
              {data.concepts.map((c) => (
                <tr key={c.concept}>
                  <th scope="row">{c.title}<small>{stamp(c.t_start)}</small></th>
                  {c.suppressed ? <td colSpan={3} className="muted">Fewer than {data.min_group} students</td> : (
                    <><td><span className="meter"><i style={{ width: `${c.share}%` }} /></span>{c.share}%</td><td>{c.first_try == null ? '–' : `${c.first_try}%`}</td><td>{c.recall == null ? '–' : `${c.recall}%`}</td></>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">"Right a week later" is the comprehension measure: a delayed recall check on ideas students first flagged as confusing.</p>
        </section>

        <section className="card">
          <h2>What they asked</h2>
          {hot.filter((c) => c.questions?.length).slice(0, 3).map((c) => (
            <div key={c.concept} className="asked">
              <h3>{c.title}</h3>
              <ul>{c.questions!.map((q) => <li key={q.text}>"{q.text}" <span className="muted">×{q.count}</span></li>)}</ul>
            </div>
          ))}
          {!hot.some((c) => c.questions?.length) && <p className="muted">No questions from groups of {data.min_group} or more yet.</p>}
          {hot[0] && <p className="tip"><strong>One thing to try:</strong> open Thursday with two minutes on "{hot[0].title}". {hot[0].share}% of the class flagged it.</p>}
        </section>
      </div>

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
