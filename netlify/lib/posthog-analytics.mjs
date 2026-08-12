export const ANALYTICS_EPOCH = "portfolio-ai-2026-08-v1";
const SAFE_BRANCH = /^[a-z0-9][a-z0-9/_-]{0,79}$/i;
const EVENTS = [
  "portfolio_session_started",
  "portfolio_session_progress",
  "portfolio_project_clicked",
  "portfolio_case_progress",
  "portfolio_session_ended",
];

export function isValidBranch(value) {
  return SAFE_BRANCH.test(value ?? "") && !value.includes("//");
}

function queryHost(host) {
  return host.replace(/\/+$/, "").replace("://us.i.", "://us.").replace("://eu.i.", "://eu.");
}

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalSegments(value) {
  let candidate = value;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { return []; }
  }
  return Array.isArray(candidate) && candidate.length === 12
    && candidate.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0)
    ? candidate
    : [];
}

export async function queryPostHogEvents(config, branchId, fetcher = fetch) {
  if (!isValidBranch(branchId)) throw new TypeError("Invalid branch");
  const eventNames = EVENTS.map((name) => `'${name}'`).join(", ");
  const query = `SELECT event, toString(timestamp), properties.visitor_id, properties.session_id, properties.project_id, properties.project_label, properties.max_scroll_depth, properties.active_dwell_ms, properties.case_view_id, properties.segment_dwell_ms FROM events WHERE properties.branch_id = '${branchId}' AND properties.analytics_epoch = '${ANALYTICS_EPOCH}' AND event IN (${eventNames}) ORDER BY timestamp ASC LIMIT 5000`;
  const response = await fetcher(`${queryHost(config.host)}/api/projects/${encodeURIComponent(config.projectId)}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.personalApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PostHog query failed: ${response.status}`);
  const body = await response.json();
  return (body.results ?? []).flatMap((row) => {
    const [event, timestamp, visitorId, sessionId, projectId, projectLabel, depth, dwell, caseViewId, segments] = row;
    if (!EVENTS.includes(event) || ![timestamp, visitorId, sessionId].every((item) => typeof item === "string")) return [];
    return [{
      event,
      timestamp,
      visitorId,
      sessionId,
      projectId: typeof projectId === "string" ? projectId : null,
      projectLabel: typeof projectLabel === "string" ? projectLabel : null,
      depth: optionalNumber(depth),
      dwell: optionalNumber(dwell),
      caseViewId: typeof caseViewId === "string" ? caseViewId : null,
      segments: optionalSegments(segments),
    }];
  });
}

function emptyCase(id, label = id.toUpperCase()) {
  return { id, label, clicks: 0, activeDwellMs: 0, maxDepth: 0, segmentDwellMs: Array(12).fill(0), views: new Map() };
}

export function summarizeBranch(rows, branchId) {
  const sessions = new Map();
  const visitors = new Map();

  for (const row of rows) {
    if (!sessions.has(row.sessionId)) {
      sessions.set(row.sessionId, {
        id: row.sessionId,
        visitorId: row.visitorId,
        startedAt: Date.parse(row.timestamp),
        lastSeenAt: Date.parse(row.timestamp),
        endedAt: null,
        currentSection: "hero",
        maxScrollDepth: 0,
        events: [],
        heatmap: {},
        sections: [],
        cases: {},
      });
    }
    const session = sessions.get(row.sessionId);
    session.lastSeenAt = Math.max(session.lastSeenAt, Date.parse(row.timestamp));
    if (row.event === "portfolio_session_ended") session.endedAt = Date.parse(row.timestamp);
    if (row.event === "portfolio_session_progress") session.maxScrollDepth = Math.max(session.maxScrollDepth, row.depth);

    if (row.projectId) {
      session.cases[row.projectId] ??= emptyCase(row.projectId, row.projectLabel ?? undefined);
      const project = session.cases[row.projectId];
      if (row.projectLabel) project.label = row.projectLabel;
      if (row.event === "portfolio_project_clicked") {
        project.clicks += 1;
        session.events.push({ type: "click", label: project.label, at: Date.parse(row.timestamp) });
      }
      if (row.event === "portfolio_case_progress") {
        const viewId = row.caseViewId ?? `legacy-${row.projectId}`;
        const previous = project.views.get(viewId) ?? { activeDwellMs: 0, maxDepth: 0, segmentDwellMs: Array(12).fill(0) };
        project.views.set(viewId, {
          activeDwellMs: Math.max(previous.activeDwellMs, row.dwell),
          maxDepth: Math.max(previous.maxDepth, row.depth),
          segmentDwellMs: previous.segmentDwellMs.map((value, index) => Math.max(value, row.segments[index] ?? 0)),
        });
      }
    }
  }

  const chronological = Array.from(sessions.values()).sort((a, b) => a.startedAt - b.startedAt);
  for (const session of chronological) {
    const cases = Object.fromEntries(Object.values(session.cases).map((project) => {
      const views = Array.from(project.views.values());
      return [project.id, {
        id: project.id,
        label: project.label,
        clicks: project.clicks,
        activeDwellMs: views.reduce((sum, view) => sum + view.activeDwellMs, 0),
        maxDepth: views.reduce((max, view) => Math.max(max, view.maxDepth), 0),
        segmentDwellMs: views.reduce((total, view) => total.map((value, index) => value + view.segmentDwellMs[index]), Array(12).fill(0)),
      }];
    }));
    session.cases = cases;
    const count = (visitors.get(session.visitorId) ?? 0) + 1;
    visitors.set(session.visitorId, count);
    session.visitNumber = count;
  }

  const visitorLabels = new Map(
    Array.from(visitors.keys(), (visitorId, index) => [
      visitorId,
      `VISITOR ${String(index + 1).padStart(2, "0")}`,
    ]),
  );
  const ordered = chronological.reverse().map(({ visitorId, ...session }) => ({
    ...session,
    visitorLabel: visitorLabels.get(visitorId),
  }));

  return {
    branchId,
    totalSessions: ordered.length,
    totalVisitors: visitors.size,
    sessions: ordered,
    fetchedAt: Date.now(),
  };
}
