import { useEffect, useState } from 'react';
import { api, go, session, useAsync, when, stamp, type Home, type User } from './ui';
import { Bridge, Troll } from './Troll';
import { LectureView, NewLecture } from './Lecture';
import { Repair } from './Repair';
import { Practice } from './Practice';
import { Strategies } from './Strategies';
import { Instructor } from './Instructor';
import { SettingsPage } from './Settings';

function useHash() {
  const [hash, set] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => set(location.hash.slice(1) || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function Login({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const out = await api('/login', 'POST', { name, role });
      session.token = out.token;
      go(role === 'instructor' ? '/teach' : '/');
      onDone();
    } catch (err: any) { setError(err.message); }
  };
  return (
    <main className="login">
      <Troll size={150} mood="happy" />
      <h1>NorBu</h1>
      <p className="lede">The troll under the Northbridge. Flag what you miss in a lecture, keep listening, and mend the gap later.</p>
      <form onSubmit={submit} className="card">
        <label>What should NorBu call you?
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} placeholder="First name" />
        </label>
        <div className="dial" role="radiogroup" aria-label="I am a">
          <button type="button" role="radio" aria-checked={role === 'student'} className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>I'm a student</button>
          <button type="button" role="radio" aria-checked={role === 'instructor'} className={role === 'instructor' ? 'on' : ''} onClick={() => setRole('instructor')}>I'm an instructor</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={!name.trim()}>Cross the bridge</button>
        <p className="fine">No diagnosis, paperwork or waitlist needed. In the pilot you sign in with your Northbridge Microsoft account.</p>
      </form>
    </main>
  );
}

function applyPrefs(u?: User) {
  const s = u?.settings || {};
  const root = document.documentElement;
  root.dataset.font = s.font || 'atkinson';
  root.style.setProperty('--scale', String(s.size || 1));
  root.style.setProperty('--leading', String(s.spacing || 1.6));
  root.dataset.calm = s.calm ? '1' : '';
}

