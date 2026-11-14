import { useEffect, useMemo, useRef, useState } from 'react';
import { api, go, stamp, useAsync, Tutor, LevelDial, Modal, OfflineNote, ReadAloud, Recognition, Toggle, type Home, type Lecture, type Level, type Mark, type Post, type Segment } from './ui';

interface Data { lecture: Lecture; segments: Segment[]; marks: Mark[]; notes: { body: string; summary: string | null }; posts: Post[] }
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
  const [tab, setTab] = useState<'notes' | 'gaps' | 'class'>('notes');
  const [interim, setInterim] = useState('');
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
    if (shown >= data.segments.length) { setMode('recorded'); toast('Lecture over. Your flags are waiting under "Gaps".'); setTab('gaps'); return; }
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : REPLAY_MS);
    return () => clearTimeout(t);
  }, [mode, shown, data]); // eslint-disable-line

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
    r.onerror = (e: any) => { if (e.error === 'not-allowed') { toast('Noor needs microphone permission to transcribe.'); stopLive(); } };
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
      toast(`Flagged at ${stamp(seg.t_start)}. Keep listening, I'll hold your place.`);
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
  const openMarks = data.marks.filter((m) => m.status === 'open' && m.kind !== 'comment');
  const patchMark = async (m: Mark, status: Mark['status']) => { await api(`/marks/${m.id}`, 'PATCH', { status }); update({ marks: data.marks.map((x) => (x.id === m.id ? { ...x, status } : x)) }); reload(); };
  const removeMark = async (m: Mark) => { await api(`/marks/${m.id}`, 'DELETE'); update({ marks: data.marks.filter((x) => x.id !== m.id) }); reload(); };
  const toggle = (mid: string) => setExpanded((s) => { const n = new Set(s); n.has(mid) ? n.delete(mid) : n.add(mid); return n; });

  return (
    <main className={`lecture ${user.settings.focus ? 'focus' : ''} ${live ? 'is-live' : ''}`}>
      <header className="lecthead">
        <button className="ghost" onClick={() => go('/')}>‹ Map</button>
        <div>
          <h1>{data.lecture.title}</h1>
          <p className="muted">
            {live ? <span className="livedot">● {mode === 'replay' ? 'Live replay (demo, sped up)' : 'Listening'}</span> : `Transcript from ${data.lecture.source}`}
            {segments.length ? ` · ${stamp(segments[segments.length - 1].t_end)}` : ''}
          </p>
        </div>
        <div className="lectactions">
          {data.lecture.live_demo && mode === 'recorded' ? <button className="primary" onClick={() => { setShown(0); setSelected(null); setMode('replay'); }}>▶ Sit in on it live</button> : null}
          {mode === 'replay' && <button className="ghost" onClick={() => setMode('recorded')}>Skip to the recording</button>}
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
              <article key={s.id} id={`seg-${s.id}`} className={`seg ${current ? 'current' : ''} ${ms.some((m) => m.status === 'open' && m.kind !== 'comment') ? 'has-gap' : ''}`}>
                <button className="time" onClick={() => setSelected(s.id === selected ? null : s.id)} aria-pressed={s.id === selected} title="Select this passage">{stamp(s.t_start)}</button>
                <div>
                  <p onClick={() => !live && setSelected(s.id)}>{s.text}</p>
                  {ms.map((m) => (
                    <MarkChip key={m.id} mark={m} open={expanded.has(m.id)} onToggle={() => toggle(m.id)} onTime={jump} onResolve={() => patchMark(m, 'resolved')} onDelete={() => removeMark(m)} />
                  ))}
                </div>
              </article>
            );
          })}
          {interim && <article className="seg current interim"><span className="time">…</span><div><p>{interim}</p></div></article>}
        </section>

        <aside className="side">
          <div className="tabs" role="tablist">
            {([['notes', 'Notes'], ['gaps', `Gaps${openMarks.length ? ` (${openMarks.length})` : ''}`], ['class', 'Class']] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          {tab === 'notes' && <Notes id={id} data={data} update={update} onTime={jump} toast={toast} />}
          {tab === 'gaps' && (
            <div className="pad">
              {!openMarks.length && <p className="muted">No gaps in this lecture. Press <kbd>F</kbd> whenever you lose the thread.</p>}
              <ul className="todo">
                {openMarks.map((m) => {
                  const seg = data.segments.find((s) => s.id === m.segment_id)!;
                  return (
                    <li key={m.id}><button className="row" onClick={() => go(`/repair/${m.id}`)}>
                      <span className="tag gap">{stamp(seg.t_start)}</span>
                      <span><strong>{m.body || seg.text.slice(0, 60) + '…'}</strong><small>Mend this gap</small></span><span className="chev">›</span>
                    </button></li>
                  );
                })}
              </ul>
            </div>
          )}
          {tab === 'class' && <ClassTalk id={id} data={data} update={update} target={target} personal={!!data.lecture.owner_id} onTime={jump} />}
        </aside>
      </div>

      <footer className="dock">
        <button className="flagbtn" onClick={() => addMark('flag')} title="Mark this moment and keep listening (F)">
          <span aria-hidden>⚑</span> I'm lost here <kbd>F</kbd>
        </button>
        <form className="ask" onSubmit={(e) => { e.preventDefault(); if (text.trim()) addMark(kind, text.trim()); }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} aria-label="What to add">
            <option value="question">Ask Noor</option>
            <option value="comment">Note to self</option>
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)}
            placeholder={target ? (kind === 'question' ? `Ask about ${stamp(target.t_start)}. No need to explain the context.` : `Add a note at ${stamp(target.t_start)}`) : 'Click a passage, then ask about it'} />
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
      </div>
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
