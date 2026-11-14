# server/: API rules

Plain `node:http` + `node:sqlite` + `@anthropic-ai/sdk`, ES modules (`.mjs`). No framework,
no ORM, no build step: Node runs these files directly.

## Commands (from repo root)

- Run API only: `npm run server` (port 8787, `PORT` overrides; `NORBU_DB` sets the DB path)
- Tests: `npm test` (`node --test server/*.test.mjs`, in-memory DB, offline tutor)
- Lint: `npm run lint` / `npx eslint --fix server/<file>.mjs`

## Conventions

- **Routes are thin.** Register with `on(method, '/api/path/:param', handler, { open? })` in
  `createApp()`. A handler gets `{ user, body, params }` and returns a JSON-serialisable
  object. Put reusable logic (AI prompts, parsing, scheduling) in its own module, not inline.
- **Validate input.** Parse `body` with a `zod` schema (`schema.parse(body)` → throw
  `fail(400, ...)` on error) for every new or changed endpoint. Do not trust client IDs:
  re-check ownership with `lectureFor()` / `markFor()` or a `user_id=?` filter.
- **SQL.** Always parameterised (`q`, `one`, `run` with `?` placeholders). Never interpolate
  values into SQL strings. Schema changes go in `SCHEMA` in `db.mjs` as idempotent
  `create ... if not exists` / guarded `alter table`, and the seed must still work.
- **Async only where it waits.** Handlers that call Claude are `async`; DB calls are sync
  (`DatabaseSync`) and stay that way.
- **AI.** Add tutor functions to `ai.mjs`, wrapped in `withFallback(online, offline)`.
  Structured output uses a `zod` schema with `zodOutputFormat`. Keep the system prompt's
  accessibility and "do not do graded work" rules intact. Model comes from `NORBU_MODEL`.
- **Privacy.** Aggregates respect `MIN_GROUP` and the user's `shareAggregates` setting;
  synthetic demo users (`synthetic=1`) can never sign in. Error responses never leak
  internals: unknown errors return a generic 500 message and log server-side.
- **Tests.** Integration-style through the real HTTP server (`createApp(openDb(':memory:'))`);
  they must pass with no API key.
