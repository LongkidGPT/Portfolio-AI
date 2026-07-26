import assert from "node:assert/strict";
import test from "node:test";

import {
  appendSession,
  createSession,
  describeHeatCell,
  getMonitorSnapshot,
  incrementHeatCell,
  normalizeSectionLayout,
  parseVisitorId,
  recordSessionEvent,
  setPresentationMode,
} from "../src/visitor-analytics.js";

test("visitor id comes from the dedicated link and rejects unsafe labels", () => {
  assert.equal(
    parseVisitorId("https://portfolio.test/?visitor=anker-hr-a8f3"),
    "anker-hr-a8f3",
  );
  assert.equal(
    parseVisitorId("https://portfolio.test/?visitor=%3Cscript%3E"),
    "guest",
  );
  assert.equal(parseVisitorId("https://portfolio.test/"), "guest");
});

test("each page opening appends a new session without replacing earlier visits", () => {
  const first = createSession({
    id: "session-01",
    visitorId: "anker-hr-a8f3",
    startedAt: 1000,
  });
  const second = createSession({
    id: "session-02",
    visitorId: "anker-hr-a8f3",
    startedAt: 2000,
  });

  const history = appendSession(appendSession([], first), second);

  assert.equal(history.length, 2);
  assert.deepEqual(
    history.map((session) => session.id),
    ["session-02", "session-01"],
  );
  assert.equal(history[0].visitorId, "anker-hr-a8f3");
});

test("presentation mode changes globally while keeping recorded sessions", () => {
  const state = {
    mode: "blurred",
    sessions: [
      createSession({
        id: "session-01",
        visitorId: "guest",
        startedAt: 1000,
      }),
    ],
  };

  const next = setPresentationMode(state, "open");

  assert.equal(next.mode, "open");
  assert.equal(next.sessions.length, 1);
  assert.notEqual(next, state);
  assert.throws(() => setPresentationMode(state, "private"));
});

test("pointer samples accumulate into a compact twelve-column heat grid", () => {
  const once = incrementHeatCell({}, { x: 0.51, y: 0.27 });
  const twice = incrementHeatCell(once, { x: 0.54, y: 0.26 });

  assert.deepEqual(twice, { "6:3": 2 });
  assert.deepEqual(
    incrementHeatCell(twice, { x: -1, y: 2 }),
    twice,
  );
});

test("events update only their own visit and preserve the earlier history", () => {
  const older = createSession({
    id: "session-01",
    visitorId: "anker-hr-a8f3",
    startedAt: 1000,
  });
  const current = createSession({
    id: "session-02",
    visitorId: "anker-hr-a8f3",
    startedAt: 2000,
  });

  const sessions = recordSessionEvent([current, older], "session-02", {
    type: "section",
    label: "SELECTED WORK",
    at: 2600,
    section: "work",
  });

  assert.equal(sessions[0].currentSection, "work");
  assert.equal(sessions[0].lastSeenAt, 2600);
  assert.deepEqual(sessions[0].events, [
    { type: "section", label: "SELECTED WORK", at: 2600 },
  ]);
  assert.deepEqual(sessions[1], older);
});

test("monitor snapshot anonymizes recipient ids and identifies recent activity", () => {
  const first = {
    ...createSession({
      id: "session-01",
      visitorId: "anker-hr-a8f3",
      startedAt: 1000,
    }),
    lastSeenAt: 49_900,
  };
  const second = createSession({
    id: "session-02",
    visitorId: "interviewer-b7k2",
    startedAt: 2000,
  });

  const snapshot = getMonitorSnapshot([first, second], 50_000);

  assert.equal(snapshot.totalSessions, 2);
  assert.equal(snapshot.activeCount, 1);
  assert.deepEqual(
    snapshot.sessions.map((session) => session.visitorLabel),
    ["VISITOR 01", "VISITOR 02"],
  );
  assert.equal(JSON.stringify(snapshot).includes("anker-hr"), false);
});

test("heartbeat keeps a visit online without polluting its visible timeline", () => {
  const session = createSession({
    id: "session-01",
    visitorId: "guest",
    startedAt: 1000,
  });

  const [updated] = recordSessionEvent([session], "session-01", {
    type: "heartbeat",
    label: "ACTIVE",
    at: 6000,
  });

  assert.equal(updated.lastSeenAt, 6000);
  assert.deepEqual(updated.events, []);
});

test("page exit closes only the active visit", () => {
  const session = createSession({
    id: "session-01",
    visitorId: "guest",
    startedAt: 1000,
  });

  const [ended] = recordSessionEvent([session], "session-01", {
    type: "end",
    label: "PAGE CLOSED",
    at: 9000,
  });

  assert.equal(ended.endedAt, 9000);
  assert.equal(ended.lastSeenAt, 9000);
});

test("sampled pointer movement updates heat data without filling the timeline", () => {
  const session = createSession({
    id: "session-01",
    visitorId: "guest",
    startedAt: 1000,
  });

  const [updated] = recordSessionEvent([session], "session-01", {
    type: "pointer",
    label: "POINTER SAMPLE",
    point: { x: 0.5, y: 0.5 },
    at: 1200,
  });

  assert.deepEqual(updated.heatmap, { "6:6": 1 });
  assert.deepEqual(updated.events, []);
});

test("page section proportions are stored with their visit and stay out of the timeline", () => {
  const session = createSession({
    id: "session-01",
    visitorId: "guest",
    startedAt: 1000,
  });
  const sections = [
    { id: "hero", label: "HERO", start: 0, end: 0.2 },
    { id: "work", label: "SELECTED WORK", start: 0.2, end: 0.6 },
  ];

  const [updated] = recordSessionEvent([session], "session-01", {
    type: "layout",
    label: "PAGE STRUCTURE",
    sections,
    at: 1100,
  });

  assert.deepEqual(updated.sections, sections);
  assert.deepEqual(updated.events, []);
});

test("a heat cell explains its page section, samples, and approximate dwell time", () => {
  const details = describeHeatCell(
    "6:3",
    4,
    [
      { id: "hero", label: "HERO", start: 0, end: 0.2 },
      { id: "work", label: "SELECTED WORK", start: 0.2, end: 0.6 },
    ],
  );

  assert.deepEqual(details, {
    sectionLabel: "SELECTED WORK",
    samples: 4,
    dwellMs: 1600,
  });
});

test("page dimensions become stable normalized section bands", () => {
  const sections = normalizeSectionLayout(
    [
      { id: "hero", label: "HERO", top: 0, height: 1000 },
      {
        id: "work",
        label: "SELECTED WORK",
        top: 2000,
        height: 1000,
      },
    ],
    5000,
  );

  assert.deepEqual(sections, [
    { id: "hero", label: "HERO", start: 0, end: 0.2 },
    { id: "work", label: "SELECTED WORK", start: 0.4, end: 0.6 },
  ]);
});
