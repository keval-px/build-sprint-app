import "./style.css";
import { STORE, summarize, describeJourney } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";

declare global { interface ImportMeta { readonly env: Record<string, string | undefined> } }
interface EvidenceResponse {
  store: string; events: CheckoutEvent[]; totalStored: number; truncated: boolean;
  enabled: boolean; sampledAt: number;
}
const element = (id: string) => document.getElementById(id)!;
const text = (id: string, value: string | number) => { element(id).textContent = String(value); };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const time = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const eventLabels: Record<CheckoutEvent["name"], string> = {
  checkout_started: "Checkout started", checkout_contact_info_submitted: "Contact information submitted",
  checkout_address_info_submitted: "Address information submitted", checkout_shipping_info_submitted: "Shipping information submitted",
  payment_info_submitted: "Payment information submitted", checkout_completed: "Checkout completed", alert_displayed: "Checkout alert displayed",
};
const categoryLabels = { discount: "Discount or gift-card", payment: "Payment", delivery: "Delivery", validation: "Input validation" };

function showView(view: "overview" | "journeys", focus = false) {
  for (const name of ["overview", "journeys"] as const) {
    element(name).hidden = name !== view;
    element(`${name}-tab`).setAttribute("aria-selected", String(name === view));
    element(`${name}-tab`).tabIndex = name === view ? 0 : -1;
  }
  if (focus) element(`${view}-tab`).focus();
}
for (const view of ["overview", "journeys"] as const) {
  element(`${view}-tab`).addEventListener("click", () => showView(view));
  element(`${view}-tab`).addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      showView(event.key === "Home" ? "overview" : event.key === "End" ? "journeys" : view === "overview" ? "journeys" : "overview", true);
    }
  });
}
element("open-journeys").addEventListener("click", () => showView("journeys", true));

function render(data: EvidenceResponse) {
  const summary = summarize(data.events);
  text("session-count", summary.sessionCount);
  text("completed-count", summary.completed);
  text("incomplete-count", summary.noCompletionObserved);
  text("event-count", summary.eventCount);
  text("stored-count", data.totalStored);
  text("collection-state", data.enabled ? "Enabled in Convex" : "Disabled in Convex");
  text("request-status", `Updated ${time(data.sampledAt)} · ${summary.eventCount} test events in this view`);
  text("coverage-note", `${data.truncated ? "Partial view: only the latest 500 events are shown. Earlier session steps may be missing." : "This view includes all stored test events."}${summary.sessionsWithoutStart ? ` ${summary.sessionsWithoutStart} sessions have no start event in this view.` : ""} A missing completion is not proof of abandonment.`);
  element("open-journeys").toggleAttribute("disabled", summary.sessionCount === 0);

  if (!data.enabled) {
    text("summary-title", "Test collection is paused");
    text("summary-description", "The backend is ready. Connect the Shopify test pixel and enable collection before starting your checkout tests.");
  } else if (summary.sessionCount === 0) {
    text("summary-title", "Ready for your first test checkout");
    text("summary-description", "Run a checkout in the demo store, then refresh here to check the events Shopify reported. Pixel delivery still needs verification.");
  } else {
    text("summary-title", `${summary.sessionCount} test checkout${summary.sessionCount === 1 ? "" : "s"} observed`);
    text("summary-description", "Review the actual browser events below. A deliberate test error shows that collection works; it does not establish a live-store incident.");
  }

  const observation = summary.observations[0];
  if (observation) {
    const label = categoryLabels[observation.category];
    element("observation").innerHTML = `<s-badge>Test observation · unverified origin</s-badge><h3>${label} error events observed</h3><p>${observation.alerts} error event${observation.alerts === 1 ? "" : "s"} across ${observation.sessions} test checkout${observation.sessions === 1 ? "" : "s"}.</p><p>This is an observed error category, not an abnormal-pattern detector or a confirmed cause. Reproduce the same checkout step and compare the visible error with its timeline.</p><p class="small">No baseline, financial impact, or merchant confirmation has been established.</p>`;
  } else {
    element("observation").innerHTML = `<h3>${summary.eventCount ? "No categorized error events observed" : "No test evidence yet"}</h3><p>${summary.eventCount ? "The collected events do not yet support a checkout-error observation. This is not a clean bill of health." : "Once collection is connected, complete a test checkout and deliberately try an invalid discount code. The evidence here will show only events that actually arrive."}</p>`;
  }

  element("journey-list").innerHTML = summary.journeys.length ? summary.journeys.reverse().map((session, index) => {
    const alerts = session.events.filter(event => event.name === "alert_displayed" && event.category);
    const detail = describeJourney(session.events);
    const status = detail.outcome;
    return `<details class="journey"><summary><div><strong>Test checkout ${index + 1}</strong><span class="small">${escape(time(session.events[0].timestamp))} · ${session.events.length} events</span><span class="small">Last recorded progress: ${escape(detail.lastProgress)}</span><span class="small">Errors observed: ${detail.categories.length ? detail.categories.map(category => categoryLabels[category]).join(", ") : "None recorded"}</span></div><span class="journey-status">${status}${alerts.length ? ` · ${alerts.length} error event${alerts.length === 1 ? "" : "s"}` : ""}</span></summary><p class="small">${session.completed ? "Completion was recorded. Errors before completion do not mean the checkout was lost." : "Recording stops at the last event shown. This does not establish that the customer left or why."}</p><p class="small">Anonymous checkout ID: ${escape(session.id.slice(0, 12))}…</p><ol class="timeline">${session.events.map(event => `<li><div><strong>${escape(eventLabels[event.name])}</strong>${event.category ? `<span>${categoryLabels[event.category]} error category</span>` : ""}</div><time datetime="${new Date(event.timestamp).toISOString()}">${escape(time(event.timestamp))}</time></li>`).join("")}</ol></details>`;
  }).join("") : "<p class='empty'>No test checkouts collected yet. Start a checkout in the demo store, then refresh this page.</p>";
}

let loading = false;
async function refresh() {
  if (loading) return;
  loading = true;
  element("refresh").setAttribute("loading", "");
  element("refresh").setAttribute("disabled", "");
  element("request-error").hidden = true;
  text("request-status", "Loading checkout evidence…");
  try {
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    const backend = local ? "https://neighborly-nightingale-843.convex.site" : location.origin;
    const response = await fetch(`${backend}/api/test-evidence`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Could not read checkout evidence.");
    const data: EvidenceResponse = await response.json();
    if (data.store !== STORE || !Array.isArray(data.events)) throw new Error("Unexpected evidence response.");
    render(data);
  } catch {
    element("request-error").hidden = false;
    text("request-error", "Could not load the test evidence. Check your connection, then tap Refresh test data. Previous results, if shown, have not been updated.");
    text("request-status", "Evidence could not be refreshed.");
  } finally {
    element("refresh").removeAttribute("loading");
    element("refresh").removeAttribute("disabled");
    loading = false;
  }
}
element("refresh").addEventListener("click", refresh);
void refresh();
