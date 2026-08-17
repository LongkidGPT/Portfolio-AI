import { useEffect, useState } from "react";

export const titleLines = ["DESIGN FOR RETAIL"];
const titleLength = titleLines.reduce((total, line) => total + line.length, 0);
const typeDelay = 30;
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

  // 按行拆分已打出的字数，支持 1 行或多行标题
  let consumed = 0;
  const lineStates = titleLines.map((line) => {
    const typed = Math.max(0, Math.min(visibleCount - consumed, line.length));
    const cursorHere =
      phase !== "done" &&
      visibleCount > consumed &&
      visibleCount <= consumed + line.length;
    consumed += line.length;
    return { line, typed, cursorHere };
  });
  // 一个字都没打时，光标停在第一行
  if (phase !== "done" && visibleCount === 0 && lineStates.length > 0) {
    lineStates[0].cursorHere = true;
  }

  return (
    <h1 className="hero-typewriter" aria-label={titleLines.join(" ")}>
      <span className="hero-typewriter__ghost" aria-hidden="true">
        {titleLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
      <span className="hero-typewriter__typed" aria-hidden="true">
        {lineStates.map(({ line, typed, cursorHere }) => (
          <span key={line}>
            {line.slice(0, typed)}
            {cursorHere && <i className="hero-typewriter__cursor" />}
          </span>
        ))}
      </span>
    </h1>
  );
}
