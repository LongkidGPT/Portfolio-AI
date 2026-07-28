const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampSpatialInput = (value) => clamp(value, -1, 1);

export function resolveSpatialTargetTime(normalizedX, duration) {
  const safeDuration = Number.isFinite(duration) ? Math.max(duration, 0) : 0;
  return ((clampSpatialInput(normalizedX) + 1) / 2) * safeDuration;
}

export function classifySpatialGesture(deltaX, deltaY, threshold = 8) {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) {
    return "pending";
  }

  return Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
}
