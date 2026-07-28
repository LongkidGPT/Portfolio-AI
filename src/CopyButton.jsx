import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { copyText } from "./copy-text.js";

export function CopyButton({
  value,
  label,
  copiedLabel,
  className,
  trackLabel,
  showArrow = false,
  onAnimationEnd,
}) {
  const [copyState, setCopyState] = useState("idle");
  const feedbackTimerRef = useRef(null);

  useEffect(
    () => () => window.clearTimeout(feedbackTimerRef.current),
    [],
  );

  const handleCopy = async () => {
    const copied = await copyText(value);
    setCopyState(copied ? "copied" : "failed");
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(
      () => setCopyState("idle"),
      1800,
    );
  };

  const visibleLabel =
    copyState === "copied"
      ? copiedLabel
      : copyState === "failed"
        ? "复制失败，请重试"
        : label;

  return (
    <button
      className={`${className} copy-action copy-action--${copyState}`}
      type="button"
      data-track-label={trackLabel}
      onClick={handleCopy}
      onAnimationEnd={onAnimationEnd}
      aria-live="polite"
    >
      {visibleLabel}
      {copyState === "copied" ? (
        <span className="copy-action__status" aria-hidden="true">
          ✓
        </span>
      ) : (
        showArrow && (
          <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
        )
      )}
    </button>
  );
}
