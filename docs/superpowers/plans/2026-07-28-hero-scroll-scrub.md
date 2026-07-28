# Hero Scroll-Scrub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hero autoplay with a monotonic scroll/swipe-controlled 8-second video sequence, then crossfade to the supplied final poster, reveal copy in order, and release the existing page scroll.

**Architecture:** Keep input normalization and state transitions as pure functions in `hero-controller.js`, and isolate pointer math in `hero-parallax.js`. A focused React hook owns browser events, video seeking, readiness timeout, and cleanup; `HeroSection.jsx` owns Hero markup and reveal completion while `App.jsx` keeps the rest of the portfolio unchanged.

**Tech Stack:** React 19, Vite 6, CSS, Node.js built-in test runner, local `ffmpeg` and `cwebp` CLIs.

## Global Constraints

- The video never autoplays on page load.
- Vertical scroll/swipe is the only input that advances the video.
- Pointer movement in any direction affects parallax but not progress.
- The cumulative distance required to complete the 8-second video is `clamp(2.2 × viewport height, 1200 px, 2200 px)`.
- The Hero completes in approximately two to three deliberate scroll/swipe gestures.
- The final poster locks and does not rewind during the page session.
- Copy and capsules reveal only after the final visual appears.
- The page releases only after the reveal completes, and the next downward input moves into the second section.
- Desktop parallax is bounded to ±18 px horizontal translation, ±12 px vertical translation, ±0.7° Y rotation, ±0.5° X rotation, with a base scale of approximately 1.04.
- Touch/coarse-pointer devices do not display the pointer light or activate desktop pointer parallax.
- Reduced-motion users see the complete final state immediately and retain native scrolling.
- Media readiness failure after 4 seconds shows the final state and releases native scrolling.
- The delivery video is 1920 × 1080, H.264, `yuv420p`, 24 fps, audio-free, fast-start, short-GOP, and at or below 6 MiB.
- Source masters remain unchanged.
- Existing Approach coverage, Contact copy, CTA, footer, visitor monitor, and project case behavior remain unchanged.

---

## File Structure

- `src/hero-controller.js`: pure wheel/touch normalization, scrub distance, monotonic progress, state transition, and release-gate functions.
- `src/hero-parallax.js`: pure pointer normalization, bounded transform, and light-response calculations.
- `src/use-hero-scroll-scrub.js`: window event subscription, media readiness, RAF smoothing, video seeking, failure timeout, and cleanup.
- `src/HeroSection.jsx`: Hero DOM, pointer RAF, supplied light image, reveal sequence completion, and navigation gate.
- `src/CopyButton.jsx`: existing shared clipboard action moved out of `App.jsx` so Hero and Contact use one implementation.
- `src/App.jsx`: replace the inline Hero implementation with `HeroSection`.
- `src/styles.css`: shared visual stage, poster crossfade, sequential copy animations, pointer-light treatment, mobile/reduced-motion rules, and Contact background crop.
- `tests/hero-controller.test.mjs`: pure scrub and state-machine coverage.
- `tests/hero-parallax.test.mjs`: pure parallax and light bounds.
- `tests/hero-integration.test.mjs`: Hero component/hook contract and event-cleanup source checks.
- `tests/media-loading.test.mjs`: asset paths, dimensions/budgets, loading strategy, and source-asset policy.
- `tests/page-shell.test.mjs`: final Hero DOM/CSS contract and Contact background assertion.
- `public/assets/hero-bg-optimized.mp4`: new derivative of `hero-bg test 01.mp4`.
- `public/assets/hero-first-frame.webp`: real first frame of the new video.
- `public/assets/hero-poster.webp`: derivative of `hero-poster 02.png`.
- `public/assets/hero-light-spot.png`: unchanged alpha source copied from `light spot.png`.
- `public/assets/contact-bg.webp`: derivative of `contact-bg 02.png`.
- `source-assets/homepage/hero-bg.mp4`: source-asset copy of `hero-bg test 01.mp4`.

---

### Task 1: Prepare and verify the supplied media derivatives

**Files:**
- Modify: `source-assets/homepage/hero-bg.mp4`
- Modify: `public/assets/hero-bg-optimized.mp4`
- Create: `public/assets/hero-first-frame.webp`
- Modify: `public/assets/hero-poster.webp`
- Create: `public/assets/hero-light-spot.png`
- Modify: `public/assets/contact-bg.webp`
- Modify: `tests/media-loading.test.mjs`

**Interfaces:**
- Consumes: the four unchanged masters in `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5`.
- Produces: stable public URLs `/assets/hero-bg-optimized.mp4`, `/assets/hero-first-frame.webp`, `/assets/hero-poster.webp`, `/assets/hero-light-spot.png`, and `/assets/contact-bg.webp`.

- [ ] **Step 1: Update the failing media contract**

Replace the Hero/contact asset portions of `tests/media-loading.test.mjs` with:

```js
const homepageImages = [
  "/public/assets/hero-first-frame.webp",
  "/public/assets/hero-poster.webp",
  "/public/assets/hero-light-spot.png",
  "/public/assets/contact-bg.webp",
  ...projects.flatMap(({ defaultImage, hoverImage }) => [
    `/public${defaultImage}`,
    `/public${hoverImage}`,
  ]),
];

test("homepage media derivatives exist within delivery budgets", async () => {
  const imageSizes = await Promise.all(
    homepageImages.map(async (path) => (await stat(repoFile(path))).size),
  );
  const imageTotal = imageSizes.reduce((total, size) => total + size, 0);
  const { size: videoSize } = await stat(
    repoFile("/public/assets/hero-bg-optimized.mp4"),
  );

  assert.ok(
    imageTotal <= 10 * 1024 * 1024,
    `homepage images total ${(imageTotal / 1024 / 1024).toFixed(2)} MiB`,
  );
  assert.ok(
    videoSize <= 6 * 1024 * 1024,
    `hero video is ${(videoSize / 1024 / 1024).toFixed(2)} MiB`,
  );
});

```

