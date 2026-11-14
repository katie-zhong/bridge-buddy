import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, insertSegments, now, uid, DAY } from './db.mjs';
import * as ai from './ai.mjs';
import { z } from 'zod';
import { CONCEPTS, AREAS, DETAILS, SYLLABUS } from './content.mjs';
import { parseSyllabus, parseTranscript } from './integrations.mjs';
import { applySample, clearProgress } from './sample.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIN_GROUP = 5; // never show an aggregate about fewer than this many students
const MAX_LEVEL = 4; // driftwood, oak, stone, iron, gold
const ROT_AFTER = 3, ROTTEN_AFTER = 5; // newer lectures in the course since the plank was last worked on

// Everything a student may change about their own profile. Unknown keys are rejected.
// Read&Write highlighter colours, each with a fixed meaning so colour is never the only cue.
export const RW_COLOURS = ['key', 'term', 'example', 'question'];
const RwPut = z.object({ highlights: z.record(z.string().min(1).max(600), z.enum(RW_COLOURS)).refine((h) => Object.keys(h).length <= 400, 'Too many highlights') }).strict();
const RwDemo = z.object({ licensed: z.boolean() }).strict();

const MePatch = z.object({
  settings: z.object({
    font: z.enum(['atkinson', 'lexend', 'system']), size: z.number().min(0.8).max(1.6), spacing: z.number().min(1.2).max(2.4),
    calm: z.boolean(), level: z.enum(['hint', 'example', 'walkthrough']), focus: z.boolean(), checkpoints: z.boolean(),
    reminder: z.string().regex(/^(\d\d:\d\d)?$/), shareAggregates: z.boolean(), recs: z.boolean(), onboarded: z.boolean(),
    readAloud: z.boolean(), dictation: z.boolean(),
    replaySpeed: z.boolean(), speed: z.union([z.literal(0.75), z.literal(1), z.literal(1.5), z.literal(2)]), wordHighlight: z.boolean(),
  }).partial().strict().optional(),
  struggles: z.array(z.string().max(40)).max(20).optional(),
}).strict();

