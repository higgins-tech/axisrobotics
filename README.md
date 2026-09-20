# Axis Robotics — Website Rebuild

A from-scratch recreation of axisrobotics.ai, built with **plain HTML, CSS and vanilla JavaScript** — no frameworks, no build step, no dependencies. Open `index.html` in a browser (or serve the folder) and it runs.

## File structure

```
axis-robotics/
├── index.html        All markup, single page
├── css/
│   └── style.css      All styling (design tokens, layout, animation, responsive)
├── js/
│   └── script.js       All behavior (nav, scroll animations, mega menu)
├── assets/             Drop real images/video/gifs here (see "Replacing placeholders")
└── smoke-test.js        Optional headless functional test (needs `npm i jsdom` to run)
```

There is no build tool. Editing any file and refreshing the browser is the whole workflow.

## What's implemented

- **Preloader** — percentage counter + wordmark, matching the loading screen on first visit.
- **Header** — fixed, transparent, no background at any scroll position. Text/icon color
  automatically switches between black / white to stay legible over whatever section is
  currently behind it (driven by `data-section-theme` on each `<section>`).
  - At the very top of the page (desktop only) the nav shows the five categories inline,
    exactly like the reference site's first-load state.
  - Anywhere else (and always on mobile) it collapses to a single **Menu +** control.
- **Mega menu** — a single source of truth: the footer's nav markup (`#footerNav`) is
  cloned by JS into the header's dropdown on page load, so category/link edits only ever
  need to happen once, in the footer.
- **Scroll-jacked "pinned" sections** (Bottleneck 3-card stack, Products 4-panel showcase)
  — sticky + tall-wrapper pattern driven by a small reusable `createPinController()`
  factory in `script.js`. Cards/panels crossfade and slide based on scroll progress, with
  live pagination counters ("1/3", "Products 1/4").
  - **These are desktop-only.** Under 1024px width they gracefully degrade to plain,
    normal-flow stacked content (matching the mobile reference screenshots, which show no
    pinning/pagination at all on phones).
- **Word-by-word scroll reveal** on the "infinity loop" section — each word brightens
  (and the accent phrase turns green) as it crosses a line in the viewport while scrolling.
- **Parallax float** on the rock in the "living system" section.
- **Reveal-on-scroll** fade/slide-up for headings, cards and feature blocks
  (`data-reveal` attribute + `IntersectionObserver`).
- **Infinite logo marquee** (pure CSS keyframe, pauses on hover).
- Full **keyboard support**, visible focus states, and `prefers-reduced-motion` respected
  (all animation collapses to instant state changes if the OS setting is on).

## Replacing the placeholders

Every image/video slot is a dashed, labeled `.media-placeholder` block so it's obvious
what goes where and at roughly what size. To swap one in:

```html
<!-- before -->
<div class="hero__media media-placeholder" data-asset-label="hero-robot-arm.mp4 · 2400×1400">
  <div class="media-placeholder__inner">...</div>
</div>

<!-- after -->
<div class="hero__media">
  <video src="assets/hero-robot-arm.mp4" autoplay muted loop playsinline></video>
</div>
```

Just delete the `media-placeholder` class and the inner `.media-placeholder__inner` div,
and put an `<img>`/`<video>` in its place — the surrounding layout (sizing, rounding,
gradients) is all on the parent wrapper, so it doesn't need to change.

Search for `media-placeholder` in `index.html` to find all ~14 slots (hero, 3 bottleneck
cards, living-system rock, quadrants rock, 3 pillar images, 4 product screens, footer
banner).

## Design tokens

All colors, fonts, spacing and radii are CSS custom properties at the top of
`css/style.css` (`:root`), so retheming (e.g. adjusting the exact brand green once you
have the client's real hex value) is a one-line change that propagates everywhere.

Fonts used (Google Fonts, loaded via `<link>` in `<head>`):
- **Unbounded** — display/headline type (the big blocky "AXIS ROBOTICS" / "DATA" text)
- **Space Grotesk** — UI text (nav, buttons, small labels)
- **Inter** — body copy / paragraphs

Icons: [Remix Icon](https://remixicon.com/) via CDN (`ri-*` classes).

## Notes / assumptions made

A few details in the reference screenshots weren't fully visible and were filled in with
reasonable, on-brand placeholders — flag these with the client if exact copy exists:
- The 4th "Products" panel description (Data-Processing Pipeline) and the 3rd panel
  ("Automated Evaluation Engine") wording.
- Exact brand green hex (`--green` in `style.css` — currently `#17a64b`, eyeballed from
  screenshots).
- Mega-menu open/expanded visual treatment (no screenshot of it open existed to match
  against; built as a clean slide-in drawer with an accordion per category).

## Testing

`smoke-test.js` loads the real `index.html`/`script.js` into jsdom and exercises the nav
toggle, mega-menu accordion, and every scroll/resize-driven controller to catch runtime
errors without needing a browser. Run with:

```
npm init -y && npm install jsdom --no-save
node smoke-test.js
```
