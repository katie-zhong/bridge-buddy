import { useEffect, useState } from 'react';
import { api, go, session, profile, signIn, DEMO_NAME, useAsync, when, stamp, Switch, type Home, type Mark, type User } from './ui';
import { Bridge, PlankIcon, Troll, type PlankState } from './Troll';
import { Welcome } from './Welcome';
import { LectureView, NewLecture } from './Lecture';
import { Repair } from './Repair';
import { Practice } from './Practice';
import { StrategyChips } from './Strategies';
import { Community, OfficeHoursRow } from './Community';
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
      await signIn(who, role);
      profile.set({ name: who, role, demo });
      go(role === 'instructor' ? '/teach' : '/');
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in'); setBusy(false); }
  };
  return (
    <main className="login">
      <Troll size={150} />
      <h1>Bridgeway</h1>
      <p className="lede">Norbu, your Northbridge buddy, helps you flag what you miss in a lecture, keep listening, and mend the gap later.</p>
      <form onSubmit={submit} className="card">
        <label>What should Norbu call you?
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} placeholder="First name" />
        </label>
        <div className="dial" role="radiogroup" aria-label="I am a">
          <button type="button" role="radio" aria-checked={role === 'student'} className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>I'm a student</button>
          <button type="button" role="radio" aria-checked={role === 'instructor'} className={role === 'instructor' ? 'on' : ''} onClick={() => setRole('instructor')}>I'm an instructor</button>
        </div>
        <Switch checked={demo} onChange={setDemo}>Demo mode</Switch>
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
    signIn(p.name, p.role)
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

const FlameIcon = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="M10 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#e2a43b" filter="url(#paint)" /></svg>;
const CardsIcon = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><rect x="5" y="3" width="11" height="14" rx="2.5" fill="#8cc5c6" transform="rotate(10 10 10)" /><rect x="3" y="4" width="11" height="14" rx="2.5" fill="#4c9aa6" /></svg>;

