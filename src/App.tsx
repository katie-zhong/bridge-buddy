import { useEffect, useState } from 'react';
import { api, go, session, profile, signIn, switchDemoRole, clearDemoTokens, DEMO_NAME, useAsync, when, stamp, type Home, type User } from './ui';
import { Bridge, PlankIcon, Troll } from './Troll';
import { Welcome } from './Welcome';
import { LectureView, NewLecture } from './Lecture';
import { Repair } from './Repair';
import { Practice } from './Practice';
import { ForYou } from './Strategies';
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
  const saved = profile.get();
  const [name, setName] = useState(saved?.name === DEMO_NAME ? '' : saved?.name ?? '');
  const [role, setRole] = useState<'student' | 'instructor'>(saved?.role ?? 'student');
  const [demo, setDemo] = useState(saved?.demo ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const who = name.trim() || (demo ? DEMO_NAME : '');
    if (!who) return;
    setBusy(true);
    try {
      await signIn(who, role, demo);
      profile.set({ name: who, role, demo });
      go(role === 'instructor' ? '/teach' : '/');
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in'); setBusy(false); }
  };
  return (
    <main className="login">
      <Troll size={150} mood="happy" />
      <h1>Noor</h1>
      <p className="lede">Your Northbridge buddy. Flag what you miss in a lecture, keep listening, and mend the gap later.</p>
      <form onSubmit={submit} className="card">
        <label>What should Noor call you?{demo && <span className="muted"> (optional in demo mode)</span>}
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} placeholder="First name" />
        </label>
        <div className="dial" role="radiogroup" aria-label="I am a">
          <button type="button" role="radio" aria-checked={role === 'student'} className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>I'm a student</button>
          <button type="button" role="radio" aria-checked={role === 'instructor'} className={role === 'instructor' ? 'on' : ''} onClick={() => setRole('instructor')}>I'm an instructor</button>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          <span>Demo mode<small>Skip signing in. This browser remembers your name and role and opens Noor straight away next time.</small></span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || (!demo && !name.trim())}>{demo && !name.trim() ? 'Try the demo' : 'Cross the bridge'}</button>
        <p className="fine">No diagnosis, paperwork or waitlist needed. In the pilot you sign in with your Northbridge Microsoft account.</p>
      </form>
    </main>
  );
}

/** Demo mode: if there is no session but a demo profile is saved, sign in as that person. */
function useDemoSignIn(authed: boolean, onDone: () => void) {
  const p = authed ? null : profile.get();
  const [pending, setPending] = useState(!!p?.demo);
  useEffect(() => {
    if (!p?.demo) return;
    signIn(p.name, p.role, true)
      .then(() => { if (p.role === 'instructor' && !location.hash) go('/teach'); onDone(); })
      .catch(() => setPending(false)); // server unreachable: fall back to the login screen
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return pending;
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
  const fresh = planks.every((p) => p.state === 'plain') && !recalls.length;
  const demo = home.lectures.find((l) => l.live_demo);
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
          <li><PlankIcon state="gap" /><b>{count('gap')}</b> missing</li>
          <li><PlankIcon state="mended" /><b>{count('mended')}</b> patched</li>
          <li><PlankIcon state="proven" /><b>{count('proven')}</b> proven</li>
          <li><PlankIcon state="plain" /><b>{count('plain')}</b> sound</li>
        </ul>
      </section>

      {fresh && demo && (
        <section className="card starthere">
          <Troll size={72} mood="happy" />
          <div>
            <h2>Start here</h2>
            <p>Sit in on today's lecture. Press <kbd>F</kbd> the moment you get lost, then come back and mend the plank.</p>
            <button className="primary" onClick={() => go(`/lecture/${demo.id}`)}>Open {demo.title.split(':')[0]}</button>
          </div>
        </section>
      )}

      <ForYou home={home} />

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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" fillRule="evenodd" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8c.1.6.1 1.2 0 1.8l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8a5.6 5.6 0 0 1 0-1.8l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" transform="translate(0 1)" />
    </svg>
  );
}

/** Demo mode only: flip between the student and the teacher view. */
function RoleSwitch({ role }: { role: User['role'] }) {
  const [busy, setBusy] = useState(false);
  const pick = async (r: User['role']) => {
    if (r === role || busy) return;
    setBusy(true);
    try { await switchDemoRole(r); } catch { setBusy(false); }
  };
  return (
    <div className="roleswitch" role="radiogroup" aria-label="Demo: view as">
      <span className="tag">Demo</span>
      {(['student', 'instructor'] as const).map((r) => (
        <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? 'on' : ''} disabled={busy} onClick={() => pick(r)}>
          {r === 'student' ? 'Student' : 'Teacher'}
        </button>
      ))}
    </div>
  );
}

