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

The home screen is a **top-down forest**: a connected river system, one lake per course, one bridge
across each lake. Click a bridge to see it **from the front**: a stone arch whose blocks *are* the
lectures (each lecture is a run of wedge stones in its material, and a flag is a missing stone). The
blocks must build the bridge, never sit on top of one. It all lives in `src/Map.tsx` (scenes) and
`src/Scenery.tsx` (trees, rocks, rivers, block layout), and follows the same rules as everything
else: scenery under `paint-wide`, small things under `paint`, flat shapes with a lighter and a deeper
wash, **no dark outlines** (rails, posts and shadows are filled shapes, not outlines). The hover
label is the dark rounded label (`.plantip`). Lecture blocks are drawn only by `MaterialBlock` /
`MaterialIcon` in `src/Troll.tsx`, next to the idea planks (`PlankArt`).

- **Material** says how often the plank was renovated: driftwood → oak → stone → iron → gold
  (`MATERIALS` in `ui.tsx`; the look is in `MaterialPlank`). Legends use `MaterialIcon`, never CSS swatches.
- **Rot** (a little moss, then bites out of the edge) means newer lectures have piled up since the
  student last worked on it. **A dashed hole with a `?`** (a missing stone on the arch) means an open flag in that lecture.
- Shape carries the state as well as colour (uneven boards, seams, rivets, moss, holes).

Inside a lecture, each **idea** is drawn with `PlankArt` / `PlankIcon` from `src/Troll.tsx`:

| State | Meaning | Looks like |
|---|---|---|
| `plain` | taught, no gap flagged ("sound") | bare wood, grain and a knot |
| `gap` | flagged as lost ("missing") | an empty dashed hole with a `?` |
| `mended` | riddle passed ("patched") | amber-stained wood with a nailed batten across it |

(`proven` still exists in the icon set but nothing uses it since recall riddles were removed.)

Words: flag → **gap** → **mend** (one idea), and **renovate** (a whole lecture's plank, by practice).

## Norbu the troll

`TrollArt` in `src/Troll.tsx`: small furry troll, **green all over** (so the teeth read clearly),
tall ears, no outlines. Default (`idle`) is a closed smile with **two fangs showing**; `think` is a
flat mouth; `happy` is a too-wide grin with every tooth and is used **only when a riddle or a
practice problem is answered well, or a plank is renovated** (not for greetings or the home
screen). Keep the silhouette; add new moods rather than new characters. The face (eyes, mouth)
stays unfiltered and high-contrast.

## Copy and layout

- Say less. Prefer an icon plus a number or a short label over a sentence. Put explanations
  behind a `WhyTip` ("?") from `ui.tsx`: at most two short lines, **Why** then **How**.
- Plain words, short sentences, sentence case. No diagnoses, no guilt about streaks.
- Demo data is always labelled as demo data.
- Names: the app is **Bridgeway**; the troll who speaks, explains and asks riddles is **Norbu**.
- Navigation: Map and Community as tabs; Settings is the gear at the top right.
  What gets in the way (areas, then details), the suggested strategies and Connected tools live inside Settings.
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
