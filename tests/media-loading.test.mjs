import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import * as portfolioData from "../src/portfolio-data.js";

const repoFile = (path) => new URL(`..${path}`, import.meta.url);
const { projects } = portfolioData;

test("homepage image model uses optimized WebP assets within an 8 MiB budget", async () => {
  const imagePaths = [
    "/public/assets/hero-poster.webp",
    "/public/assets/contact-bg.webp",
    ...projects.flatMap(({ defaultImage, hoverImage }) => [
      `/public${defaultImage}`,
      `/public${hoverImage}`,
    ]),
  ];

  for (const path of imagePaths) {
    assert.match(path, /\.webp$/);
  }

  const sizes = await Promise.all(
    imagePaths.map(async (path) => (await stat(repoFile(path))).size),
  );
  const totalBytes = sizes.reduce((total, size) => total + size, 0);

  assert.ok(
    totalBytes <= 8 * 1024 * 1024,
    `homepage images total ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`,
  );
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

test("hero is poster-first and does not eagerly preload the full video", async () => {
  const app = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  );

  assert.match(app, /poster="\/assets\/hero-poster\.webp"/);
  assert.match(app, /src="\/assets\/hero-bg-optimized\.mp4"/);
  assert.match(app, /preload="metadata"/);
  assert.doesNotMatch(app, /preload="auto"/);
});

test("hero motion asset stays within a 4 MiB delivery budget", async () => {
  const { size } = await stat(
    repoFile("/public/assets/hero-bg-optimized.mp4"),
  );

  assert.ok(
    size <= 4 * 1024 * 1024,
    `hero video is ${(size / 1024 / 1024).toFixed(2)} MiB`,
  );
});
