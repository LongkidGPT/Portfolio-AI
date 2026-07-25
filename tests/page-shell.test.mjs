import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("page shell contains all five navigation destinations", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  for (const id of ["hero", "approach", "work", "experience", "contact"]) {
    assert.match(app, new RegExp(`id="${id}"`));
  }
});

test("hero uses the supplied video and poster assets", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(app, /\/assets\/hero-bg\.mp4/);
  assert.match(app, /\/assets\/hero-poster\.jpg/);
  assert.match(app, /muted/);
  assert.match(app, /playsInline/);
});

test("project cards render independent image layers", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(app, /project-card__image--default/);
  assert.match(app, /project-card__image--hover/);
});

test("responsive CSS reveals the poster after video playback and real work on mobile", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.hero--settled \.hero__video\s*\{\s*opacity:\s*0/);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.project-card__image--default\s*\{\s*opacity:\s*0/,
  );
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.project-card__image--hover\s*\{[\s\S]*?opacity:\s*1/,
  );
});
