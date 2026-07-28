const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeHeroPointer({ clientX, clientY }, rect) {
  const percentX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  const percentY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

  return {
    x: (percentX - 50) / 50,
    y: (percentY - 50) / 50,
    percentX,
    percentY,
  };
}

export function resolveHeroParallax({ x, y }) {
  return {
    translateX: x * 18,
    translateY: y * 12,
    rotateX: y * -0.5,
    rotateY: x * 0.7,
    scale: 1.04,
  };
}

export function resolvePointerLight(previous, next, elapsedMs) {
  const distance = Math.hypot(
    next.clientX - previous.clientX,
    next.clientY - previous.clientY,
  );
  const velocity = clamp(distance / Math.max(elapsedMs, 1) / 1.4, 0, 1);

  return {
    velocity,
    scale: 0.96 + velocity * 0.12,
    opacity: (64 + velocity * 20) / 100,
  };
}
