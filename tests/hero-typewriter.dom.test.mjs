import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let HeroTypewriter;
let titleLines;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ HeroTypewriter, titleLines } = await vite.ssrLoadModule(
    "/src/HeroTypewriter.jsx",
  ));
});

test.after(async () => {
  await vite?.close();
});

function installDom({ reducedMotion = false } = {}) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const timers = new Map();
  let nextTimerId = 1;

  dom.window.setTimeout = (callback, delay) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, delay });
    return id;
  };
  dom.window.clearTimeout = (id) => timers.delete(id);
  dom.window.matchMedia = () => ({
    matches: reducedMotion,
    addEventListener() {},
    removeEventListener() {},
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
  };

  for (const [name, value] of Object.entries(globals)) {
    previousGlobals[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true,
    });
  }

  return {
    pending(delay) {
      return [...timers.values()].filter((timer) => timer.delay === delay)
        .length;
    },
    async runNext(delay) {
      const entry = [...timers.entries()].find(
        ([, timer]) => timer.delay === delay,
      );
      assert.ok(entry, `expected a pending ${delay}ms timer`);
      const [id, timer] = entry;
      timers.delete(id);
      await act(async () => timer.callback());
    },
    restore() {
      dom.window.close();
      for (const [name, descriptor] of Object.entries(previousGlobals)) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

test("typewriter types both title lines then keeps the cursor for one second", async () => {
  const environment = installDom();
  const root = createRoot(document.querySelector("#root"));
  let completed = 0;

  try {
    await act(async () => {
      root.render(
        React.createElement(HeroTypewriter, {
          active: true,
          onComplete: () => {
            completed += 1;
          },
        }),
      );
    });

    const title = document.querySelector("h1");
    assert.equal(title.getAttribute("aria-label"), titleLines.join(" "));
    assert.equal(environment.pending(30), 1);

    const totalChars = titleLines.reduce((sum, line) => sum + line.length, 0);
    for (let index = 0; index < totalChars; index += 1) {
      await environment.runNext(30);
    }

    const typedText = document.querySelector(".hero-typewriter__typed").textContent;
    for (const line of titleLines) assert.ok(typedText.includes(line));
    assert.ok(document.querySelector(".hero-typewriter__cursor"));
    assert.equal(environment.pending(1000), 1);
    assert.equal(completed, 0);

    await environment.runNext(1000);
    assert.equal(document.querySelector(".hero-typewriter__cursor"), null);
    assert.equal(completed, 1);
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});

test("reduced motion exposes the complete title without typing timers", async () => {
  const environment = installDom({ reducedMotion: true });
  const root = createRoot(document.querySelector("#root"));
  let completed = 0;

  try {
    await act(async () => {
      root.render(
        React.createElement(HeroTypewriter, {
          active: true,
          onComplete: () => {
            completed += 1;
          },
        }),
      );
    });

    const headingText = document.querySelector("h1").textContent;
    for (const line of titleLines) assert.ok(headingText.includes(line));
    assert.equal(document.querySelector(".hero-typewriter__cursor"), null);
    assert.equal(environment.pending(30), 0);
    assert.equal(completed, 1);
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});
