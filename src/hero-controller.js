export const HERO_STATES = Object.freeze({
  READY: "ready",
  SCRUBBING: "scrubbing",
  RESOLVING: "resolving",
  REVEALED: "revealed",
  RELEASED: "released",
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getHeroScrubDistance(viewportHeight) {
  return clamp((viewportHeight * 22) / 10, 1200, 2200);
}

export function normalizeWheelDelta(
  { deltaY, deltaMode },
  { lineHeight = 16, pageHeight = 0 } = {},
) {
  if (deltaMode === 1) return deltaY * lineHeight;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

export function resolveTouchAdvance(previousY, currentY) {
  return Math.max(0, previousY - currentY);
}

export function shouldCaptureHeroInput(state) {
  return [
    HERO_STATES.READY,
    HERO_STATES.SCRUBBING,
    HERO_STATES.RESOLVING,
  ].includes(state);
}

export function advanceHeroScrub(model, deltaPixels, viewportHeight) {
  if (
    ![HERO_STATES.READY, HERO_STATES.SCRUBBING].includes(model.state) ||
    deltaPixels <= 0
  ) {
    return model;
  }

  const distance = getHeroScrubDistance(viewportHeight);
  const cappedDelta =
    deltaPixels > distance
      ? Math.min(deltaPixels, viewportHeight * 0.35)
      : deltaPixels;
  const progress = Number(
    clamp(model.progress + cappedDelta / distance, 0, 1).toPrecision(16),
  );

  return {
    state:
      progress === 1 ? HERO_STATES.RESOLVING : HERO_STATES.SCRUBBING,
    progress,
  };
}

export function resolveHeroRelease(model, deltaPixels) {
  if (model.state === HERO_STATES.REVEALED && deltaPixels > 0) {
    return { state: HERO_STATES.RELEASED, progress: 1 };
  }
  return model;
}
