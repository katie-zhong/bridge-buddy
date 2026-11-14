import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { COURSE, LECTURES, DEADLINES, STRATEGIES, STRUGGLES } from './content.mjs';

export const DAY = 86400;
export const now = () => Math.floor(Date.now() / 1000);
export const uid = () => randomUUID().slice(0, 13);

const SCHEMA = `
create table if not exists users(id text primary key, name text, role text, token text unique, settings text default '{}', struggles text default '[]', synthetic int default 0, created_at int);
create table if not exists courses(id text primary key, code text, title text, exam_label text, exam_at int);
create table if not exists lectures(id text primary key, course_id text, title text, held_at int, source text, seg_seconds int, live_demo int default 0, owner_id text);
create table if not exists segments(id text primary key, lecture_id text, idx int, t_start int, t_end int, text text, concept text);
create index if not exists seg_lecture on segments(lecture_id, idx);
create table if not exists marks(id text primary key, user_id text, lecture_id text, segment_id text, kind text, body text, answer text, level text, status text default 'open', note_line text, tries int default 0, first_try_pass int, created_at int, repaired_at int);
create index if not exists marks_user on marks(user_id, lecture_id);
create index if not exists marks_seg on marks(segment_id);
create table if not exists recalls(id text primary key, user_id text, mark_id text, question text, due_at int, done_at int, passed int, early int default 0, answer text, feedback text);
create table if not exists cards(id text primary key, user_id text, lecture_id text, mark_id text, front text, back text, box int default 0, due_at int);
create table if not exists notes(user_id text, lecture_id text, body text default '', summary text, primary key(user_id, lecture_id));
create table if not exists deadlines(id text primary key, course text, title text, due_at int, source text, kind text);
create table if not exists posts(id text primary key, lecture_id text, segment_id text, user_id text, anonymous int, body text, parent_id text, created_at int);
create table if not exists strategy_use(user_id text, strategy_id text, active int default 1, helpful int, primary key(user_id, strategy_id));
`;

// Small deterministic generator so the demo cohort is the same on every machine.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function openDb(path = process.env.NORBU_DB || 'norbu.db') {
  const db = new DatabaseSync(path);
  db.exec('pragma journal_mode = wal;');
  db.exec(SCHEMA);
  if (!db.prepare('select 1 from courses').get()) seed(db);
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
  db.prepare('insert into courses values(?,?,?,?,?)').run(COURSE.id, COURSE.code, COURSE.title, COURSE.exam_label, t + COURSE.exam_in_days * DAY);
  for (const l of LECTURES) {
    db.prepare('insert into lectures values(?,?,?,?,?,?,?,?)').run(l.id, COURSE.id, l.title, t - l.days_ago * DAY, 'Panopto', l.seg_seconds, l.live_demo ? 1 : 0, null);
    insertSegments(db, l.id, l.segments, l.seg_seconds);
  }
  for (const d of DEADLINES) db.prepare('insert into deadlines values(?,?,?,?,?,?)').run(uid(), d.course, d.title, t + d.in_days * DAY, d.source, d.kind);
  seedCohort(db, t);
}

// A synthetic class of 84 students so that the aggregate views (instructor heatmap,
// "what helped students like you") have something to show. Always labelled as demo data.
function seedCohort(db, t) {
  const r = rng(7);
  const flagRate = { demand: 0.07, shift: 0.19, equilibrium: 0.1, elasticity: 0.24, midpoint: 0.42, revenue: 0.27, 'opportunity-cost': 0.12, ppf: 0.16 };
  const segs = db.prepare('select * from segments order by lecture_id, idx').all();
  const insUser = db.prepare('insert into users(id,name,role,token,struggles,synthetic,created_at) values(?,?,?,?,?,1,?)');
  const insMark = db.prepare('insert into marks(id,user_id,lecture_id,segment_id,kind,body,status,tries,first_try_pass,created_at,repaired_at) values(?,?,?,?,?,?,?,?,?,?,?)');
  const insRecall = db.prepare('insert into recalls(id,user_id,mark_id,question,due_at,done_at,passed) values(?,?,?,?,?,?,?)');
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
    const mine = STRUGGLES.filter(() => r() < 0.3).map((s) => s.key);
    insUser.run(id, `Student ${i + 1}`, 'student', `demo-token-${i}`, JSON.stringify(mine), t - 20 * DAY);
    let lift = 0;
    for (const s of STRATEGIES) {
      if (mine.includes(s.struggle) && r() < 0.5) {
        insUse.run(id, s.id, r() < 0.8 ? 1 : 0);
        lift = Math.min(0.4, lift + s.lift * 1.5);
      }
    }
    const seen = new Set();
    for (const s of segs) {
      const key = s.lecture_id + s.concept;
      if (seen.has(key) || r() > (flagRate[s.concept] || 0.05) / 3.2) continue;
      seen.add(key);
      const mid = uid();
      const qs = questions[s.concept];
      const asked = qs && r() < 0.45;
      const repaired = r() < 0.74;
      const made = t - Math.floor(r() * 5 * DAY) - 8 * DAY;
      insMark.run(mid, id, s.lecture_id, s.id, asked ? 'question' : 'flag', asked ? qs[Math.floor(r() * qs.length)] : null, repaired ? 'repaired' : 'open', repaired ? 1 + (r() < 0.35 ? 1 : 0) : 0, repaired ? (r() < 0.5 + lift ? 1 : 0) : null, made, repaired ? made + DAY : null);
      if (repaired) insRecall.run(uid(), id, mid, '', made + 8 * DAY, made + 8 * DAY, r() < 0.48 + lift ? 1 : 0);
    }
  }
  db.exec('commit');
}
