import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { COURSES, LECTURES, DEADLINES, DETAILS } from './content.mjs';

export const DAY = 86400;
export const now = () => Math.floor(Date.now() / 1000);
export const uid = () => randomUUID().slice(0, 13);

// Bump when SCHEMA or the seed changes shape. An older database holds demo data only
// (see CLAUDE.md rule 5), so it is dropped and seeded again.
const VERSION = 4;
const SET_VERSION = 'pragma user_version = 4';
const DROP = ['users', 'courses', 'lectures', 'segments', 'marks', 'recalls', 'cards', 'problems', 'attempts', 'planks', 'notes', 'deadlines', 'posts', 'strategy_use', 'accommodations', 'rw_highlights']
  .map((t) => `drop table if exists ${t};`).join('\n');

const SCHEMA = `
create table if not exists users(id text primary key, name text, role text, token text unique, settings text default '{}', struggles text default '[]', synthetic int default 0, created_at int);
create table if not exists courses(id text primary key, code text, title text, exam_label text, exam_at int, theme text);
create table if not exists lectures(id text primary key, course_id text, title text, held_at int, source text, seg_seconds int, live_demo int default 0, owner_id text);
create table if not exists segments(id text primary key, lecture_id text, idx int, t_start int, t_end int, text text, concept text);
create index if not exists seg_lecture on segments(lecture_id, idx);
create table if not exists marks(id text primary key, user_id text, lecture_id text, segment_id text, kind text, body text, answer text, level text, status text default 'open', note_line text, tries int default 0, first_try_pass int, created_at int, repaired_at int);
create index if not exists marks_user on marks(user_id, lecture_id);
create index if not exists marks_seg on marks(segment_id);
create table if not exists problems(id text primary key, lecture_id text, question text, answer text, keywords text default '[]', segment_id text, author_id text, created_at int);
create index if not exists problems_lecture on problems(lecture_id);
create table if not exists attempts(id text primary key, user_id text, lecture_id text, problem_id text, passed int, first_try int, created_at int);
create index if not exists attempts_user on attempts(user_id, lecture_id);
create table if not exists planks(user_id text, lecture_id text, level int default 0, renovated_at int, primary key(user_id, lecture_id));
create table if not exists notes(user_id text, lecture_id text, body text default '', summary text, primary key(user_id, lecture_id));
create table if not exists deadlines(id text primary key, course_id text, title text, due_at int, source text, kind text, detail text, weight int, covers text default '[]');
create table if not exists posts(id text primary key, lecture_id text, segment_id text, user_id text, anonymous int, body text, parent_id text, created_at int);
create table if not exists strategy_use(user_id text, strategy_id text, active int default 1, helpful int, primary key(user_id, strategy_id));
create table if not exists accommodations(user_id text primary key, readwrite int default 0, source text);
create table if not exists rw_highlights(user_id text, lecture_id text, data text default '{}', primary key(user_id, lecture_id));
`;

// Small deterministic generator so the demo cohort is the same on every machine.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function openDb(path = process.env.NORBU_DB || 'norbu.db') {
  const db = new DatabaseSync(path);
  db.exec('pragma journal_mode = wal;');
  if (db.prepare('pragma user_version').get().user_version !== VERSION) {
    db.exec(DROP);
    db.exec(SCHEMA);
    seed(db);
    db.exec(SET_VERSION);
  }
  return db;
}

export function insertSegments(db, lectureId, texts, segSeconds, startIdx = 0) {
  const ins = db.prepare('insert into segments values(?,?,?,?,?,?,?)');
  texts.forEach((s, i) => {
    const idx = startIdx + i;
    const t0 = s.t_start ?? idx * segSeconds;
    ins.run(uid(), lectureId, idx, t0, s.t_end ?? t0 + segSeconds, s.text, s.concept || `part-${Math.floor(idx / 5) + 1}`);
  });
}

function seed(db) {
  const t = now();
  for (const c of COURSES) db.prepare('insert into courses values(?,?,?,?,?,?)').run(c.id, c.code, c.title, c.exam_label, t + c.exam_in_days * DAY, c.theme);
  const insProblem = db.prepare('insert into problems(id,lecture_id,question,answer,keywords,created_at) values(?,?,?,?,?,?)');
  for (const l of LECTURES) {
    // Lectures arrive on the bridge by themselves: in a pilot this row comes from Panopto.
    db.prepare('insert into lectures values(?,?,?,?,?,?,?,?)').run(l.id, l.course, l.title, t - l.days_ago * DAY, 'Panopto', l.seg_seconds, l.live_demo ? 1 : 0, null);
    insertSegments(db, l.id, l.segments, l.seg_seconds);
    l.problems.forEach((p, i) => insProblem.run(`${l.id}-p${i + 1}`, l.id, p.question, p.answer, JSON.stringify(p.keywords), t));
  }
  for (const d of DEADLINES) db.prepare('insert into deadlines values(?,?,?,?,?,?,?,?,?)').run(uid(), d.course, d.title, t + d.in_days * DAY, d.source, d.kind, d.detail, d.weight, JSON.stringify(d.covers));
  seedCohort(db, t);
  shareCohortFlags(db);
}

