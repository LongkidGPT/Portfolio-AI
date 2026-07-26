import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVisitorMonitorModel,
  summarizeClickActivity,
} from "../src/visitor-monitor-model.js";

const snapshot = {
  activeCount: 1,
  totalSessions: 2,
  totalVisitors: 1,
  sessions: [
    {
      id: "session-02",
      visitorLabel: "VISITOR 01",
      visitNumber: 2,
      currentSection: "work",
      maxScrollDepth: 47,
      active: true,
      events: [
        { type: "section", label: "SELECTED WORK", at: 3000 },
      ],
      heatmap: { "6:3": 4 },
    },
  ],
};

test("blurred public mode keeps live content mounted behind a mask", () => {
  const model = buildVisitorMonitorModel({
    mode: "blurred",
    snapshot,
    isOwner: false,
  });

  assert.equal(model.masked, true);
  assert.equal(model.maskLabel, "DATA MASKED");
  assert.equal(model.current.visitorLabel, "VISITOR");
  assert.equal(model.modeAction, null);
});

test("open mode exposes anonymized data while controls remain owner-only", () => {
  const publicModel = buildVisitorMonitorModel({
    mode: "open",
    snapshot,
    isOwner: false,
  });
  const ownerModel = buildVisitorMonitorModel({
    mode: "open",
    snapshot,
    isOwner: true,
  });

  assert.equal(publicModel.masked, false);
  assert.equal(publicModel.current.visitorLabel, "VISITOR");
  assert.equal(publicModel.modeAction, null);
  assert.deepEqual(ownerModel.modeAction, {
    label: "HIDE DATA",
    nextMode: "blurred",
  });
});

test("current and history visitor labels are normalized without changing session identity", () => {
  const olderSession = {
    ...snapshot.sessions[0],
    id: "session-01",
    visitorLabel: "VISITOR 03",
    visitNumber: 1,
    active: false,
  };
  const model = buildVisitorMonitorModel({
    mode: "open",
    snapshot: {
      ...snapshot,
      sessions: [
        { ...snapshot.sessions[0], visitorLabel: "VISITOR 27" },
        olderSession,
      ],
    },
    isOwner: false,
  });

  assert.equal(model.current.visitorLabel, "VISITOR");
  assert.equal(model.current.visitNumber, 2);
  assert.deepEqual(
    model.sessions.map(({ id, visitorLabel, visitNumber }) => ({
      id,
      visitorLabel,
      visitNumber,
    })),
    [
      { id: "session-02", visitorLabel: "VISITOR", visitNumber: 2 },
      { id: "session-01", visitorLabel: "VISITOR", visitNumber: 1 },
    ],
  );
});

test("selecting a history row switches the visible session and heatmap", () => {
  const older = {
    ...snapshot.sessions[0],
    id: "session-01",
    visitNumber: 1,
    active: false,
    heatmap: { "2:8": 9 },
  };
  const model = buildVisitorMonitorModel({
    mode: "open",
    snapshot: { ...snapshot, sessions: [...snapshot.sessions, older] },
    isOwner: false,
    selectedSessionId: "session-01",
  });

  assert.equal(model.current.id, "session-01");
  assert.deepEqual(model.current.heatmap, { "2:8": 9 });
});

test("recent activity ignores passive events and aggregates button click counts", () => {
  const activity = summarizeClickActivity([
    { type: "section", label: "SELECTED WORK", at: 100 },
    { type: "click", label: "品牌系统｜视觉语言定义", at: 200 },
    { type: "click", label: "COPY WECHAT", at: 300 },
    { type: "click", label: "品牌系统｜视觉语言定义", at: 400 },
  ]);

  assert.deepEqual(activity, [
    {
      label: "品牌系统｜视觉语言定义",
      count: 2,
      lastClickedAt: 400,
    },
    { label: "COPY WECHAT", count: 1, lastClickedAt: 300 },
  ]);
});
