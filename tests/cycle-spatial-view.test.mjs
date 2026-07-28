import assert from "node:assert/strict";
import test from "node:test";

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
