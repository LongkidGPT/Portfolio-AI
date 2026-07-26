import assert from "node:assert/strict";
import test from "node:test";

import {
  getCaseStudy,
  shouldDismissCaseStudy,
} from "../src/case-study-model.js";

const manifest = {
  brand: { id: "brand", slices: [{ src: "/brand-01.webp", width: 1720, height: 4096 }] },
};

test("case lookup returns the requested case and rejects unknown IDs", () => {
  assert.equal(getCaseStudy(manifest, "brand")?.id, "brand");
  assert.equal(getCaseStudy(manifest, "missing"), null);
  assert.equal(getCaseStudy(manifest, null), null);
});

test("modal dismisses only for Escape, backdrop, and explicit close", () => {
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Escape" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: true }), true);
  assert.equal(shouldDismissCaseStudy({ type: "close" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: false }), false);
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Enter" }), false);
});
