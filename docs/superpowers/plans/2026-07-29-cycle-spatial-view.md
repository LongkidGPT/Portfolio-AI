# Cycle Spatial View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the frontal ±15-degree window of `cycle.mp4` as an inverse pointer/touch-controlled settled-Hero view, then complete the requested full-page light, Contact, copy, and Experience refinements.

**Architecture:** Preprocess the 360-degree source into a short seam-safe all-intra MP4 ordered from one 15-degree endpoint through the frontal seam to the opposite endpoint. Keep angle and gesture decisions in pure functions, manage media seeking in a focused React hook, and mount the cursor light once at application level. Reuse the existing Hero scroll-scrub state machine and copy-button implementation.

**Tech Stack:** React 19, Vite 6, native HTML video, Pointer Events, Node test runner, jsdom, FFmpeg.

## Global Constraints

- The interactive view is active only after the settled Hero scene appears.
- Expose only the frontal `-15°` to `+15°` range; never traverse the 360-degree middle.
- Desktop cursor and mobile horizontal drag use inverse view mapping.
- Mobile does not request gyroscope or device-orientation permission.
- Predominantly vertical mobile movement must continue normal page scrolling.
- Reduced motion and cycle-media failure keep `hero-poster 02` static.
- The supplied light spot follows fine-pointer desktop input across the full page and never blocks interaction.
- Contact uses `contact-bg 03`; Contact WeChat copies `LKchat1980` with visible feedback.
- Experience company names use 100% white; roles and dates retain their hierarchy.
- Preserve the user's existing `design-qa.md` changes.

---

### Task 1: Seam-safe spatial-view model and focused media asset

**Files:**
- Create: `src/cycle-spatial-view.js`
- Create: `tests/cycle-spatial-view.test.mjs`
- Create: `public/assets/hero-cycle-front.mp4`

**Interfaces:**
- Produces: `clampSpatialInput(value) -> number`
- Produces: `resolveSpatialTargetTime(normalizedX, duration) -> number`
- Produces: `classifySpatialGesture(deltaX, deltaY, threshold = 8) -> "pending" | "horizontal" | "vertical"`

- [ ] **Step 1: Write the failing model tests**

```js
import {
  classifySpatialGesture,
  resolveSpatialTargetTime,
} from "../src/cycle-spatial-view.js";

test("inverse mapping sends a left pointer to the right-side source endpoint", () => {
  assert.equal(resolveSpatialTargetTime(-1, 0.72), 0);
  assert.equal(resolveSpatialTargetTime(0, 0.72), 0.36);
  assert.equal(resolveSpatialTargetTime(1, 0.72), 0.72);
});

test("mapping clamps pointer input outside the viewport", () => {
  assert.equal(resolveSpatialTargetTime(-3, 0.72), 0);
  assert.equal(resolveSpatialTargetTime(3, 0.72), 0.72);
});

test("gesture classification preserves vertical scrolling", () => {
  assert.equal(classifySpatialGesture(4, 4), "pending");
  assert.equal(classifySpatialGesture(18, 7), "horizontal");
  assert.equal(classifySpatialGesture(7, 18), "vertical");
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `node --test tests/cycle-spatial-view.test.mjs`

Expected: FAIL because `src/cycle-spatial-view.js` does not exist.

- [ ] **Step 3: Implement the pure model**

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampSpatialInput = (value) => clamp(value, -1, 1);

export function resolveSpatialTargetTime(normalizedX, duration) {
  const safeDuration = Number.isFinite(duration) ? Math.max(duration, 0) : 0;
  return ((clampSpatialInput(normalizedX) + 1) / 2) * safeDuration;
}

export function classifySpatialGesture(deltaX, deltaY, threshold = 8) {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) return "pending";
  return Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
}
```

- [ ] **Step 4: Generate the focused all-intra MP4**

Run:

```bash
ffmpeg -y -i "../cycle.mp4" \
  -filter_complex "[0:v]trim=start=7.74:end=8.096,setpts=PTS-STARTPTS[a];[0:v]trim=start=0:end=0.356,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,fps=30,scale=1280:720:flags=lanczos,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -crf 18 -preset slow -g 1 -keyint_min 1 -sc_threshold 0 -movflags +faststart \
  public/assets/hero-cycle-front.mp4
```

Verify: `ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,nb_frames -of default=noprint_wrappers=1 public/assets/hero-cycle-front.mp4`

Expected: H.264, 1280×720, approximately 0.71 seconds, approximately 21 frames, no audio stream.

- [ ] **Step 5: Run the model tests and commit**

Run: `node --test tests/cycle-spatial-view.test.mjs`

Expected: PASS.

Commit:

```bash
git add src/cycle-spatial-view.js tests/cycle-spatial-view.test.mjs public/assets/hero-cycle-front.mp4
git commit -m "feat: add seam-safe spatial view model"
```

