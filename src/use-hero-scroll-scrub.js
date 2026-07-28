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

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    video.pause();
    video.currentTime = 0;

    if (reducedMotion) {
      publish({ state: HERO_STATES.RELEASED, progress: 1 });
      return undefined;
    }

    let animationFrameId = 0;
    let videoFrameId = null;
    let disposed = false;
    let lastPresentedProgress = 0;
    let fallbackSeekProgress = null;
    let touchPoint = null;

    const handleMetadata = () => {
      readyRef.current = true;
    };

    const handleReady = () => {
      handleMetadata();
      window.clearTimeout(failureTimerId);
    };

    const handleSeeked = () => {
      if (fallbackSeekProgress === null) return;
      lastPresentedProgress = fallbackSeekProgress;
      fallbackSeekProgress = null;
    };

    const failureTimerId = window.setTimeout(failMedia, 4000);

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
      if (!ADVANCE_KEYS.has(event.key)) return;
      publishInput(window.innerHeight * 0.28, event);
    };

    const requestSeek = (nextTime, requestedProgress) => {
      const needsFinalFrame =
        requestedProgress === 1 && lastPresentedProgress !== 1;

      if (
        !readyRef.current ||
        !Number.isFinite(video.duration) ||
        (!needsFinalFrame &&
          Math.abs(video.currentTime - nextTime) < 1 / 48)
      ) {
        return;
      }

      if ("requestVideoFrameCallback" in video) {
        if (videoFrameId !== null) return;
        video.currentTime = nextTime;
        videoFrameId = video.requestVideoFrameCallback(() => {
          lastPresentedProgress = requestedProgress;
          videoFrameId = null;
        });
        return;
      }

      if (fallbackSeekProgress !== null) return;
      fallbackSeekProgress = requestedProgress;
      video.currentTime = nextTime;
    };

    const render = () => {
      const target = targetProgressRef.current;
      const current = renderedProgressRef.current;
      const difference = target - current;
      const rendered =
        Math.abs(difference) < 0.001 ? target : current + difference * 0.16;

      renderedProgressRef.current = rendered;

      const finalUsableTime = Math.max((video.duration || 8) - 1 / 24, 0);
      requestSeek(rendered * finalUsableTime, rendered);

      if (
        target === 1 &&
        rendered >= 0.999 &&
        lastPresentedProgress === 1 &&
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
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.clearTimeout(failureTimerId);
      window.cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameId);
      }
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("seeked", handleSeeked);
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
