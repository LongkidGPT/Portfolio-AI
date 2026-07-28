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
