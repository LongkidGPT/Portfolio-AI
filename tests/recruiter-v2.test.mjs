import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V2 reveals Hero information after the cinematic sequence completes", async () => {
  const [hero, css] = await Promise.all([
    read("src/HeroSection.jsx"),
    read("src/styles.css"),
  ]);

  assert.doesNotMatch(hero, /contentIsHidden/);
  assert.doesNotMatch(hero, /event\.preventDefault\(\)/);
  assert.match(hero, /active=\{contentRevealStarted\}/);
  assert.match(hero, /preload="auto"/);
  assert.match(hero, /\/assets\/hero-bg-scrub-720\.mp4/);
  assert.doesNotMatch(hero, /requestIdleCallback/);
  assert.match(css, /\.hero__content\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.hero--type-complete \.hero__content\s*\{[\s\S]*?pointer-events:\s*auto/);
  assert.match(
    css.slice(css.indexOf("@media (max-width: 760px)")),
    /\.top-nav__links\s*\{[\s\S]*?display:\s*flex/,
  );
});

test("V2 renders case evidence as visible HTML with chapter and case navigation", async () => {
  const [page, modal, css] = await Promise.all([
    read("src/CaseStudyPage.jsx"),
    read("src/CaseStudyModal.jsx"),
    read("src/styles.css"),
  ]);

  assert.match(modal, /case-study__overview/);
  assert.match(modal, /case-study__toc/);
  assert.match(modal, /case-study__pager/);
  assert.match(modal, /项目背景/);
  assert.match(modal, /我的职责/);
  assert.match(modal, /项目成果/);
  assert.match(page, /previousProject/);
  assert.match(page, /nextProject/);
  assert.match(page, /onSelectCase=/);

  const summaryRule = css.match(/\.case-study__summary\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(summaryRule, /width:\s*1px/);
  assert.doesNotMatch(summaryRule, /clip-path/);
});

test("all project cases use shareable routes while retaining the existing case document", async () => {
  const [app, main, page, modal] = await Promise.all([
    read("src/App.jsx"),
    read("src/main.jsx"),
    read("src/CaseStudyPage.jsx"),
    read("src/CaseStudyModal.jsx"),
  ]);

  assert.match(app, /window\.location\.assign\(`\/case\/\$\{caseId\}`\)/);
  assert.match(main, /brand\|marketing\|system/);
  assert.match(page, /previousProject/);
  assert.match(page, /nextProject/);
  assert.match(page, /standalone/);
  assert.match(modal, /case-study__overview/);
  assert.match(modal, /case-study__visuals/);
});

test("V2 declares the Chinese document language and clarifies copy actions", async () => {
  const [html, contact, copyButton] = await Promise.all([
    read("index.html"),
    read("src/ContactSection.jsx"),
    read("src/CopyButton.jsx"),
  ]);

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(contact, /actionLabel="复制邮箱地址"/);
  assert.match(copyButton, /actionLabel/);
  assert.match(copyButton, /aria-label=/);
});
