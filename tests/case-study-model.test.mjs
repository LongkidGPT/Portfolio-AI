import assert from "node:assert/strict";
import test from "node:test";

import * as caseStudyModel from "../src/case-study-model.js";
import { caseStudies } from "../src/case-study-manifest.js";
import { projects } from "../src/portfolio-data.js";

const { getCaseStudy, shouldDismissCaseStudy } = caseStudyModel;

const manifest = {
  brand: { id: "brand", slices: [{ src: "/brand-01.webp", width: 1720, height: 4096 }] },
};

test("case lookup returns the requested case and rejects unknown IDs", () => {
  assert.equal(getCaseStudy(manifest, "brand")?.id, "brand");
  assert.equal(getCaseStudy(manifest, "missing"), null);
  assert.equal(getCaseStudy(manifest, null), null);
});

test("runtime lookup preserves durable summaries after the generated manifest is rebuilt", () => {
  const regeneratedManifest = {
    brand: {
      id: "brand",
      slices: [
        {
          src: "/assets/cases/brand/slice-01.webp",
          width: 1720,
          height: 4096,
        },
      ],
    },
  };

  assert.deepEqual(getCaseStudy(regeneratedManifest, "brand"), {
    ...regeneratedManifest.brand,
    summary: {
      background: "多品牌全球化扩张需要统一、清晰且可执行的视觉语言。",
      responsibility: "负责光影、影像与场景规则模块，并推动跨品牌、跨团队应用。",
      outcome: "形成可复用的视觉规范，支持全球市场一致、高效落地。",
    },
  });
});

test("every project card case id resolves to a runtime case study", () => {
  assert.deepEqual(
    projects.map((project) => getCaseStudy(caseStudies, project.caseId)?.id),
    ["brand", "marketing", "system"],
  );
});

test("modal dismisses only for Escape, backdrop, and explicit close", () => {
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Escape" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: true }), true);
  assert.equal(shouldDismissCaseStudy({ type: "close" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: false }), false);
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Enter" }), false);
});

class FakeElement {
  constructor(document = null) {
    this.ownerDocument = document;
    this.attributes = new Map();
    this.inert = false;
    this.disabled = false;
    this.hidden = false;
    this.style = {};
    this.focusCount = 0;
  }

  focus() {
    this.focusCount += 1;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function keyboardEvent(key, { shiftKey = false } = {}) {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event;
}

test("modal environment makes the page inert, locks scroll, then restores page state and focus", () => {
  assert.equal(typeof caseStudyModel.activateModalEnvironment, "function");

  const document = { activeElement: null };
  const backgroundElement = new FakeElement(document);
  const returnFocusElement = new FakeElement(document);
  const body = new FakeElement(document);
  backgroundElement.setAttribute("aria-hidden", "false");
  body.style.overflow = "clip";

  const restore = caseStudyModel.activateModalEnvironment({
    backgroundElement,
    body,
    returnFocusElement,
  });

  assert.equal(backgroundElement.inert, true);
  assert.equal(backgroundElement.getAttribute("aria-hidden"), "true");
  assert.equal(body.style.overflow, "hidden");

  restore();

  assert.equal(backgroundElement.inert, false);
  assert.equal(backgroundElement.getAttribute("aria-hidden"), "false");
  assert.equal(body.style.overflow, "clip");
  assert.equal(returnFocusElement.focusCount, 1);
});

test("keyboard handling closes on Escape and cycles Tab focus inside the modal", () => {
  assert.equal(typeof caseStudyModel.handleCaseStudyKeyDown, "function");

  const document = { activeElement: null };
  const closeButton = new FakeElement(document);
  const retryButton = new FakeElement(document);
  const modalElement = {
    ownerDocument: document,
    querySelectorAll() {
      return [closeButton, retryButton];
    },
  };
  let closeCount = 0;

  const escapeEvent = keyboardEvent("Escape");
  caseStudyModel.handleCaseStudyKeyDown({
    event: escapeEvent,
    modalElement,
    onClose: () => {
      closeCount += 1;
    },
  });
  assert.equal(closeCount, 1);

  document.activeElement = retryButton;
  const tabEvent = keyboardEvent("Tab");
  caseStudyModel.handleCaseStudyKeyDown({
    event: tabEvent,
    modalElement,
    onClose() {},
  });
  assert.equal(tabEvent.defaultPrevented, true);
  assert.equal(document.activeElement, closeButton);

  document.activeElement = closeButton;
  const shiftTabEvent = keyboardEvent("Tab", { shiftKey: true });
  caseStudyModel.handleCaseStudyKeyDown({
    event: shiftTabEvent,
    modalElement,
    onClose() {},
  });
  assert.equal(shiftTabEvent.defaultPrevented, true);
  assert.equal(document.activeElement, retryButton);
});

test("backdrop handling closes only for a click on the backdrop itself", () => {
  assert.equal(typeof caseStudyModel.handleCaseStudyBackdrop, "function");

  const backdrop = {};
  let closeCount = 0;
  const onClose = () => {
    closeCount += 1;
  };

  caseStudyModel.handleCaseStudyBackdrop({
    event: { target: {}, currentTarget: backdrop },
    onClose,
  });
  caseStudyModel.handleCaseStudyBackdrop({
    event: { target: backdrop, currentTarget: backdrop },
    onClose,
  });

  assert.equal(closeCount, 1);
});

test("failed image retry resets the error and cache-busts URLs with or without queries", () => {
  assert.equal(typeof caseStudyModel.nextSliceRetryState, "function");
  assert.equal(typeof caseStudyModel.getRetrySliceSource, "function");

  const retryState = caseStudyModel.nextSliceRetryState({
    error: true,
    retry: 1,
  });

  assert.deepEqual(retryState, { error: false, retry: 2 });
  assert.equal(
    caseStudyModel.getRetrySliceSource("/slice.webp", retryState.retry),
    "/slice.webp?retry=2",
  );
  assert.equal(
    caseStudyModel.getRetrySliceSource("/slice.webp?width=860", 3),
    "/slice.webp?width=860&retry=3",
  );
});

test("case accessibility labels the dialog once and hides continuous image slices from assistive technology", () => {
  assert.equal(typeof caseStudyModel.getCaseStudyAccessibility, "function");

  assert.deepEqual(
    caseStudyModel.getCaseStudyAccessibility("营销全案｜新品上市视觉"),
    {
      title: "营销全案｜新品上市视觉",
      titleId: "case-study-title",
      imageAttributes: { alt: "", "aria-hidden": "true" },
    },
  );
});
