import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.mjs';
import { createApp } from './index.mjs';
import { parseSyllabus, parseTranscript } from './integrations.mjs';

const server = createApp(openDb(':memory:'));
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/api`;
const call = async (token, path, method = 'GET', body) => {
  const res = await fetch(base + path, { method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
};
const login = async (name, role) => (await call(null, '/login', 'POST', { name, role })).data.token;
test.after(() => server.close());

test('flag, mend with a riddle, then a delayed recall is scheduled', async () => {
  const t = await login('Maya');
  const { data: lec } = await call(t, '/lectures/econ101-l4');
  const seg = lec.segments.find((s) => s.concept === 'midpoint');
  const { data: mark } = await call(t, '/marks', 'POST', { lecture_id: lec.lecture.id, segment_id: seg.id, kind: 'flag' });
  let home = (await call(t, '/home')).data;
  assert.equal(home.planks.find((p) => p.concept === 'midpoint').state, 'gap');

  const riddle = (await call(t, `/marks/${mark.id}/riddle`, 'POST')).data;
  assert.ok(riddle.question);
  const wrong = (await call(t, `/marks/${mark.id}/answer`, 'POST', { question: riddle.question, answer: 'no idea sorry' })).data;
  assert.equal(wrong.passed, false);
  const right = (await call(t, `/marks/${mark.id}/answer`, 'POST', { question: riddle.question, answer: 'both changes are 40 percent so elasticity is 1' })).data;
  assert.equal(right.passed, true);

  home = (await call(t, '/home')).data;
  assert.equal(home.planks.find((p) => p.concept === 'midpoint').state, 'mended');
  assert.equal(home.recalls.length, 1);
  assert.ok(home.recalls[0].due_at > Date.now() / 1000 + 6 * 86400);
  assert.equal(home.streak.days, 1);

  // Answering early is practice only: the real check stays scheduled.
  const early = (await call(t, `/recalls/${home.recalls[0].id}/answer`, 'POST', { answer: 'it is 1, unit elastic, 40 over 40' })).data;
  assert.equal(early.early, true);
  home = (await call(t, '/home')).data;
  assert.equal(home.recalls.length, 1);
  assert.equal(home.planks.find((p) => p.concept === 'midpoint').state, 'mended');
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

test('picking a struggle switches on its starter strategy once, and bad settings are refused', async () => {
  const t = await login('Ola');
  const me = (await call(t, '/me', 'PATCH', { struggles: ['attention', 'reading'] })).data;
  assert.equal(me.settings.checkpoints, true); // attention starter: ten-minute checkpoints
  assert.equal(me.settings.readAloud, true); // reading starter: listen while you read
  let active = (await call(t, '/strategies')).data.strategies.filter((s) => s.active).map((s) => s.id);
  assert.deepEqual(active.sort(), ['checkpoints', 'listen']);

  // Turning a starter off sticks: re-picking the struggle does not switch it back on.
  await call(t, '/strategies/checkpoints', 'POST', { active: false });
  await call(t, '/me', 'PATCH', { struggles: ['reading'] });
  await call(t, '/me', 'PATCH', { struggles: ['reading', 'attention'] });
  active = (await call(t, '/strategies')).data.strategies.filter((s) => s.active).map((s) => s.id);
  assert.deepEqual(active, ['listen']);

  // With recommendations off, nothing is switched on.
  await call(t, '/me', 'PATCH', { settings: { recs: false } });
  await call(t, '/me', 'PATCH', { struggles: ['reading', 'attention', 'numbers'] });
  assert.ok(!(await call(t, '/strategies')).data.strategies.find((s) => s.id === 'worked').active);

  const ok = await call(t, '/me', 'PATCH', { settings: { replaySpeed: true, speed: 1.25, wordHighlight: true } });
  assert.equal(ok.data.settings.speed, 1.25);
  assert.equal((await call(t, '/me', 'PATCH', { settings: { speed: 9 } })).status, 400);
  assert.equal((await call(t, '/me', 'PATCH', { settings: { isAdmin: true } })).status, 400);
});

test('syllabus pull: team, office hours with Teams links, and who to contact', async () => {
  const t = await login('Rin');
  const { data } = await call(t, '/course');
  assert.equal(data.source, 'Brightspace');
  assert.deepEqual(data.team.map((p) => p.role), ['instructor', 'ta', 'isa']);
  assert.ok(data.office_hours.length >= 3 && data.office_hours.every((o) => o.teams_url.startsWith('https://teams.microsoft.com/')));
  assert.equal(data.routing.find((r) => /extensions/i.test(r.topic)).role, 'isa');
  // The parser skips lines it does not understand instead of guessing.
  const odd = parseSyllabus('TEACHING TEAM\nLibrarian: Sam <s@x.example>\nTeaching assistant: Ana <ana@x.example>\n\nOFFICE HOURS\nAna: Someday 10:00-11:00\nAna: Monday 9:00-10:00');
  assert.deepEqual(odd.team.map((p) => p.name), ['Ana']);
  assert.equal(odd.office_hours.length, 1);
  assert.equal(odd.office_hours[0].teams_url, null);
});

test('Read&Write: only a licensed student can save highlights, and only valid ones', async () => {
  const t = await login('Kai');
  const lec = 'econ101-l4';
  assert.equal((await call(t, `/lectures/${lec}`)).data.readwrite.licensed, false);
  assert.equal((await call(t, `/lectures/${lec}/readwrite`, 'PUT', { highlights: { 'Demand slopes down.': 'key' } })).status, 403);
  await call(t, '/integrations/readwrite/demo', 'POST', { licensed: true });
  assert.equal((await call(t, '/integrations')).data.readwrite.licensed, true);
  assert.equal((await call(t, `/lectures/${lec}/readwrite`, 'PUT', { highlights: { 'Demand slopes down.': 'key' } })).status, 200);
  assert.deepEqual((await call(t, `/lectures/${lec}`)).data.readwrite.highlights, { 'Demand slopes down.': 'key' });
  assert.equal((await call(t, `/lectures/${lec}/readwrite`, 'PUT', { highlights: { x: 'purple' } })).status, 400);
  const teacher = await login('Prof', 'instructor');
  assert.equal((await call(teacher, '/integrations/readwrite/demo', 'POST', { licensed: true })).status, 403);
});
