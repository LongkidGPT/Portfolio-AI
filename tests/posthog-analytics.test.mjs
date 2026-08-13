import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_EPOCH,
  isValidBranch,
  queryPostHogEvents,
  summarizeBranch,
} from "../netlify/lib/posthog-analytics.mjs";
import { createPostHogAnalytics } from "../src/posthog-analytics.js";

test("browser capture uses the current PostHog api_key payload", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: storage,
    sessionStorage: storage,
    location: { hostname: "localhost", pathname: "/" },
  };

  let request;
  const analytics = createPostHogAnalytics({
    token: "phc_portfolio",
    host: "https://us.i.posthog.com",
    branchId: "portfolio-home",
    fetcher: (_url, options) => {
      request = JSON.parse(options.body);
      return Promise.resolve({ ok: true });
    },
  });
  analytics.capture("portfolio_session_started");

  assert.equal(request.api_key, "phc_portfolio");
  assert.equal("token" in request, false);
  globalThis.window = previousWindow;
});

test("job branch identifiers stay bounded and cannot alter the query", () => {
  assert.equal(isValidBranch("anker-brand"), true);
  assert.equal(isValidBranch("job/oppo-retail"), true);
  assert.equal(isValidBranch("bad' OR 1=1"), false);
});

test("PostHog query is isolated by the Portfolio AI epoch and job branch", async () => {
  let body;
  const fetcher = async (_url, options) => {
    body = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ results: [[
        "portfolio_project_clicked", "2026-08-12T08:00:00.000Z", "visitor-a", "session-a",
        "brand", "品牌系统", 0, 0, null, null,
      ]] }),
    };
  };
  const rows = await queryPostHogEvents({ personalApiKey: "phx", projectId: "42", host: "https://us.i.posthog.com" }, "anker-brand", fetcher);
  assert.equal(rows[0].projectId, "brand");
  assert.match(body.query.query, new RegExp(`analytics_epoch = '${ANALYTICS_EPOCH}'`));
  assert.match(body.query.query, /branch_id = 'anker-brand'/);
});

test("summary groups card clicks and case reading by visit", () => {
  const base = {
    visitorId: "visitor-a", sessionId: "session-a", projectId: "brand", projectLabel: "品牌系统",
    depth: 0, dwell: 0, caseViewId: null, segments: [],
  };
  const summary = summarizeBranch([
    { ...base, event: "portfolio_session_started", timestamp: "2026-08-12T08:00:00.000Z" },
    { ...base, event: "portfolio_project_clicked", timestamp: "2026-08-12T08:00:01.000Z" },
    { ...base, event: "portfolio_case_progress", timestamp: "2026-08-12T08:00:15.000Z", depth: 58, dwell: 14000, caseViewId: "view-a", segments: [0, 1000, 3000, 4000, 6000, 0, 0, 0, 0, 0, 0, 0] },
  ], "anker-brand");
  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.sessions[0].cases.brand.clicks, 1);
  assert.equal(summary.sessions[0].cases.brand.maxDepth, 58);
  assert.equal(summary.sessions[0].cases.brand.activeDwellMs, 14000);
  assert.equal(summary.sessions[0].visitorLabel, "VISITOR 01");
  assert.equal("visitorId" in summary.sessions[0], false);
  assert.equal(JSON.stringify(summary).includes("visitor-a"), false);
});