Update the legacy-source list so `hero-chaos.webp` is no longer required, while retaining the existing checks that unoptimized PNG/JPG/MP4 masters do not appear under `public/assets`.

- [ ] **Step 2: Run the media test to verify it fails**

Run:

```bash
node --test \
  --test-name-pattern="homepage media derivatives" \
  tests/media-loading.test.mjs
```

Expected: FAIL because `hero-first-frame.webp` and `hero-light-spot.png` do not exist yet.

- [ ] **Step 3: Create the web derivatives without changing the masters**

Run:

```bash
cp "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-bg test 01.mp4" source-assets/homepage/hero-bg.mp4

/opt/homebrew/bin/ffmpeg -y \
  -i "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-bg test 01.mp4" \
  -an -vf "scale=1920:1080:flags=lanczos" -r 24 \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -g 12 -keyint_min 12 -sc_threshold 0 -movflags +faststart \
  public/assets/hero-bg-optimized.mp4

/opt/homebrew/bin/ffmpeg -y \
  -i "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-bg test 01.mp4" \
  -frames:v 1 -vf "scale=1920:1080:flags=lanczos" \
  /private/tmp/hero-first-frame.png

/opt/homebrew/bin/cwebp -quiet -q 90 -metadata none \
  /private/tmp/hero-first-frame.png \
  -o public/assets/hero-first-frame.webp

/opt/homebrew/bin/cwebp -quiet -q 88 -metadata none \
  -resize 1920 1080 \
  "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-poster 02.png" \
  -o public/assets/hero-poster.webp

cp "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/light spot.png" \
  public/assets/hero-light-spot.png

/opt/homebrew/bin/cwebp -quiet -q 86 -metadata none \
  "/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/contact-bg 02.png" \
  -o public/assets/contact-bg.webp
```

Keep `light spot.png` lossless because its transparent glow edge is more vulnerable to compression halos than the photographic assets.

- [ ] **Step 4: Verify technical media properties and budgets**

Run:

```bash
/opt/homebrew/bin/ffprobe -v error \
  -show_entries stream=codec_name,width,height,r_frame_rate \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 \
  public/assets/hero-bg-optimized.mp4

stat -f "%N %z" \
  public/assets/hero-bg-optimized.mp4 \
  public/assets/hero-first-frame.webp \
  public/assets/hero-poster.webp \
  public/assets/hero-light-spot.png \
  public/assets/contact-bg.webp
```

Expected: one H.264 video stream, no AAC/audio stream, 1920×1080, 24/1 fps, approximately 8 seconds, and MP4 size ≤ 6,291,456 bytes.

- [ ] **Step 5: Run the media contract**

Run:

```bash
node --test \
  --test-name-pattern="homepage media derivatives" \
  tests/media-loading.test.mjs
```

Expected: the media derivative test PASS.

- [ ] **Step 6: Commit the media derivatives and contract**

```bash
git add \
  source-assets/homepage/hero-bg.mp4 \
  public/assets/hero-bg-optimized.mp4 \
  public/assets/hero-first-frame.webp \
  public/assets/hero-poster.webp \
  public/assets/hero-light-spot.png \
  public/assets/contact-bg.webp \
  tests/media-loading.test.mjs
git commit -m "assets: prepare scroll-driven hero media"
```

---

### Task 2: Build the monotonic Hero state controller

**Files:**
- Modify: `src/hero-controller.js`
- Modify: `tests/hero-controller.test.mjs`

**Interfaces:**
- Consumes: wheel/touch CSS-pixel deltas, viewport height, and the current `{ state, progress }`.
- Produces:
  - `HERO_STATES`
  - `normalizeWheelDelta(event, metrics): number`
  - `getHeroScrubDistance(viewportHeight): number`
  - `resolveTouchAdvance(previousY, currentY): number`
  - `advanceHeroScrub(model, deltaPixels, viewportHeight): HeroModel`
  - `resolveHeroRelease(model, deltaPixels): HeroModel`
  - `shouldCaptureHeroInput(state): boolean`

- [ ] **Step 1: Replace the old phase tests with failing state-machine tests**

Use this test contract in `tests/hero-controller.test.mjs`:

```js
import {
  HERO_STATES,
  advanceHeroScrub,
  getHeroScrubDistance,
  normalizeWheelDelta,
  resolveHeroRelease,
  resolveTouchAdvance,
  shouldCaptureHeroInput,
} from "../src/hero-controller.js";

test("scrub distance follows the approved viewport clamp", () => {
  assert.equal(getHeroScrubDistance(400), 1200);
  assert.equal(getHeroScrubDistance(800), 1760);
  assert.equal(getHeroScrubDistance(1400), 2200);
});

test("wheel delta modes normalize to CSS pixels", () => {
  assert.equal(normalizeWheelDelta({ deltaY: 20, deltaMode: 0 }, {}), 20);
  assert.equal(
    normalizeWheelDelta(
      { deltaY: 3, deltaMode: 1 },
      { lineHeight: 18, pageHeight: 900 },
    ),
    54,
  );
  assert.equal(
    normalizeWheelDelta(
      { deltaY: 1, deltaMode: 2 },
      { lineHeight: 18, pageHeight: 900 },
    ),
    900,
  );
});

test("positive input advances monotonically and one large event is capped", () => {
  const start = { state: HERO_STATES.READY, progress: 0 };
  const first = advanceHeroScrub(start, 440, 800);
  const backward = advanceHeroScrub(first, -500, 800);
  const huge = advanceHeroScrub(backward, 10000, 800);

  assert.equal(first.state, HERO_STATES.SCRUBBING);
  assert.equal(first.progress, 0.25);
  assert.deepEqual(backward, first);
  assert.equal(huge.progress, 0.4090909090909091);
});

test("completion enters resolving and cannot rewind", () => {
  const model = advanceHeroScrub(
    { state: HERO_STATES.SCRUBBING, progress: 0.95 },
    440,
    800,
  );

  assert.deepEqual(model, {
    state: HERO_STATES.RESOLVING,
    progress: 1,
  });
  assert.deepEqual(advanceHeroScrub(model, -200, 800), model);
});

test("revealed state releases on the next positive input", () => {
  const revealed = { state: HERO_STATES.REVEALED, progress: 1 };

  assert.equal(shouldCaptureHeroInput(HERO_STATES.RESOLVING), true);
  assert.equal(shouldCaptureHeroInput(HERO_STATES.REVEALED), false);
  assert.deepEqual(resolveHeroRelease(revealed, -20), revealed);
  assert.deepEqual(resolveHeroRelease(revealed, 20), {
    state: HERO_STATES.RELEASED,
    progress: 1,
  });
});

test("upward finger travel maps to positive advance only", () => {
  assert.equal(resolveTouchAdvance(700, 540), 160);
  assert.equal(resolveTouchAdvance(540, 700), 0);
});
```

