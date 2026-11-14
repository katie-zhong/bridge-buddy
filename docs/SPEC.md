# Bridgeway specification

> Source of truth for scope and decisions. Reconstructed from the code and README at commit
> `93bd2f2` plus the repository setup decisions of 2026-11-14. Items marked **(open)** need a
> decision from the team. When a change alters anything here, update this file in the same change.

## 1. Problem and audience

First-year students at Northbridge University (case: ProdCon 2026 "Learning Without Limits")
get lost during lectures and have no low-cost way to mark the moment, recover later, and
check that the recovery stuck. Many have learning differences (dyslexia, dysgraphia,
dyscalculia, ADHD), diagnosed or not. Instructors cannot see where a class got lost.

**Users:** students (primary), instructors (aggregate view only).

## 2. Core loop

1. **Flag** the moment you get lost in a lecture (one key: **F**), and keep listening.
2. **Mend** the gap later: see the source passage, get an explanation at a chosen level
   (Hint / Worked example / Full walkthrough), then answer a riddle in a new situation.
   Graded on understanding, not spelling.
3. **Renovate** a lecture's plank by solving its practice problems (set by the instructor).
   Each renovation rebuilds the plank in a stronger material.
4. **Come back** before it rots: a plank nobody has worked on decays as newer lectures arrive.

**The map.** Home is a top-down **forest with one lake per course**, and one bridge across each lake.
Hover a bridge to see its subject, weakest plank and exam; click it to open that bridge (`#/bridge/:course`),
where each lecture is one plank. Hover or focus a plank for the lecture and its actions. Lectures arrive on
the bridge by themselves (Panopto in a pilot; seeded in this build).

- **Material** (plank level 0 to 4): Driftwood → Oak → Stone → Iron → Gold. Passing
  `min(2, number of problems)` distinct practice problems since the last renovation raises
  the level by one. A bridge's level is its weakest plank; when that rises, the student
  gets a celebration.
- **Rot:** counted in newer lectures of the same course since the student last asked,
  flagged, mended or practised on that plank. Starting to rot at `3 + level`, rotten at
  `5 + level`. Any of those actions stops it. Rot is a prompt, not a penalty: no level is lost.
- **Gap:** an open flag or unanswered question shows as a hole on that lecture's plank.
- **Streak:** days in a row with a mended gap or a solved practice problem. Logging in does not count.

## 3. Features (current scope)