---

### Task 2: Settled-Hero pointer and touch controller

**Files:**
- Create: `src/use-cycle-spatial-view.js`
- Modify: `src/HeroSection.jsx`
- Modify: `src/styles.css`
- Create: `tests/cycle-spatial-view.dom.test.mjs`
- Modify: `tests/hero-integration.test.mjs`

**Interfaces:**
- Consumes: `resolveSpatialTargetTime(normalizedX, duration)`
- Consumes: `classifySpatialGesture(deltaX, deltaY, threshold)`
- Produces: `useCycleSpatialView({ heroRef, videoRef, active })`

- [ ] **Step 1: Write failing DOM tests**

Create a jsdom fixture containing a Hero element and cycle video. Assert that:

```js
test("settled desktop pointer selects the inverse local view", async () => {
  // Activate the hook fixture, dispatch pointermove at the Hero left edge,
  // advance one animation frame, and assert video.currentTime approaches 0.
});

test("horizontal touch owns spatial view while vertical touch remains scrollable", async () => {
  // Dispatch a horizontal touch/pointer sequence and assert target seeking.
  // Dispatch a vertical sequence and assert preventDefault was not called.
});

test("inactive and reduced-motion modes keep the frontal poster", async () => {
  // Assert no cycle seek occurs before reveal or with reduced motion enabled.
});
```

Update `hero-integration.test.mjs` to require:

```js
assert.match(heroSource, /hero-cycle-front\.mp4/);
assert.match(heroSource, /useCycleSpatialView/);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/cycle-spatial-view.dom.test.mjs tests/hero-integration.test.mjs`

Expected: FAIL because the hook and Hero cycle layer are missing.

- [ ] **Step 3: Implement the controller hook**

The hook must:

```js
export function useCycleSpatialView({ heroRef, videoRef, active }) {
  // Keep target/current normalized X refs.
  // Fine pointer: map Hero-relative clientX to [-1, 1].
  // Touch pointer: classify the gesture; update only horizontal gestures.
  // On leave/up/cancel: target returns to 0.
  // RAF interpolation: current += (target - current) * 0.14.
  // Convert current to currentTime with resolveSpatialTargetTime.
  // Disable seeking for reduced motion, inactive state, or unavailable media.
}
```

Use `requestVideoFrameCallback` to avoid overlapping seeks and `seeked` as fallback. The hook must not call `preventDefault()` for vertical gestures.

- [ ] **Step 4: Add the settled cycle layer**

In `HeroSection.jsx`:

```jsx
const cycleVideoRef = useRef(null);
const spatialViewActive = ["revealed", "released"].includes(heroState);
useCycleSpatialView({
  heroRef,
  videoRef: cycleVideoRef,
  active: spatialViewActive,
});
```

Render above the poster:

```jsx
<video
  ref={cycleVideoRef}
  className="hero__cycle-scene"
  src="/assets/hero-cycle-front.mp4"
  poster="/assets/hero-poster.webp"
  muted
  playsInline
  preload="auto"
  aria-hidden="true"
/>
```

Keep the poster underneath until the cycle layer reports usable media. Remove the final-scene planar `rotateX`/`rotateY` behavior; the settled spatial response comes from video seeking.

- [ ] **Step 5: Run focused and full tests, then commit**

Run:

```bash
node --test tests/cycle-spatial-view.dom.test.mjs tests/hero-integration.test.mjs
npm test
```

Expected: all tests PASS.

Commit:

```bash
git add src/use-cycle-spatial-view.js src/HeroSection.jsx src/styles.css tests/cycle-spatial-view.dom.test.mjs tests/hero-integration.test.mjs
git commit -m "feat: control settled hero view with pointer"
```

---

### Task 3: Full-page pointer light

**Files:**
- Create: `src/PointerLight.jsx`
- Modify: `src/App.jsx`
- Modify: `src/HeroSection.jsx`
- Modify: `src/styles.css`
- Create: `tests/pointer-light.dom.test.mjs`

**Interfaces:**
- Consumes: `resolvePointerLight(previous, next, elapsedMs)` from `src/hero-parallax.js`
- Produces: `<PointerLight />`

- [ ] **Step 1: Write failing pointer-light tests**

```js
test("pointer light follows viewport coordinates outside Hero", () => {
  // Mount PointerLight, dispatch window pointermove at (320, 240),
  // and assert --light-x is 320px and --light-y is 240px.
});

test("pointer light is decorative and cannot intercept clicks", () => {
  // Assert aria-hidden=true and the global pointer-light class.
});

test("coarse pointer and reduced motion keep the light hidden", () => {
  // Stub matchMedia and assert opacity remains zero.
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/pointer-light.dom.test.mjs`