- [ ] **Step 2: Run the controller tests to verify they fail**

Run:

```bash
node --test tests/hero-controller.test.mjs
```

Expected: FAIL because the new exports do not exist and the old autoplay/phase model is still present.

- [ ] **Step 3: Implement the minimal pure controller**

Replace `src/hero-controller.js` with:

```js
export const HERO_STATES = Object.freeze({
  READY: "ready",
  SCRUBBING: "scrubbing",
  RESOLVING: "resolving",
  REVEALED: "revealed",
  RELEASED: "released",
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getHeroScrubDistance(viewportHeight) {
  return clamp(viewportHeight * 2.2, 1200, 2200);
}

export function normalizeWheelDelta(
  { deltaY, deltaMode },
  { lineHeight = 16, pageHeight = 0 } = {},
) {
  if (deltaMode === 1) return deltaY * lineHeight;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

export function resolveTouchAdvance(previousY, currentY) {
  return Math.max(0, previousY - currentY);
}

export function shouldCaptureHeroInput(state) {
  return [
    HERO_STATES.READY,
    HERO_STATES.SCRUBBING,
    HERO_STATES.RESOLVING,
  ].includes(state);
}

export function advanceHeroScrub(model, deltaPixels, viewportHeight) {
  if (
    ![HERO_STATES.READY, HERO_STATES.SCRUBBING].includes(model.state) ||
    deltaPixels <= 0
  ) {
    return model;
  }

  const distance = getHeroScrubDistance(viewportHeight);
  const cappedDelta = Math.min(deltaPixels, viewportHeight * 0.35);
  const progress = clamp(model.progress + cappedDelta / distance, 0, 1);

  return {
    state:
      progress === 1 ? HERO_STATES.RESOLVING : HERO_STATES.SCRUBBING,
    progress,
  };
}

export function resolveHeroRelease(model, deltaPixels) {
  if (model.state === HERO_STATES.REVEALED && deltaPixels > 0) {
    return { state: HERO_STATES.RELEASED, progress: 1 };
  }
  return model;
}
```

The React hook always supplies current line and page metrics; the pure helper keeps a browser-independent default for Node tests.

- [ ] **Step 4: Run the controller tests**

Run:

```bash
node --test tests/hero-controller.test.mjs
```

Expected: all Hero controller tests PASS.

- [ ] **Step 5: Commit the pure controller**

```bash
git add src/hero-controller.js tests/hero-controller.test.mjs
git commit -m "feat: add monotonic hero scrub controller"
```

---

### Task 3: Add bounded two-dimensional parallax and pointer-light math

**Files:**
- Create: `src/hero-parallax.js`
- Create: `tests/hero-parallax.test.mjs`

**Interfaces:**
- Consumes: pointer coordinates, Hero bounds, previous pointer sample, and elapsed milliseconds.
- Produces:
  - `normalizeHeroPointer(event, rect): { x: number, y: number, percentX: number, percentY: number }`
  - `resolveHeroParallax(pointer): { translateX: number, translateY: number, rotateX: number, rotateY: number, scale: number }`
  - `resolvePointerLight(previous, next, elapsedMs): { velocity: number, scale: number, opacity: number }`

- [ ] **Step 1: Write the failing parallax tests**

Create `tests/hero-parallax.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHeroPointer,
  resolveHeroParallax,
  resolvePointerLight,
} from "../src/hero-parallax.js";

test("pointer normalization is centered and clamped", () => {
  const rect = { left: 100, top: 50, width: 1000, height: 600 };

  assert.deepEqual(
    normalizeHeroPointer({ clientX: 600, clientY: 350 }, rect),
    { x: 0, y: 0, percentX: 50, percentY: 50 },
  );
  assert.deepEqual(
    normalizeHeroPointer({ clientX: -100, clientY: 900 }, rect),
    { x: -1, y: 1, percentX: 0, percentY: 100 },
  );
});

test("parallax remains inside approved desktop limits", () => {
  assert.deepEqual(resolveHeroParallax({ x: 1, y: -1 }), {
    translateX: 18,
    translateY: -12,
    rotateX: 0.5,
    rotateY: 0.7,
    scale: 1.04,
  });
});

test("pointer light responds to velocity within narrow bounds", () => {
  const still = resolvePointerLight(
    { clientX: 100, clientY: 100 },
    { clientX: 100, clientY: 100 },
    16,
  );
  const fast = resolvePointerLight(
    { clientX: 100, clientY: 100 },
    { clientX: 500, clientY: 300 },
    16,
  );

  assert.deepEqual(still, { velocity: 0, scale: 0.96, opacity: 0.64 });
  assert.equal(fast.velocity, 1);
  assert.equal(fast.scale, 1.08);
  assert.equal(fast.opacity, 0.84);
});
```

- [ ] **Step 2: Run the parallax tests to verify they fail**

Run:

```bash
node --test tests/hero-parallax.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/hero-parallax.js`.

- [ ] **Step 3: Implement the parallax helper**

