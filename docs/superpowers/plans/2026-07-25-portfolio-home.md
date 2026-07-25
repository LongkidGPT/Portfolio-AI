# Kid Portfolio Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a faithful, responsive portfolio homepage whose Hero uses a background video and DOM content, whose second section covers the sticky Hero, and whose three project cards switch independently on hover.

**Architecture:** Use a small Vite vanilla-JavaScript application. Keep the semantic page in `index.html`, visual system in `src/styles.css`, Hero playback state in `src/hero-controller.js`, project-card data and behavior in `src/project-cards.js`, and application wiring in `src/main.js`. Raster assets live under `public/assets`; the Hero video is a real MP4/WebM asset with a stable poster fallback.

**Tech Stack:** Vite, vanilla JavaScript, CSS, Vitest, jsdom, Playwright browser verification, FFmpeg for local video assembly.

## Global Constraints

- Desktop is the primary visual acceptance target; mobile uses a single-column adaptation.
- The page content and static composition follow `Portflio Test 1.5.jpg`.
- Selected Work default states follow the main screenshot and each card independently changes to its matching image from `SELECTED WORK.png`.
- Hero uses background video plus DOM; do not introduce React or Three.js.
- Hero must support muted inline playback, poster fallback, `prefers-reduced-motion`, and a stable final state.
- Approach must move upward over a sticky one-viewport Hero.
- Touch devices show real project imagery without depending on hover.

---

### Task 1: Scaffold the Vite application and test harness

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, and `npm test`.
- Produces: DOM anchors `#hero`, `#approach`, `#work`, `#experience`, and `#contact`.

- [ ] **Step 1: Write the failing smoke test**

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('portfolio shell', () => {
  it('contains every required section anchor', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const id of ['hero', 'approach', 'work', 'experience', 'contact']) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the shell is missing**

Run: `npm test -- --run`

Expected: FAIL because `package.json` or the required page shell does not exist.

- [ ] **Step 3: Create the Vite shell**

Create `package.json` with scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.1.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.4"
  }
}
```

Create `vite.config.js` with `server.host = '0.0.0.0'` and `server.allowedHosts = ['terminal.local']`. Create the semantic five-section page shell in `index.html`, import `src/main.js`, and add the shared black background and typography reset in `src/styles.css`.

- [ ] **Step 4: Install dependencies and run tests**

Run: `npm install`

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src tests
git commit -m "feat: scaffold portfolio homepage"
```

### Task 2: Prepare reference-derived raster and Hero video assets

**Files:**
- Create: `public/assets/hero-poster.webp`
- Create: `public/assets/hero-chaos.webp`
- Create: `public/assets/hero-background.mp4`
- Create: `public/assets/work-brand-default.webp`
- Create: `public/assets/work-marketing-default.webp`
- Create: `public/assets/work-system-default.webp`
- Create: `public/assets/work-brand-hover.webp`
- Create: `public/assets/work-marketing-hover.webp`
- Create: `public/assets/work-system-hover.webp`
- Create: `public/assets/contact-background.webp`

**Interfaces:**
- Produces: final relative asset URLs consumed by HTML and JavaScript.
- Consumes: the three approved source images supplied by the user.

- [ ] **Step 1: Measure and inspect the three references**

Run:

```bash
sips -g pixelWidth -g pixelHeight "/Users/jade/Desktop/Portflio Test 1.5.jpg" "/Users/jade/Desktop/SELECTED WORK.png" "/Users/jade/Desktop/Longkid Folder/面试准备/面试Coding/ninebot-portfolio-home/storyboards/hero-interaction-storyboard-chaos-to-order-v1.png"
```

Inspect the source at original resolution and record exact crop coordinates before producing any asset.

- [ ] **Step 2: Produce clean Hero keyframes**

Use Image Gen editing with `Portflio Test 1.5.jpg` as reference to remove navigation, text, and buttons while preserving the black/cyan digital-rain environment and centered digital human. Produce a clean stable poster and a matching chaos frame without the human.

- [ ] **Step 3: Crop the six work states**

Crop the three default project images from `Portflio Test 1.5.jpg` and the three hover project images from `SELECTED WORK.png`. Preserve each source composition; do not bake card titles or buttons into the assets.

- [ ] **Step 4: Assemble the Hero video**

Use FFmpeg to create a silent 8–10 second H.264 MP4:

- 0–2s: slow motion over the chaos frame.
- 2–5s: crossfade toward the stable digital-rain environment.
- 5–8s: reveal the human and settle into the final poster.

Encode at 1920×1080, `yuv420p`, with `-movflags +faststart`. The final frame must visually match `hero-poster.webp` to avoid a visible playback jump.

- [ ] **Step 5: Inspect every output asset**

Open the poster, representative video frame, three default cards, three hover cards, and contact background. Reject any crop containing source-page navigation, card copy, or duplicated DOM text.

- [ ] **Step 6: Commit**

```bash
git add public/assets
git commit -m "feat: add portfolio visual assets"
```

### Task 3: Implement Hero playback and cover-scroll behavior

**Files:**
- Create: `src/hero-controller.js`
- Create: `tests/hero-controller.test.js`
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `resolveHeroMode({ reducedMotion, coarsePointer, autoplayBlocked })`.
- Produces: `createHeroController(video, root)` returning `{ start(), settle() }`.
- Consumes: `/assets/hero-background.mp4` and `/assets/hero-poster.webp`.

- [ ] **Step 1: Write failing Hero-state tests**

