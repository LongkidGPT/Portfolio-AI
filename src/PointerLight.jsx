import { useEffect, useRef } from "react";

import { resolvePointerLight } from "./hero-parallax.js";

const INITIAL_LIGHT = {
  x: 0,
  y: 0,
  scale: 0.96,
  opacity: 0,
};

export function PointerLight() {
  const lightRef = useRef(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return undefined;

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const target = { ...INITIAL_LIGHT };
    const current = { ...INITIAL_LIGHT };
    const hero = document.querySelector(".hero");
    let previousPointer = null;
    let animationFrameId = 0;
    let enabled = false;
    let titleEntered = Boolean(
      hero?.matches(".hero--resolving, .hero--revealed, .hero--released"),
    );

    const updateVisibility = () => {
      target.opacity =
        enabled && titleEntered && previousPointer ? 0.8 : 0;
    };

    const render = () => {
      for (const key of Object.keys(current)) {
        current[key] += (target[key] - current[key]) * 0.18;
      }

      light.style.setProperty("--pointer-x", `${current.x}px`);
      light.style.setProperty("--pointer-y", `${current.y}px`);
      light.style.setProperty("--pointer-scale", current.scale);
      light.style.setProperty("--pointer-opacity", current.opacity);
      animationFrameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event) => {
      if (!enabled || event.pointerType === "touch") return;

      const now = performance.now();
      if (!previousPointer) {
        current.x = event.clientX;
        current.y = event.clientY;
      }
      const previous = previousPointer ?? {
        clientX: event.clientX,
        clientY: event.clientY,
        time: now,
      };
      const response = resolvePointerLight(
        previous,
        event,
        now - previous.time,
      );

      target.x = event.clientX;
      target.y = event.clientY;
      target.scale = response.scale;
      previousPointer = {
        clientX: event.clientX,
        clientY: event.clientY,
        time: now,
      };
      updateVisibility();
    };

    const hideLight = () => {
      target.opacity = 0;
      previousPointer = null;
    };

    const updateMode = () => {
      enabled =
        !coarsePointerQuery.matches && !reducedMotionQuery.matches;
      if (!enabled) {
        current.opacity = 0;
        light.style.setProperty("--pointer-opacity", 0);
      }
      updateVisibility();
    };

    const heroObserver = new window.MutationObserver(() => {
      titleEntered = Boolean(
        hero?.matches(".hero--resolving, .hero--revealed, .hero--released"),
      );
      updateVisibility();
    });

    if (hero) {
      heroObserver.observe(hero, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    coarsePointerQuery.addEventListener("change", updateMode);
    reducedMotionQuery.addEventListener("change", updateMode);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", hideLight);
    document.documentElement.addEventListener("mouseleave", hideLight);
    updateMode();
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      heroObserver.disconnect();
      coarsePointerQuery.removeEventListener("change", updateMode);
      reducedMotionQuery.removeEventListener("change", updateMode);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", hideLight);
      document.documentElement.removeEventListener(
        "mouseleave",
        hideLight,
      );
    };
  }, []);

  return (
    <img
      ref={lightRef}
      className="pointer-light"
      src="/assets/pointer-light-02.png"
      alt=""
      aria-hidden="true"
      style={{
        "--pointer-x": "0px",
        "--pointer-y": "0px",
        "--pointer-scale": 0.96,
        "--pointer-opacity": 0,
      }}
      onError={(event) =>
        event.currentTarget.classList.add("is-unavailable")
      }
    />
  );
}