Create `src/hero-parallax.js`:

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeHeroPointer({ clientX, clientY }, rect) {
  const percentX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  const percentY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

  return {
    x: (percentX - 50) / 50,
    y: (percentY - 50) / 50,
    percentX,
    percentY,
  };
}

export function resolveHeroParallax({ x, y }) {
  return {
    translateX: x * 18,
    translateY: y * 12,
    rotateX: y * -0.5,
    rotateY: x * 0.7,
    scale: 1.04,
  };
}

export function resolvePointerLight(previous, next, elapsedMs) {
  const distance = Math.hypot(
    next.clientX - previous.clientX,
    next.clientY - previous.clientY,
  );
  const velocity = clamp(distance / Math.max(elapsedMs, 1) / 1.4, 0, 1);

  return {
    velocity,
    scale: 0.96 + velocity * 0.12,
    opacity: 0.64 + velocity * 0.2,
  };
}
```

- [ ] **Step 4: Run the parallax tests**

Run:

```bash
node --test tests/hero-parallax.test.mjs
```

Expected: all parallax tests PASS.

- [ ] **Step 5: Commit the parallax helper**

```bash
git add src/hero-parallax.js tests/hero-parallax.test.mjs
git commit -m "feat: add bounded hero parallax model"
```

---

### Task 4: Integrate scroll/swipe seeking and the five-state Hero flow

**Files:**
- Create: `src/use-hero-scroll-scrub.js`
- Create: `src/HeroSection.jsx`
- Create: `src/CopyButton.jsx`
- Modify: `src/App.jsx:1-245`
- Create: `tests/hero-integration.test.mjs`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: Task 2 controller exports, Task 3 pointer exports, `videoRef`, `heroRef`, browser wheel/touch/keyboard/media events.
- Produces:
  - `useHeroScrollScrub({ videoRef }): { heroState, renderedProgress, completeReveal, failMedia, releaseHero }`
  - `HeroSection(): JSX.Element`
  - Hero root class `hero hero--<state>`
  - CSS variables `--stage-x`, `--stage-y`, `--stage-rx`, `--stage-ry`, `--stage-scale`, `--light-x`, `--light-y`, `--light-scale`, and `--light-opacity`.

- [ ] **Step 1: Write the failing integration contract**

Create `tests/hero-integration.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HeroSection uses one shared visual stage and supplied assets", async () => {
  const source = await readFile(
    new URL("../src/HeroSection.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /className="hero__stage"/);
  assert.match(source, /className="hero__video"/);
  assert.match(source, /className="hero__final-scene"/);
  assert.match(source, /className="hero__pointer-light"/);
  assert.match(source, /\/assets\/hero-first-frame\.webp/);
  assert.match(source, /\/assets\/hero-light-spot\.png/);
  assert.doesNotMatch(source, /hero__distortion/);
  assert.doesNotMatch(source, /\.play\(/);
});

test("scrub hook installs cancellable desktop, touch, and keyboard input", async () => {
  const source = await readFile(
    new URL("../src/use-hero-scroll-scrub.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /addEventListener\("wheel", handleWheel, \{ passive: false \}\)/);
  assert.match(source, /addEventListener\("touchmove", handleTouchMove, \{ passive: false \}\)/);
  assert.match(source, /addEventListener\("keydown", handleKeyDown\)/);
  assert.match(source, /removeEventListener\("wheel", handleWheel\)/);
  assert.match(source, /removeEventListener\("touchmove", handleTouchMove\)/);
  assert.match(source, /removeEventListener\("keydown", handleKeyDown\)/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /4000/);
});

test("App delegates the Hero without changing the remaining page sections", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /<HeroSection \/>/);
  assert.doesNotMatch(source, /attemptPlayback/);
  for (const id of ["approach", "work", "contact"]) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
});
```

Update the existing Hero asset assertions in `tests/page-shell.test.mjs` to read `HeroSection.jsx`, require `hero--resolving`, `hero--revealed`, and `hero--released` class construction, and reject the old `hero--settled`/distortion contract.

- [ ] **Step 2: Run the integration tests to verify they fail**

Run:

```bash
node --test tests/hero-integration.test.mjs tests/page-shell.test.mjs
```

Expected: FAIL because the hook and component do not exist and `App.jsx` still autoplays the video.

- [ ] **Step 3: Implement the scroll-scrub hook**

Create `src/use-hero-scroll-scrub.js`:

```js
import { useCallback, useEffect, useRef, useState } from "react";

import {
  HERO_STATES,
  advanceHeroScrub,
  normalizeWheelDelta,
  resolveHeroRelease,
  resolveTouchAdvance,
  shouldCaptureHeroInput,
} from "./hero-controller.js";

const ADVANCE_KEYS = new Set(["ArrowDown", "PageDown", " "]);

export function useHeroScrollScrub({ videoRef }) {
  const [model, setModel] = useState({
    state: HERO_STATES.READY,
    progress: 0,
  });
  const modelRef = useRef(model);
  const targetProgressRef = useRef(0);
  const renderedProgressRef = useRef(0);
  const readyRef = useRef(false);

  const publish = useCallback((next) => {
    modelRef.current = next;
    targetProgressRef.current = next.progress;
    setModel(next);
  }, []);

  const failMedia = useCallback(() => {
    readyRef.current = false;
    publish({ state: HERO_STATES.RELEASED, progress: 1 });
  }, [publish]);

  const releaseHero = useCallback(() => {
    if (modelRef.current.state === HERO_STATES.REVEALED) {
      publish({ state: HERO_STATES.RELEASED, progress: 1 });
    }
  }, [publish]);

  const completeReveal = useCallback(() => {
    if (modelRef.current.state === HERO_STATES.RESOLVING) {
      publish({ state: HERO_STATES.REVEALED, progress: 1 });
    }
  }, [publish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    video.pause();
    video.currentTime = 0;

    if (reducedMotion) {
      publish({ state: HERO_STATES.RELEASED, progress: 1 });
      return undefined;
    }

    let animationFrameId = 0;
    let videoFrameId = null;
    let disposed = false;
    let touchPoint = null;

    const handleMetadata = () => {
      readyRef.current = true;
    };

    const handleReady = () => {
      handleMetadata();
      window.clearTimeout(failureTimerId);
    };

    const failureTimerId = window.setTimeout(failMedia, 4000);

    if (video.readyState >= 1) {
      handleMetadata();
    }
    if (video.readyState >= 2) {
      handleReady();
    }

    const publishInput = (deltaPixels, event) => {
      const current = modelRef.current;
      const released = resolveHeroRelease(current, deltaPixels);

      if (released !== current) {
        publish(released);
        return;
      }

      if (shouldCaptureHeroInput(current.state)) {
        event.preventDefault();
      }

      if (![HERO_STATES.READY, HERO_STATES.SCRUBBING].includes(current.state)) {
        return;
      }

      const next = advanceHeroScrub(
        current,
        deltaPixels,
        window.innerHeight,
      );

      targetProgressRef.current = next.progress;

      if (next.state === HERO_STATES.RESOLVING) {
        const queued = {
          state: HERO_STATES.SCRUBBING,
          progress: next.progress,
        };
        modelRef.current = queued;
        setModel(queued);
        return;
      }

      publish(next);
    };

    const handleWheel = (event) => {
      const lineHeight =
        Number.parseFloat(getComputedStyle(document.documentElement).lineHeight) ||
        16;
      const delta = normalizeWheelDelta(event, {
        lineHeight,
        pageHeight: window.innerHeight,
      });
      publishInput(delta, event);
    };

    const handleTouchStart = (event) => {
      const touch = event.touches[0];
      touchPoint = touch
        ? { clientX: touch.clientX, clientY: touch.clientY }
        : null;
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      const current = modelRef.current;

      if (!touch || !touchPoint) return;

      if (shouldCaptureHeroInput(current.state)) {
        event.preventDefault();
      }

      const horizontal = Math.abs(touch.clientX - touchPoint.clientX);
      const vertical = Math.abs(touch.clientY - touchPoint.clientY);
      const delta =
        vertical > horizontal
          ? resolveTouchAdvance(touchPoint.clientY, touch.clientY)
          : 0;

      touchPoint = { clientX: touch.clientX, clientY: touch.clientY };
      publishInput(delta, event);
    };

    const handleTouchEnd = () => {
      touchPoint = null;
    };

    const handleKeyDown = (event) => {
      if (!ADVANCE_KEYS.has(event.key)) return;
      publishInput(window.innerHeight * 0.28, event);
    };

    const requestSeek = (nextTime) => {
      if (
        !readyRef.current ||
        !Number.isFinite(video.duration) ||
        Math.abs(video.currentTime - nextTime) < 1 / 48
      ) {
        return;
      }

      if ("requestVideoFrameCallback" in video) {
        if (videoFrameId !== null) return;
        video.currentTime = nextTime;
        videoFrameId = video.requestVideoFrameCallback(() => {
          videoFrameId = null;
        });
        return;
      }

      video.currentTime = nextTime;
    };

    const render = () => {
      const target = targetProgressRef.current;
      const current = renderedProgressRef.current;
      const difference = target - current;
      const rendered =
        Math.abs(difference) < 0.001 ? target : current + difference * 0.16;

      renderedProgressRef.current = rendered;

      const finalUsableTime = Math.max((video.duration || 8) - 1 / 24, 0);
      requestSeek(rendered * finalUsableTime);

      if (
        target === 1 &&
        rendered >= 0.999 &&
        modelRef.current.state === HERO_STATES.SCRUBBING
      ) {
        publish({ state: HERO_STATES.RESOLVING, progress: 1 });
      }

      if (!disposed) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.clearTimeout(failureTimerId);
      window.cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameId);
      }
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [failMedia, publish, videoRef]);

  return {
    heroState: model.state,
    renderedProgress: renderedProgressRef.current,
    completeReveal,
    failMedia,
    releaseHero,
  };
}
```

Do not call `video.play()`. The rendered state enters `resolving` only after the eased progress reaches the final usable frame, so the poster cannot overtake a still-seeking video.

- [ ] **Step 4: Move the shared copy action into its own component**

Create `src/CopyButton.jsx` with the current behavior plus the animation callback needed by the Hero:

```jsx
import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { copyText } from "./copy-text.js";

export function CopyButton({
  value,
  label,
  copiedLabel,
  className,
  trackLabel,
  showArrow = false,
  onAnimationEnd,
}) {
  const [copyState, setCopyState] = useState("idle");
  const feedbackTimerRef = useRef(null);

  useEffect(
    () => () => window.clearTimeout(feedbackTimerRef.current),
    [],
  );

  const handleCopy = async () => {
    const copied = await copyText(value);
    setCopyState(copied ? "copied" : "failed");
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(
      () => setCopyState("idle"),
      1800,
    );
  };

  const visibleLabel =
    copyState === "copied"
      ? copiedLabel
      : copyState === "failed"
        ? "复制失败，请重试"
        : label;

  return (
    <button
      className={`${className} copy-action copy-action--${copyState}`}
      type="button"
      data-track-label={trackLabel}
      onClick={handleCopy}
      onAnimationEnd={onAnimationEnd}
      aria-live="polite"
    >
      {visibleLabel}
      {copyState === "copied" ? (
        <span className="copy-action__status" aria-hidden="true">
          ✓
        </span>
      ) : (
        showArrow && (
          <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
        )
      )}
    </button>
  );
}
```

Import `CopyButton` from `./CopyButton.jsx` in both `App.jsx` and `HeroSection.jsx`.

- [ ] **Step 5: Extract `HeroSection` and wire the five states**

Create `src/HeroSection.jsx`. Import `ArrowDown`, React refs/effect, `CopyButton`, the Task 3 helpers, and `useHeroScrollScrub`. Preserve the current navigation/title/subtitle/action labels exactly. Use this complete DOM structure:

```jsx
import { ArrowDown } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { CopyButton } from "./CopyButton.jsx";
import {
  normalizeHeroPointer,
  resolveHeroParallax,
  resolvePointerLight,
} from "./hero-parallax.js";
import { useHeroScrollScrub } from "./use-hero-scroll-scrub.js";

export function HeroSection() {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const {
    heroState,
    completeReveal,
    failMedia,
    releaseHero,
  } = useHeroScrollScrub({ videoRef });
```

After the initialization above, add the pointer members and navigation/reveal handlers specified below. End the component with this return block:

```jsx
return (
  <section
    ref={heroRef}
    className={`hero hero--${heroState}`}
    id="hero"
    data-track-section
    data-track-label="HERO"
    onPointerMove={handlePointerMove}
    onPointerLeave={handlePointerLeave}
  >
    <div className="hero__stage" aria-hidden="true">
      <video
        ref={videoRef}
        className="hero__video"
        src="/assets/hero-bg-optimized.mp4"
        poster="/assets/hero-first-frame.webp"
        muted
        playsInline
        preload="metadata"
        onError={failMedia}
      />
      <img
        className="hero__final-scene"
        src="/assets/hero-poster.webp"
        alt=""
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() =>
          heroRef.current?.classList.add("hero--poster-failed")
        }
      />
    </div>
    <img
      className="hero__pointer-light"
      src="/assets/hero-light-spot.png"
      alt=""
      aria-hidden="true"
      onError={(event) =>
        event.currentTarget.classList.add("is-unavailable")
      }
    />
    <div className="hero__scrim" aria-hidden="true" />

    <nav
      className="top-nav"
      aria-label="主导航"
      onClick={handleHeroNavigation}
    >
      <a className="top-nav__brand" href="#hero">
        Kid Long
      </a>
      <div className="top-nav__links">
        <a href="#work">Work</a>
        <a href="#experience">Info</a>
        <a href="#contact">Connect</a>
      </div>
      <a className="top-nav__talk" href="#contact">
        Let&apos;s Talk
      </a>
    </nav>

    <div className="hero__content">
      <h1>
        Design for Business
        <br />
        Momentum
      </h1>
      <p>以视觉系统、上市传播与用户体验，推动品牌认知与业务转化</p>
      <div className="hero__actions" onClick={handleHeroNavigation}>
        <a className="button button--light" href="#work">
          View selected work
          <ArrowDown aria-hidden="true" size={14} weight="regular" />
        </a>
        <CopyButton
          className="wechat-pill"
          value="LKchat1980"
          label="Wechat: LKchat1980"
          copiedLabel="已复制微信号"
          trackLabel="Wechat: LKchat1980"
          onAnimationEnd={handleRevealAnimationEnd}
        />
      </div>
    </div>
  </section>
);
}
```

Extend `CopyButton` with an optional `onAnimationEnd` prop and pass it to its `<button>`. Implement `handleRevealAnimationEnd` as:

```js
const handleRevealAnimationEnd = (event) => {
  if (event.animationName === "hero-wechat-in") {
    completeReveal();
  }
};
```

Use one pointer RAF loop to ease current transform values 14% toward the latest target values. Store `{ x, y, percentX, percentY }` from `normalizeHeroPointer`, convert it with `resolveHeroParallax`, and write the eight CSS custom properties to `heroRef.current.style`. On pointer leave, set normalized X/Y targets to zero and light opacity to zero. Skip pointer updates when either `(pointer: coarse)` or `(max-width: 760px)` matches.

Implement that pointer loop with these component members:

```js
const pointerTargetRef = useRef({
  x: 0,
  y: 0,
  percentX: 50,
  percentY: 50,
  lightScale: 0.96,
  lightOpacity: 0,
});
const pointerCurrentRef = useRef({ ...pointerTargetRef.current });
const previousPointerRef = useRef(null);

