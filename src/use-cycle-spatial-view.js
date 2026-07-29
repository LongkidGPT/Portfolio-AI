import { useEffect } from "react";

import {
  classifySpatialGesture,
  resolveSpatialTargetTime,
} from "./cycle-spatial-view.js";

const CYCLE_FALLBACK_DURATION = 2 / 3;
const SEEK_EPSILON = 1 / 90;

function normalizeClientX(clientX, rect) {
  if (!rect.width) return 0;
  return Math.min(
    1,
    Math.max(-1, ((clientX - rect.left) / rect.width) * 2 - 1),
  );
}

export function useCycleSpatialView({ heroRef, videoRef, active }) {
  useEffect(() => {
    const hero = heroRef.current;
    const video = videoRef.current;
    if (!hero || !video) return undefined;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (!active || reducedMotionQuery.matches) return undefined;

    let targetX = 0;
    let currentX = 0;
    let animationFrameId = 0;
    let videoFrameId = null;
    let touchGesture = null;
    let disposed = false;

    video.pause();

    const requestSeek = (time) => {
      if (
        video.readyState < 1 ||
        Math.abs(video.currentTime - time) < SEEK_EPSILON
      ) {
        return;
      }

      if ("requestVideoFrameCallback" in video) {
        if (videoFrameId !== null) return;
        video.currentTime = time;
        videoFrameId = video.requestVideoFrameCallback(() => {
          videoFrameId = null;
        });
        return;
      }

      video.currentTime = time;
    };

    const render = () => {
      const difference = targetX - currentX;
      currentX =
        Math.abs(difference) < 0.001
          ? targetX
          : currentX + difference * 0.14;

      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : CYCLE_FALLBACK_DURATION;
      requestSeek(resolveSpatialTargetTime(currentX, duration));

      if (!disposed) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    const handlePointerDown = (event) => {
      if (event.pointerType !== "touch") return;
      touchGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: "pending",
      };
      hero.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === "touch") {
        if (!touchGesture || touchGesture.pointerId !== event.pointerId) {
          return;
        }

        if (touchGesture.axis === "pending") {
          touchGesture.axis = classifySpatialGesture(
            event.clientX - touchGesture.startX,
            event.clientY - touchGesture.startY,
          );
        }

        if (touchGesture.axis !== "horizontal") return;
        event.preventDefault();
      }

      targetX = normalizeClientX(
        event.clientX,
        hero.getBoundingClientRect(),
      );
    };

    const resetView = (event) => {
      if (
        event?.pointerType === "touch" &&
        touchGesture &&
        event.pointerId !== touchGesture.pointerId
      ) {
        return;
      }

      targetX = 0;
      touchGesture = null;
    };

    const handleReducedMotionChange = (event) => {
      if (!event.matches) return;
      targetX = 0;
      currentX = 0;
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : CYCLE_FALLBACK_DURATION;
      video.currentTime = duration / 2;
    };

    hero.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    hero.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    hero.addEventListener("pointerup", resetView, { passive: true });
    hero.addEventListener("pointercancel", resetView, { passive: true });
    hero.addEventListener("pointerleave", resetView, { passive: true });
    reducedMotionQuery.addEventListener(
      "change",
      handleReducedMotionChange,
    );
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameId);
      }
      hero.removeEventListener("pointerdown", handlePointerDown);
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerup", resetView);
      hero.removeEventListener("pointercancel", resetView);
      hero.removeEventListener("pointerleave", resetView);
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
    };
  }, [active, heroRef, videoRef]);
}
