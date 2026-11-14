import { useState } from 'react';
import { api, mailto, nextSlot, stamp, useAsync, WhyTip, type Course, type Home, type Mark, type Role } from './ui';

const useCourse = () => useAsync<Course>(() => api('/course'), []);
const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtSlot = (d: Date, end: string) => {
  const e = new Date(d);
  const [h, m] = end.split(':').map(Number);
  e.setHours(h, m);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time(d)}–${time(e)}`;
};
const soon = (d: Date) => d.getTime() - Date.now() < 36 * 3600 * 1000;
const ROLE_SHORT: Record<Role, string> = { instructor: 'Instructor', ta: 'TA', isa: 'ISA' };

function TeamsIcon() {
  return <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><rect x="2" y="5" width="11" height="10" rx="2.5" fill="currentColor" /><path d="M14 8.5l4-2.5v8l-4-2.5z" fill="currentColor" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><rect x="2" y="4" width="16" height="12" rx="3" fill="currentColor" opacity=".25" /><path d="M3 6l7 5 7-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Bridge (inside Coming up): the next office hours, straight from the syllabus. */
export function OfficeHoursRow() {
  const { data } = useCourse();
  if (!data?.office_hours.length) return null;
  const next = data.office_hours.map((o) => ({ ...o, at: nextSlot(o.day, o.start) })).sort((a, b) => +a.at - +b.at)[0];
  return (
    <li className="row static hoursrow">
      <span className={`tag day ${soon(next.at) ? 'soon' : ''}`}>{next.at.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      <span><strong>Office hours · {next.name.replace(/^(Dr|Prof)\.?\s+/, '').split(' ').slice(-1)[0]}</strong><small>{time(next.at)}</small></span>
      {next.teams_url && <a className="btn ghost small" href={next.teams_url} target="_blank" rel="noreferrer" aria-label={`Join ${next.name}'s office hours on Microsoft Teams`}><TeamsIcon /> Join</a>}
    </li>
  );
}

/** Community: the teaching team, office hours and the right person to email, all from Brightspace. */
export function Community({ home, query }: { home: Home; query: URLSearchParams }) {
  const course = useCourse();
  const markId = query.get('mark');
  const mark = useAsync<Mark | null>(() => (markId ? api<Mark>(`/marks/${markId}`) : Promise.resolve(null)), [markId]);
  const [picked, setTopic] = useState<number | null>(null);
  const c = course.data;
  if (course.error) return <main className="page narrow"><p className="error">{course.error}</p></main>;
  if (!c) return <main className="page narrow"><p className="muted">Loading…</p></main>;

  // ?about=ta|isa|instructor preselects the matching syllabus rule (e.g. from a plank you are mending).
  const topic = picked ?? Math.max(0, c.routing.findIndex((r) => r.role === query.get('about')));
  const rule = c.routing[topic] ?? c.routing[0];
  const person = c.team.find((p) => p.role === rule?.role);
  const m = mark.data;
  const first = (n: string) => n.replace(/^(Dr|Prof)\.?\s+/, '').split(' ')[0];
  const context = m ? `\n\nI got lost in ${(m.lecture || 'a lecture').split(':')[0]} at ${stamp(m.t_start || 0)}, where the lecture says:\n"${(m.seg_text || '').slice(0, 220)}${(m.seg_text || '').length > 220 ? '…' : ''}"\n` : '\n\n';
  const subject = `${c.code}: ${m ? `question about ${(m.lecture || 'lecture').split(':')[0]}` : rule?.topic.split(',')[0] ?? 'question'}`;
  const body = person ? `Hi ${first(person.name)},${context}\n[Write your question here]\n\nThanks,\n${home.user.name}` : '';
  const hours = c.office_hours.map((o) => ({ ...o, at: nextSlot(o.day, o.start) })).sort((a, b) => +a.at - +b.at);

  return (
    <main className="page">
      <div className="between wrap">
        <div><p className="eyebrow">{c.code} · {c.title}</p><h1>Community</h1></div>
        <span className="tag" title="Pulled from the course syllabus in Brightspace">From the Brightspace syllabus{c.demo ? ' · demo data' : ''}</span>
      </div>

      <div className="cols">
        <section className="card stack">
          <h2>Reach out</h2>
          <div className="chips" role="radiogroup" aria-label="What is it about?">
            {c.routing.map((r, i) => (
              <button key={r.topic} role="radio" aria-checked={i === topic} className={i === topic ? 'pick on' : 'pick'} onClick={() => setTopic(i)}>{r.topic}</button>
            ))}
          </div>
          {person && (
            <div className="contact">
              <span className="avatar" aria-hidden>{person.name.replace(/^(Dr|Prof)\.?\s+/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
              <span className="person"><strong>{person.name}</strong><small>{person.role_label}</small></span>
              <WhyTip label={`Why ${first(person.name)}?`}>
                <span className="line"><b>Why:</b> your syllabus says "{rule.rule}"</span>
                <span className="line"><b>How:</b> the email opens with your question's context filled in. Add your question and send.</span>
              </WhyTip>
              <a className="btn primary" href={mailto(person.email, subject, body)}><MailIcon /> Email {first(person.name)}</a>
            </div>
          )}
          {m && <p className="fine">The email includes where you got lost in {(m.lecture || '').split(':')[0]} ({stamp(m.t_start || 0)}).</p>}
        </section>

        <section className="card">
          <h2>Office hours</h2>
          <ul className="todo">
            {hours.map((o) => (
              <li key={o.teams_url ?? o.name + o.day} className="row static">
                <span className={`tag ${soon(o.at) ? 'soon' : ''}`}>{o.role ? ROLE_SHORT[o.role] : '—'}</span>
                <span><strong>{o.name}</strong><small>{fmtSlot(o.at, o.end)}</small></span>
                {o.teams_url && <a className="btn ghost small" href={o.teams_url} target="_blank" rel="noreferrer" aria-label={`Join ${o.name} on Microsoft Teams`}><TeamsIcon /> Teams</a>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>Teaching team</h2>
        <ul className="team">
          {c.team.map((p) => (
            <li key={p.email}>
              <span className="avatar" aria-hidden>{p.name.replace(/^(Dr|Prof)\.?\s+/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
              <span className="person"><strong>{p.name}</strong><small>{p.role_label}</small></span>
              <a className="btn ghost small" href={mailto(p.email, `${c.code}: `, `Hi ${first(p.name)},\n\n\n\nThanks,\n${home.user.name}`)} aria-label={`Email ${p.name}`}><MailIcon /> Email</a>
            </li>
          ))}
        </ul>
        <p className="fine">Class questions about a lecture go in that lecture's Class tab, where classmates can answer too.</p>
      </section>
    </main>
  );
}
