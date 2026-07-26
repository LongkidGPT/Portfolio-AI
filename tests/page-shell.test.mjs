import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function cssDeclarations(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "g"))]
    .map((match) => match[1])
    .join("\n");
}

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

test("navigation uses one-pixel masked gradient borders", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  const navRule = cssDeclarations(css, ".top-nav");
  const talkRule = cssDeclarations(css, ".top-nav__talk");
  const navBorderRule = cssDeclarations(css, ".top-nav::before");
  const talkBorderRule = cssDeclarations(css, ".top-nav__talk::before");

  assert.doesNotMatch(navRule, /\bborder:/);
  assert.doesNotMatch(talkRule, /\bborder:/);
  assert.match(
    navBorderRule,
    /padding:\s*1px;[\s\S]*?linear-gradient\(90deg,[\s\S]*?rgba\(255,\s*255,\s*255,\s*1\)[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\)[\s\S]*?rgba\(255,\s*255,\s*255,\s*1\)/,
  );
  assert.match(talkBorderRule, /padding:\s*1px;[\s\S]*?opacity:\s*0\.\d+/);
  assert.match(navBorderRule, /mask-composite:\s*exclude/);
  assert.match(talkBorderRule, /mask-composite:\s*exclude/);
});

test("heading support spacing is reduced by exactly thirty percent", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  const rootRule = cssDeclarations(css, ":root");
  assert.match(rootRule, /--heading-support-gap:\s*25\.2px/);
  assert.match(rootRule, /--heading-support-gap-compact:\s*19\.6px/);
  assert.match(
    cssDeclarations(css, ".hero__content > p"),
    /margin:\s*var\(--heading-support-gap\)\s+0\s+0/,
  );
  assert.match(
    cssDeclarations(css, ".approach__intro"),
    /--heading-support-gap:\s*29\.4px/,
  );
  assert.match(
    cssDeclarations(css, ".approach__intro p"),
    /margin:\s*var\(--heading-support-gap\)\s+0\s+0/,
  );
  assert.match(
    cssDeclarations(css, ".section-heading p"),
    /margin-top:\s*var\(--heading-support-gap-compact\)/,
  );
  assert.match(
    cssDeclarations(css, ".experience__intro"),
    /--heading-support-gap-compact:\s*12\.6px/,
  );
  assert.match(
    cssDeclarations(css, ".experience__intro p"),
    /margin-top:\s*var\(--heading-support-gap-compact\)/,
  );
  assert.match(
    cssDeclarations(css, ".contact"),
    /--heading-support-gap:\s*33\.6px/,
  );
  assert.match(
    cssDeclarations(css, ".contact__details"),
    /margin:\s*var\(--heading-support-gap\)\s+0\s+0/,
  );

  const mobileStart = css.indexOf("@media (max-width: 760px)");
  const mobileEnd = css.indexOf("@media (prefers-reduced-motion: reduce)");
  const mobile = css.slice(mobileStart, mobileEnd);
  assert.match(cssDeclarations(mobile, ":root"), /--heading-support-gap:\s*16\.8px/);
  assert.match(cssDeclarations(mobile, ".contact"), /--heading-support-gap:\s*23\.8px/);
});

test("zoom-stable CSS keeps tablet card copy and modal content in bounds", async () => {
  const css = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(cssDeclarations(css, "body"), /overflow-x:\s*hidden/);
  assert.match(cssDeclarations(css, ".content-layer"), /overflow-x:\s*hidden/);
  assert.match(cssDeclarations(css, "img"), /max-width:\s*100%/);
  assert.match(cssDeclarations(css, ".case-study__document"), /max-width:\s*100%/);
  assert.match(cssDeclarations(css, ".project-card__copy > span"), /overflow-wrap:\s*break-word/);
  assert.doesNotMatch(cssDeclarations(css, ".project-card__copy"), /bottom:\s*\d+%/);

  const tabletStart = css.indexOf(
    "@media (min-width: 761px) and (max-width: 1023px)",
  );
  const tabletEnd = css.indexOf("@media (max-width: 760px)");
  const tablet = css.slice(tabletStart, tabletEnd);
  assert.match(
    cssDeclarations(tablet, ".project-grid"),
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(cssDeclarations(tablet, ".project-card__panel"), /padding:\s*clamp\(/);
  assert.match(cssDeclarations(tablet, ".project-card__arrow"), /width:\s*clamp\(/);
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