| Area | Behaviour |
|---|---|
| Sign-in | First name + role (student / instructor). Stand-in for Microsoft Entra ID. Name and role are remembered in the browser and prefilled. **Demo mode** switch: name optional ("Guest"), skips the login screen on later visits, and silently signs back in as the same person if the server forgot the session (e.g. Vercel cold start). Signing out turns demo mode off. In demo mode a **Student ⇄ Instructor** switch in the header flips between the two views as the same name (it signs in as that name with the other role). |
| Welcome (first visit) | Students only, once (`settings.onboarded`). (1) "What gets in the way?": six areas, each opening into three specific details; skippable. (2) Straight after: one suggested strategy per picked detail, with how and why, and a "Use this" switch. (3) A three-step tour (planks, press F, renovate). Replayable from Settings. |
| Map (home) | A forest with a lake and a bridge per course, a legend, and "Coming up". Hover a bridge for the subject; click to open it. On a bridge: hover, focus or tap a plank for the lecture title and date, material, rot, gaps, and buttons to renovate, mend a gap or open the lecture; "Add a lecture" (record live or bring a transcript) adds a plank. |
| Coming up | Every deadline from every source as a card: date, course, kind, weight, source, what it involves, and the planks it covers with their state (tap one to renovate it). |
| Lecture | Header timeline with a dot per idea that has a gap (red) or was patched (amber) and a ring for where you are; flagged passages tinted red with a flag icon; Ideas tab lists the lecture's ideas with Mend; Norbu speech bubble on flag; ask about the current moment without typing context; questions/flags collapse into the margin; mended gaps fold into one line of notes; per-lecture notes; AI summary; discussion posts (optionally anonymous). |
| Live | Replay the demo lecture "as if live" (optional speed control 0.75×–2× and current-word highlight, both off by default and switched on in Settings → Lecture transcript); record a real lecture with browser speech recognition (Chrome/Edge); paste or upload Panopto captions (.vtt/.srt). |
| Mend | Explanation dial, riddle, grading; a note line is added on pass. |
| Renovate | Practice problems for one lecture, one at a time, graded for understanding against the instructor's model answer. The model answer is shown only after a correct answer. A lecture the student added has no instructor problems, so the tutor writes two from its transcript. |
| Community | Tab. Pulled from the Brightspace syllabus (mock): teaching team (course instructor, TA, instructional support assistant / ISA) with emails, weekly office hours with Microsoft Teams links (next session also on the Bridge), and the syllabus's "who to contact" rules. Student picks what the message is about, sees the right person and the syllabus line that says so ("?"), and an Email button opens a prefilled `mailto:`. From a plank being mended, "Email your TA about this moment" adds the lecture, timestamp and passage. |
| Read&Write | Mock of Texthelp Read&Write for students whose registered accommodations include a licence (not everyone). Licensed students get "Open in Read&Write" in a lecture's Notes tab: the generated notes (summary, mended-plank lines, own notes) with four highlighters that each carry a meaning and symbol (key idea ★, word to learn Aa, example e.g., ask about ?), an eraser, read aloud, and "collect highlights" into notes. Highlights are saved per lecture. The licence is simulated per student from Settings → Connected tools (labelled demo); it is never visible to instructors. |
| Class view | Instructor: flags along the lecture timeline, results by idea, common questions, and the lecture's practice problems (add / remove, share right first try). Groups only, never names. |
| Demo progress | New student accounts start with sample progress (`server/sample.mjs`): all five materials, planks rotting and rotten, one open gap, a two-day streak. Settings → Demo progress reloads it or clears it (`POST /api/demo/progress`). Labelled as demo data on the map. |
| Settings | Opened from the gear icon at the top right. What gets in the way and the suggested strategies (with why, and how many students it helped, groups ≥ 5 only), with a switch to stop suggestions; typeface, size, spacing, calm mode, focus view, explanation level, lecture transcript tools (replay speed, word highlight), connected tools, daily reminder, data export, account deletion, opt out of class totals. |
| Look | Flat, painterly "indie game" illustration: watercolour edges and pigment grain, no dark outlines, soft shadows instead of borders. Inside a lecture, ideas use `PlankArt`/`PlankIcon` (bare, patched, or a dashed hole). On the map, lecture planks are drawn by material in `Map.tsx`. |
| Speech | Read-aloud on explanations; "say it" dictation in answer boxes. |
| Norbu | The troll, green all over. Two fangs always show. After a mended gap or a solved problem Norbu grins with every tooth. |

Every course names its exam "Midterm 1" (labels and deadline titles).

Removed on 2026-11-14: the Practice tab, week-later recall riddles and
flashcards (renovation replaces them), the "What helps" tab (moved into Settings and the
welcome flow), and the "Today" and "Lectures" panels on the home screen.

## 4. Non-negotiable principles

- **Accessibility first.** Plain language, adjustable reading settings, keyboard access,
  no colour-only meaning, read-aloud/dictation. Grading ignores spelling and grammar.
- **Privacy by default.** Per-user access checks on every query. Aggregates only for
  groups ≥ 5 (`MIN_GROUP`). Instructors never see names. Users can export or delete all
  their data and opt out of class totals. No real student data until SSO exists.
- **Never diagnose.** The app asks what feels hard; it never infers or names a condition.
- **Help learning, not cheating.** The tutor explains methods with different examples and
  does not complete graded work.
- **Grounded tutor.** Answers cite transcript timestamps `[mm:ss]` and say when a question
  goes beyond the lecture.
- **Works offline.** Without an API key (or when Claude fails) an offline tutor answers
  from seeded content and the UI says so.
- **Honest demo data.** Seeded lectures, deadlines and the synthetic 84-student cohort are
  labelled as demo data wherever they appear.

## 5. Architecture

```
Browser (React SPA, Vite) ──/api/* JSON──▶ Node server (node:http) ──▶ SQLite (node:sqlite, WAL)
                                                   │
                                                   ├──▶ Claude API (@anthropic-ai/sdk), fallback: offline tutor
                                                   └──▶ integrations.mjs (Panopto / Brightspace / M365 boundary)
```

