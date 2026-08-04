import { useCallback, useEffect, useRef, useState } from "react";

import {
  HERO_STATES,
  advanceHeroScrub,
  normalizeWheelDelta,
  resolveHeroRelease,
  resolveTouchAdvance,
  shouldCaptureHeroInput,
} from "./hero-controller.js";

const ADVANCE_KEYS = new Set(["ArrowDown", "PageDown", " "]);
const HERO_VIDEO_FPS = 24;
const MIN_SEEK_INTERVAL_MS = 1000 / HERO_VIDEO_FPS;
const INTERACTIVE_KEY_TARGETS =
  "a, button, input, select, textarea, [contenteditable]:not([contenteditable='false'])";

function shouldOwnHeroKeyDown(event) {
  if (
    !ADVANCE_KEYS.has(event.key) ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false;
  }

  return !event.target?.closest?.(INTERACTIVE_KEY_TARGETS);
}

export function useHeroScrollScrub({ videoRef }) {
  const [model, setModel] = useState({
    state: HERO_STATES.READY,
    progress: 0,
  });
  const modelRef = useRef(model);
  const targetProgressRef = useRef(0);
  const renderedProgressRef = useRef(0);
  const readyRef = useRef(false);

  const publish = useCallback((next) => {
    modelRef.current = next;
    targetProgressRef.current = next.progress;
    setModel(next);
  }, []);

  const failMedia = useCallback(() => {
    readyRef.current = false;
    publish({ state: HERO_STATES.RELEASED, progress: 1 });
  }, [publish]);

  const releaseHero = useCallback(() => {
    if (modelRef.current.state === HERO_STATES.REVEALED) {
      publish({ state: HERO_STATES.RELEASED, progress: 1 });
    }
  }, [publish]);

  const completeReveal = useCallback(() => {
    if (modelRef.current.state === HERO_STATES.RESOLVING) {
      publish({ state: HERO_STATES.REVEALED, progress: 1 });
    }
  }, [publish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    video.pause();
    video.currentTime = 0;

    if (reducedMotionQuery.matches) {
      publish({ state: HERO_STATES.RELEASED, progress: 1 });
      return undefined;
    }

    let animationFrameId = 0;
    let videoFrameId = null;
    let disposed = false;
    let lastPresentedTime = 0;
    let fallbackSeekProgress = null;
    let fallbackSeekTime = null;
    let seekWatchdogId = null;
    let touchPoint = null;
    let lastSeekRequestedAt = Number.NEGATIVE_INFINITY;

    const clearSeekWatchdog = () => {
      if (seekWatchdogId === null) return;
      window.clearTimeout(seekWatchdogId);
      seekWatchdogId = null;
    };

    const cancelInFlightSeek = () => {
      clearSeekWatchdog();
      if (videoFrameId !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameId);
      }
      videoFrameId = null;
      fallbackSeekProgress = null;
      fallbackSeekTime = null;
    };

    const handleMediaFailure = () => {
      window.clearTimeout(failureTimerId);
      cancelInFlightSeek();
      failMedia();
    };

    const armSeekWatchdog = () => {
      clearSeekWatchdog();
      seekWatchdogId = window.setTimeout(handleMediaFailure, 4000);
    };

    const handleMetadata = () => {
      readyRef.current = true;
    };

    const handleReady = () => {
      handleMetadata();
      window.clearTimeout(failureTimerId);
    };

    const handleSeeked = () => {
      if (fallbackSeekProgress === null) return;
      lastPresentedTime = fallbackSeekTime ?? video.currentTime;
      fallbackSeekProgress = null;
      fallbackSeekTime = null;
      clearSeekWatchdog();
    };

    const failureTimerId = window.setTimeout(handleMediaFailure, 4000);

    const handleReducedMotionChange = (event) => {
      if (!event.matches) return;
      handleMediaFailure();
    };

    if (video.readyState >= 1) {
      handleMetadata();
    }
    if (video.readyState >= 2) {
      handleReady();
    }

    const publishInput = (deltaPixels, event) => {
      const current = modelRef.current;
      const released = resolveHeroRelease(current, deltaPixels);

      if (released !== current) {
        publish(released);
        return;
      }

      if (shouldCaptureHeroInput(current.state)) {
        event.preventDefault();
      }

      if (![HERO_STATES.READY, HERO_STATES.SCRUBBING].includes(current.state)) {
        return;
      }

      const next = advanceHeroScrub(
        current,
        deltaPixels,
        window.innerHeight,
      );

      targetProgressRef.current = next.progress;

      if (next.state === HERO_STATES.RESOLVING) {
        const queued = {
          state: HERO_STATES.SCRUBBING,
          progress: next.progress,
        };
        modelRef.current = queued;
        setModel(queued);
        return;
      }

      publish(next);
    };

    const handleWheel = (event) => {
      const lineHeight =
        Number.parseFloat(getComputedStyle(document.documentElement).lineHeight) ||
        16;
      const delta = normalizeWheelDelta(event, {
        lineHeight,
        pageHeight: window.innerHeight,
      });
      publishInput(delta, event);
    };

    const handleTouchStart = (event) => {
      const touch = event.touches[0];
      touchPoint = touch
        ? { clientX: touch.clientX, clientY: touch.clientY }
        : null;
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      const current = modelRef.current;

      if (!touch || !touchPoint) return;

      if (shouldCaptureHeroInput(current.state)) {
        event.preventDefault();
      }

      const horizontal = Math.abs(touch.clientX - touchPoint.clientX);
      const vertical = Math.abs(touch.clientY - touchPoint.clientY);
      const delta =
        vertical > horizontal
          ? resolveTouchAdvance(touchPoint.clientY, touch.clientY)
          : 0;

      touchPoint = { clientX: touch.clientX, clientY: touch.clientY };
      publishInput(delta, event);
    };

    const handleTouchEnd = () => {
      touchPoint = null;
    };

    const handleKeyDown = (event) => {
      if (!shouldOwnHeroKeyDown(event)) return;
      publishInput(window.innerHeight * 0.28, event);
    };

    const requestSeek = (nextTime, requestedProgress, timestamp) => {
      const needsFinalFrame =
        requestedProgress === 1 &&
        lastPresentedTime < nextTime - 1 / (HERO_VIDEO_FPS * 2);

      if (
        !readyRef.current ||
        !Number.isFinite(video.duration) ||
        (!needsFinalFrame &&
          Math.abs(video.currentTime - nextTime) < 1 / 48)
      ) {
        return;
      }

      if (
        !needsFinalFrame &&
        timestamp - lastSeekRequestedAt < MIN_SEEK_INTERVAL_MS
      ) {
        return;
      }

      if ("requestVideoFrameCallback" in video) {
        if (videoFrameId !== null) return;
        lastSeekRequestedAt = timestamp;
        video.currentTime = nextTime;
        videoFrameId = video.requestVideoFrameCallback(() => {
          lastPresentedTime = nextTime;
          videoFrameId = null;
          clearSeekWatchdog();
        });
        armSeekWatchdog();
        return;
      }

      if (fallbackSeekProgress !== null) return;
      lastSeekRequestedAt = timestamp;
      fallbackSeekProgress = requestedProgress;
      fallbackSeekTime = nextTime;
      video.currentTime = nextTime;
      armSeekWatchdog();
    };

    const render = (timestamp = performance.now()) => {
      if (
        [HERO_STATES.REVEALED, HERO_STATES.RELEASED].includes(
          modelRef.current.state,
        )
      ) {
        return;
      }

      const target = targetProgressRef.current;
      const current = renderedProgressRef.current;
      const difference = target - current;
      const rendered =
        Math.abs(difference) < 0.001 ? target : current + difference * 0.16;

      renderedProgressRef.current = rendered;

      const finalUsableTime = Math.max(
        (video.duration || 8) - 1 / HERO_VIDEO_FPS,
        0,
      );
      const frameTime = Math.min(
        Math.round(rendered * finalUsableTime * HERO_VIDEO_FPS) /
          HERO_VIDEO_FPS,
        finalUsableTime,
      );
      requestSeek(frameTime, rendered, timestamp);

      if (
        target === 1 &&
        lastPresentedTime >=
          finalUsableTime - 1 / (HERO_VIDEO_FPS * 2) &&
        modelRef.current.state === HERO_STATES.SCRUBBING
      ) {
        publish({ state: HERO_STATES.RESOLVING, progress: 1 });
      }

      if (!disposed) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("abort", handleMediaFailure);
    video.addEventListener("error", handleMediaFailure);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.clearTimeout(failureTimerId);
      clearSeekWatchdog();
      window.cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameId);
      }
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("abort", handleMediaFailure);
      video.removeEventListener("error", handleMediaFailure);
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [failMedia, publish, videoRef]);

  return {
    heroState: model.state,
    renderedProgress: renderedProgressRef.current,
    completeReveal,
    failMedia,
    releaseHero,
  };
}
