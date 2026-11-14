import { useEffect, useState } from 'react';
import { api, go, session, MATERIALS, profile, signIn, switchDemoRole, clearDemoTokens, DEMO_NAME, useAsync, when, Switch, type Home, type User } from './ui';
import { MaterialIcon, Troll } from './Troll';
import { BridgeView, ForestMap, MapLegend, rotWord } from './Map';
import { Renovate } from './Renovate';
import { Welcome } from './Welcome';
import { LectureView, NewLecture } from './Lecture';
import { Repair } from './Repair';
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
      await signIn(who, role, demo);
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

const FlameIcon = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="M10 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#e2a43b" filter="url(#paint)" /></svg>;

const date = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function Today({ home, courseId }: { home: Home; courseId?: string }) {
  const { courses, streak, open, deadlines } = home;
  const [adding, setAdding] = useState(false);
  const course = courses.find((c) => c.id === courseId);
  const planks = courses.flatMap((c) => c.planks);
  const rotting = planks.filter((p) => p.rot > 0).length, gaps = planks.filter((p) => p.open > 0).length;
  const mood = gaps || rotting ? 'think' : 'idle';
  const line = gaps ? `${gaps} ${gaps === 1 ? 'plank has a gap' : 'planks have gaps'}.`
    : rotting ? `${rotting} ${rotting === 1 ? 'plank is' : 'planks are'} rotting.`
    : 'Your bridges are holding.';
  const now = Date.now() / 1000;
  const shown = course ? deadlines.filter((d) => d.course_id === course.id) : deadlines;
  return (
    <main className="page">
      <div className="between wrap maphead">
        {course ? (
          <div>
            <button className="link backlink" onClick={() => go('/')}>‹ All bridges</button>
            <h1>{course.code} · {course.title}</h1>
          </div>
        ) : <h1>Hi {home.user.name}. {line}</h1>}
        <div className="herochips">
          {course && <button className="ghost" onClick={() => setAdding(true)}>+ Add a lecture</button>}
          <span className={`pill streak ${streak.today ? 'lit' : ''}`} title="Days in a row you mended a gap or solved a practice problem. Logging in does not count."><FlameIcon />{streak.days} day{streak.days === 1 ? '' : 's'}</span>
        </div>
      </div>
      {course
        ? <BridgeView key={course.id} course={course} open={open} mood={mood} />
        : <ForestMap courses={courses} mood={mood} onOpen={(id) => go(`/bridge/${id}`)} />}
      <div className="between wrap legendrow">
        <MapLegend />
        <span className="fine">{course ? 'Hover a plank to see the lecture' : 'Hover a bridge for the subject, click to open it'} · Demo: sample progress</span>
      </div>

      <h2 className="sectionhead">Coming up</h2>
      <ul className="todo officehours"><OfficeHoursRow /></ul>
      <div className="deadlines">
        {shown.map((d) => {
          const owner = courses.find((c) => c.id === d.course_id);
          const covered = planks.filter((p) => d.covers.includes(p.lecture_id));
          return (
            <article key={d.id} className="card deadline">
              <div className="between">
                <span className={`tag day ${d.due_at - now < 2.5 * 86400 ? 'soon' : ''}`}>{when(d.due_at)}</span>
                <small>{date(d.due_at)}</small>
              </div>
              <h3>{d.title}</h3>
              <p className="muted">{owner?.code} · {d.kind}{d.weight ? ` · ${d.weight}% of grade` : ''} · from {d.source}</p>
              <p>{d.detail}</p>
              {covered.length > 0 && (
                <div className="covers">
                  <small>Planks it covers</small>
                  {covered.map((p) => (
                    <button key={p.lecture_id} className={`cover ${p.rot || p.open ? 'weak' : ''}`} onClick={() => go(`/renovate/${p.lecture_id}`)} title={`Renovate ${p.title}`}>
                      <MaterialIcon level={p.level} rot={p.rot} size={30} />{p.title.split(':')[0]}
                      <span>{[p.open ? 'gap' : '', rotWord(p).toLowerCase()].filter(Boolean).join(', ') || MATERIALS[p.level].toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {course && adding && <NewLecture course={course} onClose={() => setAdding(false)} />}
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
  // Coming back to the map: fetch it again, so a lecture added or worked on elsewhere shows up.
  useEffect(() => { if (authed && hash === '/') home.reload(); }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps
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
      const msg = n ? `${n} gap${n === 1 ? '' : 's'} to mend. Five minutes is enough.` : 'Your bridges are holding. Renovate one plank to keep them that way?';
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
    : [['/', 'Map'], ['/community', 'Community']];
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
  else if (parts[0] === 'repair') screen = <><Today home={h} /><Repair id={parts[1]} user={h.user} onClose={() => { reload(); go('/'); }} /></>;
  else if (parts[0] === 'bridge') screen = <Today home={h} courseId={parts[1]} />;
  else if (parts[0] === 'renovate') screen = <><Today home={h} /><Renovate id={parts[1]} onClose={() => { reload(); go('/'); }} /></>;
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
        {profile.get()?.demo && <RoleSwitch role={h.user.role} />}
        <a className="gear" href="#/settings" aria-label="Settings" title="Settings" aria-current={parts[0] === 'settings' ? 'page' : undefined}><GearIcon /></a>
      </header>
      <div id="main">{screen}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
