import assert from "node:assert/strict";
import test from "node:test";

import { createAnalyticsStore } from "../src/visitor-store.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("local store persists repeated sessions and the public presentation mode", () => {
  const storage = createMemoryStorage();
  const store = createAnalyticsStore({ storage });

  store.startSession({
    id: "session-01",
    visitorId: "anker-hr-a8f3",
    startedAt: 1000,
  });
  store.startSession({
    id: "session-02",
    visitorId: "anker-hr-a8f3",
    startedAt: 2000,
  });
  store.setMode("open");

  const reloaded = createAnalyticsStore({ storage }).getState();

  assert.equal(reloaded.mode, "open");
  assert.deepEqual(
    reloaded.sessions.map((session) => session.id),
    ["session-02", "session-01"],
  );
});

test("store subscribers receive the session event written by the collector", () => {
  const store = createAnalyticsStore({ storage: createMemoryStorage() });
  const states = [];
  const unsubscribe = store.subscribe((state) => states.push(state));

  store.startSession({
    id: "session-01",
    visitorId: "guest",
    startedAt: 1000,
  });
  store.recordEvent("session-01", {
    type: "section",
    label: "SELECTED WORK",
    section: "work",
    at: 1500,
  });
  unsubscribe();

  assert.equal(states.at(-1).sessions[0].currentSection, "work");
  assert.equal(states.at(-1).sessions[0].events.length, 1);
});
