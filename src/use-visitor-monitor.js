import { useEffect, useMemo, useRef, useState } from "react";

import { getMonitorSnapshot, normalizeSectionLayout } from "./visitor-analytics.js";
import { getPortfolioAnalytics } from "./posthog-analytics.js";
import { createBrowserAnalyticsStore } from "./visitor-store.js";

let browserStore;

function getBrowserStore() {
  browserStore ??= createBrowserAnalyticsStore();
  return browserStore;
}

function createSessionId() {
  return `session-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function mergeLocalAndRemote(localSessions, remoteSessions) {
  if (!remoteSessions) return localSessions;
  const merged = new Map(remoteSessions.map((session) => [session.id, session]));
  for (const session of localSessions) {
    const remote = merged.get(session.id);
    merged.set(session.id, { ...remote, ...session, cases: remote?.cases ?? session.cases ?? {} });
  }
  return Array.from(merged.values()).sort((a, b) => b.startedAt - a.startedAt);
}

export function useVisitorMonitor() {
  const store = useMemo(getBrowserStore, []);
  const analytics = useMemo(getPortfolioAnalytics, []);
  const [state, setState] = useState(store.getState);
  const [remoteSessions, setRemoteSessions] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("loading");
  const sessionIdRef = useRef(null);

  useEffect(() => store.subscribe(setState), [store]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/analytics/summary?branch=${encodeURIComponent(analytics.branchId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const payload = await response.json();
        if (!disposed) {
          setRemoteSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
          setCloudStatus("ready");
        }
      } catch {
        if (!disposed) setCloudStatus("unavailable");
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [analytics.branchId]);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
      const startedAt = Date.now();
      store.startSession({ id: sessionIdRef.current, visitorId: analytics.visitorId, startedAt });
      store.recordEvent(sessionIdRef.current, { type: "page", label: "OPENED PORTFOLIO", at: startedAt });
      analytics.capture("portfolio_session_started");
    }

    const sessionId = sessionIdRef.current;
    let lastScrollDepth = -1;
    let scrollFrame = 0;
    let layoutFrame = 0;
    let activeStartedAt = Date.now();
    let activeDwellMs = 0;

    const readActiveDwell = () => activeDwellMs + (document.visibilityState === "hidden" ? 0 : Date.now() - activeStartedAt);
    const report = () => analytics.capture("portfolio_session_progress", {
      active_dwell_ms: readActiveDwell(),
      max_scroll_depth: Math.max(0, lastScrollDepth),
    });
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") {
        activeDwellMs += Date.now() - activeStartedAt;
        report();
      } else activeStartedAt = Date.now();
    };
    const recordHeartbeat = () => {
      store.recordEvent(sessionId, { type: "heartbeat", label: "ACTIVE", at: Date.now() });
      report();
    };
    const recordLayout = () => {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        const height = Math.max(document.documentElement.scrollHeight, innerHeight);
        store.recordEvent(sessionId, {
          type: "layout", label: "PAGE STRUCTURE", at: Date.now(),
          sections: normalizeSectionLayout(Array.from(document.querySelectorAll("[data-track-section]"), (section) => {
            const bounds = section.getBoundingClientRect();
            return { id: section.id, label: section.dataset.trackLabel || section.id.toUpperCase(), top: bounds.top + scrollY, height: bounds.height };
          }), height),
        });
      });
    };
    const recordScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const depth = Math.min(100, Math.round((scrollY / Math.max(document.documentElement.scrollHeight - innerHeight, 1)) * 100));
        if (depth <= lastScrollDepth + 2) return;
        lastScrollDepth = depth;
        store.recordEvent(sessionId, { type: "scroll", label: `${depth}% DEPTH`, scrollDepth: depth, at: Date.now() });
      });
    };
    const recordProjectClick = (event) => {
      const card = event.target.closest?.("[data-project-id]");
      if (!card || card.closest(".visitor-monitor")) return;
      const label = card.dataset.trackLabel || card.dataset.projectId;
      store.recordEvent(sessionId, { type: "click", label, at: Date.now() });
      analytics.capture("portfolio_project_clicked", { project_id: card.dataset.projectId, project_label: label });
    };
    const closeSession = () => {
      store.recordEvent(sessionId, { type: "end", label: "PAGE CLOSED", at: Date.now() });
      analytics.capture("portfolio_session_ended", { active_dwell_ms: readActiveDwell(), max_scroll_depth: Math.max(0, lastScrollDepth) }, { beacon: true });
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      store.recordEvent(sessionId, { type: "section", label: visible.target.dataset.trackLabel || visible.target.id.toUpperCase(), section: visible.target.id, at: Date.now() });
    }, { threshold: [0.25, 0.55] });

    document.querySelectorAll("[data-track-section]").forEach((section) => observer.observe(section));
    const heartbeat = setInterval(recordHeartbeat, 15_000);
    addEventListener("scroll", recordScroll, { passive: true });
    addEventListener("resize", recordLayout, { passive: true });
    addEventListener("pagehide", closeSession);
    document.addEventListener("click", recordProjectClick);
    document.addEventListener("visibilitychange", visibilityChanged);
    recordScroll(); recordLayout();
    return () => {
      observer.disconnect(); clearInterval(heartbeat);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (layoutFrame) cancelAnimationFrame(layoutFrame);
      removeEventListener("scroll", recordScroll); removeEventListener("resize", recordLayout); removeEventListener("pagehide", closeSession);
      document.removeEventListener("click", recordProjectClick); document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [analytics, store]);

  const sessions = mergeLocalAndRemote(state.sessions, remoteSessions);
  return {
    mode: state.mode,
    snapshot: getMonitorSnapshot(sessions),
    isOwner: false,
    branchId: analytics.branchId,
    cloudStatus,
    setMode: (mode) => store.setMode(mode),
  };
}
