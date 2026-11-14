import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.mjs';
import { createApp } from './index.mjs';
import { parseTranscript } from './integrations.mjs';

const server = createApp(openDb(':memory:'));
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/api`;
const call = async (token, path, method = 'GET', body) => {
  const res = await fetch(base + path, { method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
};
const login = async (name, role) => (await call(null, '/login', 'POST', { name, role })).data.token;
test.after(() => server.close());

const plank = (home, id) => home.courses.flatMap((c) => c.planks).find((p) => p.lecture_id === id);

test('flag a gap, then mend it with a riddle', async () => {
  const t = await login('Maya');
  const { data: lec } = await call(t, '/lectures/econ101-l4');
  const seg = lec.segments.find((s) => s.concept === 'midpoint');
  const { data: mark } = await call(t, '/marks', 'POST', { lecture_id: lec.lecture.id, segment_id: seg.id, kind: 'flag' });
  let home = (await call(t, '/home')).data;
  assert.equal(plank(home, 'econ101-l4').open, 1);

  const riddle = (await call(t, `/marks/${mark.id}/riddle`, 'POST')).data;
  assert.ok(riddle.question);
  const wrong = (await call(t, `/marks/${mark.id}/answer`, 'POST', { question: riddle.question, answer: 'no idea sorry' })).data;
  assert.equal(wrong.passed, false);
  const right = (await call(t, `/marks/${mark.id}/answer`, 'POST', { question: riddle.question, answer: 'both changes are 40 percent so elasticity is 1' })).data;
  assert.equal(right.passed, true);

  home = (await call(t, '/home')).data;
  assert.equal(plank(home, 'econ101-l4').open, 0);
  assert.equal(home.streak.days, 1);
});

test('planks rot when newer lectures pile up, and working on one stops the rot', async () => {
  const t = await login('Rot');
  let home = (await call(t, '/home')).data;
  assert.equal(home.courses.length, 3);
  assert.equal(plank(home, 'math115-l1').rot, 2); // five newer lectures, never touched
  assert.equal(plank(home, 'math115-l3').rot, 1); // three newer lectures
  assert.equal(plank(home, 'math115-l6').rot, 0); // the newest

  const { data: lec } = await call(t, '/lectures/math115-l1');
  await call(t, '/marks', 'POST', { lecture_id: 'math115-l1', segment_id: lec.segments[0].id, kind: 'question', body: 'what is a vector?' });
  home = (await call(t, '/home')).data;
  assert.equal(plank(home, 'math115-l1').rot, 0);
});

test('renovating: passing the practice problems upgrades the plank, then the whole bridge', async () => {
  const t = await login('Reno');
  const practice = async (id) => (await call(t, `/lectures/${id}/practice`)).data;
  const solve = (pid, answer) => call(t, `/problems/${pid}/answer`, 'POST', { answer }).then((r) => r.data);

  let p = await practice('psyc100-l1');
  assert.equal(p.need, 2);
  assert.equal(p.level, 0);
  assert.equal((await call(t, `/problems/${p.problems[0].id}/answer`, 'POST', { answer: '' })).status, 400);
  const miss = await solve('psyc100-l1-p1', 'no idea');
  assert.equal(miss.passed, false);
  assert.equal(miss.model_answer, null); // the answer is never handed over on a miss
  const one = await solve('psyc100-l1-p1', 'the population, bigger towns have more of both');
  assert.equal(one.passed, true);
  assert.equal(one.renovated, false);
  const two = await solve('psyc100-l1-p2', 'it keeps the groups even so only the change explains it');
  assert.equal(two.renovated, true);
  assert.equal(two.level, 1);
  assert.equal(two.bridge_level, null); // the other PSYC planks are still driftwood

  const answers = { 'psyc100-l2': ['dendrites receive, the axon sends', 'it either fires fully or not at all'], 'psyc100-l3': ['the can opener sound', 'the response fades, extinction'], 'psyc100-l4': ['retrieval failed', 'self testing with flashcards'] };
  let last;
  for (const [id, [a, b]] of Object.entries(answers)) { await solve(`${id}-p1`, a); last = await solve(`${id}-p2`, b); }
  assert.equal(last.renovated, true);
  assert.equal(last.bridge_level, 1); // every PSYC plank is now oak

  const home = (await call(t, '/home')).data;
  assert.ok(home.courses.find((c) => c.id === 'psyc100').planks.every((x) => x.level === 1 && x.rot === 0));
  p = await practice('psyc100-l1');
  assert.equal(p.done, 0); // the next renovation starts from scratch
});

test('instructors set the practice problems; students cannot', async () => {
  const student = await login('Sam');
  const prof = await login('Dr. Okafor', 'instructor');
  const body = { question: 'Define a shortage in one sentence.', answer: 'Buyers want more than sellers offer at that price.' };
  assert.equal((await call(student, '/lectures/econ101-l4/problems', 'POST', body)).status, 403);
  assert.equal((await call(prof, '/lectures/econ101-l4/problems', 'POST', { question: 'x', answer: '' })).status, 400);
  const added = (await call(prof, '/lectures/econ101-l4/problems', 'POST', body)).data;
  assert.equal(added.length, 5);
  const mine = added.find((x) => x.question === body.question);
  const graded = (await call(student, `/problems/${mine.id}/answer`, 'POST', { answer: 'buyers want more than sellers offer' })).data;
  assert.equal(graded.passed, true);
  assert.equal((await call(student, `/problems/${mine.id}`, 'DELETE')).status, 403);
  assert.equal((await call(prof, `/problems/${mine.id}`, 'DELETE')).data.length, 4);
});

test('what gets in the way: picked details come back with their strategy', async () => {
  const t = await login('Pat');
  await call(t, '/me', 'PATCH', { struggles: ['num-steps', 'not-a-real-key'] });
  const { data } = await call(t, '/strategies');
  assert.equal(data.picked.length, 1);
  assert.equal(data.picked[0].strategy.title, 'Full walkthrough first');
  for (const s of data.picked) assert.ok(s.stat === null || s.stat.tried >= data.min_group);
  const used = (await call(t, '/strategies/num-steps', 'POST', { active: true })).data;
  assert.equal(used.user.settings.level, 'walkthrough');
});

test('students cannot see the instructor view, and small groups are hidden', async () => {
  const student = await login('Sam');
  assert.equal((await call(student, '/instructor/lectures/econ101-l4')).status, 403);
  const prof = await login('Dr. Okafor', 'instructor');
  const { data } = await call(prof, '/instructor/lectures/econ101-l4');
  for (const s of data.segments) assert.ok(s.students === null || s.students >= data.min_group);
  for (const c of data.concepts) assert.ok(c.suppressed || c.students >= data.min_group);
  assert.ok(!JSON.stringify(data).includes('Student 1"'));
});

test('one student cannot read or change another student\'s marks', async () => {
  const a = await login('A'), b = await login('B');
  const { data: lec } = await call(a, '/lectures/econ101-l3');
  const { data: mark } = await call(a, '/marks', 'POST', { lecture_id: 'econ101-l3', segment_id: lec.segments[0].id, kind: 'flag' });
  assert.equal((await call(b, `/marks/${mark.id}`)).status, 404);
  assert.equal((await call(b, `/marks/${mark.id}`, 'DELETE')).status, 404);
  assert.equal((await call(null, '/home')).status, 401);
});

test('deleting an account removes its data', async () => {
  const t = await login('Gone');
  await call(t, '/lectures', 'POST', { title: 'Mine', transcript: 'One sentence here. And another one follows it.' });
  assert.equal((await call(t, '/me', 'DELETE')).data.deleted, true);
  assert.equal((await call(t, '/home')).status, 401);
});

test('transcripts: Panopto captions and plain text', () => {
  const vtt = parseTranscript('WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nHello there.\n\n00:00:06.000 --> 00:00:09.000\nMore words.\n\n00:01:10.000 --> 00:01:15.000\nLater on.');
  assert.equal(vtt.length, 2);
  assert.equal(vtt[0].text, 'Hello there. More words.');
  assert.equal(vtt[1].t_start, 70);
  assert.equal(parseTranscript('Just one short sentence.').length, 1);
  assert.equal(parseTranscript('   ').length, 0);
});