```js
import { describe, expect, it } from 'vitest';
import { resolveHeroMode } from '../src/hero-controller.js';

describe('resolveHeroMode', () => {
  it('uses poster mode for reduced motion', () => {
    expect(resolveHeroMode({ reducedMotion: true, coarsePointer: false, autoplayBlocked: false })).toBe('poster');
  });

  it('uses simplified autoplay for touch devices', () => {
    expect(resolveHeroMode({ reducedMotion: false, coarsePointer: true, autoplayBlocked: false })).toBe('autoplay');
  });

  it('uses interactive playback on desktop', () => {
    expect(resolveHeroMode({ reducedMotion: false, coarsePointer: false, autoplayBlocked: false })).toBe('interactive');
  });
});
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run tests/hero-controller.test.js`

Expected: FAIL because `resolveHeroMode` is not defined.

- [ ] **Step 3: Implement playback states**

Implement the pure mode resolver and a controller that:

- Shows the poster immediately.
- Attempts muted inline playback.
- Adds `is-ready` and `is-settled` classes at the appropriate video events.
- Starts or replays the interactive segment only on the first desktop pointer entry.
- Falls back to poster mode when `video.play()` rejects.

- [ ] **Step 4: Implement sticky Hero and covering Approach**

Use a Hero wrapper whose sticky child is `position: sticky; top: 0; height: 100svh`. Place the remaining page in a higher stacking context with an opaque black Approach section and rounded top corners. DOM copy fades in with the stable phase; reduced-motion mode displays it immediately.

- [ ] **Step 5: Run unit and production builds**

Run: `npm test -- --run`

Run: `npm run build`

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add index.html src tests
git commit -m "feat: implement hero video and cover scroll"
```

### Task 4: Implement the page sections and independent project-card states

**Files:**
- Create: `src/project-cards.js`
- Create: `tests/project-cards.test.js`
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `PROJECTS`, an array of `{ id, defaultImage, hoverImage, title, description }`.
- Produces: `enhanceProjectCards(root)` to attach pointer and keyboard states.

- [ ] **Step 1: Write failing project mapping tests**

```js
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/project-cards.js';

describe('project cards', () => {
  it('defines three unique independent states', () => {
    expect(PROJECTS).toHaveLength(3);
    expect(new Set(PROJECTS.map((project) => project.id)).size).toBe(3);
    for (const project of PROJECTS) {
      expect(project.defaultImage).not.toBe(project.hoverImage);
    }
  });
});
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run tests/project-cards.test.js`

Expected: FAIL because `PROJECTS` does not exist.

- [ ] **Step 3: Implement all semantic content**

Add the Approach title and five numbered principles, Selected Work title and three links, Experience introduction and five experience rows, and Contact details. Keep visible copy aligned with the approved screenshot; do not invent additional sections.

- [ ] **Step 4: Implement card transitions**

Each card contains two `<img>` layers. Pointer hover and keyboard focus crossfade only that card’s hover layer over 500ms while applying a maximum 1.025 scale. Touch/coarse-pointer CSS shows the hover layer by default.

- [ ] **Step 5: Complete desktop and mobile styling**

Match the screenshot’s narrow desktop content width, black background, muted grey typography, cyan imagery, fine borders, generous vertical rhythm, and one-large/two-small card grid. Below 760px, use one column, simplify navigation, reduce spacing, and prevent horizontal overflow.

- [ ] **Step 6: Run tests and build**

Run: `npm test -- --run`

Run: `npm run build`

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add index.html src tests
git commit -m "feat: build portfolio sections and project interactions"
```

### Task 5: Browser verification and visual QA

**Files:**
- Create: `design-qa.md`
- Create: `artifacts/desktop-home.png`
- Create: `artifacts/mobile-home.png`
- Modify: any source or asset file required to fix P0–P2 differences.

**Interfaces:**
- Consumes: the complete local Vite site.
- Produces: a passing `design-qa.md`.

- [ ] **Step 1: Start the production-equivalent local preview**

Run: `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`

Expected: Vite serves the site on port 4173.

- [ ] **Step 2: Verify desktop behavior**

Open the page at 1440×1000. Confirm:

- Hero video loads and settles without a visible poster jump.
- Approach covers the sticky Hero while scrolling.
- Each project card switches independently and restores on pointer exit.
- Keyboard focus reveals the matching project image.
- Navigation anchors scroll to the correct sections.
- Browser console has no errors.

- [ ] **Step 3: Verify mobile behavior**

Open the page at 390×844. Confirm:

- No horizontal overflow.
- Sections are single-column.
- Real project images are visible without hover.
- Hero uses autoplay or poster fallback and reduced motion is respected.

- [ ] **Step 4: Capture and compare**

Capture full-page desktop and mobile screenshots. Compare the desktop capture against `Portflio Test 1.5.jpg`, and compare the Selected Work hover state against `SELECTED WORK.png`.

- [ ] **Step 5: Write and iterate the QA report**

Write `design-qa.md` with severity-labelled differences. Fix all P0, P1, and P2 issues, recapture, and repeat until the last line is:

```text
final result: passed
```

- [ ] **Step 6: Run the final verification**

Run: `npm test -- --run`

Run: `npm run build`

Expected: tests pass and Vite builds without warnings that affect runtime behavior.

- [ ] **Step 7: Commit**

```bash
git add design-qa.md artifacts index.html src public package.json package-lock.json vite.config.js tests
git commit -m "test: verify portfolio homepage"
```
