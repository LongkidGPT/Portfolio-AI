import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCaseStudyPlan,
  renderCaseStudyManifest,
} from "./case-study-pipeline.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputRoot = resolve(projectRoot, "public", "assets", "cases");
const defaultManifestPath = resolve(
  projectRoot,
  "src",
  "case-study-manifest.js",
);

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

function readOption(argv, optionName) {
  const optionIndex = argv.indexOf(optionName);
  if (optionIndex === -1) return null;

  const value = argv[optionIndex + 1];
  if (!value || value.startsWith("--")) {
    const expectedValue =
      optionName === "--source-root" ? "a directory path" : "a value";
    throw new Error(`${optionName} requires ${expectedValue}`);
  }

  return value;
}

export function parseConversionOptions(
  argv,
  { cwd = process.cwd(), env = process.env } = {},
) {
  const sourceRoot = readOption(argv, "--source-root");
  if (!sourceRoot) {
    throw new Error(
      "Missing required --source-root <directory>. Run npm run assets:cases -- --source-root /path/to/approved-masters.",
    );
  }

  return {
    sourceRoot: resolve(cwd, sourceRoot),
    cwebpCommand:
      readOption(argv, "--cwebp") || env.CWEBP_BIN || "cwebp",
  };
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

export async function convertPlan(
  plan,
  sourcePath,
  {
    cwebpCommand = "cwebp",
    env = process.env,
    outputRoot = defaultOutputRoot,
  } = {},
) {
  const outputDirectory = resolve(outputRoot, plan.id);
  await mkdir(outputDirectory, { recursive: true });

  for (const slice of plan.slices) {
    const outputPath = resolve(outputDirectory, slice.filename);
    const result = spawnSync(
      cwebpCommand,
      buildCwebpArgs({
        sourcePath,
        sourceWidth: plan.width,
        outputPath,
        slice,
      }),
      { env, stdio: "inherit" },
    );

    if (result.error) {
      if (result.error.code === "ENOENT") {
        throw new Error(
          `Unable to run cwebp command "${cwebpCommand}". Install cwebp on PATH or pass --cwebp <path> (or set CWEBP_BIN).`,
        );
      }
      throw new Error(
        `Unable to run cwebp command "${cwebpCommand}": ${result.error.message}`,
      );
    }
    if (result.status !== 0) {
      throw new Error(`cwebp failed while writing ${outputPath}`);
    }
  }
}

export async function runConversion({
  sourceRoot,
  cwebpCommand = "cwebp",
  env = process.env,
  manifestPath = defaultManifestPath,
  outputRoot = defaultOutputRoot,
}) {
  const sourcePaths = await Promise.all(
    sources.map((source) => validateSource(source, sourceRoot)),
  );
  const plans = sources.map((source) => buildCaseStudyPlan(source));

  for (const [index, plan] of plans.entries()) {
    await convertPlan(plan, sourcePaths[index], {
      cwebpCommand,
      env,
      outputRoot,
    });
  }

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    renderCaseStudyManifest(plans),
  );
}

async function main() {
  const options = parseConversionOptions(process.argv.slice(2));
  await runConversion(options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
