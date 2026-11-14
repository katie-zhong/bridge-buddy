# Deploying Noor to Vercel

## How it maps onto Vercel

| Piece | On Vercel |
|---|---|
| `src/` React app | `npm run build` → `dist/`, served from Vercel's CDN |
| `server/` API | One Vercel Function, `api/norbu.mjs`, which wraps `createHandler()` from `server/index.mjs` |
| Routing | `vercel.json` rewrites `/api/*` → `api/norbu.mjs`; the function restores the original URL |
| SQLite | `node:sqlite` file at `/tmp/norbu.db` (see the limitation below) |

Local dev (`npm run dev`) and `npm start` are unchanged.

## First deploy (dashboard)

1. Go to vercel.com → **Add New… → Project** → import `katie-zhong/buddy`.
2. Framework preset: **Vite** (it is set in `vercel.json`; build `npm run build`, output `dist`).
3. **Environment Variables** (Settings → Environment Variables):
   - `ANTHROPIC_API_KEY`: optional. Without it the app runs the offline tutor.
   - `NORBU_MODEL`: optional, defaults to `claude-opus-5-5`.
4. **Settings → General → Node.js Version: 22.x** (or 24.x). `node:sqlite` needs ≥ 22.13.
5. Deploy. Every push to a branch then gets a preview URL; pushes to `main` go to production.

## First deploy (CLI)

```bash
npm i -g vercel
```

```bash
vercel link
```

```bash
vercel env add ANTHROPIC_API_KEY
```

```bash
vercel --prod
```

## ⚠️ Limitation: data does not persist on Vercel yet

Vercel Functions have no persistent disk; `/tmp` belongs to one instance and is wiped on
cold start. On Vercel, therefore:

- The demo course and the synthetic class re-seed on every cold start (25 ms, so it is fast).
- Sign-ins, flags, notes and progress are lost when the instance is recycled, and two
  concurrent instances do not share data. A user whose token disappears is sent back to the
  sign-in screen (the app handles the 401 cleanly). With **Demo mode** ticked at sign-in, the
  browser instead signs them back in as the same name and role, so a demo link keeps working
  (their earlier flags and progress are still gone).

This is acceptable for a **demo / judging link**, not for a pilot. Before real use, move the
store to a hosted database. Lowest-effort options:

- **Turso (libSQL)**: SQLite-compatible, so the existing SQL and schema carry over almost
  unchanged; swap `DatabaseSync` for the `@libsql/client` (async) client.
- **Neon Postgres** (via the Vercel Marketplace): better long-term fit; needs SQL
  dialect review (`insert or ...`, `pragma`, JSON-in-text columns).

Either way the change is contained in `server/db.mjs` plus making DB calls `await`ed in
`server/index.mjs`.

## Other notes

- `maxDuration` is 300 s for the API function (Claude calls can be slow). That needs Fluid
  compute (the default for new projects). If your plan rejects it, lower it to 60 in `vercel.json`.
- Security headers are set in `vercel.json`. The microphone stays allowed for the page itself
  because live transcription uses it.
- To reproduce Vercel routing locally: `npm run build`, then serve `dist/` and send `/api/*` to
  `api/norbu.mjs` (as `vercel dev` does).
