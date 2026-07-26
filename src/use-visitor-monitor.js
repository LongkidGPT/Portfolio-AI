import { useEffect, useMemo, useRef, useState } from "react";

import {
  getMonitorSnapshot,
  normalizeSectionLayout,
  parseVisitorId,
} from "./visitor-analytics.js";
import { createBrowserAnalyticsStore } from "./visitor-store.js";

let browserStore;

function getBrowserStore() {
  browserStore ??= createBrowserAnalyticsStore();
  return browserStore;
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ??
    `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getClickLabel(target) {
  const interactive = target.closest(
    "a, button, .project-card, [data-track-label]",
  );
  if (!interactive || interactive.closest(".visitor-monitor")) return null;
  return (
    interactive.dataset.trackLabel ||
    interactive.getAttribute("aria-label") ||
    interactive.textContent?.trim().replace(/\s+/g, " ").slice(0, 48) ||
    null
  );
}

export function useVisitorMonitor() {
  const store = useMemo(getBrowserStore, []);
  const [state, setState] = useState(store.getState);
  const sessionIdRef = useRef(null);

  useEffect(() => store.subscribe(setState), [store]);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
      const startedAt = Date.now();
      store.startSession({
        id: sessionIdRef.current,
        visitorId: parseVisitorId(window.location.href),
        startedAt,
      });
      store.recordEvent(sessionIdRef.current, {
        type: "page",
        label: "OPENED PORTFOLIO",
        at: startedAt,
      });
    }

    const sessionId = sessionIdRef.current;
    let lastPointerSample = 0;
    let lastScrollDepth = -1;
    let scrollFrame = 0;
    let layoutFrame = 0;

    const recordHeartbeat = () => {
      store.recordEvent(sessionId, {
        type: "heartbeat",
        label: "ACTIVE",
        at: Date.now(),
      });
    };

    const recordLayout = () => {
      if (layoutFrame) return;
      layoutFrame = window.requestAnimationFrame(() => {
        layoutFrame = 0;
        const documentHeight = Math.max(
          document.documentElement.scrollHeight,
          window.innerHeight,
        );
        const sections = normalizeSectionLayout(
          Array.from(
            document.querySelectorAll("[data-track-section]"),
            (section) => {
              const bounds = section.getBoundingClientRect();
              return {
                id: section.id,
                label:
                  section.dataset.trackLabel || section.id.toUpperCase(),
                top: bounds.top + window.scrollY,
                height: bounds.height,
              };
            },
          ),
          documentHeight,
        );
        store.recordEvent(sessionId, {
          type: "layout",
          label: "PAGE STRUCTURE",
          sections,
          at: Date.now(),
        });
      });
    };

    const recordPointer = (event) => {
      const now = Date.now();
      if (
        now - lastPointerSample < 400 ||
        event.target.closest?.(".visitor-monitor")
      ) {
        return;
      }
      lastPointerSample = now;
      const pageHeight = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight,
      );
      store.recordEvent(sessionId, {
        type: "pointer",
        label: "POINTER SAMPLE",
        point: {
          x: event.clientX / window.innerWidth,
          y: (window.scrollY + event.clientY) / pageHeight,
        },
        at: now,
      });
    };

    const recordScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const scrollable = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1,
        );
        const depth = Math.min(
          100,
          Math.round((window.scrollY / scrollable) * 100),
        );
        if (depth <= lastScrollDepth + 2) return;
        lastScrollDepth = depth;
        store.recordEvent(sessionId, {
          type: "scroll",
          label: `${depth}% DEPTH`,
          scrollDepth: depth,
          at: Date.now(),
        });
      });
    };

    const recordClick = (event) => {
      const label = getClickLabel(event.target);
      if (!label) return;
      store.recordEvent(sessionId, {
        type: "click",
        label,
        at: Date.now(),
      });
    };

    const closeSession = () => {
      store.recordEvent(sessionId, {
        type: "end",
        label: "PAGE CLOSED",
        at: Date.now(),
      });
    };

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        store.recordEvent(sessionId, {
          type: "section",
          label:
            visible.target.dataset.trackLabel ||
            visible.target.id.toUpperCase(),
          section: visible.target.id,
          at: Date.now(),
        });
      },
      { threshold: [0.25, 0.55] },
    );

    document
      .querySelectorAll("[data-track-section]")
      .forEach((section) => sectionObserver.observe(section));
    const heartbeatTimer = window.setInterval(recordHeartbeat, 5000);
    window.addEventListener("pointermove", recordPointer, { passive: true });
    window.addEventListener("scroll", recordScroll, { passive: true });
    window.addEventListener("resize", recordLayout, { passive: true });
    window.addEventListener("pagehide", closeSession);
    document.addEventListener("click", recordClick);
    recordScroll();
    recordLayout();

    return () => {
      sectionObserver.disconnect();
      window.clearInterval(heartbeatTimer);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
      window.removeEventListener("pointermove", recordPointer);
      window.removeEventListener("scroll", recordScroll);
      window.removeEventListener("resize", recordLayout);
      window.removeEventListener("pagehide", closeSession);
      document.removeEventListener("click", recordClick);
    };
  }, [store]);

  return {
    mode: state.mode,
    snapshot: getMonitorSnapshot(state.sessions),
    isOwner: new URL(window.location.href).searchParams.get("owner") === "1",
    setMode: (mode) => store.setMode(mode),
  };
}
