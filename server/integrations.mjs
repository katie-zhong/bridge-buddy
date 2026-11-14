// Campus integration boundary.
//
// The pilot connects three systems. Each is reached through one function here, so the
// rest of the app never knows where a transcript or a deadline came from. Today these
// are fed by seeded demo data (content.mjs) and by transcript upload; the live
// connectors need Northbridge credentials and are the first item in the pilot plan.
//
//   Panopto      -> lecture recordings + caption files (WebVTT)   -> parseTranscript()
//   Brightspace  -> assignment, quiz and reading due dates        -> deadlines table
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