- **API:** REST-style JSON under `/api/*`, bearer token auth, errors as `{ error }`.
- **Data:** SQLite tables `users, courses, lectures, segments, marks, problems, attempts, planks,
  notes, deadlines, posts, strategy_use`. `db.mjs` carries a schema `VERSION`; a database
  from an older version holds demo data only, so it is dropped and seeded again. Lectures split into ~30 s / ~45-word segments so a flag
  points at a small passage.
- **AI:** model from `NORBU_MODEL` (default `claude-opus-5-5`); structured outputs via zod
  schemas (riddle, grade, practice grade); free text for ask/explain/summary.
- **Production:** either one Node process serving the SPA and the API on port 8787
  (`npm start`), or Vercel (static `dist/` on the CDN, the API as one function, `api/norbu.mjs`).
  See `docs/DEPLOY.md`.

## 6. Tech stack decision (2026-11-14)

**Decision: stay TypeScript/JavaScript end to end in one npm package** rather than
introducing a Python (FastAPI) backend or migrating to Next.js.

Why:
- **It already works and is small.** ~2.5k lines, green tests, one process. A rewrite into
  two languages would cost weeks and add no user-facing value for the pilot.
- **One language, one contract layer.** `zod` is already used for Claude structured output;
  the same library validates request bodies, so client and server share one schema vocabulary
  instead of hand-syncing Pydantic models to TS types.
- **AI work is API calls, not local ML.** Python's main advantage (ML ecosystem) does not
  apply; the Anthropic TypeScript SDK covers everything used.
- **SPA over Next.js.** The app is authenticated, highly interactive, and browser-API heavy
  (speech synthesis/recognition, keyboard flags); there is no SEO need. Server Components
  would add complexity for little benefit. Vite gives fast builds and a static bundle.
- **Performance is not the bottleneck.** Latency is dominated by Claude calls; SQLite in WAL
  mode comfortably serves a single-course pilot.

Guardrails added: ESLint (typescript-eslint + react-hooks), `typecheck` / `lint` / `check`
scripts, Claude Code permissions and an auto-fix lint hook, `CLAUDE.md` files.

**Scaling path (when the pilot grows, not before):**
1. Move route bodies' zod schemas into a shared module imported by both `server/` and `src/`
   so response types are inferred, not hand-written. Convert `server/` to TypeScript.
2. Replace the hand-rolled router with Fastify or Hono (schema validation, OpenAPI).
3. Postgres (via Drizzle or Kysely) when there is more than one server process or course.
4. Split into npm/pnpm workspaces (`apps/api`, `apps/web`, `packages/contracts`) once there
   is a second deployable.

## 7. Integrations (pilot work, not built)

| System | Provides | Status |
|---|---|---|
| Panopto | Recordings + caption files | Manual caption upload works; API connector pending credentials |
| Brightspace | Assignment / quiz / reading due dates; syllabus (teaching team, office hours, Teams links, who to contact) | Seeded demo deadlines; demo syllabus parsed by `parseSyllabus()` |
| Read&Write (Texthelp) | Licence from registered accommodations (Accessibility Services) | Simulated per student (`accommodations` table) |
| Microsoft 365 | Entra ID sign-in; opt-in Outlook dates | Name-only sign-in stand-in |

All of them plug in through `server/integrations.mjs` only.

## 8. Known gaps and open questions

- **(open)** On Vercel the SQLite store lives in `/tmp` and resets on cold start (demo only).
  A pilot needs a hosted DB (Turso/libSQL or Postgres); see `docs/DEPLOY.md`.
- **(open)** SSO via Entra ID is a precondition for any real student data.
- **(open)** Reminders fire only while a tab is open; phone push needs a service worker
  and push service.
- **(open)** The Claude path has not been exercised against the live API in this repo.
- **(open)** Request bodies are not yet schema-validated on all existing endpoints
  (new endpoints must be; see `server/CLAUDE.md`).
- **(open)** Success metric definition. With recall riddles removed, the comprehension
  measure is practice problems right on the first try, per lecture, across renovations.
  Target values are not set, and the pitch deck still describes week-later recall.
- **(open)** Rot thresholds (3 and 5 lectures) and "2 problems per renovation" are first guesses.
- Existing `any` usages in `src/` are lint warnings to remove opportunistically.
