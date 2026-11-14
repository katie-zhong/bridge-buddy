# Noor

Your Northbridge buddy. A lecture companion for first-year students, built for
the ProdCon 2026 case "Learning Without Limits".

**The loop:** flag the moment you get lost → keep listening → mend the gap later with an
explanation at the level you choose → answer Noor's riddle → renovate each lecture's plank with practice so it does not rot.


## Run it

Needs Node 22.13 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. Sign in with any first name, as a student or an instructor.
Tick **Demo mode** to skip the login screen next time: the browser remembers your name and role
and signs you straight in (and back in, if the server restarted and forgot you).

For a single production process (serves the built app and the API on port 8787):

```bash
npm run build && npm start
```

```bash
npm test
```

### Deploy to Vercel

See [docs/DEPLOY.md](docs/DEPLOY.md). Note that data does not persist on Vercel until a hosted database is added.

### Windows

If PowerShell says "running scripts is disabled on this system", use `npm.cmd` in place of
`npm` (for example `npm.cmd install`), or run the commands from Command Prompt.

### Turning on Claude

Without credentials Noor runs an **offline tutor** that only knows the seeded demo
lectures (the header shows an "Offline tutor" badge). To use Claude for any lecture:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

In PowerShell, set it first with `$env:ANTHROPIC_API_KEY = "sk-ant-..."`, then `npm.cmd run dev`.

The key stays on the server. `NORBU_MODEL` overrides the model (default `claude-opus-5-5`).
The Claude path has not been exercised in this repository yet because no key was available
when it was built; if a call fails, Noor falls back to the offline tutor and says so.

## What is in it

| Area | What it does |
|---|---|
| Map (home) | One bridge per course, one plank per lecture. Hover a plank to see the lecture and renovate it. Planks rot if left alone while newer lectures arrive. "+" adds a lecture. Deadlines from every source below, with the planks each one covers. |
| Lecture | Timestamped transcript. Press **F** to flag. Ask a question about the current moment without typing context. Questions and flags collapse into the margin; mended ones fold into one line of your notes. |
| Live | "Sit in on it live" replays the demo lecture as if live. "+" on a bridge records a real lecture from your microphone (Chrome or Edge) or takes a Panopto caption file (.vtt/.srt). |
| Mend a gap | Source passage → explanation with a Hint / Worked example / Full walkthrough dial → riddle graded on understanding, not spelling. |
| Renovate | Solve the lecture's practice problems to rebuild its plank: driftwood → oak → stone → iron → gold. |
| Class view | Instructors see where the class got lost and set the practice problems. Groups only, never names. |
| Settings | What gets in the way and the strategies Noor suggests for it, typeface, size, spacing, calm mode, focus view, daily reminder, data export, account deletion, opt out of class totals. |

Read-aloud and "say it" dictation are available on explanations and answer boxes.

## What is real and what is stand-in

- **Real:** everything above, the SQLite store, per-user access checks, the minimum-group
  rule, live browser transcription, transcript import.
- **Demo data:** three courses with 14 lectures and their practice problems (only the two full ECON 101 lectures are long), a deadline list, and a generated class of 84
  students so the aggregate views have something to show. The app labels these figures as
  demo data wherever they appear.
- **Not connected yet:** Panopto, Brightspace and Microsoft 365. `server/integrations.mjs`
  is the single boundary they plug into. Sign-in is a name, standing in for Microsoft
  Entra ID. Do not put real student data in this build before SSO is in place.
- **Reminders** fire while Noor is open in a tab. Phone push needs a service worker and a
  push service, which is pilot work.

## Layout

```
server/index.mjs         HTTP API and static hosting
server/ai.mjs            Claude tutor + offline fallback
server/db.mjs            schema and seed
server/content.mjs       demo course, strategies
server/integrations.mjs  Panopto / Brightspace / M365 boundary, transcript parser
api/norbu.mjs            Vercel Function entry (wraps the same API)
src/                     React app (Map, Lecture, Repair, Renovate, Welcome, Strategies, Instructor, Settings)
```