useEffect(() => {
  const hero = heroRef.current;
  if (!hero) return undefined;
  if (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 760px)").matches
  ) {
    return undefined;
  }

  let frameId = 0;
  const renderPointer = () => {
    const current = pointerCurrentRef.current;
    const target = pointerTargetRef.current;

    for (const key of Object.keys(current)) {
      current[key] += (target[key] - current[key]) * 0.14;
    }

    const transform = resolveHeroParallax(current);
    hero.style.setProperty("--stage-x", `${transform.translateX}px`);
    hero.style.setProperty("--stage-y", `${transform.translateY}px`);
    hero.style.setProperty("--stage-rx", `${transform.rotateX}deg`);
    hero.style.setProperty("--stage-ry", `${transform.rotateY}deg`);
    hero.style.setProperty("--stage-scale", transform.scale);
    hero.style.setProperty("--light-x", `${current.percentX}%`);
    hero.style.setProperty("--light-y", `${current.percentY}%`);
    hero.style.setProperty("--light-scale", current.lightScale);
    hero.style.setProperty("--light-opacity", current.lightOpacity);
    frameId = window.requestAnimationFrame(renderPointer);
  };

  frameId = window.requestAnimationFrame(renderPointer);
  return () => window.cancelAnimationFrame(frameId);
}, []);

