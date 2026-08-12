import { isValidBranch, queryPostHogEvents, summarizeBranch } from "../lib/posthog-analytics.mjs";

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "content-security-policy": "default-src 'none'; frame-ancestors 'none'" },
  });
}

export default async (request) => {
  const branchId = new URL(request.url).searchParams.get("branch") ?? "";
  if (!isValidBranch(branchId)) return json({ error: "Invalid branch" }, 400);

  const config = {
    personalApiKey: process.env.PORTFOLIO_POSTHOG_PERSONAL_API_KEY,
    projectId: process.env.PORTFOLIO_POSTHOG_PROJECT_ID,
    host: process.env.PORTFOLIO_POSTHOG_HOST,
  };
  if (!config.personalApiKey || !config.projectId || !config.host) {
    return json({ error: "Analytics is not configured" }, 503);
  }

  try {
    return json(summarizeBranch(await queryPostHogEvents(config, branchId), branchId));
  } catch (error) {
    console.error("portfolio analytics summary failed", error);
    return json({ error: "Analytics is temporarily unavailable" }, 502);
  }
};

export const config = { path: "/api/analytics/summary" };
