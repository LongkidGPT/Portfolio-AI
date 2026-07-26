import { caseStudyContent } from "./case-study-content.js";

export function getCaseStudy(manifest, caseId) {
  if (!caseId || !manifest[caseId]) return null;
  return {
    ...manifest[caseId],
    ...caseStudyContent[caseId],
  };
}

export function shouldDismissCaseStudy({ type, key, isBackdrop = false }) {
  if (type === "close") return true;
  if (type === "keydown") return key === "Escape";
  return type === "backdrop" && isBackdrop;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(modalElement) {
  return [...modalElement.querySelectorAll(focusableSelector)].filter(
    (element) =>
      !element.disabled &&
      !element.hidden &&
      element.getAttribute?.("aria-hidden") !== "true",
  );
}

export function activateModalEnvironment({
  backgroundElement,
  body,
  returnFocusElement,
}) {
  const originalInert = backgroundElement?.inert ?? false;
  const originalAriaHidden =
    backgroundElement?.getAttribute?.("aria-hidden") ?? null;
  const originalOverflow = body.style.overflow;

  if (backgroundElement) {
    backgroundElement.inert = true;
    backgroundElement.setAttribute("aria-hidden", "true");
  }
  body.style.overflow = "hidden";

  return () => {
    if (backgroundElement) {
      backgroundElement.inert = originalInert;
      if (originalAriaHidden === null) {
        backgroundElement.removeAttribute("aria-hidden");
      } else {
        backgroundElement.setAttribute("aria-hidden", originalAriaHidden);
      }
    }
    body.style.overflow = originalOverflow;
    if (returnFocusElement?.isConnected !== false) {
      returnFocusElement?.focus?.();
    }
  };
}

export function handleCaseStudyKeyDown({ event, modalElement, onClose }) {
  if (shouldDismissCaseStudy({ type: event.type, key: event.key })) {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = focusableElements(modalElement);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  const activeElement = modalElement.ownerDocument.activeElement;
  const activeIndex = focusable.indexOf(activeElement);
  const shouldWrapBackward = event.shiftKey && activeIndex <= 0;
  const shouldWrapForward =
    !event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1);

  if (shouldWrapBackward || shouldWrapForward) {
    event.preventDefault();
    (shouldWrapBackward ? last : first).focus();
  }
}

export function handleCaseStudyBackdrop({ event, onClose }) {
  if (
    shouldDismissCaseStudy({
      type: "backdrop",
      isBackdrop: event.target === event.currentTarget,
    })
  ) {
    onClose();
  }
}

export function nextSliceRetryState(currentState = {}) {
  return {
    error: false,
    retry: (currentState.retry ?? 0) + 1,
  };
}

export function getRetrySliceSource(source, retry = 0) {
  if (!retry) return source;
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}retry=${retry}`;
}

export function getCaseStudyAccessibility(title) {
  return {
    title: title || "项目案例",
    titleId: "case-study-title",
    imageAttributes: { alt: "", "aria-hidden": "true" },
  };
}
