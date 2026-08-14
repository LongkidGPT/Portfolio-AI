import { useEffect, useRef, useState } from "react";

import { resolvePointerLight } from "./hero-parallax.js";

const INITIAL_LIGHT = {
  x: 0,
  y: 0,
  scale: 0.96,
  opacity: 0,
};
const LIGHT_SETTLE_EPSILON = 0.001;
const ACTIVE_HERO_STATES = ".hero";

function ActivePointerLight() {
  const lightRef = useRef(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return undefined;

    const target = { ...INITIAL_LIGHT };
    const current = { ...INITIAL_LIGHT };
    let previousPointer = null;
    let animationFrameId = 0;

    const render = () => {
      let unsettled = false;

      for (const key of Object.keys(current)) {
        const difference = target[key] - current[key];
        current[key] += difference * 0.18;
        unsettled ||= Math.abs(difference) > LIGHT_SETTLE_EPSILON;
      }

      light.style.setProperty("--pointer-x", `${current.x}px`);
      light.style.setProperty("--pointer-y", `${current.y}px`);
      light.style.setProperty("--pointer-scale", current.scale);
      light.style.setProperty("--pointer-opacity", current.opacity);

      animationFrameId = unsettled
        ? window.requestAnimationFrame(render)
        : 0;
    };

    const requestRender = () => {
      if (animationFrameId !== 0) return;
      animationFrameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === "touch") return;

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
      target.opacity = 0.8;
      previousPointer = {
        clientX: event.clientX,
        clientY: event.clientY,
        time: now,
      };
      requestRender();
    };

    const hideLight = () => {
      target.opacity = 0;
      previousPointer = null;
      requestRender();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", hideLight);
    document.addEventListener("visibilitychange", hideLight);
    document.documentElement.addEventListener("mouseleave", hideLight);

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", hideLight);
      document.removeEventListener("visibilitychange", hideLight);
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
      src="/assets/pointer-light-02.webp"
      alt=""
      aria-hidden="true"
      decoding="async"
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

export function PointerLight() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const hero = document.querySelector(".hero");

    const updateMode = () => {
      setEnabled(
        !coarsePointerQuery.matches &&
          !reducedMotionQuery.matches &&
          Boolean(hero?.matches(ACTIVE_HERO_STATES)),
      );
    };

    const heroObserver = new window.MutationObserver(updateMode);
    if (hero) {
      heroObserver.observe(hero, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    coarsePointerQuery.addEventListener("change", updateMode);
    reducedMotionQuery.addEventListener("change", updateMode);
    updateMode();

    return () => {
      heroObserver.disconnect();
      coarsePointerQuery.removeEventListener("change", updateMode);
      reducedMotionQuery.removeEventListener("change", updateMode);
    };
  }, []);

  return enabled ? <ActivePointerLight /> : null;
}
