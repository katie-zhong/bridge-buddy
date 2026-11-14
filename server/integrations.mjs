// Campus integration boundary.
//
// The pilot connects three systems. Each is reached through one function here, so the
// rest of the app never knows where a transcript or a deadline came from. Today these
// are fed by seeded demo data (content.mjs) and by transcript upload; the live
// connectors need Northbridge credentials and are the first item in the pilot plan.
//
//   Panopto      -> lecture recordings + caption files (WebVTT)   -> parseTranscript()
//   Brightspace  -> assignment, quiz and reading due dates        -> deadlines table
//                -> course syllabus: teaching team, office hours,
//                   Teams links, who to contact for what           -> parseSyllabus()
//   Read&Write   -> Texthelp licence from registered accommodations -> accommodations table
//                   (Accessibility Services), opt-in per student
//   Microsoft 365-> sign-in (Entra ID) and, opt-in, Outlook dates -> users / deadlines

const toSeconds = (t) => {
  const p = t.replace(',', '.').split(':').map(Number);
  return Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]);
};

// Accepts a Panopto caption export (WebVTT or SRT) or plain pasted text.
// Returns segments of roughly 30 seconds / 45 words so a flag points at a small passage.
export function parseTranscript(raw) {
  const cueRe = /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  const cues = [...raw.replace(/\r/g, '').matchAll(cueRe)].map((m) => ({
    t_start: toSeconds(m[1]), t_end: toSeconds(m[2]), text: m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  })).filter((c) => c.text);

  if (cues.length) {
    const out = [];
    for (const c of cues) {
      const last = out[out.length - 1];
      if (last && c.t_end - last.t_start <= 35 && last.text.split(' ').length < 60) {
        last.text += ' ' + c.text;
        last.t_end = c.t_end;
      } else out.push({ ...c });
    }
    return out;
  }

  const sentences = raw.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) || [];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    cur = (cur + ' ' + s).trim();
    if (cur.split(' ').length >= 40) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out.map((text, i) => ({ text, t_start: i * 30, t_end: i * 30 + 30 }));
}

// ---- Brightspace syllabus ---------------------------------------------------
const ROLES = [
  { key: 'instructor', re: /course instructor/i, label: 'Course instructor' },
  { key: 'ta', re: /teaching assistant/i, label: 'Teaching assistant' },
  { key: 'isa', re: /instructional support assistant/i, label: 'Instructional support assistant' },
];
const roleOf = (text) => ROLES.find((r) => r.re.test(text));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const section = (text, title) => {
  const m = text.match(new RegExp(`^${title}\\s*$([\\s\\S]*?)(?=^[A-Z][A-Z ]+$|(?![\\s\\S]))`, 'm'));
  return m ? m[1].trim().split('\n').map((l) => l.trim()).filter(Boolean) : [];
};

// Reads the teaching team, office hours (with Microsoft Teams links) and the "who to contact"
// rules out of a syllabus. Lines it does not understand are skipped, never guessed at.
export function parseSyllabus(text) {
  const team = section(text, 'TEACHING TEAM').flatMap((line) => {
    const m = line.match(/^(.+?):\s*(.+?)\s*<([^>\s]+@[^>\s]+)>$/);
    const r = m && roleOf(m[1]);
    return r ? [{ role: r.key, role_label: r.label, name: m[2], email: m[3] }] : [];
  });
  const office_hours = section(text, 'OFFICE HOURS').flatMap((line) => {
    const m = line.match(/^(.+?):\s*(\w+)\s+(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2}),?\s*(?:Microsoft Teams\s+)?(https:\/\/teams\.microsoft\.com\/\S+)?/);
    const day = m && DAYS.findIndex((d) => d.toLowerCase() === m[2].toLowerCase());
    if (!m || day < 0) return [];
    const who = team.find((t) => t.name === m[1]);
    return [{ name: m[1], role: who?.role ?? null, day, start: m[3], end: m[4], teams_url: m[5] ?? null }];
  });
  const routing = section(text, 'WHO TO CONTACT').flatMap((line) => {
    const m = line.match(/^(.+?):\s*(.+)$/);
    const r = m && roleOf(m[2]);
    return r ? [{ topic: m[1], role: r.key, rule: line }] : [];
  });
  return { team, office_hours, routing };
}