const handlePointerMove = (event) => {
  const hero = heroRef.current;
  if (!hero) return;
  if (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 760px)").matches
  ) {
    return;
  }

  const normalized = normalizeHeroPointer(
    event,
    hero.getBoundingClientRect(),
  );
  const now = performance.now();
  const previous = previousPointerRef.current ?? {
    clientX: event.clientX,
    clientY: event.clientY,
    time: now,
  };
  const light = resolvePointerLight(
    previous,
    event,
    now - previous.time,
  );

  pointerTargetRef.current = {
    ...normalized,
    lightScale: light.scale,
    lightOpacity: light.opacity,
  };
  previousPointerRef.current = {
    clientX: event.clientX,
    clientY: event.clientY,
    time: now,
  };
};

const handlePointerLeave = () => {
  pointerTargetRef.current = {
    x: 0,
    y: 0,
    percentX: 50,
    percentY: 50,
    lightScale: 0.96,
    lightOpacity: 0,
  };
  previousPointerRef.current = null;
};
```

Implement the navigation gate:

```js
const handleHeroNavigation = (event) => {
  const anchor = event.target.closest("a[href^='#']");
  if (!anchor || anchor.getAttribute("href") === "#hero") return;

  if (["ready", "scrubbing", "resolving"].includes(heroState)) {
    event.preventDefault();
    return;
  }

  if (heroState === "revealed") {
    releaseHero();
  }
};
```

- [ ] **Step 6: Replace the inline Hero in `App.jsx`**

Import `HeroSection` and replace the entire existing `<section className="hero">…</section>` block with:

```jsx
<HeroSection />
```

Remove `ArrowDown`, Hero refs/state/effect/pointer handlers, `resolveHeroMode`, `resolveHeroPhase`, `resolveHeroPointer`, and the local `CopyButton` definition from `App.jsx`. Import `CopyButton` from `./CopyButton.jsx` for the Contact CTA.

- [ ] **Step 7: Run controller, parallax, integration, shell, and copy tests**

Run:

```bash
node --test \
  tests/hero-controller.test.mjs \
  tests/hero-parallax.test.mjs \
  tests/hero-integration.test.mjs \
  tests/page-shell.test.mjs \
  tests/copy-text.test.mjs
