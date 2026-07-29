import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let VisitorMonitor;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ VisitorMonitor } = await vite.ssrLoadModule("/src/VisitorMonitor.jsx"));
});

test.after(async () => {
  await vite?.close();
});

function installDom() {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const animationFrames = new Map();
  let compact = true;
  let nextAnimationFrameId = 1;

  class TestIntersectionObserver {
    observe() {}

    disconnect() {}
  }

  const requestAnimationFrame = (callback) => {
    const id = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.set(id, callback);
    return id;
  };
  const cancelAnimationFrame = (id) => animationFrames.delete(id);

  Object.assign(dom.window, {
    cancelAnimationFrame,
    requestAnimationFrame,
  });
  Object.defineProperties(dom.window, {
    innerHeight: { configurable: true, value: 844, writable: true },
    innerWidth: { configurable: true, value: 390, writable: true },
  });
  dom.window.matchMedia = (query) => ({
    media: query,
    matches: query === "(max-width: 760px)" ? compact : false,
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
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IntersectionObserver: TestIntersectionObserver,
    requestAnimationFrame,
    cancelAnimationFrame,
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
    setCompact(value) {
      compact = value;
      dom.window.innerWidth = value ? 390 : 1440;
      dom.window.innerHeight = value ? 844 : 900;
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

function click(element) {
  element.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

test("Live Signal starts collapsed on both mobile and desktop", async () => {
  const environment = installDom();
  let root = createRoot(document.querySelector("#root"));

  try {
    await act(async () => {
      root.render(React.createElement(VisitorMonitor));
    });

    const mobileLauncher = document.querySelector(".visitor-monitor__bar");
    assert.equal(mobileLauncher.getAttribute("aria-expanded"), "false");
    assert.equal(document.querySelector(".visitor-monitor__body"), null);
    assert.match(mobileLauncher.textContent, /LIVE SIGNAL/);

    await act(async () => click(mobileLauncher));
    assert.equal(mobileLauncher.getAttribute("aria-expanded"), "true");
    assert.ok(document.querySelector(".visitor-monitor__body"));
    assert.ok(
      document.querySelector(".visitor-monitor__mask"),
      "the existing blurred public mode must still open",
    );

    await act(async () => root.unmount());
    environment.setCompact(false);
    root = createRoot(document.querySelector("#root"));
    await act(async () => {
      root.render(React.createElement(VisitorMonitor));
    });

    assert.equal(
      document
        .querySelector(".visitor-monitor__bar")
        .getAttribute("aria-expanded"),
      "false",
    );
    assert.equal(document.querySelector(".visitor-monitor__body"), null);
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});