function Today({ home }: { home: Home }) {
  const { planks, streak, open, recalls, deadlines, course } = home;
  const now = Date.now() / 1000;
  const due = recalls.filter((r) => r.due_at <= now);
  const count = (s: string) => planks.filter((p) => p.state === s).length;
  const mood = open.length ? 'think' : 'idle';
  const gaps = count('gap');
  const fresh = planks.every((p) => p.state === 'plain') && !recalls.length;
  const demo = home.lectures.find((l) => l.live_demo);
  const line = gaps ? `${gaps === 1 ? 'One plank needs' : `${gaps === 2 ? 'Two' : gaps} planks need`} you.`
    : due.length ? 'A riddle is waiting.'
    : fresh ? 'Press F when you get lost.' : 'Your bridge is holding.';
  // The idea a flag belongs to: the plank of that lecture that starts at or before the flagged moment.
  const ideaOf = (m: Mark) => [...planks].reverse().find((p) => p.lecture_id === m.lecture_id && p.t_start <= (m.t_start || 0))?.title;
  const legend: [PlankState, string][] = [['gap', 'missing'], ['mended', 'patched'], ['proven', 'proven'], ['plain', 'sound']];
  return (
    <main className="page">
      <section className="hero card">
        <div className="herohead">
          <div>
            <p className="eyebrow">{course.code}</p>
            <h1>Hi {home.user.name}. {line}</h1>
          </div>
          <div className="herochips">
            <span className={`pill streak ${streak.today ? 'lit' : ''}`} title="Days in a row with a riddle solved. Logging in does not count."><FlameIcon />{streak.days} day{streak.days === 1 ? '' : 's'}</span>
            {home.cards_due > 0 && <button className="pill cards" onClick={() => go('/practice')} title="Flashcards ready to review"><CardsIcon />{home.cards_due} card{home.cards_due === 1 ? '' : 's'}</button>}
          </div>
        </div>
        <Bridge planks={planks} examLabel={course.exam_label} examIn={when(course.exam_at)} mood={mood} />
        <div className="between wrap legendrow">
          <ul className="legend">
            {legend.map(([st, word]) => <li key={st} title={word}><PlankIcon state={st} /><b>{count(st)}</b><span className="sr"> {word}</span></li>)}
          </ul>
          <span className="fine">Hover a plank to see the idea</span>
        </div>
      </section>

      {fresh && demo && (
        <section className="card starthere">
          <Troll size={72} />
          <div>
            <h2>Start here</h2>
            <p>Sit in on today's lecture. Press <kbd>F</kbd> when you get lost.</p>
            <button className="primary" onClick={() => go(`/lecture/${demo.id}`)}>Open {demo.title.split(':')[0]}</button>
          </div>
        </section>
      )}

      <div className="cols">
        <section className="card">
          <h2>Today</h2>
          {!open.length && !due.length && <p className="muted">Nothing to mend.</p>}
          <ul className="todo">
            {open.map((m) => (
              <li key={m.id} className="row static">
                <PlankIcon state="gap" />
                <span><strong>{(m.kind === 'question' && m.body) || ideaOf(m) || `${(m.seg_text || '').slice(0, 48)}…`}</strong></span>
                <span className="mono muted">{stamp(m.t_start || 0)}</span>
                <button className="primary small" onClick={() => go(`/repair/${m.id}`)}>Mend</button>
              </li>
            ))}
            {due.map((r) => (
              <li key={r.id} className="row static">
                <PlankIcon state="mended" />
                <span><strong>Week-later riddle</strong></span>
                <span className="mono muted">{stamp(r.t_start)}</span>
                <button className="ghost small" onClick={() => go('/practice')}>Try</button>
              </li>
            ))}
          </ul>
          <StrategyChips home={home} />
        </section>

        <section className="card">
          <h2>Coming up</h2>
          <ul className="todo">
            <OfficeHoursRow />
            {deadlines.map((d) => (
              <li key={d.id} className="row static">
                <span className={`tag day ${d.due_at - now < 2.5 * 86400 ? 'soon' : ''}`}>{when(d.due_at)}</span>
                <span><strong>{d.title}{d.course !== course.code ? ` · ${d.course.split(' ')[0]}` : ''}</strong></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="between"><h2>Lectures</h2><NewLecture /></div>
        <ul className="todo">
          {home.lectures.map((l) => (
            <li key={l.id}><button className="row" onClick={() => go(`/lecture/${l.id}`)}>
              <span><strong>{l.title}</strong><small>{when(l.held_at)} · {Math.round(((l.segments || 0) * 30) / 60)} min</small></span>
              {l.open ? <span className="gapcount" title={`${l.open} missing`}><PlankIcon state="gap" size={28} /><b>{l.open}</b><span className="sr"> missing</span></span> : null}<span className="chev">›</span>
            </button></li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/** Demo mode only: flip between the student and instructor views as the same person. */
function RoleSwitch({ role, reload }: { role: User['role']; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const flip = async (toInstructor: boolean) => {
    const p = profile.get();
    if (!p) return;
    const next = toInstructor ? 'instructor' : 'student';
    setBusy(true);
    try {
      await signIn(p.name, next);
      profile.set({ ...p, role: next });
      go(next === 'instructor' ? '/teach' : '/');
      reload();
    } finally { setBusy(false); }
  };
  return (
    <span className="roleswitch" title="Demo mode: switch between the student and instructor views">
      <span className={role === 'student' ? 'on' : ''} aria-hidden>Student</span>
      <Switch checked={role === 'instructor'} disabled={busy} onChange={flip}><span className="sr">Instructor view</span></Switch>
      <span className={role === 'instructor' ? 'on' : ''} aria-hidden>Instructor</span>
    </span>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" fillRule="evenodd" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8c.1.6.1 1.2 0 1.8l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8a5.6 5.6 0 0 1 0-1.8l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" transform="translate(0 1)" />
    </svg>
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

  // Daily reminder at the time the student chose. Fires while Bridgeway is open in a tab.
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
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Bridgeway', { body: msg });
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
    : [['/', 'Bridge'], ['/practice', 'Practice'], ['/community', 'Community']];
  const reload = () => home.reload();
  const signOut = () => {
    const p = profile.get();
    if (p) profile.set({ ...p, demo: false }); // keep the name and role for next time, but show the login screen
    session.token = null; go('/'); location.reload();
  };

  let screen;
  if (!instructor && !h.user.settings.onboarded) screen = <Welcome home={h} reload={reload} />;
  else if (parts[0] === 'lecture') screen = <LectureView key={parts[1]} id={parts[1]} home={h} startAt={Number(new URLSearchParams(query).get('t')) || undefined} reload={reload} toast={setToast} />;
  else if (parts[0] === 'repair') screen = <><Today home={h} /><Repair id={parts[1]} user={h.user} onClose={() => { reload(); history.length > 1 ? history.back() : go('/'); }} /></>;
  else if (parts[0] === 'practice') screen = <Practice reload={reload} />;
  else if (parts[0] === 'community') screen = <Community home={h} query={new URLSearchParams(query)} />;
  else if (parts[0] === 'settings' || parts[0] === 'help') screen = <SettingsPage home={h} section={parts[0] === 'help' ? 'help' : parts[1]} reload={reload} signOut={signOut} />;
  else if (parts[0] === 'teach' || instructor) screen = <Instructor home={h} />;
  else screen = <Today home={h} />;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <button className="brand" onClick={() => go(instructor ? '/teach' : '/')}><Troll size={34} /> <span>Bridgeway</span></button>
        <nav aria-label="Main">
          {(instructor || h.user.settings.onboarded) && nav.map(([to, label]) => <a key={to} href={`#${to}`} aria-current={path === to ? 'page' : undefined}>{label}</a>)}
        </nav>
        {h.ai === 'offline' && <span className="tag" title="No Claude API key on the server. Norbu answers from built-in course content.">Offline tutor</span>}
        {profile.get()?.demo && <RoleSwitch role={h.user.role} reload={reload} />}
        <a className="gear" href="#/settings" aria-label="Settings" title="Settings" aria-current={parts[0] === 'settings' ? 'page' : undefined}><GearIcon /></a>
      </header>
      <div id="main">{screen}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
