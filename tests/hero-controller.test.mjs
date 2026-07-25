import assert from "node:assert/strict";
import test from "node:test";

import { resolveHeroMode } from "../src/hero-controller.js";

test("reduced motion always resolves to poster mode", () => {
  assert.equal(
    resolveHeroMode({
      reducedMotion: true,
      coarsePointer: false,
      autoplayBlocked: false,
    }),
    "poster",
  );
});

test("coarse pointers use automatic playback", () => {
  assert.equal(
    resolveHeroMode({
      reducedMotion: false,
      coarsePointer: true,
      autoplayBlocked: false,
    }),
    "autoplay",
  );
});

test("desktop pointers use interactive playback", () => {
  assert.equal(
    resolveHeroMode({
      reducedMotion: false,
      coarsePointer: false,
      autoplayBlocked: false,
    }),
    "interactive",
  );
});

test("blocked autoplay falls back to poster mode", () => {
  assert.equal(
    resolveHeroMode({
      reducedMotion: false,
      coarsePointer: false,
      autoplayBlocked: true,
    }),
    "poster",
  );
});
