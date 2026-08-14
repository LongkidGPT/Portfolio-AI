import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import * as portfolioData from "../src/portfolio-data.js";

const repoFile = (path) => new URL(`..${path}`, import.meta.url);
const { projects } = portfolioData;

function readLossyWebpDimensions(buffer) {
  const frameSignature = Buffer.from([0x9d, 0x01, 0x2a]);
  const frameOffset = buffer.indexOf(frameSignature);

  assert.notEqual(frameOffset, -1, "expected a lossy WebP frame");
  return {
    width: buffer.readUInt16LE(frameOffset + 3) & 0x3fff,
    height: buffer.readUInt16LE(frameOffset + 5) & 0x3fff,
  };
}

const homepageImages = [
  "/public/assets/hero-first-frame.webp",
  "/public/assets/hero-poster.webp",
  "/public/assets/pointer-light-02.webp",
  "/public/assets/contact-bg.webp",
  "/public/assets/fonts/mont-extralight.otf",
  "/public/assets/fonts/inter-variable.woff2",
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
    repoFile("/public/assets/hero-bg-scrub-720.mp4"),
  );

  assert.ok(
    imageTotal <= 10 * 1024 * 1024,
    `homepage images total ${(imageTotal / 1024 / 1024).toFixed(2)} MiB`,
  );
  assert.ok(
    videoSize <= 3.25 * 1024 * 1024,
    `hero video is ${(videoSize / 1024 / 1024).toFixed(2)} MiB`,
  );
});

test("pointer light derivative stays below its critical-load budget", async () => {
  const { size } = await stat(
    repoFile("/public/assets/pointer-light-02.webp"),
  );

  assert.ok(
    size <= 200 * 1024,
    `pointer light is ${(size / 1024).toFixed(0)} KiB`,
  );
});

test("Hero poster preserves enough source resolution for Retina displays", async () => {
  const poster = await readFile(
    repoFile("/public/assets/hero-poster.webp"),
  );

  assert.deepEqual(readLossyWebpDimensions(poster), {
    width: 3840,
    height: 2160,
  });
});

test("project artwork policy avoids downloading hidden imagery", () => {
  assert.equal(typeof portfolioData.resolveProjectArtwork, "function");

  const { resolveProjectArtwork } = portfolioData;
  const project = {
    defaultImage: "/assets/default.webp",
    hoverImage: "/assets/hover.webp",
  };

  assert.deepEqual(
    resolveProjectArtwork(project, {
      canHover: true,
      hoverRequested: false,
    }),
    {
      defaultSrc: project.defaultImage,
      hoverSrc: undefined,
    },
  );
  assert.deepEqual(
    resolveProjectArtwork(project, {
      canHover: true,
      hoverRequested: true,
    }),
    {
      defaultSrc: project.defaultImage,
      hoverSrc: project.hoverImage,
    },
  );
  assert.deepEqual(
    resolveProjectArtwork(project, {
      canHover: false,
      hoverRequested: false,
    }),
    {
      defaultSrc: undefined,
      hoverSrc: project.hoverImage,
    },
  );
});

test("project cards lazy-decode both layers and request hover on interaction", async () => {
  const card = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/ProjectCard.jsx", import.meta.url), "utf8"),
  );

  assert.equal(card.match(/<img\b/g)?.length, 2);
  assert.equal(card.match(/loading="lazy"/g)?.length, 2);
  assert.equal(card.match(/decoding="async"/g)?.length, 2);
  assert.match(card, /onPointerEnter=/);
  assert.match(card, /onFocus=/);
  assert.match(card, /resolveProjectArtwork/);
});

test("project cards keep default artwork visible until hover artwork loads", async () => {
  const [{ readFile }] = await Promise.all([import("node:fs/promises")]);
  const [card, css] = await Promise.all([
    readFile(new URL("../src/ProjectCard.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(card, /onLoad=/);
  assert.match(card, /project-card--hover-ready/);
  assert.match(
    css,
    /\.project-card--hover-ready:is\(:hover, :focus-visible\) \.project-card__image--default/,
  );
  assert.match(
    css,
    /\.project-card--hover-ready:is\(:hover, :focus-visible\) \.project-card__image--hover/,
  );
});

test("legacy homepage source assets stay outside the public build input", async () => {
  const legacyAssets = [
    "hero-bg.mp4",
    "hero-poster.jpg",
    "contact-bg.png",
    "work-brand-default.png",
    "work-brand-hover.png",
    "work-marketing-default.png",
    "work-marketing-hover.png",
    "work-system-default.png",
    "work-system-hover.png",
  ];

  for (const filename of legacyAssets) {
    await assert.rejects(
      stat(repoFile(`/public/assets/${filename}`)),
      ({ code }) => code === "ENOENT",
      `${filename} must not be copied into the production build`,
    );

    const source = await stat(
      repoFile(`/source-assets/homepage/${filename}`),
    );
    assert.ok(source.isFile() && source.size > 0);
  }
});

test("document declares an existing favicon instead of requesting missing favicon.ico", async () => {
  const html = await readFile(repoFile("/index.html"), "utf8");
  const faviconPath = html.match(
    /<link\s+rel="icon"[^>]+href="([^"]+)"/,
  )?.[1];

  assert.ok(faviconPath, "index.html must declare a favicon");
  await stat(repoFile(`/public${faviconPath}`));
});
