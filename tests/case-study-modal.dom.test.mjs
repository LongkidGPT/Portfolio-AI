import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";
import React, { useRef, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";

import { projects } from "../src/portfolio-data.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let vite;
let CaseStudyModal;
let ProjectCard;

test.before(async () => {
  vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ CaseStudyModal } = await vite.ssrLoadModule("/src/CaseStudyModal.jsx"));
  ({ ProjectCard } = await vite.ssrLoadModule("/src/ProjectCard.jsx"));
});

test.after(async () => {
  await vite?.close();
});

function installDom() {
  const dom = new JSDOM(
    "<!doctype html><html><body style=\"overflow: clip\"><div id=\"root\"></div></body></html>",
    { url: "https://portfolio.test/" },
  );
  const previousGlobals = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: clearTimeout,
  };

  for (const [name, value] of Object.entries(globals)) {
    previousGlobals[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true,
    });
  }

  dom.window.matchMedia = (query) => ({
    media: query,
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  });

  return () => {
    dom.window.close();
    for (const [name, descriptor] of Object.entries(previousGlobals)) {
      if (descriptor === undefined) delete globalThis[name];
      else Object.defineProperty(globalThis, name, descriptor);
    }
  };
}

function click(element) {
  element.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

function keydown(key, { shiftKey = false } = {}) {
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function ModalHarness({ onClose }) {
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const backgroundRef = useRef(null);
  const returnFocusRef = useRef(null);
  const selectedProject = projects.find(
    (project) => project.id === selectedCaseId,
  );
  const selectedIndex = projects.findIndex(
    (project) => project.id === selectedCaseId,
  );
  const previousProject = selectedIndex > 0 ? projects[selectedIndex - 1] : null;
  const nextProject =
    selectedIndex >= 0 && selectedIndex < projects.length - 1
      ? projects[selectedIndex + 1]
      : null;

  const openCase = (event, caseId) => {
    returnFocusRef.current = event.currentTarget;
    setSelectedCaseId(caseId);
  };
  const closeCase = () => {
    onClose();
    setSelectedCaseId(null);
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { "data-testid": "background", ref: backgroundRef },
      projects.map((project) =>
        React.createElement(
          "button",
          {
            "data-case-id": project.caseId,
            key: project.id,
            onClick: (event) => openCase(event, project.caseId),
            type: "button",
          },
          project.title,
        ),
      ),
    ),
    React.createElement(CaseStudyModal, {
      backgroundRef,
      caseId: selectedCaseId,
      onClose: closeCase,
      returnFocusRef,
      title: selectedProject?.title ?? "",
      previousProject,
      nextProject,
      onSelectCase: setSelectedCaseId,
    }),
  );
}

async function renderHarness(onClose = () => {}) {
  const restoreDom = installDom();
  const container = document.querySelector("#root");
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(ModalHarness, { onClose }));
  });

  return {
    async cleanup() {
      await act(async () => root.unmount());
      restoreDom();
    },
    openButton(caseId = "brand") {
      return document.querySelector(`[data-case-id="${caseId}"]`);
    },
  };
}

async function openCase(harness, caseId = "brand") {
  const opener = harness.openButton(caseId);
  opener.focus();
  await act(async () => click(opener));
  return opener;
}

test("modal effect isolates the page, locks scrolling, and restores both state and focus after close", async () => {
  let closeCount = 0;
  const harness = await renderHarness(() => {
    closeCount += 1;
  });

  try {
    const opener = await openCase(harness);
    const background = document.querySelector("[data-testid='background']");
    const closeButton = document.querySelector("[aria-label='关闭案例']");

    assert.equal(background.inert, true);
    assert.equal(background.getAttribute("aria-hidden"), "true");
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(document.activeElement, closeButton);

    await act(async () => click(closeButton));

    assert.equal(closeCount, 1);
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(background.inert, false);
    assert.equal(background.hasAttribute("aria-hidden"), false);
    assert.equal(document.body.style.overflow, "clip");
    assert.equal(document.activeElement, opener);

    await act(async () => keydown("Escape"));
    assert.equal(closeCount, 1, "keydown listener must be removed after close");
  } finally {
    await harness.cleanup();
  }
});

