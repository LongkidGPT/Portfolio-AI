import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCaseStudyPlan,
  renderCaseStudyManifest,
} from "./case-study-pipeline.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceRoot = resolve(projectRoot, "../..");
const cwebpPath = "/opt/homebrew/bin/cwebp";

const sources = [
  { id: "brand", filename: "品牌系统-案例.png", width: 2656, height: 32768 },
  { id: "marketing", filename: "营销全案-案例.png", width: 1630, height: 32768 },
  { id: "system", filename: "系统架构-案例.png", width: 3215, height: 32768 },
];

export function readPngDimensions(filePath) {
  const header = readFileSync(filePath);

  if (
    header.length < 24
    || header.toString("hex", 0, 8) !== "89504e470d0a1a0a"
    || header.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error(`Expected a PNG with an IHDR header: ${filePath}`);
  }

  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  };
}

export function buildCwebpArgs({ sourcePath, sourceWidth, outputPath, slice }) {
  return [
    "-q", String(slice.quality),
    "-metadata", "none",
    "-crop", "0", String(slice.sourceY), String(sourceWidth), String(slice.sourceHeight),
    "-resize", String(slice.width), String(slice.height),
    "-o", outputPath,
    sourcePath,
  ];
}

function parseSourceRoot(argv) {
  const optionIndex = argv.indexOf("--source-root");

  if (optionIndex === -1) {
    return defaultSourceRoot;
  }

  const sourceRoot = argv[optionIndex + 1];
  if (!sourceRoot || sourceRoot.startsWith("--")) {
    throw new Error("--source-root requires a directory path");
  }

  return isAbsolute(sourceRoot)
    ? sourceRoot
    : resolve(process.cwd(), sourceRoot);
}

async function validateSource(source, sourceRoot) {
  const sourcePath = resolve(sourceRoot, source.filename);
  const dimensions = readPngDimensions(sourcePath);

  if (dimensions.width !== source.width || dimensions.height !== source.height) {
    throw new Error(
      `${source.filename} must be ${source.width}x${source.height}px; found ${dimensions.width}x${dimensions.height}px.`,
    );
  }

  return sourcePath;
}

async function convertPlan(plan, sourcePath) {
  const outputDirectory = resolve(projectRoot, "public", "assets", "cases", plan.id);
  await mkdir(outputDirectory, { recursive: true });

  for (const slice of plan.slices) {
    const outputPath = resolve(outputDirectory, slice.filename);
    const result = spawnSync(
      cwebpPath,
      buildCwebpArgs({
        sourcePath,
        sourceWidth: plan.width,
        outputPath,
        slice,
      }),
      { stdio: "inherit" },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`cwebp failed while writing ${outputPath}`);
    }
  }
}

async function main() {
  const sourceRoot = parseSourceRoot(process.argv.slice(2));
  const sourcePaths = await Promise.all(
    sources.map((source) => validateSource(source, sourceRoot)),
  );
  const plans = sources.map((source) => buildCaseStudyPlan(source));

  for (const [index, plan] of plans.entries()) {
    await convertPlan(plan, sourcePaths[index]);
  }

  await writeFile(
    resolve(projectRoot, "src", "case-study-manifest.js"),
    renderCaseStudyManifest(plans),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
