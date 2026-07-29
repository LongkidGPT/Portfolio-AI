import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React, { useRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let useCycleSpatialView;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ useCycleSpatialView } = await vite.ssrLoadModule(
    "/src/use-cycle-spatial-view.js",
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
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.matchMedia = (query) => ({
    matches:
      query === "(prefers-reduced-motion: reduce)" && reducedMotion,
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
    HTMLMediaElement: dom.window.HTMLMediaElement,
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
    stepAnimationFrames(count = 1) {
      for (let index = 0; index < count; index += 1) {
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending) callback(performance.now());
      }
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

function Harness({ active }) {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  useCycleSpatialView({ heroRef, videoRef, active });

  return React.createElement(
    "section",
    { ref: heroRef, "data-testid": "hero" },
    React.createElement("video", {
      ref: videoRef,
      "data-testid": "cycle",
    }),
  );
}

async function renderHarness(active = true) {
  const root = createRoot(document.querySelector("#root"));
  await act(async () => {
    root.render(React.createElement(Harness, { active }));
  });

  const hero = document.querySelector("[data-testid='hero']");
  const video = document.querySelector("[data-testid='cycle']");
  hero.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 600,
    width: 1000,
    height: 600,
  });
  Object.defineProperty(video, "duration", {
    configurable: true,
    value: 0.666667,
  });
  Object.defineProperty(video, "readyState", {
    configurable: true,
    value: 4,
  });
  video.pause = () => {};

  return { root, hero, video };
}

function dispatchPointer(target, type, properties) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  for (const [name, value] of Object.entries(properties)) {
    Object.defineProperty(event, name, { configurable: true, value });
  }
  target.dispatchEvent(event);
  return event;
}

async function cleanup(root, environment) {
  await act(async () => root.unmount());
  environment.restore();
}

test("settled desktop pointer selects the inverse local view", async () => {
  const environment = installDom();
  const { root, hero, video } = await renderHarness(true);

  try {
    dispatchPointer(hero, "pointermove", {
      clientX: 0,
      clientY: 300,
      pointerType: "mouse",
    });
    environment.stepAnimationFrames(6);
    assert.ok(video.currentTime < video.duration / 2);

    dispatchPointer(hero, "pointermove", {
      clientX: 1000,
      clientY: 300,
      pointerType: "mouse",
    });
    environment.stepAnimationFrames(24);
    assert.ok(video.currentTime > video.duration / 2);
  } finally {
    await cleanup(root, environment);
  }
});

test("horizontal touch owns spatial view while vertical touch remains scrollable", async () => {
  const environment = installDom();
  const { root, hero, video } = await renderHarness(true);

  try {
    dispatchPointer(hero, "pointerdown", {
      clientX: 500,
      clientY: 300,
      pointerId: 1,
      pointerType: "touch",
    });
    const horizontalMove = dispatchPointer(hero, "pointermove", {
      clientX: 300,
      clientY: 308,
      pointerId: 1,
      pointerType: "touch",
    });
    environment.stepAnimationFrames(8);
    assert.equal(horizontalMove.defaultPrevented, true);
    assert.ok(video.currentTime < video.duration / 2);

    dispatchPointer(hero, "pointerup", {
      clientX: 300,
      clientY: 308,
      pointerId: 1,
      pointerType: "touch",
    });
    dispatchPointer(hero, "pointerdown", {
      clientX: 500,
      clientY: 300,
      pointerId: 2,
      pointerType: "touch",
    });
    const verticalMove = dispatchPointer(hero, "pointermove", {
      clientX: 507,
      clientY: 420,
      pointerId: 2,
      pointerType: "touch",
    });
    assert.equal(verticalMove.defaultPrevented, false);
  } finally {
    await cleanup(root, environment);
  }
});

test("inactive and reduced-motion modes do not seek the cycle video", async () => {
  for (const options of [
    { active: false, reducedMotion: false },
    { active: true, reducedMotion: true },
  ]) {
    const environment = installDom({
      reducedMotion: options.reducedMotion,
    });
    const { root, hero, video } = await renderHarness(options.active);

    try {
      video.currentTime = 0;
      dispatchPointer(hero, "pointermove", {
        clientX: 1000,
        clientY: 300,
        pointerType: "mouse",
      });
      environment.stepAnimationFrames(10);
      assert.equal(video.currentTime, 0);
    } finally {
      await cleanup(root, environment);
    }
  }
});
