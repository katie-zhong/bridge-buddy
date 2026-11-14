# NorBu: repository guide

NorBu is a lecture companion for first-year students (ProdCon 2026 case "Learning Without
Limits"). **`docs/SPEC.md` is the source of truth** for what the product does and why.
`README.md` is the user-facing run guide.

## Stack and layout

One TypeScript/JavaScript codebase, one `package.json`, managed with **npm** (Node ≥ 22.13).

```
server/        Node HTTP API (plain node:http, no framework), ES modules (.mjs)
  index.mjs      routes under /api/*, auth, static hosting of dist/
  db.mjs         node:sqlite schema + demo seed
  ai.mjs         Claude tutor (@anthropic-ai/sdk, zod structured output) + offline fallback
  content.mjs    seeded demo course content
  integrations.mjs  Panopto / Brightspace / M365 boundary, transcript parser
  *.test.mjs     node:test integration tests (in-memory DB)
src/           React 18 SPA built with Vite, strict TypeScript
  ui.tsx         shared API types, the `api()` client, hooks, small components
  <Screen>.tsx   one file per screen (Lecture, Repair, Practice, Strategies, Instructor, Settings)
api/norbu.mjs    Vercel Function entry: wraps createHandler() from server/index.mjs
scripts/dev.mjs  runs API (:8787) + Vite (:5173, proxies /api) together
vercel.json      Vercel build, /api rewrite, headers (see docs/DEPLOY.md)
docs/SPEC.md     product + technical specification
```

Directory-specific rules: `server/CLAUDE.md`, `src/CLAUDE.md`.

## Commands (run from the repo root)

| What | Command |
|---|---|
| Dev (API + web) | `npm run dev` → http://localhost:5173 |
| Lint (auto-fix) | `npm run lint` (`npm run lint:fix`) |
| Typecheck | `npm run typecheck` |
| Tests | `npm test` |
| Everything | `npm run check` |
| Production build / serve | `npm run build && npm start` (:8787) |
| Deploy | Vercel, see `docs/DEPLOY.md` |

## Cross-stack rules

- **API shape.** Every endpoint lives under `/api/*` in `server/index.mjs`, returns JSON, and
  reports failures as `{ error: string }` with an HTTP status (use `fail(status, msg)`).
  New endpoints validate their request body with a `zod` schema before touching the DB.
- **One client.** The frontend calls the API only through `api()` in `src/ui.tsx`, never
  raw `fetch` in components. Pass a response type: `api<Mark>(...)`.
- **Keep types in sync.** The response types in `src/ui.tsx` (`User`, `Mark`, `Home`, …)
  mirror what the server returns. Any change to a response shape or DB column that reaches
  the client must update those types in the same change.
- **Access control.** Every user-scoped query filters by `user.id`; lecture access goes
  through `lectureFor()`. Aggregates about students are never shown for groups smaller
  than `MIN_GROUP` (5), and instructor views never show names.
- **Secrets stay on the server.** `ANTHROPIC_API_KEY` is read only in `server/ai.mjs`.
  Nothing secret goes to the client or into the repo. Never read or print `.env` files.
- **Two entry points, one app.** `createHandler()` is the whole API. `createApp()` wraps it for
  Node and `api/norbu.mjs` wraps it for Vercel. Don't add logic to either wrapper.
- **AI calls degrade.** Every Claude call goes through `withFallback()` so the app still
  works offline and tells the user when it fell back.

## Workflow rules

1. Before starting a new feature, read `docs/SPEC.md`. If the feature changes scope or a
   decision recorded there, update the spec in the same change.
2. Before finishing, run `npm run check` (lint + typecheck + tests). For a change that
   touches only `src/`, `npm run lint && npm run typecheck` is the minimum; for `server/`,
   `npm run lint && npm test`.
3. Add or update a test in `server/*.test.mjs` for any behaviour change in the API.
4. A PostToolUse hook runs `eslint --fix` on every edited `.ts/.tsx/.mjs/.js` file and
   reports unfixable errors; fix them rather than suppressing them.
5. No real student data in this build (sign-in is a name, not SSO). Demo data must stay
   labelled as demo data in the UI.
