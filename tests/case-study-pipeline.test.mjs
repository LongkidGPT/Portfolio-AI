import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCaseStudyPlan,
  renderCaseStudyManifest,
} from "../scripts/case-study-pipeline.mjs";
import {
  buildCwebpArgs,
  readPngDimensions,
} from "../scripts/convert-case-studies.mjs";

test("brand is resized to 1720px and split into ordered slices no taller than 4096px", () => {
  const plan = buildCaseStudyPlan(
    { id: "brand", filename: "品牌系统-案例.png", width: 2656, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );

  assert.equal(plan.outputWidth, 1720);
  assert.equal(plan.outputHeight, Math.round((32768 * 1720) / 2656));
  assert.ok(plan.slices.length > 1);
  assert.equal(
    plan.slices.reduce((sum, slice) => sum + slice.height, 0),
    plan.outputHeight,
  );
  assert.ok(plan.slices.every((slice) => slice.height <= 4096));
  assert.deepEqual(
    plan.slices.map((slice) => slice.filename),
    plan.slices.map((_, index) => `slice-${String(index + 1).padStart(2, "0")}.webp`),
  );
});

test("marketing source is never upscaled", () => {
  const plan = buildCaseStudyPlan(
    { id: "marketing", filename: "营销全案-案例.png", width: 1630, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );

  assert.equal(plan.outputWidth, 1630);
  assert.equal(plan.outputHeight, 32768);
});

test("manifest contains ordered public paths and reserved dimensions", () => {
  const plan = buildCaseStudyPlan(
    { id: "system", filename: "系统架构-案例.png", width: 3215, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );
  const source = renderCaseStudyManifest([plan]);

  assert.match(source, /export const caseStudies/);
  assert.match(source, /\/assets\/cases\/system\/slice-01\.webp/);
  assert.match(source, /"width": 1720/);
});

test("converter crops the exact source range and resizes to the planned slice", () => {
  const [slice] = buildCaseStudyPlan(
    { id: "brand", filename: "品牌系统-案例.png", width: 2656, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  ).slices;

  assert.deepEqual(
    buildCwebpArgs({
      sourcePath: "/sources/brand.png",
      sourceWidth: 2656,
      outputPath: "/outputs/slice-01.webp",
      slice,
    }),
    [
      "-q", "82", "-metadata", "none", "-crop", "0", "0", "2656", "6325",
      "-resize", "1720", "4096", "-o", "/outputs/slice-01.webp", "/sources/brand.png",
    ],
  );
});

test("case-study source PNGs have their approved dimensions", () => {
  const sourceRoot = new URL("../../../", import.meta.url);
  const inputs = [
    ["品牌系统-案例.png", 2656, 32768],
    ["营销全案-案例.png", 1630, 32768],
    ["系统架构-案例.png", 3215, 32768],
  ];

  for (const [filename, width, height] of inputs) {
    assert.deepEqual(readPngDimensions(new URL(filename, sourceRoot)), { width, height });
  }
});