// A synthetic class of 84 students so that the aggregate views (instructor heatmap,
// "students who tried this") have something to show. Always labelled as demo data.
function seedCohort(db, t) {
  const r = rng(7);
  const flagRate = { demand: 0.07, shift: 0.19, equilibrium: 0.1, elasticity: 0.24, midpoint: 0.42, revenue: 0.27, 'opportunity-cost': 0.12, ppf: 0.16 };
  const segs = db.prepare('select * from segments order by lecture_id, idx').all();
  const problems = db.prepare('select * from problems').all();
  const insUser = db.prepare('insert into users(id,name,role,token,struggles,synthetic,created_at) values(?,?,?,?,?,1,?)');
  const insMark = db.prepare('insert into marks(id,user_id,lecture_id,segment_id,kind,body,status,tries,first_try_pass,created_at,repaired_at) values(?,?,?,?,?,?,?,?,?,?,?)');
  const insAttempt = db.prepare('insert into attempts values(?,?,?,?,?,?,?)');
  const insUse = db.prepare('insert into strategy_use values(?,?,1,?)');
  const questions = {
    midpoint: ['Why do we divide by the average and not the starting price?', 'Where does the 5 come from?', 'Is the answer always positive?'],
    revenue: ['How can revenue go up if fewer people buy?', 'Does this work for elastic goods too?'],
    elasticity: ['What counts as a big reaction?', 'Why is medicine inelastic?'],
    shift: ['How do I tell a shift from a movement on a graph?'],
  };
  db.exec('begin');
  for (let i = 0; i < 84; i++) {
    const id = `demo-${i}`;
    const mine = DETAILS.filter(() => r() < 0.2).map((d) => d.key);
    insUser.run(id, `Student ${i + 1}`, 'student', `demo-token-${i}`, JSON.stringify(mine), t - 20 * DAY);
    let lift = 0;
    for (const key of mine) {
      if (r() < 0.6) { insUse.run(id, key, r() < 0.74 ? 1 : 0); lift = Math.min(0.25, lift + 0.08); }
    }
    const seen = new Set();
    for (const s of segs) {
      const key = s.lecture_id + s.concept;
      if (seen.has(key) || r() > (flagRate[s.concept] || 0.12) / 3.2) continue;
      seen.add(key);
      const qs = questions[s.concept];
      const asked = qs && r() < 0.45;
      const repaired = r() < 0.74;
      const made = t - Math.floor(r() * 5 * DAY) - DAY;
      insMark.run(uid(), id, s.lecture_id, s.id, asked ? 'question' : 'flag', asked ? qs[Math.floor(r() * qs.length)] : null, repaired ? 'repaired' : 'open', repaired ? 1 + (r() < 0.35 ? 1 : 0) : 0, repaired ? (r() < 0.5 + lift ? 1 : 0) : null, made, repaired ? made + DAY : null);
    }
    for (const p of problems) {
      if (r() > 0.45) continue;
      const first = r() < 0.52 + lift ? 1 : 0;
      insAttempt.run(uid(), id, p.lecture_id, p.id, first, 1, t - Math.floor(r() * 6 * DAY));
      if (!first && r() < 0.7) insAttempt.run(uid(), id, p.lecture_id, p.id, 1, 0, t - Math.floor(r() * 2 * DAY));
    }
  }
  db.exec('commit');
}

// Sharing flags with the instructor is opt-in. About two thirds of the synthetic cohort opted in,
// so the class view has something to show. Idempotent: only touches synthetic users with no settings
// (also upgrades demo databases created before this setting existed).
function shareCohortFlags(db) {
  const users = db.prepare(`select id from users where synthetic=1 and (settings is null or settings='{}')`).all();
  const set = db.prepare('update users set settings=? where id=?');
  for (const u of users) set.run(JSON.stringify({ shareFlags: Number(u.id.replace('demo-', '')) % 3 !== 0 }), u.id);
}