Expected: FAIL because `PointerLight.jsx` does not exist.

- [ ] **Step 3: Implement and mount the global light**

`PointerLight.jsx` listens to `window.pointermove`, interpolates viewport pixel coordinates in RAF, and renders:

```jsx
<img
  className="pointer-light"
  src="/assets/hero-light-spot.png"
  alt=""
  aria-hidden="true"
/>
```

Mount `<PointerLight />` once near the App root. Remove `.hero__pointer-light` and its pointer-light state from `HeroSection.jsx`.

CSS requirements:

```css
.pointer-light {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  mix-blend-mode: screen;
}
```

Hide it for `(pointer: coarse)` and `(prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run focused and full tests, then commit**

Run:

```bash
node --test tests/pointer-light.dom.test.mjs
npm test
```

Expected: all tests PASS.

Commit:

```bash
git add src/PointerLight.jsx src/App.jsx src/HeroSection.jsx src/styles.css tests/pointer-light.dom.test.mjs
git commit -m "feat: extend pointer light across portfolio"
```

---

### Task 4: Contact background, WeChat copy, and Experience hierarchy

**Files:**
- Create: `public/assets/contact-bg-03.webp`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `tests/copy-buttons.dom.test.mjs`
- Modify: `tests/layout-style-regression.test.mjs`

**Interfaces:**
- Consumes: existing `<CopyButton />`

- [ ] **Step 1: Write failing behavior and style tests**

Add a Contact DOM test that clicks the Contact WeChat control and asserts:

```js
assert.equal(copiedValue, "LKchat1980");
assert.match(button.textContent, /已复制微信号/);
assert.equal(button.dataset.trackLabel, "Wechat: LKchat1980");
```

Add computed-style/layout assertions that the company-name cell resolves to `rgb(255, 255, 255)` and the Contact background references `contact-bg-03.webp`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/copy-buttons.dom.test.mjs tests/layout-style-regression.test.mjs`

Expected: FAIL because Contact WeChat is plain text and the new styles/assets are absent.

- [ ] **Step 3: Convert the supplied Contact background**

Run:

```bash
ffmpeg -y -i "../contact-bg 03.png" -c:v libwebp -quality 84 -compression_level 6 public/assets/contact-bg-03.webp
```

Verify dimensions and output size:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 public/assets/contact-bg-03.webp
ls -lh public/assets/contact-bg-03.webp
```

- [ ] **Step 4: Implement Contact and Experience changes**

Replace the plain Contact WeChat span with:

```jsx
<CopyButton
  className="contact__copy-link"
  value="LKchat1980"
  label="Wechat：LKchat1980"
  copiedLabel="已复制微信号"
  trackLabel="Wechat: LKchat1980"
/>
```

Style `.contact__copy-link` as an inline text control matching adjacent details. Change the Contact background URL to `/assets/contact-bg-03.webp`. Set `.experience-row span:first-child { color: #fff; }`.

- [ ] **Step 5: Run focused and full tests, then commit**

Run:

```bash
node --test tests/copy-buttons.dom.test.mjs tests/layout-style-regression.test.mjs
npm test
```

Expected: all tests PASS.

Commit:

```bash
git add public/assets/contact-bg-03.webp src/App.jsx src/styles.css tests/copy-buttons.dom.test.mjs tests/layout-style-regression.test.mjs
git commit -m "fix: refine contact and experience details"
```

---

### Task 5: Build and browser verification

**Files:**
- Modify only if verification reveals a regression in the files owned by Tasks 1–4.
- Create: `artifacts/cycle-spatial-desktop.png`
- Create: `artifacts/cycle-spatial-mobile.png`

**Interfaces:**
- Consumes: completed Tasks 1–4.

- [ ] **Step 1: Run fresh automated verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: zero test failures, successful Vite/Sites build, no whitespace errors.

- [ ] **Step 2: Verify desktop behavior in a real browser**

At 1440×900:

- Advance the Hero intro to settled state.
- Capture center, left, and right pointer positions.
- Confirm only subtle ±15-degree views appear and no 360-degree middle frame is visible.
- Scroll through every section and confirm the light follows the cursor.
- Click Contact WeChat and confirm `已复制微信号`.
- Confirm Experience company names are white.

- [ ] **Step 3: Verify mobile behavior in a real browser**

At 390×844:

- Advance the Hero intro with vertical swipes.
- Drag horizontally after reveal and confirm the spatial view responds.
- Swipe vertically and confirm the page scrolls.
- Confirm no orientation-permission prompt appears.
- Confirm Contact background crop and copy control remain legible.

- [ ] **Step 4: Re-run verification after any browser fix**

Run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: all checks pass; `design-qa.md` remains the only unrelated user modification.

