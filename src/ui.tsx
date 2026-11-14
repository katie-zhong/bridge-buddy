import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

// ---- types -------------------------------------------------------------
export type Level = 'hint' | 'example' | 'walkthrough';
export interface Settings {
  font?: 'atkinson' | 'lexend' | 'system'; size?: number; spacing?: number; calm?: boolean;
  level?: Level; focus?: boolean; checkpoints?: boolean; reminder?: string;
  shareAggregates?: boolean; /** Opt-in: let the instructor's class view count my flags. */ shareFlags?: boolean; recs?: boolean; onboarded?: boolean; readAloud?: boolean; dictation?: boolean;
  /** Lecture transcript tools: show the replay speed control, and the chosen speed. */
  replaySpeed?: boolean; speed?: Speed;
  /** Lecture transcript tools: highlight the word being read during a replay. */
  wordHighlight?: boolean;
}
export type Speed = 0.75 | 1 | 1.5 | 2;
export const SPEEDS: Speed[] = [0.75, 1, 1.5, 2];
export interface Strategy {
  id: string; struggle: string; title: string; how: string; setting?: Settings; active: boolean; helpful: number | null;
  stat: { used: number; with: number; without: number; demo: boolean } | null;
}
export interface User { id: string; name: string; role: 'student' | 'instructor'; settings: Settings; struggles: string[] }
export interface Segment { id: string; idx: number; t_start: number; t_end: number; text: string; concept: string }
export interface Mark {
  id: string; lecture_id: string; segment_id: string; kind: 'flag' | 'question' | 'comment'; body: string | null;
  answer: string | null; level: Level; status: 'open' | 'repaired' | 'resolved'; note_line: string | null;
  seg_text?: string; t_start?: number; lecture?: string; around?: Segment[]; ai_error?: string;
}
export interface Plank { lecture_id: string; lecture: string; concept: string; title: string; t_start: number; state: 'plain' | 'gap' | 'mended' | 'proven' }
export interface Recall { id: string; mark_id: string; question: string; due_at: number; done_at: number | null; passed: number | null; feedback: string | null; t_start: number; lecture: string; lecture_id: string }
export interface Card { id: string; front: string; back: string; box: number; due_at: number }
export interface Lecture { id: string; title: string; held_at: number; source: string; live_demo: number; owner_id: string | null; open?: number; segments?: number }
export interface Post { id: string; segment_id: string | null; parent_id: string | null; body: string; author: string; instructor: boolean; mine: boolean; created_at: number }
export interface Home {
  user: User; ai: 'claude' | 'offline'; course: { code: string; title: string; exam_label: string; exam_at: number };
  lectures: Lecture[]; planks: Plank[]; streak: { days: number; today: boolean }; open: Mark[]; recalls: Recall[];
  cards_due: number; deadlines: { id: string; course: string; title: string; due_at: number; source: string; kind: string }[];
  struggles: { key: string; label: string }[];
}

/** GET /api/instructor/overview. Counts are null when fewer than `min_group` students are behind them. */
export interface InstructorOverview {
  min_group: number; class_size: number; sharing: number | null; demo: boolean;
  totals: { flags: number; mended: number | null; recall: number | null } | null;
  lectures: { id: string; title: string; held_at: number; students: number | null; share: number | null; top: { title: string; share: number | null } | null }[];
  strategies: { id: string; title: string; students: number | null; share: number | null }[];
}
/** GET /api/instructor/lectures/:id */
export interface InstructorLecture {
  lecture: { id: string; title: string; held_at: number }; class_size: number; min_group: number; demo: boolean;
  concepts: { concept: string; title: string; t_start: number; suppressed?: boolean; students?: number; share?: number | null; repaired?: number | null; first_try?: number | null; recall?: number | null }[];
  segments: { id: string; idx: number; t_start: number; text: string; concept: string; students: number | null }[];
  posts: Post[];
}

// ---- api ---------------------------------------------------------------
export const session = {
  get token() { try { return localStorage.getItem('norbu-token'); } catch { return null; } },
  set token(v: string | null) { try { v ? localStorage.setItem('norbu-token', v) : localStorage.removeItem('norbu-token'); } catch { /* private mode */ } },
};