test("rendered modal traps Tab in its controls and retries a failed image with a cache-busted URL", async () => {
  const harness = await renderHarness();

  try {
    await openCase(harness);
    const firstImage = document.querySelector(".case-study__slice img");
    assert.equal(firstImage.alt, "");
    assert.equal(firstImage.getAttribute("aria-hidden"), "true");

    await act(async () => {
      firstImage.dispatchEvent(new window.Event("error", { bubbles: true }));
    });

    const retryButton = document.querySelector(".case-study__retry");
    const closeButton = document.querySelector("[aria-label='关闭案例']");
    const lastButton = document.querySelector(
      "[aria-label^='查看下一个案例']",
    );
    assert.ok(retryButton);
    assert.ok(lastButton);

    lastButton.focus();
    await act(async () => keydown("Tab"));
    assert.equal(document.activeElement, closeButton);

    closeButton.focus();
    await act(async () => keydown("Tab", { shiftKey: true }));
    assert.equal(document.activeElement, lastButton);

    await act(async () => click(retryButton));
    assert.equal(
      document.querySelector(".case-study__slice img").getAttribute("src"),
      "/assets/cases/brand/slice-01.webp?retry=1",
    );
  } finally {
    await harness.cleanup();
  }
});

test("rendered case slices reserve their real dimensions without forcing a second aspect-ratio box", async () => {
  const harness = await renderHarness();

  try {
    await openCase(harness, "system");
    const firstSlice = document.querySelector(".case-study__slice");
    const firstImage = firstSlice.querySelector("img");

    assert.equal(firstSlice.hasAttribute("style"), false);
    assert.equal(firstImage.getAttribute("width"), "1720");
    assert.equal(firstImage.getAttribute("height"), "4096");
  } finally {
    await harness.cleanup();
  }
});

test("Escape and backdrop close the rendered modal while document clicks do not", async () => {
  let closeCount = 0;
  const harness = await renderHarness(() => {
    closeCount += 1;
  });

  try {
    await openCase(harness);
    await act(async () => keydown("Escape"));
    assert.equal(closeCount, 1);

    await openCase(harness);
    await act(async () => click(document.querySelector(".case-study__document")));
    assert.equal(closeCount, 1);

    await act(async () => click(document.querySelector("[role='dialog']")));
    assert.equal(closeCount, 2);
  } finally {
    await harness.cleanup();
  }
});

test("all three rendered dialogs expose structured background, responsibility, and outcome summaries", async () => {
  const harness = await renderHarness();

  try {
    for (const project of projects) {
      await openCase(harness, project.caseId);
      const dialog = document.querySelector("[role='dialog']");
      const summaryId = dialog.getAttribute("aria-describedby");
      const summary = document.getElementById(summaryId);

      assert.ok(summaryId);
      assert.ok(summary);
      assert.match(summary.textContent, /项目背景/);
      assert.match(summary.textContent, /我的职责/);
      assert.match(summary.textContent, /项目成果/);
      const summaryValues = [...summary.querySelectorAll("dd")];
      assert.equal(summaryValues.length, 3);
      assert.ok(
        summaryValues.every((value) => value.textContent.trim().length >= 12),
        `${project.caseId} summary values must contain meaningful content`,
      );

      await act(async () =>
        click(document.querySelector("[aria-label='关闭案例']")),
      );
    }
  } finally {
    await harness.cleanup();
  }
});

test("rendered ProjectCard forwards its runtime case id when clicked", async () => {
  const restoreDom = installDom();
  const root = createRoot(document.querySelector("#root"));
  const openedCaseIds = [];

  try {
    await act(async () => {
      root.render(
        React.createElement(ProjectCard, {
          onOpenCase: (caseId) => openedCaseIds.push(caseId),
          project: projects[1],
        }),
      );
    });
    await act(async () => click(document.querySelector(".project-card")));

    assert.deepEqual(openedCaseIds, ["marketing"]);
  } finally {
    await act(async () => root.unmount());
    restoreDom();
  }
});
