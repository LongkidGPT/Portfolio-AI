const VISITOR_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/i;
const HEAT_GRID_SIZE = 12;
const ACTIVE_WINDOW_MS = 15_000;
const POINTER_SAMPLE_INTERVAL_MS = 400;

export function parseVisitorId(url) {
  const visitorId = new URL(url).searchParams.get("visitor")?.trim();
  return visitorId && VISITOR_ID_PATTERN.test(visitorId) ? visitorId : "guest";
}

export function createSession({ id, visitorId, startedAt }) {
  return {
    id,
    visitorId,
    startedAt,
    lastSeenAt: startedAt,
    endedAt: null,
    currentSection: "hero",
    maxScrollDepth: 0,
    events: [],
    heatmap: {},
    sections: [],
  };
}

export function appendSession(sessions, session) {
  return [session, ...sessions];
}

export function setPresentationMode(state, mode) {
  if (mode !== "open" && mode !== "blurred") {
    throw new TypeError(`Unsupported presentation mode: ${mode}`);
  }

  return { ...state, mode };
}

export function incrementHeatCell(heatmap, point) {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.x > 1 ||
    point.y < 0 ||
    point.y > 1
  ) {
    return heatmap;
  }

  const column = Math.min(
    HEAT_GRID_SIZE - 1,
    Math.floor(point.x * HEAT_GRID_SIZE),
  );
  const row = Math.min(
    HEAT_GRID_SIZE - 1,
    Math.floor(point.y * HEAT_GRID_SIZE),
  );
  const key = `${column}:${row}`;

  return { ...heatmap, [key]: (heatmap[key] ?? 0) + 1 };
}

export function recordSessionEvent(sessions, sessionId, event) {
  return sessions.map((session) => {
    if (session.id !== sessionId) return session;

    const silentEvent = ["heartbeat", "pointer", "scroll", "layout"].includes(
      event.type,
    );
    const visibleEvents =
      silentEvent
        ? session.events
        : [
            ...session.events,
            { type: event.type, label: event.label, at: event.at },
          ].slice(-40);
    const next = {
      ...session,
      lastSeenAt: event.at,
      events: visibleEvents,
    };

    if (event.type === "end") next.endedAt = event.at;
    if (event.section) next.currentSection = event.section;
    if (Number.isFinite(event.scrollDepth)) {
      next.maxScrollDepth = Math.max(
        session.maxScrollDepth,
        event.scrollDepth,
      );
    }
    if (event.point) {
      next.heatmap = incrementHeatCell(session.heatmap, event.point);
    }
    if (event.type === "layout" && Array.isArray(event.sections)) {
      next.sections = event.sections;
    }

    return next;
  });
}

export function getMonitorSnapshot(sessions, now = Date.now()) {
  const visitorLabels = new Map();

  for (const session of sessions) {
    if (!visitorLabels.has(session.visitorId)) {
      visitorLabels.set(
        session.visitorId,
        `VISITOR ${String(visitorLabels.size + 1).padStart(2, "0")}`,
      );
    }
  }

  const visibleSessions = sessions.map((session) => {
    const visitNumber = sessions.filter(
      (candidate) =>
        candidate.visitorId === session.visitorId &&
        candidate.startedAt <= session.startedAt,
    ).length;

    return {
      id: session.id,
      visitorLabel: visitorLabels.get(session.visitorId),
      visitNumber,
      startedAt: session.startedAt,
      lastSeenAt: session.lastSeenAt,
      endedAt: session.endedAt,
      currentSection: session.currentSection,
      maxScrollDepth: session.maxScrollDepth,
      events: session.events,
      heatmap: session.heatmap,
      sections: session.sections ?? [],
      active:
        session.endedAt === null &&
        now - session.lastSeenAt <= ACTIVE_WINDOW_MS,
    };
  });

  return {
    activeCount: visibleSessions.filter((session) => session.active).length,
    totalSessions: visibleSessions.length,
    totalVisitors: visitorLabels.size,
    sessions: visibleSessions,
  };
}

export function describeHeatCell(key, samples, sections = []) {
  const row = Number.parseInt(key.split(":")[1], 10);
  const verticalCenter = (row + 0.5) / HEAT_GRID_SIZE;
  const section = sections.find(
    (candidate) =>
      verticalCenter >= candidate.start &&
      verticalCenter <= candidate.end,
  );

  return {
    sectionLabel: section?.label ?? "PAGE",
    samples,
    dwellMs: samples * POINTER_SAMPLE_INTERVAL_MS,
  };
}

export function normalizeSectionLayout(sections, documentHeight) {
  if (!Number.isFinite(documentHeight) || documentHeight <= 0) return [];

  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    start: Math.max(0, Math.min(1, section.top / documentHeight)),
    end: Math.max(
      0,
      Math.min(1, (section.top + section.height) / documentHeight),
    ),
  }));
}
