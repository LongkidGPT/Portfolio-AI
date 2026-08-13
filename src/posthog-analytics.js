const ANALYTICS_EPOCH = "portfolio-ai-2026-08-v1";
const VISITOR_STORAGE_KEY = "portfolio-ai-anonymous-visitor-v1";
const SESSION_STORAGE_KEY = "portfolio-ai-session-v1";
const SAFE_BRANCH = /^[a-z0-9][a-z0-9/_-]{0,79}$/i;

function cleanBranch(value) {
  const normalized = value?.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return normalized && SAFE_BRANCH.test(normalized) && !normalized.includes("//")
    ? normalized
    : null;
}

export function resolveJobBranch({
  configured = import.meta.env?.VITE_ANALYTICS_BRANCH_ID,
  variant = import.meta.env?.VITE_VARIANT,
  hostname = window.location.hostname,
} = {}) {
  const explicit = cleanBranch(configured) ?? cleanBranch(variant);
  if (explicit && explicit !== "default") return explicit;

  const branchDeploy = hostname
    .toLowerCase()
    .match(/^([a-z0-9][a-z0-9-]*)--[^.]+\.netlify\.app$/)?.[1];
  return cleanBranch(branchDeploy) ?? "portfolio-home";
}

function persistentId(storage, key) {
  const stored = storage.getItem(key);
  if (stored) return stored;
  const id = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  storage.setItem(key, id);
  return id;
}

export function createPostHogAnalytics({
  token = import.meta.env?.VITE_PORTFOLIO_POSTHOG_TOKEN,
  host = import.meta.env?.VITE_PORTFOLIO_POSTHOG_HOST,
  branchId = resolveJobBranch(),
  fetcher = globalThis.fetch,
} = {}) {
  const visitorId = persistentId(window.localStorage, VISITOR_STORAGE_KEY);
  const sessionId = persistentId(window.sessionStorage, SESSION_STORAGE_KEY);
  const endpoint = host ? `${host.replace(/\/+$/, "")}/i/v0/e/` : null;

  const capture = (event, properties = {}, { beacon = false } = {}) => {
    if (!token || !endpoint) return;
    const body = JSON.stringify({
      api_key: token,
      event,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        analytics_epoch: ANALYTICS_EPOCH,
        branch_id: branchId,
        visitor_id: visitorId,
        session_id: sessionId,
        distinct_id: visitorId,
        pathname: window.location.pathname,
      },
    });

    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetcher?.(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  };

  return { branchId, capture, sessionId, visitorId };
}

let browserAnalytics;

export function getPortfolioAnalytics() {
  browserAnalytics ??= createPostHogAnalytics();
  return browserAnalytics;
}

export { ANALYTICS_EPOCH };
