// Norbu, the Bridgeway tutor. Calls Claude when credentials are present; otherwise answers from the
// seeded course content so the app still runs end to end ("offline tutor").
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { CONCEPTS } from './content.mjs';

const MODEL = process.env.NORBU_MODEL || 'claude-opus-5-5';
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;
export const aiMode = () => (client ? 'claude' : 'offline');

const stamp = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const transcript = (segs) => segs.map((s) => `[${stamp(s.t_start)}] ${s.text}`).join('\n');

const LEVELS = {
  hint: 'Support level: HINT. Give one or two short nudges that point the student toward the idea. Do not give the full explanation or any final answer.',
  example: 'Support level: WORKED EXAMPLE. Explain the idea in a few plain sentences, then show one concrete worked example with different numbers or a different situation from the lecture.',
  walkthrough: 'Support level: FULL WALKTHROUGH. Explain step by step in numbered steps, then one concrete example. Say why each step is done.',
};

const SYSTEM = `You are Norbu, a friendly bridge troll who tutors first-year students at Northbridge University in the Bridgeway app. Many of the students you help have learning differences such as dyslexia, dysgraphia, dyscalculia or ADHD, with or without a diagnosis. You never guess at or mention a diagnosis.

How you write:
- Plain words and short sentences. One idea per sentence. Define any term the first time you use it.
- Short paragraphs or numbered steps. Use **bold** only for the one or two key terms.
- For calculations, put each step on its own line and say what the step does.
- Be warm and brief. No filler, no praise for asking.

How you teach:
- Ground everything in the lecture transcript you are given. When you rely on a part of it, cite the time like [12:30] so the student can check the source.
- If the lecture does not cover the question, say so plainly, then give a short general answer marked as "beyond this lecture".
- You help students understand. You do not complete graded work. If a student asks you to solve an assignment or quiz question for them, explain the method with a different example and invite them to try theirs.
- If the transcript looks garbled at some point (it is machine-transcribed), say what you think was meant.`;

