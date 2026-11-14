import { useEffect, useMemo, useRef, useState } from 'react';
import { api, go, stamp, useAsync, Tutor, LevelDial, Modal, OfflineNote, ReadAloud, Recognition, Toggle, SPEEDS, type Home, type Lecture, type Level, type Mark, type Plank, type Post, type ReadWrite, type Segment, type Speed } from './ui';
import { ReadWritePanel } from './ReadWrite';
import { PlankIcon, Troll, type PlankState } from './Troll';

interface Data { lecture: Lecture; segments: Segment[]; marks: Mark[]; notes: { body: string; summary: string | null }; posts: Post[]; readwrite: ReadWrite; ideas: Idea[] }
/** An idea taught in this lecture and whether the student has a gap there. */
interface Idea { concept: string; title: string; t_start: number; state: PlankState }
type Mode = 'recorded' | 'replay' | 'live';
const REPLAY_MS = 3800;

/** Add a lecture (a new plank) to one course: record it live or bring a transcript. */
export function NewLecture({ course, onClose }: { course: { id: string; code: string }; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const create = async (withTranscript: boolean) => {
    try {
      const out = await api<{ id: string }>('/lectures', 'POST', { title, course_id: course.id, transcript: withTranscript ? transcript : undefined });
      onClose();
      go(`/lecture/${out.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add the lecture'); }
  };
  return (
    <Modal title={`Add a plank to ${course.code}`} onClose={onClose}>
      <p className="muted">Recorded lectures arrive from Panopto by themselves. Add one here if yours is missing.</p>
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tutorial 3" /></label>
      <div className="choice">
        <h3>Record it live</h3>
        {!Recognition && <p className="muted">Your browser does not support live transcription. Chrome and Edge do.</p>}
        <button className="primary" disabled={!Recognition} onClick={() => create(false)}>Start a live lecture</button>
      </div>
      <div className="choice">
        <h3>Bring a transcript</h3>
        <input type="file" accept=".vtt,.srt,.txt" aria-label="Caption file (.vtt, .srt or .txt)" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setTranscript(await f.text()); if (!title) setTitle(f.name.replace(/\.\w+$/, '')); } }} />
        <textarea rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Or paste the transcript here" />
        <button className="primary" disabled={!transcript.trim()} onClick={() => create(true)}>Add transcript</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </Modal>
  );
}

export function LectureView({ id, home, startAt, reload, toast }: { id: string; home: Home; startAt?: number; reload: () => void; toast: (s: string) => void }) {
  const { data, error, set } = useAsync<Data>(() => api(`/lectures/${id}`), [id]);
  const user = home.user;
  const [mode, setMode] = useState<Mode>('recorded');
  const [shown, setShown] = useState(0); // segments revealed during a replay
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<'question' | 'comment'>('question');
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level>(user.settings.level || 'example');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'notes' | 'planks' | 'class'>('notes');
  const [interim, setInterim] = useState('');
  // Transcript tools (Settings → Lecture transcript). Off means plain 1× replay with no word highlight.
  const [speedPick, setSpeedPick] = useState<Speed>(user.settings.speed || 1);
  const speedOn = user.settings.replaySpeed !== false && !!data?.lecture.live_demo;
  const speed: Speed = user.settings.replaySpeed !== false ? speedPick : 1;
  // Lectures in the order they were held, for the previous / next buttons.
  // Previous / next stay inside the course this lecture belongs to (one plank per lecture).
  const ordered = [...(home.courses.find((c) => c.planks.some((p) => p.lecture_id === id))?.planks || [])].sort((a, b) => a.held_at - b.held_at);
  const at = ordered.findIndex((l) => l.lecture_id === id);
  const prevLecture = at > 0 ? ordered[at - 1] : undefined;
  const nextLecture = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : undefined;
  const [word, setWord] = useState(0);
  const [say, setSay] = useState(''); // Norbu's speech bubble in the side panel
  useEffect(() => { if (!say) return; const t = setTimeout(() => setSay(''), 6000); return () => clearTimeout(t); }, [say]);
  const chooseSpeed = (v: Speed) => { setSpeedPick(v); api('/me', 'PATCH', { settings: { speed: v } }).catch(() => { /* keeps working for this visit */ }); };
  const rec = useRef<any>(null);
  const liveStart = useRef(0);
  const pending = useRef({ text: '', t: 0 });
  const dataRef = useRef<Data>();
  dataRef.current = data;

  const mine = data?.lecture.owner_id === user.id;
  const canRecord = mine && data?.lecture.source === 'Live';
  const segments = useMemo(() => (data ? (mode === 'replay' ? data.segments.slice(0, shown) : data.segments) : []), [data, mode, shown]);
  const live = mode !== 'recorded';
  const target = live ? segments[segments.length - 1] : segments.find((s) => s.id === selected) || null;

  const update = (patch: Partial<Data>) => dataRef.current && set({ ...dataRef.current, ...patch });
  const jump = (t: number) => {
    const seg = [...(dataRef.current?.segments || [])].reverse().find((s) => s.t_start <= t) || dataRef.current?.segments[0];
    if (!seg) return;
    setSelected(seg.id);
    document.getElementById(`seg-${seg.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  useEffect(() => { if (data && startAt != null) setTimeout(() => jump(startAt), 50); }, [!!data, startAt]); // eslint-disable-line

  // Demo replay: reveal the recorded lecture one passage at a time, as if it were live.
  useEffect(() => {
    if (mode !== 'replay' || !data) return;
    if (shown >= data.segments.length) { setMode('recorded'); toast('Lecture over. Your flags are waiting under "Ideas".'); setTab('planks'); return; }
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : REPLAY_MS / speed);
    return () => clearTimeout(t);
  }, [mode, shown, data, speed]); // eslint-disable-line

  // Word highlight: step through the newest passage, finishing as the next one arrives.
  useEffect(() => {
    setWord(0);
    if (mode !== 'replay' || !user.settings.wordHighlight || !shown || !data) return;
    const words = data.segments[shown - 1]?.text.split(/\s+/).length || 1;
    const t = setInterval(() => setWord((w) => Math.min(w + 1, words - 1)), REPLAY_MS / speed / words);
    return () => clearInterval(t);
  }, [mode, shown, speed, user.settings.wordHighlight]); // eslint-disable-line

  useEffect(() => {
    if (!live || !segments.length) return;
    document.getElementById(`seg-${segments[segments.length - 1].id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (user.settings.checkpoints && segments.length % 6 === 0) toast('Checkpoint. Still with the lecture? Press F if you lost the thread.');
  }, [segments.length, live]); // eslint-disable-line

  // Real live transcription through the browser's speech recognition.
  const pushSegment = async () => {
    const p = pending.current;
    if (!p.text.trim()) return;
    pending.current = { text: '', t: 0 };
    const now = Math.round((Date.now() - liveStart.current) / 1000);
    const seg = await api<Segment>(`/lectures/${id}/segments`, 'POST', { text: p.text.trim(), t_start: p.t, t_end: now });
    update({ segments: [...(dataRef.current?.segments || []), seg] });
  };
  const startLive = () => {
    const r = new Recognition();
    r.continuous = true; r.interimResults = true; r.lang = 'en-CA';
    const last = data?.segments[data.segments.length - 1];
    liveStart.current = Date.now() - (last ? last.t_end * 1000 : 0);
    r.onresult = (e: any) => {
      let tail = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res.isFinal) { tail += res[0].transcript; continue; }
        const p = pending.current;
        if (!p.text) p.t = Math.round((Date.now() - liveStart.current) / 1000);
        p.text += ' ' + res[0].transcript.trim();
        if (p.text.split(/\s+/).length >= 32) pushSegment();
      }
      setInterim((pending.current.text + ' ' + tail).trim());
    };
    r.onend = () => { if (rec.current === r) { try { r.start(); } catch { /* already running */ } } };
    r.onerror = (e: any) => { if (e.error === 'not-allowed') { toast('Bridgeway needs microphone permission to transcribe.'); stopLive(); } };
    rec.current = r;
    r.start();
    setMode('live');
  };
  const stopLive = () => {
    const r = rec.current;
    rec.current = null;
    r?.stop();
    pushSegment();
    setInterim('');
    setMode('recorded');
  };
  useEffect(() => () => { const r = rec.current; rec.current = null; r?.stop(); }, []);

  const addMark = async (k: Mark['kind'], body?: string) => {
    const seg = target;
    if (!seg || !data) return toast(live ? 'Nothing has been said yet.' : 'Pick a passage first by clicking it.');
    if (k === 'flag') {
      const msg = `Flagged at ${stamp(seg.t_start)}. I'll keep it for later.`;
      if (user.settings.focus) toast(msg); else setSay(msg);
      const m = await api<Mark>('/marks', 'POST', { lecture_id: id, segment_id: seg.id, kind: 'flag' });
      update({ marks: [...(dataRef.current?.marks || []), m] });
    } else {
      setBusy(true);
      try {
        const m = await api<Mark>('/marks', 'POST', { lecture_id: id, segment_id: seg.id, kind: k, body, level, live });
        update({ marks: [...(dataRef.current?.marks || []), m] });
        setExpanded((s) => new Set(s).add(m.id));
        setText('');
      } catch (e: any) { toast(e.message); }
      setBusy(false);
    }
    reload();
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'f' || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      e.preventDefault();
      addMark('flag');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  if (error) return <main className="page"><p className="error">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;

  const marksFor = (segId: string) => data.marks.filter((m) => m.segment_id === segId);
  const conceptAt = (segId: string) => data.segments.find((x) => x.id === segId)?.concept;
  // Each idea in the lecture: a hole where there is an open flag, patched once it is mended.
  const lecturePlanks: Idea[] = data.ideas.map((i) => {
    const ms = data.marks.filter((m) => m.kind !== 'comment' && conceptAt(m.segment_id) === i.concept);
    return { ...i, state: ms.some((m) => m.status === 'open') ? 'gap' : ms.some((m) => m.status === 'repaired') ? 'mended' : 'plain' };
  });
  // A passage's colour: red where you flagged it, then the plank's state once it is mended.
  const segState = (s: Segment, ms: Mark[]): PlankState | null => {
    if (ms.some((m) => m.status === 'open' && m.kind !== 'comment')) return 'gap';
    if (!ms.some((m) => m.status === 'repaired')) return null;
    return 'mended';
  };
  const openMarks = data.marks.filter((m) => m.status === 'open' && m.kind !== 'comment');
  const patchMark = async (m: Mark, status: Mark['status']) => { await api(`/marks/${m.id}`, 'PATCH', { status }); update({ marks: data.marks.map((x) => (x.id === m.id ? { ...x, status } : x)) }); reload(); };
  const removeMark = async (m: Mark) => { await api(`/marks/${m.id}`, 'DELETE'); update({ marks: data.marks.filter((x) => x.id !== m.id) }); reload(); };
  const toggle = (mid: string) => setExpanded((s) => { const n = new Set(s); n.has(mid) ? n.delete(mid) : n.add(mid); return n; });

  return (
    <main className={`lecture ${user.settings.focus ? 'focus' : ''} ${live ? 'is-live' : ''}`}>
      <header className="lecthead">
        <button className="ghost iconbtn" onClick={() => go('/')} aria-label="Back to the map" title="Back to the map">‹</button>
        <div>
          <h1>{data.lecture.title}</h1>
          <p className="muted">
            {live ? <span className="livedot">● {mode === 'replay' ? 'Live replay (demo)' : 'Listening'}</span> : `Transcript from ${data.lecture.source}`}
            {segments.length ? ` · ${stamp(segments[segments.length - 1].t_end)}` : ''}
            {speedOn && <> · <SpeedControl value={speedPick} onChange={chooseSpeed} /></>}
          </p>
        </div>
        <div className="tlwrap">
          <LectureStep dir="prev" to={prevLecture} />
          <Timeline segments={data.segments} planks={lecturePlanks} now={target?.t_start ?? (live ? segments[segments.length - 1]?.t_start : undefined)} onTime={jump} />
          <LectureStep dir="next" to={nextLecture} />
        </div>
        <div className="lectactions">
          {data.lecture.live_demo && mode === 'recorded' ? (
            <button className="primary playbtn" onClick={() => { setShown(0); setSelected(null); setMode('replay'); }} aria-label="Sit in on it live (replay)" title="Sit in on it live">
              <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden><path d="M6 3.5v13l11-6.5z" fill="currentColor" /></svg>
            </button>
          ) : null}
          {mode === 'replay' && (
            <button className="ghost playbtn" onClick={() => setMode('recorded')} aria-label="Stop the replay" title="Stop the replay">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><rect x="4.5" y="4.5" width="11" height="11" rx="2" fill="currentColor" /></svg>
            </button>
          )}
          {canRecord && mode === 'recorded' && <button className="primary" onClick={startLive}>● Start listening</button>}
          {mode === 'live' && <button className="primary" onClick={stopLive}>◼ Stop</button>}
        </div>
      </header>

      <div className="lectbody">
        <section className="transcript" aria-label="Transcript">
          {!segments.length && <p className="muted pad">{canRecord ? 'Press "Start listening" when the lecture begins. The transcript appears here as it is spoken.' : live ? 'The lecture is starting…' : 'No transcript yet.'}</p>}
          {segments.map((s, i) => {
            const ms = marksFor(s.id);
            const current = live ? i === segments.length - 1 : s.id === selected;
            return (
              <article key={s.id} id={`seg-${s.id}`} className={`seg ${current ? 'current' : ''} ${segState(s, ms) ? `is-${segState(s, ms)}` : ''}`}>
                <button className="time" onClick={() => setSelected(s.id === selected ? null : s.id)} aria-pressed={s.id === selected} title="Select this passage">{stamp(s.t_start)}</button>
                <div>
                  <p onClick={() => !live && setSelected(s.id)}>
                    {mode === 'replay' && current && user.settings.wordHighlight
                      ? s.text.split(/\s+/).map((w, k) => <span key={k} className={k === word ? 'word on' : 'word'}>{w}{' '}</span>)
                      : s.text}
                  </p>
                  {ms.map((m) => (
                    <MarkChip key={m.id} mark={m} open={expanded.has(m.id)} onToggle={() => toggle(m.id)} onTime={jump} onResolve={() => patchMark(m, 'resolved')} onDelete={() => removeMark(m)} />
                  ))}
                </div>
                <span className="segstate">{segState(s, ms) === 'gap' ? <FlagIcon label="Flagged" /> : segState(s, ms) ? <PlankIcon state={segState(s, ms) as PlankState} size={26} /> : null}</span>
              </article>
            );
          })}
          {interim && <article className="seg current interim"><span className="time">…</span><div><p>{interim}</p></div><span /></article>}
        </section>

        <aside className="side">
          <div className="tabs" role="tablist">
            {([['notes', 'Notes'], ['planks', `Ideas${openMarks.length ? ` (${openMarks.length})` : ''}`], ['class', 'Class']] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          {tab === 'notes' && <Notes id={id} data={data} update={update} onTime={jump} toast={toast} />}
          {tab === 'planks' && (
            <div className="pad">
              {!lecturePlanks.length && <p className="muted">No ideas in this lecture yet.</p>}
              <ul className="plankrows">
                {lecturePlanks.map((p) => {
                  const gapMark = p.state === 'gap' ? openMarks.find((m) => conceptAt(m.segment_id) === p.concept) : undefined;
                  return (
                    <li key={p.concept} className={p.state === 'gap' ? 'gap' : ''}>
                      <PlankIcon state={p.state} size={40} />
                      <button className="link plain" onClick={() => jump(p.t_start)}>{p.title}</button>
                      {gapMark && <button className="primary small" onClick={() => go(`/repair/${gapMark.id}`)}>Mend</button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {tab === 'class' && <ClassTalk id={id} data={data} update={update} target={target} personal={!!data.lecture.owner_id} onTime={jump} />}
          {say && <div className="norbusays" role="status"><Troll size={56} mood="think" /><p>{say}</p></div>}
        </aside>
      </div>

      <footer className="dock">
        <button className="flagbtn" onClick={() => addMark('flag')} title="Mark this moment and keep listening (F)">
          <FlagIcon /> I'm lost here <kbd>F</kbd>
        </button>
        <form className="ask" onSubmit={(e) => { e.preventDefault(); if (text.trim()) addMark(kind, text.trim()); }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} aria-label="What to add">
            <option value="question">Ask Norbu</option>
            <option value="comment">Note to self</option>
          </select>
          <span className="askicon" aria-hidden><Troll size={26} /></span>
          <input value={text} onChange={(e) => setText(e.target.value)}
            placeholder={target ? (kind === 'question' ? `Ask about ${stamp(target.t_start)}…` : `Note at ${stamp(target.t_start)}…`) : 'Click a passage, then ask'} />
          <button className="primary" disabled={busy || !text.trim()}>{busy ? 'Thinking…' : kind === 'question' ? 'Ask' : 'Add'}</button>
        </form>
        {kind === 'question' && <LevelDial value={level} onChange={setLevel} />}
      </footer>
    </main>
  );
}

function MarkChip({ mark: m, open, onToggle, onTime, onResolve, onDelete }: { mark: Mark; open: boolean; onToggle: () => void; onTime: (t: number) => void; onResolve: () => void; onDelete: () => void }) {
  if (m.status === 'repaired') return <p className="mended-line"><span aria-hidden>✓</span> {m.note_line}</p>;
  const label = m.kind === 'flag' ? 'Flagged: lost here' : m.body;
  return (
    <div className={`chip ${m.kind} ${m.status} ${open ? 'open' : ''}`}>
      <button className="chiphead" onClick={onToggle} aria-expanded={open}>
        <span aria-hidden>{m.kind === 'flag' ? '⚑' : m.kind === 'question' ? '?' : '✎'}</span>
        <span>{label}</span>
        {m.status === 'resolved' && m.kind !== 'comment' && <em>sorted</em>}
      </button>
      {open && (
        <div className="chipbody">
          {m.answer && <><Tutor text={m.answer} onTime={onTime} /><ReadAloud text={m.answer} /></>}
          {m.ai_error && <OfflineNote error={m.ai_error} />}
          <div className="actions">
            {m.status === 'open' && <button className="primary small" onClick={() => go(`/repair/${m.id}`)}>Mend this gap</button>}
            {m.status === 'open' && <button className="ghost small" onClick={onResolve}>I've got it now</button>}
            <button className="ghost small" onClick={onDelete}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Notes({ id, data, update, onTime, toast }: { id: string; data: Data; update: (p: Partial<Data>) => void; onTime: (t: number) => void; toast: (s: string) => void }) {
  const [body, setBody] = useState(data.notes.body || '');
  const [busy, setBusy] = useState('');
  const [offline, setOffline] = useState<string | null>(null);
  const [rwOpen, setRwOpen] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => api(`/lectures/${id}/notes`, 'PUT', { body }).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [body]); // eslint-disable-line
  const summarise = async () => {
    setBusy('summary');
    try {
      const out = await api(`/lectures/${id}/summary`, 'POST');
      update({ notes: { body, summary: out.text } });
      setOffline(out.ai === 'offline' ? out.ai_error || '' : null);
    } catch (e: any) { toast(e.message); }
    setBusy('');
  };
  const mended = data.marks.filter((m) => m.note_line);
  return (
    <div className="pad notes">
      <label className="sr" htmlFor="notes">Your notes</label>
      <textarea id="notes" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your own notes. Questions and flags stay in the margin, so this stays clean." />
      {mended.length > 0 && (
        <div className="added">
          <h3>Added from mended gaps</h3>
          <ul>{mended.map((m) => <li key={m.id}>{m.note_line}</li>)}</ul>
        </div>
      )}
      <div className="actions">
        <button className="ghost small" disabled={!!busy} onClick={summarise}>{busy === 'summary' ? 'Writing…' : data.notes.summary ? 'Rewrite summary' : 'Write me a summary'}</button>
        {data.readwrite.licensed && <button className="ghost small rwopen" onClick={() => setRwOpen(true)}><span className="logo rw" aria-hidden>R</span> Open in Read&amp;Write</button>}
      </div>
      {rwOpen && (
        <ReadWritePanel lectureId={id} rw={data.readwrite} onClose={() => setRwOpen(false)}
          parts={[
            ...(data.notes.summary ? [{ title: 'Summary', text: data.notes.summary }] : []),
            ...(mended.length ? [{ title: 'From mended gaps', text: mended.map((m) => m.note_line).join(' ') }] : []),
            ...(body.trim() ? [{ title: 'My notes', text: body }] : []),
          ]}
          onSaved={(highlights) => update({ readwrite: { licensed: true, highlights } })}
          onAddToNotes={(t) => setBody((b) => `${b.trim()}${b.trim() ? '\n\n' : ''}${t}`)}
        />
      )}
      {data.notes.summary && (
        <div className="summary">
          <div className="between"><h3>Summary</h3><ReadAloud text={data.notes.summary} /></div>
          <Tutor text={data.notes.summary} onTime={onTime} />
          {offline !== null && <OfflineNote error={offline} />}
        </div>
      )}
    </div>
  );
}

function ClassTalk({ id, data, update, target, personal, onTime }: { id: string; data: Data; update: (p: Partial<Data>) => void; target: Segment | null | undefined; personal: boolean; onTime: (t: number) => void }) {
  const [body, setBody] = useState('');
  const [anon, setAnon] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  if (personal) return <p className="pad muted">This is your own recording, so there is no class discussion for it.</p>;
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const posts = await api<Post[]>(`/lectures/${id}/posts`, 'POST', { body, anonymous: anon, parent_id: replyTo, segment_id: replyTo ? null : target?.id });
    update({ posts });
    setBody(''); setReplyTo(null);
  };
  const roots = data.posts.filter((p) => !p.parent_id);
  const timeOf = (p: Post) => data.segments.find((s) => s.id === p.segment_id)?.t_start;
  return (
    <div className="pad talk">
      {!roots.length && <p className="muted">Nobody has posted about this lecture yet. Questions go to classmates and the instructor.</p>}
      {roots.map((p) => (
        <div key={p.id} className="post">
          <p className="who">{p.author}{p.instructor && <span className="tag proven">Instructor</span>}{timeOf(p) != null && <button className="time" onClick={() => onTime(timeOf(p)!)}>{stamp(timeOf(p)!)}</button>}</p>
          <p>{p.body}</p>
          {data.posts.filter((r) => r.parent_id === p.id).map((r) => (
            <div key={r.id} className="post reply"><p className="who">{r.author}{r.instructor && <span className="tag proven">Instructor</span>}</p><p>{r.body}</p></div>
          ))}
          <button className="ghost small" onClick={() => setReplyTo(replyTo === p.id ? null : p.id)}>{replyTo === p.id ? 'Cancel reply' : 'Reply'}</button>
        </div>
      ))}
      <form onSubmit={send}>
        <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={replyTo ? 'Write a reply' : target ? `Ask the class about ${stamp(target.t_start)}` : 'Ask the class'} />
        <div className="between">
          <Toggle checked={anon} onChange={setAnon}>Post without my name</Toggle>
          <button className="primary small" disabled={!body.trim()}>Post</button>
        </div>
      </form>
    </div>
  );
}

function FlagIcon({ label }: { label?: string }) {
  return (
    <svg className="flagicon" viewBox="0 0 20 20" width="20" height="20" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M5 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 3h10l-2.5 3.5L16 10H6z" fill="currentColor" />
    </svg>
  );
}

/** The lecture as a line: a dot per idea that is not plain (red missing, amber patched), and where you are. */
function Timeline({ segments, planks, now, onTime }: { segments: Segment[]; planks: Idea[]; now?: number; onTime: (t: number) => void }) {
  const end = segments[segments.length - 1]?.t_end || 1;
  const pct = (t: number) => `${Math.min(100, (100 * t) / end)}%`;
  const WORD: Record<PlankState, string> = { gap: 'missing', mended: 'patched', proven: 'proven', plain: 'sound' };
  return (
    <div className="timeline" role="group" aria-label="Where your gaps are in this lecture">
      <div className="track"><i style={{ width: now == null ? 0 : pct(now) }} /></div>
      {planks.filter((p) => p.state !== 'plain').map((p) => (
        <button key={p.concept} className={`dot ${p.state}`} style={{ left: pct(p.t_start) }} onClick={() => onTime(p.t_start)}
          aria-label={`${p.title}, ${WORD[p.state]}, at ${stamp(p.t_start)}`} title={`${p.title} · ${stamp(p.t_start)}`} />
      ))}
      {now != null && <span className="here" style={{ left: pct(now) }} aria-hidden />}
    </div>
  );
}

function LectureStep({ dir, to }: { dir: 'prev' | 'next'; to?: Plank }) {
  const label = to ? `${dir === 'prev' ? 'Previous' : 'Next'} lecture: ${to.title}` : `No ${dir === 'prev' ? 'earlier' : 'later'} lecture`;
  return (
    <button className="ghost iconbtn step" disabled={!to} onClick={() => to && go(`/lecture/${to.lecture_id}`)} aria-label={label} title={label}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden style={dir === 'next' ? { transform: 'scaleX(-1)' } : undefined}>
        <rect x="3" y="4" width="2.6" height="12" rx="1.2" fill="currentColor" /><path d="M16 4v12L7 10z" fill="currentColor" />
      </svg>
    </button>
  );
}

/** "1×" in the subheader; click it for a slider that snaps to the set speeds. */
function SpeedControl({ value, onChange }: { value: Speed; onChange: (v: Speed) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', key);
    window.addEventListener('mousedown', click);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mousedown', click); };
  }, [open]);
  const i = Math.max(0, SPEEDS.indexOf(value));
  return (
    <span className="speedctl" ref={box}>
      <button className="speedbtn" aria-expanded={open} aria-label={`Replay speed ${value}×. Change`} onClick={() => setOpen(!open)}>{value}×</button>
      {open && (
        <span className="speedpop">
          <input type="range" min={0} max={SPEEDS.length - 1} step={1} value={i} autoFocus aria-label="Replay speed" aria-valuetext={`${value} times`}
            onChange={(e) => onChange(SPEEDS[Number(e.target.value)])} list="speed-steps" />
          <datalist id="speed-steps">{SPEEDS.map((v, k) => <option key={v} value={k} />)}</datalist>
          <span className="ticks" aria-hidden>{SPEEDS.map((v) => <span key={v} className={v === value ? 'on' : ''}>{v}×</span>)}</span>
        </span>
      )}
    </span>
  );
}
