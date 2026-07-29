import { useEffect, useState } from "react";

const titleLines = ["Design for Business", "Momentum"];
const titleLength = titleLines.reduce((total, line) => total + line.length, 0);
const typeDelay = 60;
const cursorHoldDelay = 1000;

export function HeroTypewriter({ active, onComplete }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    if (!active || phase !== "idle") return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(titleLength);
      setPhase("done");
      onComplete();
      return undefined;
    }

    setPhase("typing");
    return undefined;
  }, [active, onComplete, phase]);

  useEffect(() => {
    if (phase !== "typing") return undefined;

    const timerId = window.setTimeout(() => {
      setVisibleCount((currentCount) => {
        const nextCount = Math.min(titleLength, currentCount + 1);
        if (nextCount === titleLength) setPhase("cursor");
        return nextCount;
      });
    }, typeDelay);

    return () => window.clearTimeout(timerId);
  }, [phase, visibleCount]);

  useEffect(() => {
    if (phase !== "cursor") return undefined;

    const timerId = window.setTimeout(() => {
      setPhase("done");
      onComplete();
    }, cursorHoldDelay);

    return () => window.clearTimeout(timerId);
  }, [onComplete, phase]);

  const firstLineCount = Math.min(visibleCount, titleLines[0].length);
  const secondLineCount = Math.max(0, visibleCount - titleLines[0].length);
  const cursorOnFirstLine =
    phase !== "done" && visibleCount <= titleLines[0].length;
  const cursorOnSecondLine =
    phase !== "done" && visibleCount > titleLines[0].length;

  return (
    <h1
      className="hero-typewriter"
      aria-label="Design for Business Momentum"
    >
      <span className="hero-typewriter__ghost" aria-hidden="true">
        <span>Design for Business</span>
        <span>Momentum</span>
      </span>
      <span className="hero-typewriter__typed" aria-hidden="true">
        <span>
          {titleLines[0].slice(0, firstLineCount)}
          {cursorOnFirstLine && (
            <i className="hero-typewriter__cursor" />
          )}
        </span>
        <span>
          {titleLines[1].slice(0, secondLineCount)}
          {cursorOnSecondLine && (
            <i className="hero-typewriter__cursor" />
          )}
        </span>
      </span>
    </h1>
  );
}
