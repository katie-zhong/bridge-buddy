---
name: bridgeway-design
description: Bridgeway's visual and copy style. Use before designing, mocking up or changing any UI in src/ (screens, styles.css, Norbu the troll, the bridge and planks, icons, onboarding copy), or when asked for UI prototypes or mockups.
---

# Bridgeway design guide

Bridgeway is for first-year students, many with dyslexia, ADHD, dysgraphia or dyscalculia. The look
is **minimal, readable and slightly playful but professional**: a flat, painterly indie-game
illustration style on top of a calm, tidy app. When a choice is unclear, pick the one that is
easier to read.

## Look

- **Painterly, flat assets.** Illustrations are flat shapes with watercolour edges and pigment
  grain. Use the shared SVG filters from `PaintDefs` in `src/Troll.tsx` (rendered once in
  `main.tsx`): `filter="url(#paint)"` for small shapes (planks, Norbu, signs),
  `filter="url(#paint-wide)"` for scenery. Shade with a lighter and a deeper wash of the same
  hue (light from the top left), not gradients-on-everything.
- **No dark outlines.** No black or ink strokes around shapes, cards, buttons or chips. Separate
  things with colour, a soft shadow (`var(--shadow)`) or at most a thin 1px `var(--line)` /
  `var(--edge)` line. Form fields keep a thin `var(--edge)` border so they stay findable.
- **Never filter text.** Keep labels, `?` marks and focus rings outside filtered groups so they
  stay crisp.
- **Tokens, not hex.** UI colours come from the CSS variables in `styles.css` (`--paper`,
  `--card`, `--ink`, `--muted`, `--moss`, `--clay`, `--amber`, …), which also carry dark mode.
  Illustration colours (wood, fur, sky) may be literal hex inside the SVG components.
- **Calm.** One accent action per view (`.primary`, moss). Clay red is only for "lost / missing".
  Motion is small and always stops in calm mode and under `prefers-reduced-motion`.

## The bridge metaphor (keep it consistent)

Every idea taught is one **wooden plank** on the bridge to the next exam. Draw planks only with
`PlankArt` / `PlankIcon` from `src/Troll.tsx`; never re-draw them.

| State | Meaning | Looks like |
|---|---|---|
| `plain` | taught, no gap flagged ("sound") | bare wood, grain and a knot |
| `gap` | flagged as lost ("missing") | an empty dashed hole with a `?` |
| `mended` | riddle passed ("patched") | amber-stained wood with a nailed batten across it |
| `proven` | week-later recall passed | green-sealed wood with a tick |

Repair words: flag → **missing plank** → **mend / patch** → **prove**. Shape carries the state as
well as colour (hole, batten, tick), so it never depends on colour alone.

## Norbu the troll

`TrollArt` in `src/Troll.tsx`: small furry troll, tall ears, no outlines. Default (`idle`) is a
**closed smile with one tooth**; `think` is a flat mouth; `happy` is the open toothy grin and is
used **only when a riddle or recall is answered well** (not for greetings or the home screen). Keep the silhouette; add
new moods rather than new characters. The face (eyes, mouth) stays unfiltered and high-contrast.

## Copy and layout

- Say less. Prefer an icon plus a number or a short label over a sentence. Put explanations
  behind a `WhyTip` ("?") from `ui.tsx`: at most two short lines, **Why** then **How**.
- Plain words, short sentences, sentence case. No diagnoses, no guilt about streaks.
- Demo data is always labelled as demo data.
- Names: the app is **Bridgeway**; the troll who speaks, explains and asks riddles is **Norbu**.
- Navigation: Bridge, Practice and Community as tabs; Settings is the gear at the top right.
  Profile (struggles + strategy checkboxes), What helps and Connected tools live inside Settings.
- On/off settings use `Switch` (role="switch"); picking several items uses checkboxes.
- Third-party tools (Brightspace, Teams, Read&Write) are labelled by name, and mock data as demo.

## Accessibility checklist (before finishing)

- Every control is keyboard-reachable with a visible label (or `aria-label` for icon buttons).
- Text contrast ≥ 4.5:1; the user's font, size, spacing, calm and focus settings still apply.
- Nothing relies on colour alone; decorative SVGs are `aria-hidden`, meaningful ones are labelled.
- Check the change in the running app at desktop and phone width (`npm run dev`), light and dark.

## Mockups and prototypes

For quick visual explorations, write a standalone HTML file in the scratchpad (not the repo),
reuse the tokens above, screenshot it with Playwright and show the images. Build from the
existing screens, not from scratch, unless asked for a new direction.