// The name and role someone signed in with, kept in this browser. With `demo` on, Noor signs
// them in automatically (no login screen), and silently signs them in again if the server has
// forgotten them (e.g. a Vercel cold start wiped the demo database).
const Profile = z.object({
  name: z.string().trim().min(1).max(40),
  role: z.enum(['student', 'instructor']),
  demo: z.boolean(),
});
export type Profile = z.infer<typeof Profile>;
export const DEMO_NAME = 'Guest';
export const profile = {
  get(): Profile | null {
    try {
      const parsed = Profile.safeParse(JSON.parse(localStorage.getItem('norbu-profile') ?? 'null'));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  },
  set(p: Profile | null) {
    try { p ? localStorage.setItem('norbu-profile', JSON.stringify(p)) : localStorage.removeItem('norbu-profile'); } catch { /* private mode */ }
  },
};

async function request<T>(path: string, method: string, body: unknown): Promise<{ res: Response; data: T & { error?: string } }> {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(session.token ? { authorization: `Bearer ${session.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: 'The server did not answer. Is it running?' }));
  return { res, data };
}

/** Signs in with a name and role and stores the session token. Returns the new user. */
export async function signIn(name: string, role: Profile['role'], demo = false): Promise<User> {
  const { res, data } = await request<{ token: string; user: User }>('/login', 'POST', { name, role, demo });
  if (!res.ok) throw new Error(data.error || 'Could not sign in');
  session.token = data.token;
  return data.user;
}

// Demo mode keeps one session per role in this browser, so switching between the student and
// teacher view returns to the same person instead of starting over.
const DemoTokens = z.object({ student: z.string().max(80).optional(), instructor: z.string().max(80).optional() });
const demoTokens = {
  get(): z.infer<typeof DemoTokens> {
    try {
      const parsed = DemoTokens.safeParse(JSON.parse(localStorage.getItem('norbu-demo-tokens') ?? '{}'));
      return parsed.success ? parsed.data : {};
    } catch { return {}; }
  },
  set(v: z.infer<typeof DemoTokens> | null) {
    try { v ? localStorage.setItem('norbu-demo-tokens', JSON.stringify(v)) : localStorage.removeItem('norbu-demo-tokens'); } catch { /* private mode */ }
  },
};
export const clearDemoTokens = () => demoTokens.set(null);

/** Demo mode only: switch between the student and the teacher view, then reload. */
export async function switchDemoRole(role: Profile['role']) {
  const p = profile.get();
  if (!p?.demo || p.role === role) return;
  const tokens = demoTokens.get();
  if (session.token) tokens[p.role] = session.token;
  profile.set({ ...p, role });
  const saved = tokens[role];
  if (saved) session.token = saved; // if the server forgot it, api() signs in again as this role
  else { await signIn(p.name, role, true); if (session.token) tokens[role] = session.token; }
  demoTokens.set(tokens);
  location.hash = role === 'instructor' ? '/teach' : '/';
  location.reload();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- existing call sites rely on the untyped default
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let { res, data } = await request<T>(path, method, body);
  if (res.status === 401 && session.token && path !== '/login') {
    const p = profile.get();
    if (p?.demo) {
      // Demo mode: the server lost our session. Sign in again as the same person and retry once.
      session.token = null;
      await signIn(p.name, p.role, true);
      ({ res, data } = await request<T>(path, method, body));
    } else {
      session.token = null;
      location.reload();
    }
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ---- small helpers -----------------------------------------------------
export const stamp = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const go = (hash: string) => { location.hash = hash; };

export function when(ts: number) {
  const days = Math.round((ts * 1000 - Date.now()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const reload = () => fn().then((data) => set({ data, loading: false }), (e) => set({ error: e.message, loading: false }));
  useEffect(() => { set((s) => ({ ...s, loading: true })); reload(); }, deps); // eslint-disable-line
  return { ...state, reload, set: (data: T) => set({ data, loading: false }) };
}

// ---- speech: read aloud and dictation -----------------------------------
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, '').replace(/\[(\d\d:\d\d)\]/g, ''));
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
export function ReadAloud({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  if (!('speechSynthesis' in window)) return null;
  return (
    <button className="ghost small" onClick={() => { if (on) { speechSynthesis.cancel(); setOn(false); } else { speak(text); setOn(true); } }}>
      {on ? '◼ Stop' : '🔈 Read aloud'}
    </button>
  );
}

export const Recognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

/** Textarea with an optional microphone, so answers can be spoken instead of typed. */
export function AnswerBox({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const base = useRef('');
  const toggle = () => {
    if (listening) return rec.current?.stop();
    const r = new Recognition();
    r.continuous = true; r.interimResults = true; r.lang = 'en-CA';
    base.current = value ? value + ' ' : '';
    r.onresult = (e: any) => onChange(base.current + Array.from(e.results).map((x: any) => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };
  useEffect(() => () => rec.current?.stop(), []);
  return (
    <div className="answerbox">
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {Recognition && <button type="button" className={listening ? 'mic on' : 'mic'} onClick={toggle} aria-pressed={listening}>{listening ? '◼ Stop' : '🎤 Say it'}</button>}
    </div>
  );
}

// ---- tutor text: tiny markdown with clickable lecture times --------------
function inline(text: string, onTime?: (s: number) => void): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[\d{1,2}:\d{2}\])/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const t = part.match(/^\[(\d{1,2}):(\d{2})\]$/);
    if (t) return onTime
      ? <button key={i} className="time" title="Jump to this moment in the lecture" onClick={() => onTime(+t[1] * 60 + +t[2])}>{t[1].padStart(2, '0')}:{t[2]}</button>
      : <span key={i} className="time">{part.slice(1, -1)}</span>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
export function Tutor({ text, onTime }: { text: string; onTime?: (s: number) => void }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list.ordered ? 'ol' : 'ul';
    blocks.push(<L key={blocks.length}>{list.items.map((it, i) => <li key={i}>{inline(it, onTime)}</li>)}</L>);
    list = null;
  };
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(\d+[.)]|[-*•])\s+(.*)$/);
    if (item) {
      const ordered = /\d/.test(item[1]);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list!.items.push(item[2]);
    } else {
      flush();
      const h = line.match(/^#{1,4}\s+(.*)$/);
      if (h) blocks.push(<p key={blocks.length}><strong>{inline(h[1], onTime)}</strong></p>);
      else if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line, onTime)}</p>);
    }
  }
  flush();
  return <div className="tutor">{blocks}</div>;
}

// ---- shared widgets ----------------------------------------------------
export const LEVELS: { key: Level; label: string; blurb: string }[] = [
  { key: 'hint', label: 'Hint', blurb: 'A nudge. You do the thinking.' },
  { key: 'example', label: 'Worked example', blurb: 'The idea, plus one example.' },
  { key: 'walkthrough', label: 'Full walkthrough', blurb: 'Every step explained.' },
];
export function LevelDial({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  return (
    <div className="dial" role="radiogroup" aria-label="How much support">
      {LEVELS.map((l) => (
        <button key={l.key} role="radio" aria-checked={value === l.key} className={value === l.key ? 'on' : ''} title={l.blurb} onClick={() => onChange(l.key)}>{l.label}</button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus(); };
  }, []); // eslint-disable-line
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header><h2>{title}</h2><button className="ghost" onClick={onClose} aria-label="Close">✕</button></header>
        {children}
      </div>
    </div>
  );
}

export function OfflineNote({ error }: { error?: string }) {
  return <p className="fine">{error ? `${error}. ` : ''}Answered by the offline tutor (built-in course content), not Claude.</p>;
}

/** A small "?" that opens a short explanation. Escape or a second click closes it. */
export function WhyTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', key);
    window.addEventListener('mousedown', click);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mousedown', click); };
  }, [open]);
  return (
    <span className="why" ref={box}>
      <button type="button" className="whybtn" aria-expanded={open} aria-controls={id} aria-label={label} title={label} onClick={() => setOpen(!open)}>?</button>
      {open && <span id={id} role="note" className="whypop">{children}</span>}
    </span>
  );
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
