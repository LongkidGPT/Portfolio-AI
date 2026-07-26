import {
  appendSession,
  createSession,
  recordSessionEvent,
  setPresentationMode,
} from "./visitor-analytics.js";

const STORAGE_KEY = "kid-portfolio-visitor-analytics-v1";
const CHANNEL_NAME = "kid-portfolio-visitor-analytics";
const EMPTY_STATE = { mode: "blurred", sessions: [] };

function readState(storage) {
  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY));
    if (
      (stored?.mode === "open" || stored?.mode === "blurred") &&
      Array.isArray(stored.sessions)
    ) {
      return stored;
    }
  } catch {
    // A corrupted local preview should recover without breaking the portfolio.
  }
  return EMPTY_STATE;
}

export function createAnalyticsStore({ storage, channel = null }) {
  let state = readState(storage);
  const subscribers = new Set();

  const notify = () => {
    for (const subscriber of subscribers) subscriber(state);
  };

  const persist = () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    channel?.postMessage(state);
    notify();
  };

  const receiveExternalState = (event) => {
    if (!event?.data?.sessions || !event.data.mode) return;
    state = event.data;
    notify();
  };

  channel?.addEventListener("message", receiveExternalState);

  return {
    getState: () => state,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    startSession(sessionInput) {
      state = {
        ...state,
        sessions: appendSession(
          state.sessions,
          createSession(sessionInput),
        ).slice(0, 100),
      };
      persist();
    },
    recordEvent(sessionId, event) {
      state = {
        ...state,
        sessions: recordSessionEvent(state.sessions, sessionId, event),
      };
      persist();
    },
    setMode(mode) {
      state = setPresentationMode(state, mode);
      persist();
    },
    destroy() {
      channel?.removeEventListener("message", receiveExternalState);
      channel?.close();
      subscribers.clear();
    },
  };
}

export function createBrowserAnalyticsStore() {
  const channel =
    "BroadcastChannel" in window
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;
  return createAnalyticsStore({ storage: window.localStorage, channel });
}
