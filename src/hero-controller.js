export function resolveHeroMode({
  reducedMotion,
  coarsePointer,
  autoplayBlocked,
}) {
  if (reducedMotion || autoplayBlocked) return "poster";
  if (coarsePointer) return "autoplay";
  return "interactive";
}