```

Expected: all selected tests PASS.

- [ ] **Step 8: Commit the React integration**

```bash
git add \
  src/use-hero-scroll-scrub.js \
  src/HeroSection.jsx \
  src/CopyButton.jsx \
  src/App.jsx \
  tests/hero-integration.test.mjs \
  tests/page-shell.test.mjs
git commit -m "feat: drive hero sequence from page scroll"
```

---

### Task 5: Implement the matched crossfade, staged copy reveal, and responsive Contact crop

**Files:**
- Modify: `src/styles.css:61-320`
- Modify: `src/styles.css:780-850`
- Modify: `src/styles.css:1286-1310`
- Modify: `src/styles.css:1297-1305`
- Modify: `src/styles.css:1406-1440`
- Modify: `src/styles.css:1555-1575`
- Modify: `src/styles.css:1595-1615`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: Task 4 Hero state classes and CSS variables.
- Produces: identical crop/transform for video and poster, 1050 ms poster transition, four sequential reveal animations, coarse-pointer suppression, reduced-motion immediate final state, and `contact-bg.webp` responsive crop.

- [ ] **Step 1: Add failing visual-contract assertions**

Append to `tests/page-shell.test.mjs`:

```js
test("Hero CSS shares one parallax stage and reveals content in order", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.hero__stage\s*\{[\s\S]*?--stage-scale/);
  assert.match(css, /\.hero__stage\s*\{[\s\S]*?perspective/);
  assert.match(css, /\.hero__video,[\s\S]*?\.hero__final-scene\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(css, /\.hero__final-scene\s*\{[\s\S]*?1050ms/);
  assert.match(css, /@keyframes hero-title-in/);
  assert.match(css, /@keyframes hero-subtitle-in/);
  assert.match(css, /@keyframes hero-primary-in/);
  assert.match(css, /@keyframes hero-wechat-in/);
  assert.match(css, /url\("\/assets\/hero-light-spot\.png"\)|hero__pointer-light/);
});

test("Contact uses the optimized replacement background", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.contact\s*\{[\s\S]*?url\("\/assets\/contact-bg\.webp"\)[\s\S]*?cover/,
  );
});
```

Remove the assertion that requires `.hero--settled .hero__video`.

- [ ] **Step 2: Run the shell test to verify the new contract fails**

Run:

```bash
node --test tests/page-shell.test.mjs
```

Expected: FAIL because the existing CSS uses separate layers, `hero--settled`, and one combined content transition.

- [ ] **Step 3: Replace the old distortion layout with the shared stage**

Use these core declarations in `src/styles.css`:

```css
.hero {
  --stage-x: 0px;
  --stage-y: 0px;
  --stage-rx: 0deg;
  --stage-ry: 0deg;
  --stage-scale: 1.04;
  --light-x: 50%;
  --light-y: 50%;
  --light-scale: 0.96;
  --light-opacity: 0;
}

.hero__stage {
  position: absolute;
  z-index: 0;
  inset: -2%;
  overflow: hidden;
  perspective: 1200px;
  transform:
    translate3d(var(--stage-x), var(--stage-y), 0)
    rotateX(var(--stage-rx))
    rotateY(var(--stage-ry))
    scale(var(--stage-scale));
  transform-origin: center;
  will-change: transform;
}

.hero__video,
.hero__final-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}

.hero__video {
  opacity: 1;
}

.hero__final-scene {
  z-index: 1;
  opacity: 0;
  filter: brightness(0.98);
  transition:
    opacity 1050ms cubic-bezier(0.16, 0.76, 0.22, 1),
    filter 1050ms cubic-bezier(0.16, 0.76, 0.22, 1);
}

.hero--resolving .hero__final-scene,
.hero--revealed .hero__final-scene,
.hero--released .hero__final-scene {
  opacity: 1;
  filter: brightness(1);
}

.hero--poster-failed .hero__final-scene {
  display: none;
}
```

Do not fade the video to black. Both layers keep the same `object-fit`, `object-position`, transform wrapper, and scrim.

- [ ] **Step 4: Use the supplied pointer-light image and remove distortion rules**

Delete every `.hero__distortion` and `.hero__distortion-video` rule. Style the image element:

```css
.hero__pointer-light {
  position: absolute;
  z-index: 3;
  top: var(--light-y);
  left: var(--light-x);
  width: clamp(130px, 13vw, 220px);
  aspect-ratio: 1;
  opacity: var(--light-opacity);
  transform:
    translate(-50%, -50%)
    scale(var(--light-scale));
  filter: drop-shadow(0 0 24px rgba(62, 225, 231, 0.28));
  mix-blend-mode: screen;
  pointer-events: none;
  will-change: top, left, transform, opacity;
}