export function App() {
  const hash = useHash();
  const [authed, setAuthed] = useState(!!session.token);
  const home = useAsync<Home | null>(() => (authed ? api<Home>('/home') : Promise.resolve(null)), [authed]);
  const demoPending = useDemoSignIn(authed, () => setAuthed(true));
  const [toast, setToast] = useState('');
  const user = home.data?.user;

  useEffect(() => applyPrefs(user), [user]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); } }, [toast]);

  // Daily reminder at the time the student chose. Fires while Noor is open in a tab.
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
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Noor', { body: msg });
      else setToast(msg);
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [user?.settings.reminder, home.data?.open.length]);

  if (!authed) return demoPending ? <main className="page"><p className="muted">Opening the demo…</p></main> : <Login onDone={() => setAuthed(true)} />;
  if (home.error) return <main className="page"><p className="error">{home.error}</p></main>;
  if (!home.data) return <main className="page"><p className="muted">Loading…</p></main>;

  const h = home.data;
  const [path, query] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  const instructor = h.user.role === 'instructor';
  const nav = instructor
    ? [['/teach', 'Class view']]
    : [['/', 'Bridge'], ['/practice', 'Practice']];
  const reload = () => home.reload();
  const signOut = () => {
    const p = profile.get();
    if (p) profile.set({ ...p, demo: false }); // keep the name and role for next time, but show the login screen
    clearDemoTokens();
    session.token = null; go('/'); location.reload();
  };

  let screen;
  if (!instructor && !h.user.settings.onboarded) screen = <Welcome home={h} reload={reload} />;
  else if (parts[0] === 'lecture') screen = <LectureView key={parts[1]} id={parts[1]} home={h} startAt={Number(new URLSearchParams(query).get('t')) || undefined} reload={reload} toast={setToast} />;
  else if (parts[0] === 'repair') screen = <><Today home={h} /><Repair id={parts[1]} user={h.user} onClose={() => { reload(); history.length > 1 ? history.back() : go('/'); }} /></>;
  else if (parts[0] === 'practice') screen = <Practice reload={reload} />;
  else if (parts[0] === 'settings' || parts[0] === 'help') screen = <SettingsPage home={h} section={parts[0] === 'help' ? 'help' : parts[1]} reload={reload} signOut={signOut} />;
  else if (parts[0] === 'teach' || instructor) screen = <Instructor home={h} />;
  else screen = <Today home={h} />;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <button className="brand" onClick={() => go(instructor ? '/teach' : '/')}><Troll size={34} /> <span>Noor</span></button>
        <nav aria-label="Main">
          {(instructor || h.user.settings.onboarded) && nav.map(([to, label]) => <a key={to} href={`#${to}`} aria-current={path === to ? 'page' : undefined}>{label}</a>)}
        </nav>
        {profile.get()?.demo && <RoleSwitch role={h.user.role} />}
        <a className="gear" href="#/settings" aria-label="Settings" title="Settings" aria-current={parts[0] === 'settings' ? 'page' : undefined}><GearIcon /></a>
      </header>
      <div id="main">{screen}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
