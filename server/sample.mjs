// Demo only: starter progress for a new student account, so the map shows every material, rot
// and a gap without weeks of use. The UI labels it as demo data and Settings can clear it.
import { DAY, now, uid } from './db.mjs';

// Plank level (0 driftwood, 1 oak, 2 stone, 3 iron, 4 gold) for lectures the student "renovated".
const LEVELS = {
  'psyc100-l1': 4, 'psyc100-l2': 3, 'psyc100-l3': 2, 'psyc100-l4': 1,
  'econ101-l2': 2, 'math115-l3': 1, 'math115-l4': 2,
};
// Left alone on purpose, so they rot as newer lectures arrive: econ101-l1, math115-l1, math115-l2.
// econ101-l3 gets an open flag, and econ101-l4 (the live demo lecture) stays untouched.

export function clearProgress(db, userId) {
  for (const t of ['marks', 'attempts', 'planks']) db.prepare(`delete from ${t} where user_id=?`).run(userId);
}

export function applySample(db, userId) {
  clearProgress(db, userId);
  const t = now();
  const plank = db.prepare('insert into planks values(?,?,?,?)');
  for (const [lecture, level] of Object.entries(LEVELS)) plank.run(userId, lecture, level, t);

  // Two days of solved problems, so the streak counter is not zero.
  const attempt = db.prepare('insert into attempts values(?,?,?,?,?,?,?)');
  attempt.run(uid(), userId, 'psyc100-l1', 'psyc100-l1-p1', 1, 1, t - DAY);
  attempt.run(uid(), userId, 'psyc100-l1', 'psyc100-l1-p2', 1, 1, t - 2 * DAY);

  // An open gap in ECON 101 Lecture 3, on the production possibilities frontier.
  const seg = db.prepare(`select id from segments where lecture_id='econ101-l3' and concept='ppf' order by idx limit 1`).get();
  if (seg) {
    db.prepare(`insert into marks(id,user_id,lecture_id,segment_id,kind,status,created_at) values(?,?,?,?,'flag','open',?)`)
      .run(uid(), userId, 'econ101-l3', seg.id, t - 2 * DAY);
  }
}
