const EMPTY_SESSION = {
  id: "empty",
  visitorLabel: "WAITING",
  visitNumber: 0,
  currentSection: "—",
  maxScrollDepth: 0,
  active: false,
  events: [],
  heatmap: {},
};

export function buildVisitorMonitorModel({
  mode,
  snapshot,
  isOwner,
  selectedSessionId,
}) {
  const current =
    snapshot.sessions.find(
      (session) => session.id === selectedSessionId,
    ) ??
    snapshot.sessions.find((session) => session.active) ??
    snapshot.sessions[0] ??
    EMPTY_SESSION;

  return {
    masked: mode === "blurred",
    maskLabel: mode === "blurred" ? "DATA MASKED" : null,
    current,
    modeAction: isOwner
      ? mode === "open"
        ? { label: "HIDE DATA", nextMode: "blurred" }
        : { label: "REVEAL DATA", nextMode: "open" }
      : null,
  };
}

export function summarizeClickActivity(events) {
  const activity = new Map();

  for (const event of events) {
    if (event.type !== "click") continue;
    const existing = activity.get(event.label);
    activity.set(event.label, {
      label: event.label,
      count: (existing?.count ?? 0) + 1,
      lastClickedAt: event.at,
    });
  }

  return Array.from(activity.values()).sort(
    (a, b) => b.lastClickedAt - a.lastClickedAt,
  );
}