async function text(user, effort = 'low') {
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') return 'I can\'t help with that one. Try asking about the lecture in a different way.';
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

async function structured(user, schema) {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: zodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  if (!res.parsed_output) throw new Error('The tutor returned no usable answer.');
  return res.parsed_output;
}

// Runs the Claude path, and if it fails, falls back to the offline tutor and reports why.
async function withFallback(online, offline) {
  if (!client) return { ...offline(), ai: 'offline' };
  try {
    return { ...(await online()), ai: 'claude' };
  } catch (e) {
    console.error('Claude call failed:', e?.status || '', e?.message);
    return { ...offline(), ai: 'offline', ai_error: e instanceof Anthropic.APIError ? `Claude API error ${e.status ?? ''}`.trim() : 'Claude call failed' };
  }
}

const concept = (seg) => CONCEPTS[seg?.concept];
const offlineExplain = (seg, level) => {
  const c = concept(seg);
  if (!c) return `The offline tutor only knows the demo lecture. Here is the passage again, at [${stamp(seg.t_start)}]:\n\n"${seg.text}"\n\nAdd a Claude API key on the server for a full explanation.`;
  const body = level === 'hint' ? c.hint : level === 'walkthrough' ? `${c.walkthrough}\n\n**Example:** ${c.example}` : c.example;
  return `**${c.title}** (from [${stamp(seg.t_start)}])\n\n${body}`;
};

export function ask({ lectureTitle, segs, seg, question, level }) {
  return withFallback(
    async () => ({
      text: await text(`Lecture: ${lectureTitle}\n\nTranscript so far (the student is in the lecture right now, at the last line):\n${transcript(segs)}\n\nThe student's question, asked at [${stamp(seg.t_start)}]:\n${question}\n\n${LEVELS[level] || LEVELS.example}\nKeep it under 120 words so they can get back to listening.`),
    }),
    () => ({ text: offlineExplain(seg, level) }),
  );
}

export function explain({ lectureTitle, segs, seg, level, question }) {
  return withFallback(
    async () => ({
      text: await text(`Lecture: ${lectureTitle}\n\nTranscript:\n${transcript(segs)}\n\nThe student flagged that they got lost at [${stamp(seg.t_start)}]: "${seg.text}"${question ? `\nTheir note: ${question}` : ''}\n\nExplain what this part of the lecture is saying.\n${LEVELS[level] || LEVELS.example}`),
    }),
    () => ({ text: offlineExplain(seg, level) }),
  );
}

const Riddle = z.object({ question: z.string() });
export function riddle({ lectureTitle, segs, seg }) {
  return withFallback(
    () => structured(`Lecture: ${lectureTitle}\n\nTranscript:\n${transcript(segs)}\n\nThe student just reviewed the part at [${stamp(seg.t_start)}]: "${seg.text}"\n\nWrite one riddle: a single short question that checks whether they understand this idea, answerable in one to three sentences. Use a new situation or new numbers, not the lecture's own example. It must not be answerable by copying a sentence from the transcript.`, Riddle),
    () => ({ question: concept(seg)?.riddle || `In your own words, what is this part of the lecture saying? "${seg.text.slice(0, 140)}..."` }),
  );
}

const Grade = z.object({
  passed: z.boolean(),
  feedback: z.string(),
  note_line: z.string(),
  card_front: z.string(),
  card_back: z.string(),
});
export function grade({ lectureTitle, segs, seg, question, answer }) {
  return withFallback(
    () => structured(`Lecture: ${lectureTitle}\n\nTranscript:\n${transcript(segs)}\n\nThe idea being checked is from [${stamp(seg.t_start)}]: "${seg.text}"\n\nRiddle: ${question}\nStudent's answer: ${answer}\n\nGrade for understanding of the idea only. Ignore spelling, grammar and handwriting-style slips: many of these students have dyslexia or dysgraphia. A short correct answer passes.\n- passed: true if the core idea is right.\n- feedback: two or three short sentences spoken to the student. If passed, confirm what they got right. If not, say what is missing and give a nudge, without giving the full answer.\n- note_line: one plain sentence stating the idea, to add to the student's notes.\n- card_front / card_back: one flashcard on this idea.`, Grade),
    () => {
      const c = concept(seg);
      const a = answer.toLowerCase();
      const words = a.split(/\s+/).filter(Boolean).length;
      const passed = c ? c.keywords.some((k) => a.includes(k)) && words >= 3 : words >= 12;
      return {
        passed,
        feedback: passed ? 'Yes, that is the idea. (Checked by the offline tutor, which looks for key terms.)' : `Not quite yet. ${c ? c.hint : 'Try explaining it in a full sentence or two.'}`,
        note_line: c?.note || seg.text.split('. ')[0] + '.',
        card_front: c?.card[0] || 'Explain this idea from the lecture.',
        card_back: c?.card[1] || seg.text,
      };
    },
  );
}

const Cards = z.object({ cards: z.array(z.object({ front: z.string(), back: z.string() })) });
export function flashcards({ lectureTitle, segs }) {
  return withFallback(
    () => structured(`Lecture: ${lectureTitle}\n\nTranscript:\n${transcript(segs)}\n\nWrite 5 to 8 flashcards covering the key ideas of this lecture. Fronts are short questions. Backs are one or two plain sentences.`, Cards),
    () => ({ cards: [...new Set(segs.map((s) => s.concept))].map((k) => CONCEPTS[k]).filter(Boolean).map((c) => ({ front: c.card[0], back: c.card[1] })) }),
  );
}

export function summary({ lectureTitle, segs, notes, lines }) {
  return withFallback(
    async () => ({
      text: await text(`Lecture: ${lectureTitle}\n\nTranscript:\n${transcript(segs)}\n\nThe student's own notes:\n${notes || '(none)'}\n\nIdeas the student got stuck on and then repaired:\n${lines.join('\n') || '(none)'}\n\nWrite a clean one-page summary of this lecture for this student: a heading per idea, two or three short bullet points under each, with the [mm:ss] time where it was taught. Give extra room to the ideas they got stuck on. End with a short "Check yourself" list of three questions without answers.`, 'medium'),
    }),
    () => ({
      text: [...new Set(segs.map((s) => s.concept))].map((k) => {
        const c = CONCEPTS[k];
        const first = segs.find((s) => s.concept === k);
        return c ? `**${c.title}** [${stamp(first.t_start)}]\n- ${c.note}` : `**${k}** [${stamp(first.t_start)}]\n- ${first.text}`;
      }).join('\n\n') + (lines.length ? `\n\n**Planks you repaired**\n${lines.map((l) => `- ${l}`).join('\n')}` : ''),
    }),
  );
}
