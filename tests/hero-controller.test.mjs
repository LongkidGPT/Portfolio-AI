import assert from "node:assert/strict";
import test from "node:test";

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
