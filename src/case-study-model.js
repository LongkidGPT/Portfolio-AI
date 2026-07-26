export function getCaseStudy(manifest, caseId) {
  if (!caseId || !manifest[caseId]) return null;
  return manifest[caseId];
}

export function shouldDismissCaseStudy({ type, key, isBackdrop = false }) {
  if (type === "close") return true;
  if (type === "keydown") return key === "Escape";
  return type === "backdrop" && isBackdrop;
}
