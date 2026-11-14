import { useState } from 'react';
import { api, stamp, useAsync, when, WhyTip, type Home, type InstructorLecture, type InstructorOverview, type Post } from './ui';

/**
 * Instructor dashboard. Aggregates only: no names, nothing a student typed to Noor, flags only
 * from students who chose to share them, and nothing about groups smaller than the minimum.
 */
export function Instructor({ home }: { home: Home }) {
  const overview = useAsync<InstructorOverview>(() => api<InstructorOverview>('/instructor/overview'), []);
  const lectures = home.lectures.filter((l) => !l.owner_id);
  const [id, setId] = useState(lectures[0]?.id);
  if (home.user.role !== 'instructor') return <main className="page"><p className="muted">This page is for instructors.</p></main>;
  const o = overview.data;
  if (overview.error) return <main className="page"><p className="error">{overview.error}</p></main>;
  if (!o) return <main className="page"><p className="muted">Loading…</p></main>;
  const pctOrDash = (n: number | null | undefined) => (n == null ? '–' : `${n}%`);
  const used = o.strategies.filter((s) => s.students != null).sort((a, b) => (b.students ?? 0) - (a.students ?? 0));
  const hidden = o.strategies.length - used.length;
  const most = Math.max(1, ...used.map((s) => s.students ?? 0));

  return (
    <main className="page">
      <p className="eyebrow">{home.course.code} · class view</p>
      <div className="between wrap">
        <h1>Your class at a glance</h1>
        <WhyTip label="What can I see here?">
          <span className="line"><strong>You see:</strong> counts from students who chose to share their flags, and which strategies the class uses.</span>
          <span className="line"><strong>Never:</strong> names, what a student typed to Noor, or any group under {o.min_group}.</span>
        </WhyTip>
      </div>
      {o.demo && <p className="fine">Demo data: most of this class is a generated sample, so the dashboard has something to show before a pilot.</p>}

      <section className="kpis" aria-label="Class summary">
        <div className="card kpi"><strong>{o.class_size}</strong><span>students</span></div>
        <div className="card kpi"><strong>{o.sharing ?? `<${o.min_group}`}</strong><span>share their flags</span></div>
        <div className="card kpi"><strong>{o.totals?.flags ?? '–'}</strong><span>flags shared</span></div>
        <div className="card kpi"><strong>{pctOrDash(o.totals?.mended)}</strong><span>of flags mended</span></div>
        <div className="card kpi"><strong>{pctOrDash(o.totals?.recall)}</strong><span>right a week later</span></div>
      </section>

      <div className="cols start">
        <section className="card">
          <h2>Lectures</h2>
          <ul className="todo">
            {o.lectures.map((l) => (
              <li key={l.id}>
                <button className="row" aria-pressed={id === l.id} onClick={() => setId(l.id)}>
                  <span><strong>{l.title}</strong><small>{when(l.held_at)}{l.top ? ` · most flagged: ${l.top.title}` : ''}</small></span>
                  <span className="tag">{l.share == null ? `under ${o.min_group}` : `${l.share}% flagged`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="between">
            <h2>Strategies in use <span className="muted">students</span></h2>
            <WhyTip label="Where do these numbers come from?">
              <span className="line"><strong>What:</strong> how many students switched each strategy on.</span>
              <span className="line"><strong>Not shown:</strong> who, or why they picked it.</span>
            </WhyTip>
          </div>
          {!used.length && <p className="muted">No strategy is used by {o.min_group} or more students yet.</p>}
          <table>
            <tbody>
              {used.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.title}</th>
                  <td className="num"><span className="meter use"><i style={{ width: `${(100 * (s.students ?? 0)) / most}%` }} /></span>{s.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && <p className="fine">{hidden} more used by fewer than {o.min_group} students.</p>}
        </section>
      </div>

      {id && <LectureDetail key={id} id={id} />}
    </main>
  );
}

function LectureDetail({ id }: { id: string }) {
  const { data, error, set } = useAsync<InstructorLecture>(() => api<InstructorLecture>(`/instructor/lectures/${id}`), [id]);
  const [pick, setPick] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const max = Math.max(1, ...data.segments.map((s) => s.students || 0));
  const hot = data.concepts.filter((c) => !c.suppressed).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const chosen = data.segments.find((s) => s.id === pick);
  const send = async (parent: string) => {
    const posts = await api<Post[]>(`/lectures/${id}/posts`, 'POST', { body: reply[parent], parent_id: parent });
    set({ ...data, posts }); setReply({ ...reply, [parent]: '' });
  };
  const roots = data.posts.filter((p) => !p.parent_id);

  return (
    <>
      <h2 className="sectionhead">{data.lecture.title}</h2>
      <section className="card">
        <h2>Where it got lost <span className="muted">{data.class_size} sharing</span></h2>
        <div className="heat" role="list">
          {data.segments.map((s) => {
            const label = `${stamp(s.t_start)}: ${s.students ? `${s.students} students` : `fewer than ${data.min_group} students`}`;
            return (
              <button key={s.id} role="listitem" className={`bar ${pick === s.id ? 'on' : ''}`} onClick={() => setPick(s.id)} aria-label={label} title={label}>
                <i style={{ height: `${s.students ? 12 + (88 * s.students) / max : 4}%` }} className={s.students && s.students / max > 0.66 ? 'hi' : ''} />
                {s.idx % 2 === 0 && <small>{stamp(s.t_start)}</small>}
              </button>
            );
          })}
        </div>
        {chosen
          ? <blockquote><p><span className="time">{stamp(chosen.t_start)}</span> {chosen.text}</p><p className="muted">{chosen.students ? `${chosen.students} students flagged this passage.` : `Fewer than ${data.min_group} students, so no count is shown.`}</p></blockquote>
          : <p className="muted">Pick a bar to read what you said at that moment.</p>}
        {hot[0] && <p className="tip"><strong>One thing to try:</strong> open next class with two minutes on "{hot[0].title}". {hot[0].share}% of sharing students flagged it.</p>}
      </section>

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
        <p className="fine">"Right a week later" is the comprehension measure: a delayed recall check on ideas students first flagged.</p>
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
    </>
  );
}