// Returns the (req, res) request listener. Used directly by the Vercel Function in api/,
// and wrapped in an http.Server by createApp() for local dev, `npm start` and tests.
export function createHandler(db = openDb()) {
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);
  const routes = [];
  const on = (method, pattern, fn, opts = {}) =>
    routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, ...opts });
  const fail = (status, message) => Object.assign(new Error(message), { status });

  const pub = (u) => ({ id: u.id, name: u.name, role: u.role, settings: JSON.parse(u.settings || '{}'), struggles: JSON.parse(u.struggles || '[]') });
  const rwLicensed = (u) => !!one('select readwrite from accommodations where user_id=?', u.id)?.readwrite;
  const shares = (u) => JSON.parse(u.settings || '{}').shareAggregates !== false;
  const lectureFor = (id, user) => {
    const l = one('select * from lectures where id=?', id);
    if (!l || (l.owner_id && l.owner_id !== user.id)) throw fail(404, 'Lecture not found');
    return l;
  };
  const segsOf = (lectureId) => q('select * from segments where lecture_id=? order by idx', lectureId);
  // The ideas taught in a lecture, in order, each starting where its first passage starts.
  const ideasOf = (lectureId) => {
    const seen = new Map();
    for (const s of segsOf(lectureId)) if (!seen.has(s.concept)) seen.set(s.concept, s);
    return [...seen].map(([concept, first]) => ({ concept, title: CONCEPTS[concept]?.title || `Part ${concept.replace('part-', '')}`, t_start: first.t_start }));
  };
  const markFor = (id, user) => {
    const m = one('select * from marks where id=? and user_id=?', id, user.id);
    if (!m) throw fail(404, 'Not found');
    return m;
  };
  const ctx = (mark) => {
    const lecture = one('select * from lectures where id=?', mark.lecture_id);
    const segs = segsOf(mark.lecture_id);
    return { lectureTitle: lecture.title, segs, seg: segs.find((s) => s.id === mark.segment_id) };
  };

  // ---- derived views ---------------------------------------------------
  // One plank per lecture. Its material is how many times it has been renovated; it rots when
  // newer lectures pile up and the student has not asked, mended or practised on it since.
  function planks(user, courseId) {
    const lectures = q('select * from lectures where course_id=? and (owner_id is null or owner_id=?) order by held_at', courseId, user.id);
    return lectures.map((l) => {
      const plank = one('select * from planks where user_id=? and lecture_id=?', user.id, l.id);
      const m = one(`select max(created_at) a, max(repaired_at) b, sum(status='open' and kind!='comment') open, sum(kind='question') asked from marks where user_id=? and lecture_id=?`, user.id, l.id);
      const p = one('select max(created_at) a from attempts where user_id=? and lecture_id=?', user.id, l.id);
      const touched = Math.max(l.held_at, m.a || 0, m.b || 0, p.a || 0, plank?.renovated_at || 0);
      const newer = lectures.filter((x) => x.held_at > touched).length;
      const level = plank?.level || 0;
      return {
        lecture_id: l.id, title: l.title, held_at: l.held_at, source: l.source, live_demo: l.live_demo, mine: !!l.owner_id,
        level, rot: newer >= ROTTEN_AFTER + level ? 2 : newer >= ROT_AFTER + level ? 1 : 0, newer,
        open: m.open || 0, asked: m.asked || 0,
        problems: one('select count(*) n from problems where lecture_id=?', l.id).n,
      };
    });
  }
  const bridgeLevel = (user, courseId) => Math.min(...planks(user, courseId).map((p) => p.level));

  function streak(user) {
    const stamps = [
      ...q('select repaired_at t from marks where user_id=? and repaired_at is not null', user.id),
      ...q('select created_at t from attempts where user_id=? and passed=1', user.id),
    ].map((r) => Math.floor(r.t / DAY));
    const days = new Set(stamps);
    let d = Math.floor(now() / DAY);
    if (!days.has(d)) d -= 1;
    let n = 0;
    while (days.has(d)) { n++; d--; }
    return { days: n, today: days.has(Math.floor(now() / DAY)) };
  }

  const markRow = `select m.*, s.text seg_text, s.t_start, s.idx, s.concept, l.title lecture from marks m join segments s on s.id=m.segment_id join lectures l on l.id=m.lecture_id`;
  // ---- auth ------------------------------------------------------------
  on('POST', '/api/login', ({ body }) => {
    const name = String(body.name || '').trim().slice(0, 40);
    const role = body.role === 'instructor' ? 'instructor' : 'student';
    if (!name) throw fail(400, 'Please enter a name');
    const id = uid();
    const token = uid() + uid() + uid();
    run('insert into users(id,name,role,token,created_at) values(?,?,?,?,?)', id, name, role, token, now());
    if (role === 'student' && body.sample !== false) applySample(db, id); // demo: start with sample progress
    return { token, user: pub(one('select * from users where id=?', id)) };
  }, { open: true });

  on('GET', '/api/home', ({ user }) => ({
    user: pub(user),
    ai: ai.aiMode(),
    courses: q('select * from courses').map((c) => ({ ...c, planks: planks(user, c.id) })),
    streak: streak(user),
    open: q(`${markRow} where m.user_id=? and m.status='open' and m.kind!='comment' order by m.created_at`, user.id),
    deadlines: q('select * from deadlines where due_at>? order by due_at', now() - DAY).map((d) => ({ ...d, covers: JSON.parse(d.covers) })),
    areas: AREAS.map((a) => ({ key: a.key, label: a.label, details: a.details.map((d) => ({ key: d.key, label: d.label })) })),
  }));

  const setSettings = (userId, patch) => {
    const cur = one('select settings from users where id=?', userId);
    run('update users set settings=? where id=?', JSON.stringify({ ...JSON.parse(cur.settings || '{}'), ...patch }), userId);
  };

  on('PATCH', '/api/me', ({ user, body }) => {
    const parsed = MePatch.safeParse(body);
    if (!parsed.success) throw fail(400, 'Those settings are not valid');
    const { settings, struggles } = parsed.data;
    if (settings) setSettings(user.id, settings);
    if (struggles) {
      const before = JSON.parse(user.struggles || '[]');
      const next = struggles.filter((k, i) => DETAILS.some((d) => d.key === k) && struggles.indexOf(k) === i);
      run('update users set struggles=? where id=?', JSON.stringify(next), user.id);
      // A newly picked detail switches on its strategy (and the setting it needs), unless the
      // student turned recommendations off or already made a choice about that strategy.
      const recsOn = JSON.parse(one('select settings from users where id=?', user.id).settings || '{}').recs !== false;
      for (const key of next.filter((k) => !before.includes(k))) {
        const s = DETAILS.find((d) => d.key === key).strategy;
        const decided = one('select 1 from strategy_use where user_id=? and strategy_id=?', user.id, key);
        if (!recsOn || decided) continue;
        run('insert into strategy_use values(?,?,1,null)', user.id, key);
        if (s.setting) setSettings(user.id, s.setting);
      }
    }
    return pub(one('select * from users where id=?', user.id));
  });

  on('GET', '/api/export', ({ user }) => ({
    exported_at: new Date().toISOString(),
    profile: pub(user),
    marks: q('select * from marks where user_id=?', user.id),
    practice: q('select * from attempts where user_id=?', user.id),
    planks: q('select * from planks where user_id=?', user.id),
    notes: q('select * from notes where user_id=?', user.id),
    posts: q('select * from posts where user_id=?', user.id),
    strategies: q('select * from strategy_use where user_id=?', user.id),
    accommodations: q('select readwrite, source from accommodations where user_id=?', user.id),
    readwrite_highlights: q('select lecture_id, data from rw_highlights where user_id=?', user.id),
    lectures: q('select * from lectures where owner_id=?', user.id),
  }));

  on('DELETE', '/api/me', ({ user }) => {
    for (const l of q('select id from lectures where owner_id=?', user.id)) run('delete from segments where lecture_id=?', l.id);
    for (const t of ['marks', 'attempts', 'planks', 'notes', 'posts', 'strategy_use', 'accommodations', 'rw_highlights']) run(`delete from ${t} where user_id=?`, user.id);
    run('delete from lectures where owner_id=?', user.id);
    run('delete from users where id=?', user.id);
    return { deleted: true };
  });

  // ---- lectures --------------------------------------------------------
  on('GET', '/api/lectures/:id', ({ user, params }) => {
    const lecture = lectureFor(params.id, user);
    return {
      lecture,
      segments: segsOf(lecture.id),
      ideas: ideasOf(lecture.id),
      marks: q('select * from marks where user_id=? and lecture_id=? order by created_at', user.id, lecture.id),
      notes: one('select * from notes where user_id=? and lecture_id=?', user.id, lecture.id) || { body: '', summary: null },
      posts: posts(lecture.id, user),
      readwrite: rwLicensed(user)
        ? { licensed: true, highlights: JSON.parse(one('select data from rw_highlights where user_id=? and lecture_id=?', user.id, lecture.id)?.data || '{}') }
        : { licensed: false, highlights: {} },
    };
  });

  // ---- Read&Write (Texthelp): only for students whose registered accommodations include it ----
  // A licence is never visible to instructors or other students. In this build the licence is
  // simulated per student from Settings (labelled demo); the pilot reads it from Accessibility Services.
  on('GET', '/api/integrations', ({ user }) => ({
    brightspace: { connected: true, demo: true },
    readwrite: user.role === 'student' ? { licensed: rwLicensed(user), source: one('select source from accommodations where user_id=?', user.id)?.source ?? null } : null,
  }));
  on('POST', '/api/integrations/readwrite/demo', ({ user, body }) => {
    if (user.role !== 'student') throw fail(403, 'Read&Write licences are for students');
    const parsed = RwDemo.safeParse(body);
    if (!parsed.success) throw fail(400, 'Say whether to simulate a licence');
    run('insert into accommodations(user_id,readwrite,source) values(?,?,?) on conflict(user_id) do update set readwrite=excluded.readwrite, source=excluded.source',
      user.id, parsed.data.licensed ? 1 : 0, parsed.data.licensed ? 'Accessibility Services (demo)' : null);
    return { licensed: rwLicensed(user) };
  });
  on('PUT', '/api/lectures/:id/readwrite', ({ user, params, body }) => {
    const lecture = lectureFor(params.id, user);
    if (!rwLicensed(user)) throw fail(403, 'Read&Write needs a licence through your registered accommodations');
    const parsed = RwPut.safeParse(body);
    if (!parsed.success) throw fail(400, 'Those highlights are not valid');
    run('insert into rw_highlights(user_id,lecture_id,data) values(?,?,?) on conflict(user_id,lecture_id) do update set data=excluded.data', user.id, lecture.id, JSON.stringify(parsed.data.highlights));
    return { ok: true };
  });

  // Demo: swap this student's progress for the sample map, or clear it to start from scratch.
  const SampleBody = z.object({ sample: z.boolean() }).strict();
  on('POST', '/api/demo/progress', ({ user, body }) => {
    if (user.role !== 'student') throw fail(403, 'Students only');
    const parsed = SampleBody.safeParse(body);
    if (!parsed.success) throw fail(400, 'Say whether to load sample progress');
    if (parsed.data.sample) applySample(db, user.id); else clearProgress(db, user.id);
    return { sample: parsed.data.sample };
  });

  // ---- course people, pulled from the Brightspace syllabus ---------------
  on('GET', '/api/course', () => {
    const course = one('select * from courses limit 1');
    return { code: course.code, title: course.title, source: 'Brightspace', demo: true, synced_at: now(), ...parseSyllabus(SYLLABUS) };
  });

  on('POST', '/api/lectures', ({ user, body }) => {
    const title = String(body.title || '').trim().slice(0, 120) || 'Untitled lecture';
    const course = one('select id from courses where id=?', String(body.course_id || '')) || one('select id from courses limit 1');
    const id = uid();
    const segs = body.transcript ? parseTranscript(String(body.transcript)) : [];
    if (body.transcript && !segs.length) throw fail(400, 'That transcript looks empty');
    run('insert into lectures values(?,?,?,?,?,?,0,?)', id, course.id, title, now(), body.transcript ? 'Upload' : 'Live', 30, user.id);
    insertSegments(db, id, segs, 30);
    return { id };
  });

  on('POST', '/api/lectures/:id/segments', ({ user, params, body }) => {
    const lecture = lectureFor(params.id, user);
    if (lecture.owner_id !== user.id) throw fail(403, 'Only your own live lectures can be added to');
    const text = String(body.text || '').trim();
    if (!text) throw fail(400, 'Empty segment');
    const n = one('select count(*) n from segments where lecture_id=?', lecture.id).n;
    insertSegments(db, lecture.id, [{ text, t_start: Math.max(0, body.t_start | 0), t_end: Math.max(0, body.t_end | 0) }], 30, n);
    return one('select * from segments where lecture_id=? and idx=?', lecture.id, n);
  });

  on('PUT', '/api/lectures/:id/notes', ({ user, params, body }) => {
    lectureFor(params.id, user);
    run('insert into notes(user_id,lecture_id,body) values(?,?,?) on conflict(user_id,lecture_id) do update set body=excluded.body', user.id, params.id, String(body.body || '').slice(0, 50000));
    return { ok: true };
  });

  on('POST', '/api/lectures/:id/summary', async ({ user, params }) => {
    const lecture = lectureFor(params.id, user);
    const segs = segsOf(lecture.id);
    if (!segs.length) throw fail(400, 'There is no transcript to summarise yet');
    const notes = one('select body from notes where user_id=? and lecture_id=?', user.id, lecture.id)?.body;
    const lines = q(`select note_line from marks where user_id=? and lecture_id=? and note_line is not null`, user.id, lecture.id).map((r) => r.note_line);
    const out = await ai.summary({ lectureTitle: lecture.title, segs, notes, lines });
    run('insert into notes(user_id,lecture_id,summary) values(?,?,?) on conflict(user_id,lecture_id) do update set summary=excluded.summary', user.id, lecture.id, out.text);
    return out;
  });

  // ---- marks: flags, questions, comments --------------------------------
  on('POST', '/api/marks', async ({ user, body }) => {
    const lecture = lectureFor(body.lecture_id, user);
    const segs = segsOf(lecture.id);
    const seg = segs.find((s) => s.id === body.segment_id);
    if (!seg) throw fail(400, 'Unknown part of the lecture');
    const kind = ['flag', 'question', 'comment'].includes(body.kind) ? body.kind : 'flag';
    const text = String(body.body || '').trim().slice(0, 2000) || null;
    if (kind !== 'flag' && !text) throw fail(400, 'Write something first');
    const level = ['hint', 'example', 'walkthrough'].includes(body.level) ? body.level : 'example';
    const id = uid();
    let extra = {};
    let answer = null;
    if (kind === 'question') {
      const upTo = body.live ? segs.filter((s) => s.idx <= seg.idx) : segs;
      const out = await ai.ask({ lectureTitle: lecture.title, segs: upTo, seg, question: text, level });
      answer = out.text;
      extra = { ai: out.ai, ai_error: out.ai_error };
    }
    run('insert into marks(id,user_id,lecture_id,segment_id,kind,body,answer,level,status,created_at) values(?,?,?,?,?,?,?,?,?,?)', id, user.id, lecture.id, seg.id, kind, text, answer, level, kind === 'comment' ? 'resolved' : 'open', now());
    return { ...one('select * from marks where id=?', id), ...extra };
  });

  on('GET', '/api/marks/:id', ({ user, params }) => {
    const m = one(`${markRow} where m.id=? and m.user_id=?`, params.id, user.id);
    if (!m) throw fail(404, 'Not found');
    const segs = segsOf(m.lecture_id);
    return { ...m, around: segs.filter((s) => Math.abs(s.idx - m.idx) <= 1) };
  });

  on('PATCH', '/api/marks/:id', ({ user, params, body }) => {
    const m = markFor(params.id, user);
    if (body.status === 'resolved' || body.status === 'open') run('update marks set status=? where id=?', body.status, m.id);
    return one('select * from marks where id=?', m.id);
  });

  on('DELETE', '/api/marks/:id', ({ user, params }) => {
    const m = markFor(params.id, user);
    run('delete from marks where id=?', m.id);
    return { ok: true };
  });

  on('POST', '/api/marks/:id/explain', async ({ user, params, body }) => {
    const m = markFor(params.id, user);
    const level = ['hint', 'example', 'walkthrough'].includes(body.level) ? body.level : 'example';
    const out = await ai.explain({ ...ctx(m), level, question: m.body });
    run('update marks set answer=?, level=? where id=?', out.text, level, m.id);
    return out;
  });

  on('POST', '/api/marks/:id/riddle', async ({ user, params }) => ai.riddle(ctx(markFor(params.id, user))));

  on('POST', '/api/marks/:id/answer', async ({ user, params, body }) => {
    const m = markFor(params.id, user);
    const answer = String(body.answer || '').trim();
    if (!answer) throw fail(400, 'Write or say an answer first');
    const out = await ai.grade({ ...ctx(m), question: String(body.question || ''), answer });
    run('update marks set tries=tries+1 where id=?', m.id);
    if (out.passed && m.status !== 'repaired') {
      run(`update marks set status='repaired', repaired_at=?, note_line=?, first_try_pass=? where id=?`, now(), out.note_line, m.tries === 0 ? 1 : 0, m.id);
    }
    return { passed: out.passed, feedback: out.feedback, note_line: out.passed ? out.note_line : null, ai: out.ai, ai_error: out.ai_error };
  });

  // ---- renovating a plank: practice problems set by the instructor -----
  const Answer = z.object({ answer: z.string().trim().min(1, 'Write or say an answer first').max(4000) });
  const NewProblem = z.object({ question: z.string().trim().min(5, 'Write the question first').max(1000), answer: z.string().trim().min(1, 'Add a model answer').max(2000) });
  const parse = (schema, body) => {
    const out = schema.safeParse(body);
    if (!out.success) throw fail(400, out.error.issues[0]?.message || 'Bad request');
    return out.data;
  };
  const need = (lectureId) => Math.min(2, one('select count(*) n from problems where lecture_id=?', lectureId).n);
  const passedSince = (user, lectureId) => {
    const since = one('select renovated_at t from planks where user_id=? and lecture_id=?', user.id, lectureId)?.t || 0;
    return q('select distinct problem_id from attempts where user_id=? and lecture_id=? and passed=1 and created_at>?', user.id, lectureId, since).map((r) => r.problem_id);
  };

  on('GET', '/api/lectures/:id/practice', async ({ user, params }) => {
    const lecture = lectureFor(params.id, user);
    const segs = segsOf(lecture.id);
    // A personal lecture has no instructor problems, so Norbu writes two from the transcript.
    if (!need(lecture.id) && segs.length) {
      for (const seg of [segs[Math.floor(segs.length / 3)], segs[Math.floor((2 * segs.length) / 3)]]) {
        const out = await ai.riddle({ lectureTitle: lecture.title, segs, seg });
        run('insert into problems(id,lecture_id,question,answer,segment_id,created_at) values(?,?,?,?,?,?)', uid(), lecture.id, out.question, '', seg.id, now());
      }
    }
    const done = passedSince(user, lecture.id);
    const all = q('select id, question from problems where lecture_id=? order by created_at, id', lecture.id);
    const todo = all.filter((p) => !done.includes(p.id));
    return {
      lecture: { id: lecture.id, title: lecture.title },
      level: one('select level from planks where user_id=? and lecture_id=?', user.id, lecture.id)?.level || 0,
      need: need(lecture.id), done: done.length,
      problems: (todo.length ? todo : all).slice(0, Math.max(1, need(lecture.id) - done.length)),
    };
  });

  on('POST', '/api/problems/:id/answer', async ({ user, params, body }) => {
    const { answer } = parse(Answer, body);
    const problem = one('select * from problems where id=?', params.id);
    if (!problem) throw fail(404, 'Not found');
    const lecture = lectureFor(problem.lecture_id, user);
    const segs = segsOf(lecture.id);
    const seg = problem.segment_id && segs.find((s) => s.id === problem.segment_id);
    const out = seg
      ? await ai.grade({ lectureTitle: lecture.title, segs, seg, question: problem.question, answer })
      : await ai.gradeProblem({ lectureTitle: lecture.title, segs, question: problem.question, modelAnswer: problem.answer, keywords: JSON.parse(problem.keywords || '[]'), answer });
    const first = one('select count(*) n from attempts where user_id=? and problem_id=?', user.id, problem.id).n === 0;
    const before = bridgeLevel(user, lecture.course_id);
    run('insert into attempts values(?,?,?,?,?,?,?)', uid(), user.id, lecture.id, problem.id, out.passed ? 1 : 0, first ? 1 : 0, now());
    let level = one('select level from planks where user_id=? and lecture_id=?', user.id, lecture.id)?.level || 0;
    const done = passedSince(user, lecture.id).length;
    const renovated = out.passed && done >= need(lecture.id) && level < MAX_LEVEL;
    if (renovated) {
      level += 1;
      run('insert into planks values(?,?,?,?) on conflict(user_id,lecture_id) do update set level=excluded.level, renovated_at=excluded.renovated_at', user.id, lecture.id, level, now());
    }
    const after = bridgeLevel(user, lecture.course_id);
    return {
      passed: out.passed, feedback: out.feedback, model_answer: out.passed ? problem.answer || null : null,
      done: renovated ? 0 : done, need: need(lecture.id), renovated, level,
      bridge_level: after > before ? after : null, ai: out.ai, ai_error: out.ai_error,
    };
  });

  on('POST', '/api/lectures/:id/problems', ({ user, params, body }) => {
    if (user.role !== 'instructor') throw fail(403, 'Instructors only');
    const lecture = one('select * from lectures where id=? and owner_id is null', params.id);
    if (!lecture) throw fail(404, 'Lecture not found');
    const { question, answer } = parse(NewProblem, body);
    run('insert into problems(id,lecture_id,question,answer,author_id,created_at) values(?,?,?,?,?,?)', uid(), lecture.id, question, answer, user.id, now());
    return q('select id, question, answer from problems where lecture_id=? order by created_at, id', lecture.id);
  });
  on('DELETE', '/api/problems/:id', ({ user, params }) => {
    if (user.role !== 'instructor') throw fail(403, 'Instructors only');
    const p = one('select * from problems where id=?', params.id);
    if (!p) throw fail(404, 'Not found');
    run('delete from attempts where problem_id=?', p.id);
    run('delete from problems where id=?', p.id);
    return q('select id, question, answer from problems where lecture_id=? order by created_at, id', p.lecture_id);
  });

  // ---- discussion ------------------------------------------------------
  function posts(lectureId, user) {
    return q('select p.*, u.name, u.role from posts p join users u on u.id=p.user_id where p.lecture_id=? order by p.created_at', lectureId).map((p) => ({
      id: p.id, segment_id: p.segment_id, parent_id: p.parent_id, body: p.body, created_at: p.created_at,
      author: p.anonymous && p.role !== 'instructor' ? 'Anonymous student' : p.name, instructor: p.role === 'instructor', mine: p.user_id === user.id,
    }));
  }
  on('POST', '/api/lectures/:id/posts', ({ user, params, body }) => {
    const lecture = lectureFor(params.id, user);
    if (lecture.owner_id) throw fail(400, 'Personal recordings have no class discussion');
    const text = String(body.body || '').trim().slice(0, 2000);
    if (!text) throw fail(400, 'Write something first');
    run('insert into posts values(?,?,?,?,?,?,?,?)', uid(), lecture.id, body.segment_id || null, user.id, body.anonymous ? 1 : 0, text, body.parent_id || null, now());
    return posts(lecture.id, user);
  });

  // ---- what gets in the way, and the strategy suggested for each -------
  on('GET', '/api/strategies', ({ user }) => {
    const sharing = new Map(q(`select * from users where role='student'`).filter(shares).map((u) => [u.id, u]));
    const uses = q('select * from strategy_use where helpful is not null').filter((x) => sharing.has(x.user_id));
    const mine = Object.fromEntries(q('select * from strategy_use where user_id=?', user.id).map((u) => [u.strategy_id, u]));
    const picked = JSON.parse(user.struggles || '[]');
    return {
      min_group: MIN_GROUP,
      picked: DETAILS.filter((d) => picked.includes(d.key)).map((d) => {
        const tried = uses.filter((x) => x.strategy_id === d.key);
        const { setting: _setting, ...strategy } = d.strategy;
        return {
          key: d.key, label: d.label, area: d.area, strategy,
          active: mine[d.key] ? !!mine[d.key].active : false, helpful: mine[d.key]?.helpful ?? null,
          stat: tried.length >= MIN_GROUP ? { tried: tried.length, helped: Math.round((100 * tried.filter((x) => x.helpful).length) / tried.length), demo: tried.some((x) => sharing.get(x.user_id).synthetic) } : null,
        };
      }),
    };
  });
  on('POST', '/api/strategies/:id', ({ user, params, body }) => {
    const d = DETAILS.find((x) => x.key === params.id);
    if (!d) throw fail(404, 'Not found');
    run('insert into strategy_use values(?,?,?,?) on conflict(user_id,strategy_id) do update set active=excluded.active, helpful=excluded.helpful', user.id, d.key, body.active ? 1 : 0, body.helpful == null ? null : body.helpful ? 1 : 0);
    if (d.strategy.setting && body.active) run('update users set settings=? where id=?', JSON.stringify({ ...JSON.parse(user.settings || '{}'), ...d.strategy.setting }), user.id);
    return { ok: true, user: pub(one('select * from users where id=?', user.id)) };
  });

  // ---- instructor view: aggregates only, never individuals --------------
  on('GET', '/api/instructor/lectures/:id', ({ user, params }) => {
    if (user.role !== 'instructor') throw fail(403, 'Instructors only');
    const lecture = one('select * from lectures where id=? and owner_id is null', params.id);
    if (!lecture) throw fail(404, 'Lecture not found');
    const segs = segsOf(lecture.id);
    const sharing = new Map(q(`select * from users where role='student'`).filter(shares).map((u) => [u.id, u]));
    const marks = q(`select m.*, s.concept from marks m join segments s on s.id=m.segment_id where m.lecture_id=? and m.kind!='comment'`, lecture.id).filter((m) => sharing.has(m.user_id));
    const firsts = q('select user_id, passed from attempts where lecture_id=? and first_try=1', lecture.id).filter((a) => sharing.has(a.user_id));
    const class_size = sharing.size;
    const people = (ms) => new Set(ms.map((m) => m.user_id)).size;
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
    const concepts = [...new Set(segs.map((s) => s.concept))].map((c) => {
      const ms = marks.filter((m) => m.concept === c);
      const n = people(ms);
      const first = segs.find((s) => s.concept === c);
      const base = { concept: c, title: CONCEPTS[c]?.title || `Part ${c.replace('part-', '')}`, t_start: first.t_start };
      if (n < MIN_GROUP) return { ...base, suppressed: true };
      const tried = ms.filter((m) => m.first_try_pass != null);
      const qs = {};
      for (const m of ms) if (m.kind === 'question' && m.body) qs[m.body] = (qs[m.body] || 0) + 1;
      return {
        ...base, students: n, share: pct(n, class_size),
        repaired: pct(ms.filter((m) => m.status === 'repaired').length, ms.length),
        first_try: tried.length >= MIN_GROUP ? pct(tried.filter((m) => m.first_try_pass).length, tried.length) : null,
        questions: people(ms.filter((m) => m.kind === 'question')) >= MIN_GROUP ? Object.entries(qs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([text, count]) => ({ text, count })) : [],
      };
    });
    return {
      lecture, class_size, min_group: MIN_GROUP,
      problems: q('select id, question, answer from problems where lecture_id=? order by created_at, id', lecture.id),
      practice: people(firsts) >= MIN_GROUP ? { students: people(firsts), first_try: pct(firsts.filter((a) => a.passed).length, firsts.length) } : null, demo: [...sharing.values()].some((u) => u.synthetic), concepts,
      segments: segs.map((s) => {
        const n = people(marks.filter((m) => m.segment_id === s.id));
        return { id: s.id, idx: s.idx, t_start: s.t_start, text: s.text, concept: s.concept, students: n >= MIN_GROUP ? n : null };
      }),
      posts: posts(lecture.id, user),
    };
  });

  // ---- http plumbing ---------------------------------------------------
  const dist = path.join(here, '..', 'dist');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };

  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if (!url.pathname.startsWith('/api/')) {
      let file = path.join(dist, path.normalize(url.pathname));
      if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
      if (!fs.existsSync(file)) return send(404, { error: 'Run "npm run build" first, or use "npm run dev".' });
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
    try {
      for (const r of routes) {
        const m = r.method === req.method && url.pathname.match(r.re);
        if (!m) continue;
        let user = null;
        if (!r.open) {
          const token = (req.headers.authorization || '').replace(/^Bearer /, '');
          user = token && one('select * from users where token=? and synthetic=0', token);
          if (!user) throw fail(401, 'Please sign in again');
        }
        let body = {};
        if (req.method !== 'GET') {
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 2e6) throw fail(413, 'That is too large'); }
          if (raw) { try { body = JSON.parse(raw); } catch { throw fail(400, 'Bad request'); } }
        }
        return send(200, await r.fn({ user, body, params: m.groups || {} }));
      }
      send(404, { error: 'Not found' });
    } catch (e) {
      if (!e.status) console.error(e);
      send(e.status || 500, { error: e.status ? e.message : 'Something went wrong on our side' });
    }
  };
}

export const createApp = (db) => http.createServer(createHandler(db));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  createApp().listen(port, () => console.log(`Bridgeway server on http://localhost:${port}  (tutor: ${ai.aiMode()})`));
}
