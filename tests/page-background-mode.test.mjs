import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

test("bg=black selects the pure-black comparison mode without changing the default", async () => {
  const backgroundMode = await import(
    new URL("../src/page-background-mode.js", import.meta.url)
  ).catch(() => null);

  assert.ok(
    backgroundMode?.applyPageBackgroundMode,
    "the page should expose a background-mode initializer",
  );

  const defaultRoot = { dataset: {} };
  const blackRoot = { dataset: {} };

  assert.equal(
    backgroundMode.applyPageBackgroundMode("", defaultRoot),
    "off-black",
  );
  assert.equal(defaultRoot.dataset.pageBackground, "off-black");

  assert.equal(
    backgroundMode.applyPageBackgroundMode("?bg=black", blackRoot),
    "black",
  );
  assert.equal(blackRoot.dataset.pageBackground, "black");
});

test("pure-black comparison mode overrides the shared surface token", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const dom = new JSDOM(
    `<!doctype html><html data-page-background="black"><head><style>${css}</style></head><body></body></html>`,
  );
  const pageBackground = dom.window
    .getComputedStyle(dom.window.document.documentElement)
    .getPropertyValue("--page-bg")
    .trim();
  const pageBackgroundFade = dom.window
    .getComputedStyle(dom.window.document.documentElement)
    .getPropertyValue("--page-bg-fade")
    .trim();

  assert.equal(pageBackground, "#000000");
  assert.equal(pageBackgroundFade, "rgba(0, 0, 0, 0.88)");
});
