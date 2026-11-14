import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, insertSegments, now, uid, DAY } from './db.mjs';
import * as ai from './ai.mjs';
import { CONCEPTS, STRATEGIES, STRUGGLES } from './content.mjs';
import { parseTranscript } from './integrations.mjs';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIN_GROUP = 5; // never show an aggregate about fewer than this many students
const BOXES = [0, 1, 3, 7, 14];

// Everything a student may change about their own profile. Unknown keys are rejected.
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
  const shares = (u) => JSON.parse(u.settings || '{}').shareAggregates !== false;
  const lectureFor = (id, user) => {
    const l = one('select * from lectures where id=?', id);
    if (!l || (l.owner_id && l.owner_id !== user.id)) throw fail(404, 'Lecture not found');
    return l;
  };
  const segsOf = (lectureId) => q('select * from segments where lecture_id=? order by idx', lectureId);
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
  function planks(user, courseId) {
    const lectures = q('select * from lectures where course_id=? and (owner_id is null or owner_id=?) order by held_at', courseId, user.id);
    const marks = q('select m.*, s.concept from marks m join segments s on s.id=m.segment_id where m.user_id=?', user.id);
    const proven = new Set(q('select mark_id from recalls where user_id=? and passed=1 and early=0', user.id).map((r) => r.mark_id));
    const out = [];
    for (const l of lectures) {
      const seen = new Map();
      for (const s of segsOf(l.id)) if (!seen.has(s.concept)) seen.set(s.concept, s);
      for (const [concept, first] of seen) {
        const mine = marks.filter((m) => m.lecture_id === l.id && m.concept === concept && m.kind !== 'comment');
        const repaired = mine.filter((m) => m.status === 'repaired');
        const state = mine.some((m) => m.status === 'open') ? 'gap' : !repaired.length ? 'plain' : repaired.every((m) => proven.has(m.id)) ? 'proven' : 'mended';
        out.push({ lecture_id: l.id, lecture: l.title, concept, title: CONCEPTS[concept]?.title || `Part ${concept.replace('part-', '')}`, t_start: first.t_start, state });
      }
    }
    return out;
  }

  function streak(user) {
    const stamps = [
      ...q('select repaired_at t from marks where user_id=? and repaired_at is not null', user.id),
      ...q('select done_at t from recalls where user_id=? and passed=1', user.id),
    ].map((r) => Math.floor(r.t / DAY));
    const days = new Set(stamps);
    let d = Math.floor(now() / DAY);
    if (!days.has(d)) d -= 1;
    let n = 0;
    while (days.has(d)) { n++; d--; }
    return { days: n, today: days.has(Math.floor(now() / DAY)) };
  }

  const markRow = `select m.*, s.text seg_text, s.t_start, s.idx, s.concept, l.title lecture from marks m join segments s on s.id=m.segment_id join lectures l on l.id=m.lecture_id`;
  const recallRow = `select r.*, s.t_start, s.concept, l.title lecture, m.lecture_id from recalls r join marks m on m.id=r.mark_id join segments s on s.id=m.segment_id join lectures l on l.id=m.lecture_id`;

  // ---- auth ------------------------------------------------------------
  on('POST', '/api/login', ({ body }) => {
    const name = String(body.name || '').trim().slice(0, 40);
    const role = body.role === 'instructor' ? 'instructor' : 'student';
    if (!name) throw fail(400, 'Please enter a name');
    const id = uid();
    const token = uid() + uid() + uid();
    run('insert into users(id,name,role,token,created_at) values(?,?,?,?,?)', id, name, role, token, now());
    return { token, user: pub(one('select * from users where id=?', id)) };
  }, { open: true });

  on('GET', '/api/home', ({ user }) => {
    const course = one('select * from courses limit 1');
    const lectures = q('select * from lectures where owner_id is null or owner_id=? order by held_at desc', user.id).map((l) => ({
      ...l,
      open: one(`select count(*) n from marks where user_id=? and lecture_id=? and status='open' and kind!='comment'`, user.id, l.id).n,
      segments: one('select count(*) n from segments where lecture_id=?', l.id).n,
    }));
    return {
      user: pub(user),
      ai: ai.aiMode(),
      course,
      lectures,
      planks: planks(user, course.id),
      streak: streak(user),
      open: q(`${markRow} where m.user_id=? and m.status='open' and m.kind!='comment' order by m.created_at`, user.id),
      recalls: q(`${recallRow} where r.user_id=? and r.done_at is null order by r.due_at`, user.id),
      cards_due: one('select count(*) n from cards where user_id=? and due_at<=?', user.id, now()).n,
      deadlines: q('select * from deadlines where due_at>? order by due_at', now() - DAY),
      struggles: STRUGGLES,
    };
  });

  // Starter strategy for a struggle: the one with the biggest week-later lift.
  const starter = (struggle) => STRATEGIES.filter((s) => s.struggle === struggle).sort((a, b) => b.lift - a.lift)[0];
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
      const next = struggles.filter((k, i) => STRUGGLES.some((s) => s.key === k) && struggles.indexOf(k) === i);
      run('update users set struggles=? where id=?', JSON.stringify(next), user.id);
      // A newly picked struggle switches on its starter strategy (and the setting it needs), unless
      // the student turned recommendations off or already made a choice for that struggle.
      const recsOn = JSON.parse(one('select settings from users where id=?', user.id).settings || '{}').recs !== false;
      for (const key of next.filter((k) => !before.includes(k))) {
        const s = starter(key);
        const decided = q('select strategy_id from strategy_use where user_id=?', user.id).some((u) => STRATEGIES.find((x) => x.id === u.strategy_id)?.struggle === key);
        if (!recsOn || !s || decided) continue;
        run('insert into strategy_use values(?,?,1,null)', user.id, s.id);
        if (s.setting) setSettings(user.id, s.setting);
      }
    }
    return pub(one('select * from users where id=?', user.id));
  });

  on('GET', '/api/export', ({ user }) => ({
    exported_at: new Date().toISOString(),
    profile: pub(user),
    marks: q('select * from marks where user_id=?', user.id),
    recalls: q('select * from recalls where user_id=?', user.id),
    cards: q('select * from cards where user_id=?', user.id),
    notes: q('select * from notes where user_id=?', user.id),
    posts: q('select * from posts where user_id=?', user.id),
    strategies: q('select * from strategy_use where user_id=?', user.id),
    lectures: q('select * from lectures where owner_id=?', user.id),
  }));

  on('DELETE', '/api/me', ({ user }) => {
    for (const l of q('select id from lectures where owner_id=?', user.id)) run('delete from segments where lecture_id=?', l.id);
    for (const t of ['marks', 'recalls', 'cards', 'notes', 'posts', 'strategy_use']) run(`delete from ${t} where user_id=?`, user.id);
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
      marks: q('select * from marks where user_id=? and lecture_id=? order by created_at', user.id, lecture.id),
      notes: one('select * from notes where user_id=? and lecture_id=?', user.id, lecture.id) || { body: '', summary: null },
      posts: posts(lecture.id, user),
    };
  });

  on('POST', '/api/lectures', ({ user, body }) => {
    const title = String(body.title || '').trim().slice(0, 120) || 'Untitled lecture';
    const course = one('select id from courses limit 1');
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

  on('POST', '/api/lectures/:id/cards', async ({ user, params }) => {
    const lecture = lectureFor(params.id, user);
    const segs = segsOf(lecture.id);
    if (!segs.length) throw fail(400, 'There is no transcript yet');
    const out = await ai.flashcards({ lectureTitle: lecture.title, segs });
    const have = new Set(q('select front from cards where user_id=?', user.id).map((c) => c.front));
    let added = 0;
    for (const c of out.cards) if (!have.has(c.front)) { run('insert into cards values(?,?,?,?,?,?,0,?)', uid(), user.id, lecture.id, null, c.front, c.back, now()); added++; }
    return { added, ai: out.ai, ai_error: out.ai_error };
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
    run('delete from recalls where mark_id=?', m.id);
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
      run('insert into recalls(id,user_id,mark_id,question,due_at) values(?,?,?,?,?)', uid(), user.id, m.id, String(body.question || ''), now() + 7 * DAY);
      run('insert into cards values(?,?,?,?,?,?,0,?)', uid(), user.id, m.lecture_id, m.id, out.card_front, out.card_back, now() + DAY);
    }
    return { passed: out.passed, feedback: out.feedback, note_line: out.passed ? out.note_line : null, ai: out.ai, ai_error: out.ai_error };
  });

  // ---- delayed recall and flashcards -----------------------------------
  on('GET', '/api/practice', ({ user }) => ({
    recalls: q(`${recallRow} where r.user_id=? and r.done_at is null order by r.due_at`, user.id),
    done: q(`${recallRow} where r.user_id=? and r.done_at is not null order by r.done_at desc limit 20`, user.id),
    cards: q('select * from cards where user_id=? order by due_at', user.id),
    now: now(),
  }));

  on('POST', '/api/recalls/:id/answer', async ({ user, params, body }) => {
    const r = one('select * from recalls where id=? and user_id=? and done_at is null', params.id, user.id);
    if (!r) throw fail(404, 'Not found');
    const answer = String(body.answer || '').trim();
    if (!answer) throw fail(400, 'Write or say an answer first');
    const m = one('select * from marks where id=?', r.mark_id);
    const out = await ai.grade({ ...ctx(m), question: r.question, answer });
    const early = r.due_at > now() ? 1 : 0;
    run('update recalls set done_at=?, passed=?, early=?, answer=?, feedback=? where id=?', now(), out.passed ? 1 : 0, early, answer, out.feedback, r.id);
    // Not there yet, or checked early: ask again later so the proof is a real delayed recall.
    if (!out.passed || early) run('insert into recalls(id,user_id,mark_id,question,due_at) values(?,?,?,?,?)', uid(), user.id, r.mark_id, r.question, out.passed ? r.due_at : now() + 2 * DAY);
    return { passed: out.passed, feedback: out.feedback, early: !!early, ai: out.ai, ai_error: out.ai_error };
  });

  on('POST', '/api/cards', ({ user, body }) => {
    const front = String(body.front || '').trim(), back = String(body.back || '').trim();
    if (!front || !back) throw fail(400, 'A card needs a front and a back');
    const id = uid();
    run('insert into cards values(?,?,?,?,?,?,0,?)', id, user.id, body.lecture_id || null, null, front.slice(0, 500), back.slice(0, 1000), now());
    return one('select * from cards where id=?', id);
  });
  on('POST', '/api/cards/:id/review', ({ user, params, body }) => {
    const c = one('select * from cards where id=? and user_id=?', params.id, user.id);
    if (!c) throw fail(404, 'Not found');
    const box = body.ok ? Math.min(c.box + 1, BOXES.length - 1) : 0;
    run('update cards set box=?, due_at=? where id=?', box, now() + BOXES[box] * DAY, c.id);
    return one('select * from cards where id=?', c.id);
  });
  on('DELETE', '/api/cards/:id', ({ user, params }) => { run('delete from cards where id=? and user_id=?', params.id, user.id); return { ok: true }; });

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

  // ---- what helped students like you -----------------------------------
  on('GET', '/api/strategies', ({ user }) => {
    const students = q(`select * from users where role='student'`).filter(shares);
    const uses = q('select * from strategy_use where active=1');
    const recalls = q('select user_id, passed from recalls where done_at is not null and early=0');
    const rate = (ids) => {
      const rs = recalls.filter((r) => ids.has(r.user_id));
      return rs.length ? Math.round((100 * rs.filter((r) => r.passed).length) / rs.length) : null;
    };
    const mine = Object.fromEntries(q('select * from strategy_use where user_id=?', user.id).map((u) => [u.strategy_id, u]));
    return {
      min_group: MIN_GROUP,
      strategies: STRATEGIES.map(({ lift, ...s }) => {
        const group = students.filter((u) => JSON.parse(u.struggles || '[]').includes(s.struggle));
        const used = new Set(group.filter((u) => uses.some((x) => x.user_id === u.id && x.strategy_id === s.id)).map((u) => u.id));
        const not = new Set(group.filter((u) => !used.has(u.id)).map((u) => u.id));
        const enough = used.size >= MIN_GROUP && not.size >= MIN_GROUP && rate(used) !== null && rate(not) !== null;
        return {
          ...s,
          active: !!mine[s.id]?.active, helpful: mine[s.id]?.helpful ?? null,
          stat: enough ? { used: used.size, with: rate(used), without: rate(not), demo: group.some((u) => u.synthetic) } : null,
        };
      }),
    };
  });
  on('POST', '/api/strategies/:id', ({ user, params, body }) => {
    const s = STRATEGIES.find((x) => x.id === params.id);
    if (!s) throw fail(404, 'Not found');
    run('insert into strategy_use values(?,?,?,?) on conflict(user_id,strategy_id) do update set active=excluded.active, helpful=excluded.helpful', user.id, s.id, body.active ? 1 : 0, body.helpful == null ? null : body.helpful ? 1 : 0);
    if (s.setting && body.active) run('update users set settings=? where id=?', JSON.stringify({ ...JSON.parse(user.settings || '{}'), ...s.setting }), user.id);
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
    const recalls = q('select r.mark_id, r.passed from recalls r where r.done_at is not null and r.early=0');
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
      const rs = recalls.filter((r) => ms.some((m) => m.id === r.mark_id));
      const qs = {};
      for (const m of ms) if (m.kind === 'question' && m.body) qs[m.body] = (qs[m.body] || 0) + 1;
      return {
        ...base, students: n, share: pct(n, class_size),
        repaired: pct(ms.filter((m) => m.status === 'repaired').length, ms.length),
        first_try: tried.length >= MIN_GROUP ? pct(tried.filter((m) => m.first_try_pass).length, tried.length) : null,
        recall: rs.length >= MIN_GROUP ? pct(rs.filter((r) => r.passed).length, rs.length) : null,
        questions: people(ms.filter((m) => m.kind === 'question')) >= MIN_GROUP ? Object.entries(qs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([text, count]) => ({ text, count })) : [],
      };
    });
    return {
      lecture, class_size, min_group: MIN_GROUP, demo: [...sharing.values()].some((u) => u.synthetic), concepts,
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
  createApp().listen(port, () => console.log(`Noor server on http://localhost:${port}  (tutor: ${ai.aiMode()})`));
}
