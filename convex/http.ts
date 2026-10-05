import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { parseTestEvent } from "../shared/evidence";

const http = httpRouter();
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

http.route({ path: "/test-events", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers })) });
http.route({ path: "/test-events", method: "POST", handler: httpAction(async (ctx, request) => {
  if (process.env.SHOPIFY_TEST_COLLECTION_ENABLED !== "true") return reply({ error: "Test collection is disabled." }, 503);
  const body = await request.text();
  if (body.length > 1500) return reply({ error: "Payload too large." }, 413);
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return reply({ error: "Invalid JSON." }, 400); }
  const event = parseTestEvent(parsed, Date.now());
  if (!event) return reply({ error: "Invalid anonymous test event." }, 400);
  const result = await ctx.runMutation(internal.events.recordTestEvent, event);
  return reply({ result }, result === "full" ? 429 : result === "invalid" ? 400 : 200);
}) });
http.route({ path: "/test-evidence", method: "GET", handler: httpAction(async (ctx) => {
  const evidence = await ctx.runQuery(internal.events.readTestEvidence, {});
  return reply({ ...evidence, enabled: process.env.SHOPIFY_TEST_COLLECTION_ENABLED === "true", source: "Unverified browser test events. No live merchant data.", sampledAt: Date.now() });
}) });

export default http;
