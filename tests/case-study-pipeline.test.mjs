import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  buildCaseStudyPlan,
  renderCaseStudyManifest,
} from "../scripts/case-study-pipeline.mjs";
import * as converter from "../scripts/convert-case-studies.mjs";
import {
  buildCwebpArgs,
  readPngDimensions,
} from "../scripts/convert-case-studies.mjs";

function pngHeader(width, height) {
  const header = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(header, 0);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

async function writeFakeCwebp(binDirectory) {
  await mkdir(binDirectory, { recursive: true });
  const commandPath = join(binDirectory, "cwebp");
  await writeFile(
    commandPath,
    [
      "#!/usr/bin/env node",
      'const { writeFileSync } = require("node:fs");',
      'const outputIndex = process.argv.indexOf("-o") + 1;',
      'writeFileSync(process.argv[outputIndex], "fake-webp");',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  return commandPath;
}

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
  assert.doesNotMatch(source, /summary|background|responsibility|outcome/);
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

test("PNG dimension parsing uses a repository-independent fixture", async (t) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "case-png-fixture-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const fixturePath = join(fixtureRoot, "fixture.png");
  await writeFile(fixturePath, pngHeader(2656, 32768));

  assert.deepEqual(readPngDimensions(fixturePath), {
    width: 2656,
    height: 32768,
  });
});

test("conversion requires an explicit source root with actionable messaging", () => {
  assert.equal(typeof converter.parseConversionOptions, "function");
  assert.throws(
    () => converter.parseConversionOptions([]),
    /Missing required --source-root <directory>/,
  );
  assert.throws(
    () => converter.parseConversionOptions(["--source-root"]),
    /--source-root requires a directory path/,
  );

  const parsed = converter.parseConversionOptions(
    ["--source-root", "./approved-masters"],
    { cwd: "/workspace", env: {} },
  );
  assert.equal(parsed.sourceRoot, "/workspace/approved-masters");
});

test("cwebp resolves from PATH or an explicit CLI/environment option", async (t) => {
  assert.equal(typeof converter.convertPlan, "function");
  assert.equal(typeof converter.parseConversionOptions, "function");

  const fixtureRoot = await mkdtemp(join(tmpdir(), "case-cwebp-fixture-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const binDirectory = join(fixtureRoot, "bin");
  const fakeCwebpPath = await writeFakeCwebp(binDirectory);
  const sourcePath = join(fixtureRoot, "source.png");
  await writeFile(sourcePath, pngHeader(100, 100));
  const plan = buildCaseStudyPlan(
    { id: "fixture", filename: "source.png", width: 100, height: 100 },
    { maxWidth: 100, maxSliceHeight: 100, quality: 82 },
  );

  const pathOutputRoot = join(fixtureRoot, "path-output");
  await converter.convertPlan(plan, sourcePath, {
    cwebpCommand: "cwebp",
    env: {
      ...process.env,
      PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`,
    },
    outputRoot: pathOutputRoot,
  });
  assert.equal(
    await readFile(join(pathOutputRoot, "fixture", "slice-01.webp"), "utf8"),
    "fake-webp",
  );

  const explicit = converter.parseConversionOptions(
    [
      "--source-root",
      fixtureRoot,
      "--cwebp",
      fakeCwebpPath,
    ],
    { cwd: fixtureRoot, env: {} },
  );
  assert.equal(explicit.cwebpCommand, fakeCwebpPath);

  const fromEnvironment = converter.parseConversionOptions(
    ["--source-root", fixtureRoot],
    { cwd: fixtureRoot, env: { CWEBP_BIN: fakeCwebpPath } },
  );
  assert.equal(fromEnvironment.cwebpCommand, fakeCwebpPath);

  await assert.rejects(
    converter.convertPlan(plan, sourcePath, {
      cwebpCommand: "missing-cwebp-for-test",
      env: { PATH: "" },
      outputRoot: join(fixtureRoot, "missing-output"),
    }),
    /Install cwebp on PATH or pass --cwebp <path>/,
  );
});

test("an explicitly supplied source root still completes conversion", async (t) => {
  assert.equal(typeof converter.runConversion, "function");

  const fixtureRoot = await mkdtemp(join(tmpdir(), "case-source-fixture-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const sourceRoot = join(fixtureRoot, "approved-masters");
  const binDirectory = join(fixtureRoot, "bin");
  const outputRoot = join(fixtureRoot, "outputs");
  const manifestPath = join(fixtureRoot, "case-study-manifest.js");
  const fakeCwebpPath = await writeFakeCwebp(binDirectory);
  await mkdir(sourceRoot, { recursive: true });

  for (const [filename, width, height] of [
    ["品牌系统-案例.png", 2656, 32768],
    ["营销全案-案例.png", 1630, 32768],
    ["系统架构-案例.png", 3215, 32768],
  ]) {
    await writeFile(join(sourceRoot, filename), pngHeader(width, height));
  }

  const parsed = converter.parseConversionOptions(
    [
      "--source-root",
      "approved-masters",
      "--cwebp",
      fakeCwebpPath,
    ],
    { cwd: fixtureRoot, env: {} },
  );
  await converter.runConversion({
    ...parsed,
    manifestPath,
    outputRoot,
  });

  const manifest = await readFile(manifestPath, "utf8");
  assert.match(manifest, /"brand"/);
  assert.match(manifest, /"marketing"/);
  assert.match(manifest, /"system"/);
  assert.equal(
    await readFile(join(outputRoot, "brand", "slice-01.webp"), "utf8"),
    "fake-webp",
  );
});

test("Hero fallback CSS depends only on the tracked first-frame asset", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(css, /hero-chaos\.webp/);
  assert.match(css, /hero-first-frame\.webp/);
});
