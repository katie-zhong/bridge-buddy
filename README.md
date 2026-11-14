# NorBu

The troll under the Northbridge. A lecture companion for first-year students, built for
the ProdCon 2026 case "Learning Without Limits".

**The loop:** flag the moment you get lost → keep listening → mend the gap later with an
explanation at the level you choose → answer NorBu's riddle → prove it a week later.


## Run it

Needs Node 22.13 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. Sign in with any first name, as a student or an instructor.

For a single production process (serves the built app and the API on port 8787):

```bash
npm run build && npm start
```

```bash
npm test
```

### Windows

If PowerShell says "running scripts is disabled on this system", use `npm.cmd` in place of
`npm` (for example `npm.cmd install`), or run the commands from Command Prompt.

### Turning on Claude

Without credentials NorBu runs an **offline tutor** that only knows the two seeded ECON 101
lectures (the header shows an "Offline tutor" badge). To use Claude for any lecture:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

In PowerShell, set it first with `$env:ANTHROPIC_API_KEY = "sk-ant-..."`, then `npm.cmd run dev`.

The key stays on the server. `NORBU_MODEL` overrides the model (default `claude-opus-5-5`).
The Claude path has not been exercised in this repository yet because no key was available
when it was built; if a call fails, NorBu falls back to the offline tutor and says so.

## What is in it

| Area | What it does |
|---|---|
| Bridge (home) | One plank per idea taught. Dashed = gap you flagged, amber = mended, green = proven a week later. Deadlines from every source in one list. |
| Lecture | Timestamped transcript. Press **F** to flag. Ask a question about the current moment without typing context. Questions and flags collapse into the margin; mended ones fold into one line of your notes. |
| Live | "Sit in on it live" replays the demo lecture as if live. "Add a lecture → Record it live" transcribes a real lecture from your microphone (Chrome or Edge). You can also paste or upload a Panopto caption file (.vtt/.srt). |
| Mend a plank | Source passage → explanation with a Hint / Worked example / Full walkthrough dial → riddle graded on understanding, not spelling. |
| Practice | Week-later riddles (the comprehension measure) and spaced flashcards. |
| What helps | Pick what feels hard (never a diagnosis). Suggestions show how students who said the same did on week-later riddles, only for groups of 5 or more. |
| Class view | Instructors see where the class got lost: flags along the lecture, results by idea, common questions. Groups only, never names. |
| Settings | Typeface, size, spacing, calm mode, focus view, daily reminder, data export, account deletion, opt out of class totals. |

Read-aloud and "say it" dictation are available on explanations and answer boxes.

## What is real and what is stand-in

- **Real:** everything above, the SQLite store, per-user access checks, the minimum-group
  rule, live browser transcription, transcript import.
- **Demo data:** two ECON 101 lectures, a deadline list, and a generated class of 84
  students so the aggregate views have something to show. The app labels these figures as
  demo data wherever they appear.
- **Not connected yet:** Panopto, Brightspace and Microsoft 365. `server/integrations.mjs`
  is the single boundary they plug into. Sign-in is a name, standing in for Microsoft
  Entra ID. Do not put real student data in this build before SSO is in place.
- **Reminders** fire while NorBu is open in a tab. Phone push needs a service worker and a
  push service, which is pilot work.

## Layout

```
server/index.mjs         HTTP API and static hosting
server/ai.mjs            Claude tutor + offline fallback
server/db.mjs            schema and seed
server/content.mjs       demo course, strategies
server/integrations.mjs  Panopto / Brightspace / M365 boundary, transcript parser
src/                     React app (Lecture, Repair, Practice, Strategies, Instructor, Settings)
```