.hero__pointer-light.is-unavailable {
  display: none;
}
```

The provided PNG is the light core; the drop shadow supplies only the surrounding diffusion.

- [ ] **Step 5: Split the copy into four ordered animations**

Keep all Hero copy hidden in `ready` and `scrubbing`. In `resolving`, use:

```css
.hero__content h1,
.hero__content > p,
.hero__actions > * {
  opacity: 0;
  transform: translateY(16px);
}

.hero--resolving .hero__content h1 {
  animation: hero-title-in 550ms 760ms cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
}

.hero--resolving .hero__content > p {
  animation: hero-subtitle-in 520ms 940ms cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
}

.hero--resolving .hero__actions > :first-child {
  animation: hero-primary-in 500ms 1120ms cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
}

.hero--resolving .hero__actions > :last-child {
  animation: hero-wechat-in 500ms 1260ms cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
}

.hero--revealed .hero__content h1,
.hero--revealed .hero__content > p,
.hero--revealed .hero__actions > *,
.hero--released .hero__content h1,
.hero--released .hero__content > p,
.hero--released .hero__actions > * {
  opacity: 1;
  transform: translateY(0);
}

@keyframes hero-title-in {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hero-subtitle-in {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hero-primary-in {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hero-wechat-in {
  to { opacity: 1; transform: translateY(0); }
}
```

Keep `.hero__content` at its existing desktop/mobile coordinates; only its children animate.

- [ ] **Step 6: Add mobile and reduced-motion overrides**

Inside `@media (hover: none), (pointer: coarse)` and `@media (max-width: 760px)`, set:

```css
.hero__stage {
  transform: scale(1.02);
}

.hero__pointer-light {
  display: none;
}
```

Inside `@media (prefers-reduced-motion: reduce)`, do not hide the final poster. Instead:

```css
.hero__video {
  display: none;
}

.hero__final-scene,
.hero__content h1,
.hero__content > p,
.hero__actions > * {
  opacity: 1 !important;
  transform: none !important;
  animation: none !important;
}
```

- [ ] **Step 7: Calibrate the new Contact background without altering its content**

Keep the current `.contact` height and copy layout. Use:

```css
.contact {
  background:
    #001011
    url("/assets/contact-bg.webp")
    50% 50% / cover
    no-repeat;
}
```

At `max-width: 760px`, set `background-position: 50% 50%`. Only change those percentages during browser verification if the supplied focal point is visibly clipped.

- [ ] **Step 8: Run shell and media contract tests**

Run:

```bash
node --test tests/page-shell.test.mjs tests/media-loading.test.mjs
```

Expected: all shell and media tests PASS.

- [ ] **Step 9: Commit the visual sequence**

```bash
git add src/styles.css tests/page-shell.test.mjs
git commit -m "feat: refine hero reveal and contact backdrop"
```

---

### Task 6: Verify the complete interaction in representative browsers

**Files:**
- Modify only if verification exposes a reproducible defect: `src/use-hero-scroll-scrub.js`, `src/HeroSection.jsx`, `src/styles.css`, and the matching test file.

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: a built site with no trapped scroll, crop jump, autoplay, console error, or responsive overflow.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and Vite production build exits with status 0.

- [ ] **Step 2: Start the local verification server**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4175
```

Expected: Vite serves `http://127.0.0.1:4175/`.

- [ ] **Step 3: Verify desktop mouse and trackpad flow at 1440×900**

Check in order:

1. Reload leaves the video paused at its real first frame and shows no Hero copy.
2. Pointer movement in X and Y changes the full visual-stage transform and light position without changing `video.currentTime`.
3. Two to three deliberate downward gestures reach the final frame.
4. Negative wheel input never reduces `video.currentTime`.
5. Poster crossfade has no crop, scale, brightness, black-frame, or parallax jump.
6. Title, subtitle, primary capsule, and WeChat capsule appear in that order.
7. Scroll input during `resolving` does not move the document.
8. The first positive input after `revealed` moves Approach over the fixed Hero.
9. Returning to the top shows the final poster/copy and does not rewind.
10. Console has no error and the page has no horizontal overflow.

- [ ] **Step 4: Verify touch flow at 390×844**

Check in order:

1. Upward swipes advance the video and downward finger travel does not rewind.
2. The page stays fixed only during `ready`, `scrubbing`, and `resolving`.
3. Pointer light and parallax are absent.
4. The next upward swipe after reveal moves into Approach.
5. Hero and Contact focal points remain legible without stretching.

- [ ] **Step 5: Verify reduced motion and media failure**

In DevTools:

1. Emulate `prefers-reduced-motion: reduce`; reload and confirm final poster/copy are immediate and native scrolling works.
2. Block `/assets/hero-bg-optimized.mp4`; reload and wait 4 seconds.
3. Confirm the final poster/copy appear and native scrolling is released.
4. Block `/assets/hero-light-spot.png`; confirm parallax continues without a broken-image icon.
5. Block `/assets/hero-poster.webp`; confirm the final video frame remains visible and copy still completes.

- [ ] **Step 6: Commit only test-backed corrections, if any**

For each reproducible defect, first add a failing assertion to the matching test, run it to see FAIL, apply the smallest correction, and rerun it to see PASS. Stage only the exact source and matching test files changed by that correction:

```bash
git add \
  src/use-hero-scroll-scrub.js \
  src/HeroSection.jsx \
  src/styles.css \
  tests/hero-controller.test.mjs \
  tests/hero-parallax.test.mjs \
  tests/hero-integration.test.mjs \
  tests/page-shell.test.mjs \
  tests/media-loading.test.mjs
git commit -m "fix: harden hero scroll interaction"
```

If verification passes without code changes, do not create an empty commit.

- [ ] **Step 7: Run final clean verification**

Run:

```bash
git diff --check
npm test
npm run build
```

Expected: `git diff --check` has no output, all tests PASS, and production build exits with status 0.
