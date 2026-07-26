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

test("project cards own semantic artwork, copy, and case-opening markup", async () => {
  const card = await readFile(
    new URL("../src/ProjectCard.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(card, /href="#contact"/);
  assert.match(card, /type="button"/);
  assert.match(card, /project-card__artwork/);
  assert.match(card, /project-card__image--default/);
  assert.match(card, /project-card__image--hover/);
  assert.match(card, /project-card__panel/);
  assert.match(card, /project-card__arrow/);
  assert.match(card, /project-card--temporary-art/);
  assert.match(card, /--temporary-artwork-ratio/);
  assert.match(card, /onOpenCase\(project\.caseId\)/);
  assert.equal(card.match(/data-track-label=/g)?.length, 1);
});

test("responsive CSS stacks mobile project artwork above its DOM panel", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.hero--settled \.hero__video\s*\{\s*opacity:\s*0/);
  assert.match(
    css,
    /\.project-card__panel\s*\{[\s\S]*?min-height:\s*42%/,
  );
  assert.match(
    css,
    /\.project-card--wide \.project-card__panel\s*\{[\s\S]*?min-height:\s*33%/,
  );
  assert.match(
    css,
    /\.project-card--temporary-art \.project-card__image\s*\{\s*object-position:\s*center top;\s*\}/,
  );

  const mobile = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.match(
    mobile,
    /\.project-card__artwork\s*\{[\s\S]*?grid-area:\s*1\s*\/\s*1/,
  );
  assert.match(
    mobile,
    /\.project-card__panel[\s\S]*?\{[\s\S]*?grid-area:\s*2\s*\/\s*1/,
  );
  assert.match(
    mobile,
    /\.project-card--temporary-art \.project-card__artwork\s*\{[\s\S]*?aspect-ratio:\s*var\(--temporary-artwork-ratio\)/,
  );
  assert.doesNotMatch(
    css,
    /\.project-card[^{]*\{[^}]*bottom:\s*\d+(?:\.\d+)?%/,
  );
});

test("touch and coarse pointers show project hover artwork by default", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?\.project-card__image--default\s*\{\s*opacity:\s*0/,
  );
  assert.match(
    css,
    /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?\.project-card__image--hover\s*\{\s*opacity:\s*1/,
  );
});

test("case-study modal renders the required accessible document shell", async () => {
  const [app, modal, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/CaseStudyModal.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /selectedCaseId/);
  assert.match(app, /<CaseStudyModal/);
  assert.match(modal, /loading="lazy"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /case-study__retry/);
  assert.match(css, /\.case-study__document\s*\{[\s\S]*?width:\s*860px/);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.case-study__document\s*\{[\s\S]*?width:\s*calc\(100vw - 24px\)/,
  );
});
