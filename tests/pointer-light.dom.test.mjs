import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let PointerLight;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ PointerLight } = await vite.ssrLoadModule("/src/PointerLight.jsx"));
});

test.after(async () => {
  await vite?.close();
});

function installDom({ coarse = false, reducedMotion = false } = {}) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const frames = new Map();
  let nextFrameId = 1;

  const requestAnimationFrame = (callback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  };
  const cancelAnimationFrame = (id) => frames.delete(id);

  dom.window.requestAnimationFrame = requestAnimationFrame;
  dom.window.cancelAnimationFrame = cancelAnimationFrame;
  dom.window.matchMedia = (query) => ({
    matches:
      (query === "(pointer: coarse)" && coarse) ||
      (query === "(prefers-reduced-motion: reduce)" && reducedMotion),
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
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
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
    stepAnimationFrame() {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(performance.now());
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

function dispatchPointer(clientX, clientY) {
  const event = new window.Event("pointermove");
  Object.defineProperties(event, {
    clientX: { configurable: true, value: clientX },
    clientY: { configurable: true, value: clientY },
    pointerType: { configurable: true, value: "mouse" },
  });
  window.dispatchEvent(event);
}

async function renderLight() {
  const root = createRoot(document.querySelector("#root"));
  await act(async () => {
    root.render(React.createElement(PointerLight));
  });
  return { root, light: document.querySelector(".pointer-light") };
}

async function cleanup(root, environment) {
  await act(async () => root.unmount());
  environment.restore();
}

test("pointer light follows viewport coordinates outside Hero", async () => {
  const environment = installDom();
  const { root, light } = await renderLight();

  try {
    dispatchPointer(320, 240);
    environment.stepAnimationFrame();
    assert.equal(light.style.getPropertyValue("--pointer-x"), "320px");
    assert.equal(light.style.getPropertyValue("--pointer-y"), "240px");
    assert.notEqual(
      light.style.getPropertyValue("--pointer-opacity"),
      "0",
    );
  } finally {
    await cleanup(root, environment);
  }
});

test("pointer light is decorative and cannot intercept clicks", async () => {
  const environment = installDom();
  const { root, light } = await renderLight();

  try {
    assert.equal(light.getAttribute("aria-hidden"), "true");
    assert.equal(light.getAttribute("alt"), "");
    assert.equal(light.className, "pointer-light");
    assert.equal(light.getAttribute("src"), "/assets/pointer-light-02.png");
  } finally {
    await cleanup(root, environment);
  }
});

test("coarse pointer and reduced motion keep the light hidden", async () => {
  for (const options of [
    { coarse: true, reducedMotion: false },
    { coarse: false, reducedMotion: true },
  ]) {
    const environment = installDom(options);
    const { root, light } = await renderLight();

    try {
      dispatchPointer(320, 240);
      environment.stepAnimationFrame();
      assert.equal(
        light.style.getPropertyValue("--pointer-opacity"),
        "0",
      );
    } finally {
      await cleanup(root, environment);
    }
  }
});
