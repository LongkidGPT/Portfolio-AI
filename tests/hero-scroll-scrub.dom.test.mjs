import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";
import React, { useRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let HeroSection;
let heroStyles;
let useHeroScrollScrub;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ useHeroScrollScrub } = await vite.ssrLoadModule(
    "/src/use-hero-scroll-scrub.js",
  ));
  ({ HeroSection } = await vite.ssrLoadModule("/src/HeroSection.jsx"));
  heroStyles = await readFile(
    new URL("../src/styles.css", import.meta.url),
    "utf8",
  );
});

test.after(async () => {
  await vite?.close();
});

function installDom({ mediaMatches = {}, styles = "" } = {}) {
  const dom = new JSDOM(
    `<!doctype html><html><head><style>${styles}</style></head><body><div id="root"></div></body></html>`,
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const animationFrames = new Map();
  let animationTime = 0;
  const mediaQueries = new Map();
  const timers = new Map();
  let nextAnimationFrameId = 1;
  let nextTimerId = 1;

  const requestAnimationFrame = (callback) => {
    const id = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.set(id, callback);
    return id;
  };
  const cancelAnimationFrame = (id) => animationFrames.delete(id);
  const setTimeout = (callback, delay) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeout = (id) => timers.delete(id);

  Object.assign(dom.window, {
    cancelAnimationFrame,
    clearTimeout,
    requestAnimationFrame,
    setTimeout,
  });
  Object.defineProperties(dom.window, {
    innerHeight: { configurable: true, value: 844 },
    innerWidth: { configurable: true, value: 390 },
  });
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.matchMedia = (query) => {
    if (!mediaQueries.has(query)) {
      const listeners = new Set();
      mediaQueries.set(query, {
        media: query,
        matches: Boolean(mediaMatches[query]),
        addEventListener(type, listener) {
          if (type === "change") listeners.add(listener);
        },
        removeEventListener(type, listener) {
          if (type === "change") listeners.delete(listener);
        },
        dispatch(matches) {
          this.matches = matches;
          const event = { matches, media: query };
          for (const listener of listeners) listener(event);
        },
        listenerCount() {
          return listeners.size;
        },
      });
    }
    return mediaQueries.get(query);
  };

  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    HTMLMediaElement: dom.window.HTMLMediaElement,
    Event: dom.window.Event,
    WheelEvent: dom.window.WheelEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
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
    clearTimeout,
    pendingTimers(delay) {
      return [...timers.values()].filter((timer) => timer.delay === delay)
        .length;
    },
    mediaListenerCount(query) {
      return dom.window.matchMedia(query).listenerCount();
    },
    runTimers(delay) {
      const matching = [...timers.entries()].filter(
        ([, timer]) => timer.delay === delay,
      );
      for (const [id, timer] of matching) {
        timers.delete(id);
        timer.callback();
      }
    },
    stepAnimationFrame(elapsed = 1000 / 60) {
      animationTime += elapsed;
      const pending = [...animationFrames.entries()];
      animationFrames.clear();
      for (const [, callback] of pending) callback(animationTime);
    },
    setMediaMatch(query, matches) {
      dom.window.matchMedia(query).dispatch(matches);
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

function createFakeVideo({ videoFrameCallback = true, readyState = 4 } = {}) {
  const video = new window.EventTarget();
  const frameCallbacks = new Map();
  const seekTimes = [];
  let nextFrameId = 1;
  let currentTime = 0;

  Object.assign(video, {
    duration: 8,
    readyState,
    pause() {},
  });
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set(value) {
      currentTime = value;
      seekTimes.push(value);
    },
  });

  if (videoFrameCallback) {
    video.requestVideoFrameCallback = (callback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.set(id, callback);
      return id;
    };
    video.cancelVideoFrameCallback = (id) => frameCallbacks.delete(id);
  }

  return {
    video,
    seekTimes,
    pendingFrameCount: () => frameCallbacks.size,
    commitNextFrame() {
      const pending = frameCallbacks.entries().next();
      assert.equal(pending.done, false, "expected an in-flight video frame");
      const [id, callback] = pending.value;
      frameCallbacks.delete(id);
      callback(performance.now(), {});
    },
  };
}

function ScrubHarness({ video }) {
  const videoRef = useRef(video);
  const { heroState } = useHeroScrollScrub({ videoRef });

  return React.createElement(
    "div",
    { "data-hero-state": heroState },
    React.createElement("button", { type: "button" }, "Interactive target"),
    React.createElement("a", { href: "#target" }, "Link target"),
    React.createElement(
      "div",
      {
        contentEditable: true,
        "data-key-target": "editable",
        suppressContentEditableWarning: true,
      },
      "Editable target",
    ),
    React.createElement(
      "div",
      { tabIndex: 0, "data-key-target": "plain" },
      "Plain target",
    ),
  );
}

async function renderScrubHarness(video) {
  const root = createRoot(document.querySelector("#root"));
  await act(async () => {
    root.render(React.createElement(ScrubHarness, { video }));
  });

  return {
    root,
    state() {
      return document
        .querySelector("[data-hero-state]")
        .getAttribute("data-hero-state");
    },
  };
}

function dispatchWheel(target = window, options = {}) {
  const event = new window.WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY: 200,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

function dispatchKey(target, key, options = {}) {
  const event = new window.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

async function cleanupHarness(root, environment) {
  await act(async () => root.unmount());
  environment.restore();
}

test("scrub seeks stay on 24fps frame boundaries and serialize the latest target", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    await act(async () => {
      dispatchWheel(window, { deltaY: 420 });
      environment.stepAnimationFrame();
    });

    const firstSeek = fakeVideo.seekTimes.at(-1);
    assert.ok(firstSeek > 0);
    assert.equal(Number.isInteger(firstSeek * 24), true);
    assert.equal(fakeVideo.pendingFrameCount(), 1);

    const seekCountWhilePending = fakeVideo.seekTimes.length;
    await act(async () => {
      dispatchWheel(window, { deltaY: 420 });
    });
    assert.equal(
      fakeVideo.seekTimes.length,
      seekCountWhilePending,
      "an in-flight frame must absorb newer targets without issuing another seek",
    );

    await act(async () => {
      fakeVideo.commitNextFrame();
      environment.stepAnimationFrame(16);
    });
    assert.equal(
      fakeVideo.seekTimes.length,
      seekCountWhilePending,
      "completed frames must still respect the 24fps request cadence",
    );

    await act(async () => {
      environment.stepAnimationFrame(26);
    });
    const latestSeek = fakeVideo.seekTimes.at(-1);
    assert.ok(latestSeek > firstSeek);
    assert.equal(Number.isInteger(latestSeek * 24), true);
    assert.equal(fakeVideo.pendingFrameCount(), 1);
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("native scrolling remains available until the scrub video can display frames", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo({ readyState: 0 });
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    let loadingWheel;
    await act(async () => {
      loadingWheel = dispatchWheel();
      environment.stepAnimationFrame();
    });

    assert.equal(loadingWheel.defaultPrevented, false);
    assert.equal(harness.state(), "ready");
    assert.equal(fakeVideo.seekTimes.length, 1, "mount should only reset to frame zero");

    fakeVideo.video.readyState = 4;
    await act(async () => {
      fakeVideo.video.dispatchEvent(new window.Event("loadeddata"));
    });

    let readyWheel;
    await act(async () => {
      readyWheel = dispatchWheel();
      environment.stepAnimationFrame();
    });

    assert.equal(readyWheel.defaultPrevented, true);
    assert.equal(harness.state(), "scrubbing");
    assert.ok(fakeVideo.seekTimes.at(-1) > 0);
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("the first presented final frame resolves without a duplicate tail seek", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    await act(async () => {
      for (let index = 0; index < 7; index += 1) {
        dispatchWheel(window, { deltaY: 420 });
      }
    });

    let finalSeekCount = 0;
    for (let index = 0; index < 120; index += 1) {
      await act(async () => {
        environment.stepAnimationFrame(42);
        if (fakeVideo.pendingFrameCount() === 1) {
          const isFinalFrame =
            fakeVideo.video.currentTime >= 191 / 24 - 1e-6;
          if (isFinalFrame) finalSeekCount = fakeVideo.seekTimes.length;
          fakeVideo.commitNextFrame();
        }
      });
      if (finalSeekCount > 0) break;
    }

    assert.ok(finalSeekCount > 0, "expected the final usable frame to be sought");

    await act(async () => {
      environment.stepAnimationFrame(42);
    });

    assert.equal(harness.state(), "resolving");
    assert.equal(fakeVideo.pendingFrameCount(), 0);
    assert.equal(
      fakeVideo.seekTimes.length,
      finalSeekCount,
      "the final usable frame must not be sought twice",
    );
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("a later stuck video-frame seek times out and stops capturing native scroll", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    await act(async () => {
      assert.equal(dispatchWheel().defaultPrevented, true);
      environment.stepAnimationFrame();
      fakeVideo.commitNextFrame();
    });
    assert.equal(
      environment.pendingTimers(4000),
      0,
      "a committed frame must clear its seek watchdog",
    );

    await act(async () => {
      dispatchWheel();
      environment.stepAnimationFrame(42);
    });
    assert.equal(
      environment.pendingTimers(4000),
      1,
      "every later in-flight seek needs its own watchdog",
    );

    await act(async () => environment.runTimers(4000));

    assert.equal(harness.state(), "released");
    assert.equal(
      dispatchWheel().defaultPrevented,
      false,
      "native scrolling must resume after the stuck seek fails",
    );
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("fallback seeked commits clear their per-seek watchdog", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo({ videoFrameCallback: false });
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    await act(async () => {
      dispatchWheel();
      environment.stepAnimationFrame();
    });
    assert.equal(environment.pendingTimers(4000), 1);

    await act(async () => {
      fakeVideo.video.dispatchEvent(new window.Event("seeked"));
    });
    assert.equal(environment.pendingTimers(4000), 0);
    assert.equal(harness.state(), "scrubbing");
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("a stalled seek waits for its watchdog and never jumps the video to its tail", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    await act(async () => {
      dispatchWheel();
      environment.stepAnimationFrame();
    });
    const stalledTime = fakeVideo.video.currentTime;

    await act(async () => {
      fakeVideo.video.dispatchEvent(new window.Event("stalled"));
    });
    assert.equal(harness.state(), "scrubbing");
    let stalledWheel;
    await act(async () => {
      stalledWheel = dispatchWheel();
    });
    assert.equal(stalledWheel.defaultPrevented, true);
    assert.equal(environment.pendingTimers(4000), 1);

    await act(async () => {
      environment.runTimers(4000);
      environment.stepAnimationFrame();
    });
    assert.equal(harness.state(), "released");
    assert.equal(fakeVideo.video.currentTime, stalledTime);
    assert.equal(dispatchWheel().defaultPrevented, false);
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("abort and error media events release native scrolling", async () => {
  for (const eventType of ["abort", "error"]) {
    const environment = installDom();
    const fakeVideo = createFakeVideo();
    const harness = await renderScrubHarness(fakeVideo.video);

    try {
      await act(async () => {
        fakeVideo.video.dispatchEvent(new window.Event(eventType));
      });

      assert.equal(harness.state(), "released", eventType);
      assert.equal(dispatchWheel().defaultPrevented, false, eventType);
    } finally {
      await cleanupHarness(harness.root, environment);
    }
  }
});

test("keyboard scrubbing ignores interactive targets, modifiers, and repeats", async () => {
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);

  try {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Input target");
    document.body.append(input);
    const ignoredInputs = [
      [document.querySelector("button"), " ", {}],
      [document.querySelector("a"), "ArrowDown", {}],
      [document.querySelector("input"), "PageDown", {}],
      [
        document.querySelector("[data-key-target='editable']"),
        " ",
        {},
      ],
      [
        document.querySelector("[data-key-target='plain']"),
        " ",
        { shiftKey: true },
      ],
      [
        document.querySelector("[data-key-target='plain']"),
        "ArrowDown",
        { ctrlKey: true },
      ],
      [
        document.querySelector("[data-key-target='plain']"),
        "PageDown",
        { metaKey: true },
      ],
      [
        document.querySelector("[data-key-target='plain']"),
        "ArrowDown",
        { altKey: true },
      ],
      [
        document.querySelector("[data-key-target='plain']"),
        "ArrowDown",
        { repeat: true },
      ],
    ];

    for (const [target, key, options] of ignoredInputs) {
      let event;
      await act(async () => {
        event = dispatchKey(target, key, options);
      });
      assert.equal(
        event.defaultPrevented,
        false,
        `${key} on ${target.tagName} should remain native`,
      );
    }

    let ownedEvent;
    await act(async () => {
      ownedEvent = dispatchKey(
        document.querySelector("[data-key-target='plain']"),
        "ArrowDown",
      );
    });
    assert.equal(ownedEvent.defaultPrevented, true);
    assert.equal(harness.state(), "scrubbing");
  } finally {
    await cleanupHarness(harness.root, environment);
  }
});

test("enabling reduced motion after mount releases one-way and removes its listener", async () => {
  const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
  const environment = installDom();
  const fakeVideo = createFakeVideo();
  const harness = await renderScrubHarness(fakeVideo.video);
  let unmounted = false;

  try {
    assert.equal(environment.mediaListenerCount(reducedMotionQuery), 1);
    let capturedWheel;
    await act(async () => {
      capturedWheel = dispatchWheel();
    });
    assert.equal(capturedWheel.defaultPrevented, true);

    await act(async () => {
      environment.setMediaMatch(reducedMotionQuery, true);
    });
    assert.equal(harness.state(), "released");
    assert.equal(dispatchWheel().defaultPrevented, false);

    await act(async () => {
      environment.setMediaMatch(reducedMotionQuery, false);
    });
    assert.equal(harness.state(), "released");

    await act(async () => harness.root.unmount());
    unmounted = true;
    assert.equal(environment.mediaListenerCount(reducedMotionQuery), 0);
  } finally {
    if (!unmounted) await act(async () => harness.root.unmount());
    environment.restore();
  }
});

test("mounted Hero content is immediately readable while media remains progressive", async () => {
  const environment = installDom({
    mediaMatches: { "(pointer: coarse)": true },
    styles: heroStyles,
  });
  const root = createRoot(document.querySelector("#root"));

  try {
    await act(async () => {
      root.render(React.createElement(HeroSection));
    });

    const content = document.querySelector(".hero__content");
    assert.equal(
      document.querySelector(".hero__video").getAttribute("preload"),
      "auto",
    );
    assert.equal(
      document.querySelector(".hero__video").getAttribute("src"),
      "/assets/hero-bg-scrub-720.mp4",
    );
    assert.equal(
      document.querySelector(".hero__cycle-scene"),
      null,
      "disabled spatial view must not mount or request the cycle video",
    );
    assert.equal(content.hasAttribute("inert"), false);
    assert.equal(content.hasAttribute("aria-hidden"), false);
    assert.equal(getComputedStyle(content).pointerEvents, "auto");

    await act(async () => {
      document
        .querySelector(".hero__video")
        .dispatchEvent(new window.Event("error"));
    });

    assert.ok(document.querySelector(".hero--released"));
    assert.equal(content.hasAttribute("inert"), false);
    assert.equal(content.hasAttribute("aria-hidden"), false);
    assert.equal(getComputedStyle(content).pointerEvents, "auto");
  } finally {
    await act(async () => root.unmount());
    environment.restore();
  }
});
