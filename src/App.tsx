import { useEffect, useState } from 'react';
import { api, go, session, MATERIALS, profile, signIn, DEMO_NAME, useAsync, when, type Home, type User } from './ui';
import { Troll } from './Troll';
import { BridgeMap, rotWord } from './Map';
import { Renovate } from './Renovate';
import { Welcome } from './Welcome';
import { LectureView, NewLecture } from './Lecture';
import { Repair } from './Repair';
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

const date = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function Today({ home }: { home: Home }) {
  const { courses, streak, open, deadlines } = home;
  const [adding, setAdding] = useState<string | null>(null);
  const planks = courses.flatMap((c) => c.planks);
  const rotting = planks.filter((p) => p.rot > 0).length, gaps = planks.filter((p) => p.open > 0).length;
  const mood = streak.today ? 'grin' : gaps || rotting ? 'think' : 'idle';
  const line = gaps ? `${gaps} ${gaps === 1 ? 'plank has a gap' : 'planks have gaps'}.`
    : rotting ? `${rotting} ${rotting === 1 ? 'plank is' : 'planks are'} rotting.`
    : 'Your bridges are holding.';
  const addTo = courses.find((c) => c.id === adding);
  const now = Date.now() / 1000;
  return (
    <main className="page">
      <div className="between wrap maphead">
        <h1>Hi {home.user.name}. {line}</h1>
        <div className={`streak ${streak.today ? 'lit' : ''}`} title="Days in a row you mended a gap or solved a practice problem. Logging in does not count.">
          <strong>{streak.days}</strong><span>day{streak.days === 1 ? '' : 's'} building</span>
        </div>
      </div>
      <BridgeMap courses={courses} open={open} mood={mood} onAdd={setAdding} />
      <ul className="legend">
        {MATERIALS.map((m, i) => <li key={m}><i className={`sw m${i}`} />{m}</li>)}
        <li><i className="sw rotsw" />Rotting</li>
        <li><i className="sw gapsw" />Gap flagged</li>
      </ul>

      <h2 className="sectionhead">Coming up</h2>
      <div className="deadlines">
        {deadlines.map((d) => {
          const course = courses.find((c) => c.id === d.course_id);
          const covered = planks.filter((p) => d.covers.includes(p.lecture_id));
          return (
            <article key={d.id} className="card deadline">
              <div className="between">
                <span className={`tag ${d.due_at - now < 2.5 * 86400 ? 'soon' : ''}`}>{when(d.due_at)}</span>
                <small>{date(d.due_at)}</small>
              </div>
              <h3>{d.title}</h3>
              <p className="muted">{course?.code} · {d.kind}{d.weight ? ` · ${d.weight}% of grade` : ''} · from {d.source}</p>
              <p>{d.detail}</p>
              {covered.length > 0 && (
                <div className="covers">
                  <small>Planks it covers</small>
                  {covered.map((p) => (
                    <button key={p.lecture_id} className={`cover ${p.rot || p.open ? 'weak' : ''}`} onClick={() => go(`/renovate/${p.lecture_id}`)} title={`Renovate ${p.title}`}>
                      <i className={`sw m${p.level}`} />{p.title.split(':')[0]}
                      <span>{[p.open ? 'gap' : '', rotWord(p).toLowerCase()].filter(Boolean).join(', ') || MATERIALS[p.level].toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {addTo && <NewLecture course={addTo} onClose={() => setAdding(null)} />}
    </main>
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
  // Coming back to the map: fetch it again, so a lecture added or worked on elsewhere shows up.
  useEffect(() => { if (authed && hash === '/') home.reload(); }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps
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
      const msg = n ? `${n} gap${n === 1 ? '' : 's'} to mend. Five minutes is enough.` : 'Your bridges are holding. Renovate one plank to keep them that way?';
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
    ? [['/teach', 'Class view'], ['/settings', 'Settings']]
    : [['/', 'Map'], ['/settings', 'Settings']];
  const reload = () => home.reload();
  const signOut = () => {
    const p = profile.get();
    if (p) profile.set({ ...p, demo: false }); // keep the name and role for next time, but show the login screen
    session.token = null; go('/'); location.reload();
  };

  let screen;
  if (!instructor && !h.user.settings.onboarded) screen = <Welcome home={h} reload={reload} />;
  else if (parts[0] === 'lecture') screen = <LectureView key={parts[1]} id={parts[1]} home={h} startAt={Number(new URLSearchParams(query).get('t')) || undefined} reload={reload} toast={setToast} />;
  else if (parts[0] === 'repair') screen = <><Today home={h} /><Repair id={parts[1]} user={h.user} onClose={() => { reload(); go('/'); }} /></>;
  else if (parts[0] === 'renovate') screen = <><Today home={h} /><Renovate id={parts[1]} onClose={() => { reload(); go('/'); }} /></>;
  else if (parts[0] === 'settings') screen = <SettingsPage home={h} reload={reload} signOut={signOut} />;
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
        {h.ai === 'offline' && <span className="tag" title="No Claude API key on the server. Noor answers from built-in course content.">Offline tutor</span>}
      </header>
      <div id="main">{screen}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