function Today({ home }: { home: Home }) {
  const { planks, streak, open, recalls, deadlines, course } = home;
  const now = Date.now() / 1000;
  const due = recalls.filter((r) => r.due_at <= now);
  const count = (s: string) => planks.filter((p) => p.state === s).length;
  const mood = open.length ? 'think' : streak.today ? 'happy' : 'idle';
  const gaps = count('gap');
  const line = gaps
    ? `${gaps} ${gaps === 1 ? 'plank is' : 'planks are'} missing. Mend one and I'll stop staring.`
    : due.length ? 'No gaps. But I have a riddle waiting for you.'
    : planks.some((p) => p.state !== 'plain') ? 'Your bridge is holding. Nice work.'
    : 'Open a lecture. Press F when you get lost. I\'ll remember where.';
  return (
    <main className="page">
      <section className="hero card">
        <div className="herohead">
          <div>
            <p className="eyebrow">{course.code} · {course.title}</p>
            <h1>Hi {home.user.name}. {line}</h1>
          </div>
          <div className={`streak ${streak.today ? 'lit' : ''}`} title="Days in a row with a riddle solved. Logging in does not count.">
            <strong>{streak.days}</strong><span>day{streak.days === 1 ? '' : 's'} mending</span>
          </div>
        </div>
        <Bridge planks={planks} examLabel={course.exam_label} examIn={when(course.exam_at)} mood={mood} />
        <ul className="legend">
          <li><i className="sw gap" />{count('gap')} to repair</li>
          <li><i className="sw mended" />{count('mended')} mended</li>
          <li><i className="sw proven" />{count('proven')} proven a week later</li>
          <li><i className="sw plain" />{count('plain')} no gaps flagged</li>
        </ul>
      </section>

      <div className="cols">
        <section className="card">
          <h2>Today</h2>
          {!open.length && !due.length && <p className="muted">Nothing to mend right now.</p>}
          <ul className="todo">
            {due.map((r) => (
              <li key={r.id}><button className="row" onClick={() => go('/practice')}>
                <span className="tag proven">Riddle</span><span><strong>Week-later check</strong><small>{r.lecture.split(':')[0]} · {stamp(r.t_start)}</small></span><span className="chev">›</span>
              </button></li>
            ))}
            {open.map((m) => (
              <li key={m.id}><button className="row" onClick={() => go(`/repair/${m.id}`)}>
                <span className="tag gap">{m.kind === 'question' ? 'Question' : 'Flag'}</span>
                <span><strong>{m.body || `${(m.seg_text || '').slice(0, 64)}…`}</strong><small>{(m.lecture || '').split(':')[0]} · {stamp(m.t_start || 0)}</small></span><span className="chev">›</span>
              </button></li>
            ))}
          </ul>
          {home.cards_due > 0 && <button className="ghost" onClick={() => go('/practice')}>{home.cards_due} flashcard{home.cards_due === 1 ? '' : 's'} ready to review ›</button>}
        </section>

        <section className="card">
          <h2>Coming up</h2>
          <ul className="todo">
            {deadlines.map((d) => (
              <li key={d.id} className="row static">
                <span className={`tag ${d.due_at - now < 2.5 * 86400 ? 'soon' : ''}`}>{when(d.due_at)}</span>
                <span><strong>{d.title}</strong><small>{d.course} · from {d.source}</small></span>
              </li>
            ))}
          </ul>
          <p className="fine">Pulled into one list from Brightspace, course sites and your calendar.</p>
        </section>
      </div>

      <section className="card">
        <div className="between"><h2>Lectures</h2><NewLecture /></div>
        <ul className="todo">
          {home.lectures.map((l) => (
            <li key={l.id}><button className="row" onClick={() => go(`/lecture/${l.id}`)}>
              <span className="tag">{l.source}</span>
              <span><strong>{l.title}</strong><small>{when(l.held_at)} · {Math.round(((l.segments || 0) * 30) / 60)} min{l.live_demo ? ' · live replay available' : ''}</small></span>
              {l.open ? <span className="tag gap">{l.open} to repair</span> : null}<span className="chev">›</span>
            </button></li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function App() {
  const hash = useHash();
  const [authed, setAuthed] = useState(!!session.token);
  const home = useAsync<Home | null>(() => (authed ? api<Home>('/home') : Promise.resolve(null)), [authed]);
  const [toast, setToast] = useState('');
  const user = home.data?.user;

  useEffect(() => applyPrefs(user), [user]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); } }, [toast]);

  // Daily reminder at the time the student chose. Fires while NorBu is open in a tab.
  useEffect(() => {
    const at = user?.settings.reminder;
    if (!at) return;
    const tick = () => {
      const d = new Date();
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const key = `norbu-reminded-${d.toDateString()}`;
      let fired = false;
      try { fired = !!localStorage.getItem(key); } catch { /* ignore */ }
      if (hm !== at || fired) return;
      try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
      const n = home.data?.open.length || 0;
      const msg = n ? `${n} plank${n === 1 ? '' : 's'} to mend. Five minutes is enough.` : 'Your bridge is holding. One riddle to keep it that way?';
      if ('Notification' in window && Notification.permission === 'granted') new Notification('NorBu', { body: msg });
      else setToast(msg);
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [user?.settings.reminder, home.data?.open.length]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (home.error) return <main className="page"><p className="error">{home.error}</p></main>;
  if (!home.data) return <main className="page"><p className="muted">Loading…</p></main>;

  const h = home.data;
  const [path, query] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  const instructor = h.user.role === 'instructor';
  const nav = instructor
    ? [['/teach', 'Class view'], ['/settings', 'Settings']]
    : [['/', 'Bridge'], ['/practice', 'Practice'], ['/help', 'What helps'], ['/settings', 'Settings']];
  const reload = () => home.reload();
  const signOut = () => { session.token = null; go('/'); location.reload(); };

  let screen;
  if (parts[0] === 'lecture') screen = <LectureView key={parts[1]} id={parts[1]} home={h} startAt={Number(new URLSearchParams(query).get('t')) || undefined} reload={reload} toast={setToast} />;
  else if (parts[0] === 'repair') screen = <><Today home={h} /><Repair id={parts[1]} user={h.user} onClose={() => { reload(); history.length > 1 ? history.back() : go('/'); }} /></>;
  else if (parts[0] === 'practice') screen = <Practice reload={reload} />;
  else if (parts[0] === 'help') screen = <Strategies home={h} reload={reload} />;
  else if (parts[0] === 'settings') screen = <SettingsPage user={h.user} reload={reload} signOut={signOut} />;
  else if (parts[0] === 'teach' || instructor) screen = <Instructor home={h} />;
  else screen = <Today home={h} />;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <button className="brand" onClick={() => go(instructor ? '/teach' : '/')}><Troll size={34} /> <span>NorBu</span></button>
        <nav aria-label="Main">
          {nav.map(([to, label]) => <a key={to} href={`#${to}`} aria-current={path === to ? 'page' : undefined}>{label}</a>)}
        </nav>
        {h.ai === 'offline' && <span className="tag" title="No Claude API key on the server. NorBu answers from built-in course content.">Offline tutor</span>}
      </header>
      <div id="main">{screen}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
