# src/: web app rules

React 18 single-page app, built by Vite, strict TypeScript. Hash routing (`go('#/...')`),
plain CSS in `styles.css` (CSS custom properties for the reading/accessibility settings).

## Commands (from repo root)

- Dev: `npm run dev` (Vite on :5173, proxies `/api` to :8787)
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` / `npx eslint --fix src/<file>.tsx`
- Production build: `npm run build`

## Conventions

- **Data.** Load with `useAsync(() => api<T>(...), deps)`; mutate with `api(path, method, body)`.
  No raw `fetch` in components. Shared response types live in `ui.tsx` and must match the server.
- **Types.** Strict mode. No new `any` (lint warns on the existing ones; replace them when you
  touch that code), no `@ts-ignore` / `@ts-expect-error`, no non-null `!` on API data you have
  not checked. Catch blocks use `catch (e)` and `e instanceof Error ? e.message : ...`.
- **Validation.** Validate untrusted input that the browser parses itself (uploaded caption
  files, `localStorage`, `import.meta.env`) with `zod`. Form fields: validate before calling `api()`.
- **Components.** One screen per file; shared bits go in `ui.tsx`. Keep hooks rules clean
  (`react-hooks` lint is on).
- **Accessibility is the product.** Many users have dyslexia, dysgraphia, dyscalculia or ADHD.
  Respect the user's font, size, spacing, calm and focus settings (CSS variables, not hard-coded
  values); every control is keyboard-reachable with a visible label; no colour-only meaning;
  plain, short UI copy. Read-aloud and dictation must keep working where they exist.
- **Visual language.** Monochrome and minimal: off-white `--paper`, ink type, 1px grey hairlines,
  square corners, uppercase letter-spaced `--label` text for nav/buttons/section titles, serif
  `--display` for page headlines only. Colour comes from the tokens in `styles.css`; never hard-code
  hex in components. `--clay` (muted red) is reserved for errors, danger and "live". Plank states
  are frosted glass (plain), grey glass (mended), dark glass + check (proven), dashed outline (gap):
  always fill + outline + icon, never colour alone.
- **Browser APIs** (`speechSynthesis`, `SpeechRecognition`, `localStorage`) are feature-detected
  and wrapped so the app still works without them.
