# Noor specification

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
2. **Mend** later: see the source passage, get an explanation at a chosen level
   (Hint / Worked example / Full walkthrough).
3. **Riddle:** answer a short question in a new situation; graded on understanding, not spelling.
4. **Prove** it a week later with a recall riddle (the comprehension measure).

The "bridge" metaphor: one plank per idea taught. States: plain → **gap** (flagged, dashed)
→ **mended** (riddle passed, amber) → **proven** (week-later recall passed, green).

## 3. Features (current scope)

| Area | Behaviour |
|---|---|
| Sign-in | First name + role (student / instructor). Stand-in for Microsoft Entra ID. Name and role are remembered in the browser and prefilled. **Demo mode** tickbox: name optional ("Guest"), skips the login screen on later visits, and silently signs back in as the same person if the server forgot the session (e.g. Vercel cold start). A demo **student** starts with a bridge in progress (two missing planks, a week-later riddle due now, one coming, one proven, flashcards due) so Repair and Practice have something to show. In demo mode a **Student / Teacher** switch sits at the top right; each role keeps its own session in the browser. Signing out turns demo mode off. |
| Welcome (first visit) | Students only, once (`settings.onboarded`). Step 1 asks what gets in the way (the same struggle chips as "What helps", skippable). Each struggle picked switches on its starter strategy (the one with the biggest week-later lift) and any setting it needs, unless recommendations are off or the student already chose for that struggle. Then a four-step tour of the loop (bridge → press F → mend → prove), ending in "Try it in a lecture" (opens the demo lecture) or "Go to my bridge". Can be replayed from Settings. |
| Bridge (home) | A rope bridge whose deck is built from the planks themselves: one plank per idea, a flagged idea is a visible hole. A "Start here" card points to the demo lecture until the student has flagged something. Planks per idea, open gaps, due recalls, streak, flashcards due, unified deadline list. |
| Lecture | Timestamped transcript; flag (F); ask about the current moment without typing context; questions/flags collapse into the margin; mended ideas fold into one line of notes; per-lecture notes; AI summary; generate flashcards; discussion posts (optionally anonymous). |
| Live | Replay the demo lecture "as if live" (optional speed control 0.75×–2× and current-word highlight, both off by default and switched on in Settings → Lecture transcript); record a real lecture with browser speech recognition (Chrome/Edge); paste or upload Panopto captions (.vtt/.srt). |
| Repair | Explanation dial, riddle, grading, note line + flashcard created on pass, recall scheduled. |
| Practice | Week-later riddles; spaced flashcards (Leitner boxes 0/1/3/7/14 days); add/remove cards. |
| What helps | A section of Settings (route `#/help` still opens it). Student picks what feels hard (never a diagnosis); strategies show week-later outcomes of peers who said the same, only for groups ≥ 5. Strategies that are on appear on the Bridge under "Strategies for you". Every strategy has a "?" that says, in two lines, why it was suggested and how to use it. |
| Class view | Instructor dashboard. Summary tiles (students, how many share flags, flags shared, % mended, % right a week later); lectures with the share of sharing students who flagged and the most-flagged idea; strategy use (how many students switched each strategy on, nothing about who or why); per lecture: flags along the timeline, results by idea, class discussion. **Scope:** flags come only from students who opted in (`shareFlags`, off by default); nothing a student typed to Noor (questions, answers, notes) is shown, only counts; no names; every number covers ≥ 5 students. |
| Settings | Opened from the gear icon at the top right. Typeface (Atkinson / Lexend / system), size, spacing, calm mode, focus view, explanation level, lecture transcript tools (replay speed, word highlight), What helps, daily reminder, data export, account deletion, share my flags with my instructor (opt-in), opt out of anonymous class totals. |
| Look | Flat, painterly "indie game" illustration: watercolour edges and pigment grain, no dark outlines, soft shadows instead of borders. Planks are wood: bare (sound), patched with a nailed batten (mended), green-sealed with a tick (proven), or a dashed hole with "?" (gap). Rules live in `.claude/skills/noor-design/SKILL.md`. |
| Speech | Read-aloud on explanations; "say it" dictation in answer boxes. |

## 4. Non-negotiable principles

- **Accessibility first.** Plain language, adjustable reading settings, keyboard access,
  no colour-only meaning, read-aloud/dictation. Grading ignores spelling and grammar.
- **Privacy by default.** Per-user access checks on every query. Aggregates only for
  groups ≥ 5 (`MIN_GROUP`). Instructors never see names. Users can export or delete all
  their data and opt out of class totals. Flags reach the instructor only with opt-in. No real student data until SSO exists.
- **Never diagnose.** The app asks what feels hard; it never infers or names a condition.
- **Help learning, not cheating.** The tutor explains methods with different examples and
  does not complete graded work.
- **Grounded tutor.** Answers cite transcript timestamps `[mm:ss]` and say when a question
  goes beyond the lecture.
- **Works offline.** Without an API key (or when Claude fails) an offline tutor answers
  from seeded content and the answer says so (no global "offline" badge in the header).
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
- **Data:** SQLite tables `users, courses, lectures, segments, marks, recalls, cards, notes,
  deadlines, posts, strategy_use`. Lectures split into ~30 s / ~45-word segments so a flag
  points at a small passage.
- **AI:** model from `NORBU_MODEL` (default `claude-opus-5-5`); structured outputs via zod
  schemas (riddle, grade, flashcards); free text for ask/explain/summary.
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
| Brightspace | Assignment / quiz / reading due dates | Seeded demo deadlines |
| Microsoft 365 | Entra ID sign-in; opt-in Outlook dates | Name-only sign-in stand-in |

All three plug in through `server/integrations.mjs` only.

## 8. Known gaps and open questions

- **(open)** On Vercel the SQLite store lives in `/tmp` and resets on cold start (demo only).
  A pilot needs a hosted DB (Turso/libSQL or Postgres); see `docs/DEPLOY.md`.
- **(open)** SSO via Entra ID is a precondition for any real student data.
- **(open)** Reminders fire only while a tab is open; phone push needs a service worker
  and push service.
- **(open)** The Claude path has not been exercised against the live API in this repo.
- **(open)** Request bodies are not yet schema-validated on all existing endpoints
  (new endpoints must be; see `server/CLAUDE.md`).
- **(open)** Success metric definition: week-later recall pass rate per idea is the
  comprehension measure; target values not set.
- Existing `any` usages in `src/` are lint warnings to remove opportunistically.
