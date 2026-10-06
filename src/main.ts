/// <reference types="@shopify/polaris-types" />
import "./style.css";
import {recordedImpact} from "../shared/abandoned";
import type {AbandonedSnapshot} from "../shared/abandoned";
import { STORE, summarize, describeJourney, EVIDENCE_EVENT_LIMIT } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";
import { buildMissions, isViewerId } from "../shared/actions";
import { modelCatalog, estimateCatalogImpact } from "../shared/catalog";
import {observedAverageOrderValue} from "../shared/purchases";
import type {ObservedPurchases} from "../shared/purchases";
import type { CatalogModel } from "../shared/catalog";
import type { Mission, ActionStep, MissionId } from "../shared/actions";

declare global { interface ImportMeta { readonly env: Record<string, string | undefined> } }
interface EvidenceResponse {
  store: string; events: CheckoutEvent[]; totalStored: number; truncated: boolean;
  abandonedCheckouts?:AbandonedSnapshot|null; enabled: boolean; sampledAt: number; catalogModel?: CatalogModel | null; observedPurchases?: ObservedPurchases | null;
}
const element = (id: string) => document.getElementById(id)!;
const text = (id: string, value: string | number) => { element(id).textContent = String(value); };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const time = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const approximateMoney = (cents:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',currencyDisplay:'code',maximumFractionDigits:0,minimumFractionDigits:0}).format(cents/100);
const recoveryRange = (cents:number) => `${approximateMoney(cents*.01)}–${approximateMoney(cents*.05)}`;
const eventLabels: Record<CheckoutEvent["name"], string> = {
  checkout_started: "Checkout started", checkout_contact_info_submitted: "Contact information submitted",
  checkout_address_info_submitted: "Address information submitted", checkout_shipping_info_submitted: "Shipping information submitted",
  payment_info_submitted: "Payment information submitted", checkout_completed: "Checkout completed", alert_displayed: "Checkout alert displayed",
};
const backendOrigin = ["localhost", "127.0.0.1"].includes(location.hostname) ? "https://neighborly-nightingale-843.convex.site" : location.origin;
let missions: Mission[] = [];
let selectedMission: MissionId | null = null;
let completedSteps: string[] = [];
let progressLoaded = false;
let savingProgress = false;
let abandonedCheckouts:AbandonedSnapshot|null=null;
let catalogModel: CatalogModel | null = null;
let observedPurchases: ObservedPurchases | null = null;
let viewerId: string | null = null;
try {
  const stored = localStorage.getItem("checkout-demo-viewer");
  viewerId = isViewerId(stored) ? stored : [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("checkout-demo-viewer", viewerId);
} catch { /* Checklist remains disabled; viewing evidence still works. */ }
const categoryLabels = { discount: "Discount or gift-card", payment: "Payment", delivery: "Delivery", validation: "Input validation" };

function showView(view: "overview" | "journeys", focus = false) {
  for (const name of ["overview", "journeys"] as const) {
    element(name).hidden = name !== view;
    element(`${name}-tab`).setAttribute("aria-pressed", String(name === view));
    element(`${name}-tab`).setAttribute("variant", name === view ? "primary" : "secondary");
  }
  document.querySelector("s-page")!.setAttribute("heading", view === "journeys" ? "Checkout drill-down" : "Checkout overview");
  if (focus) element(`${view}-tab`).focus();
}
for (const view of ["overview", "journeys"] as const) element(`${view}-tab`).addEventListener("click", () => showView(view));
element("open-journeys").addEventListener("click", () => showView("journeys", true));
element("coverage-details-button").addEventListener("click",()=>togglePanel(element("coverage-details-button"),"coverage-details"));

function togglePanel(button: HTMLElement, panelId: string) {
  const panel = element(panelId);
  panel.hidden = !panel.hidden;
  button.setAttribute("aria-expanded", String(!panel.hidden));
  button.textContent = panel.hidden ? (panelId === "coverage-details" ? "Data details" : "Show details") : "Hide details";
}

function renderProgress() {
  for (const mission of missions) {
    const done = mission.steps.filter(step => completedSteps.includes(step.id)).length;
    text(`mission-progress-${mission.id}`, `${done} / 3 steps`);
    text(`mission-badge-${mission.id}`, mission.count ? (mission.id === "unfinished" ? "Needs investigation" : "Needs attention") : "No matching evidence");

    for (const step of mission.steps) {
      const input = element(step.id) as HTMLElementTagNameMap["s-checkbox"];
      if (!savingProgress) input.checked = completedSteps.includes(step.id);
      input.disabled = !progressLoaded || savingProgress || !viewerId || mission.count === 0;
    }
  }
}
const money = (cents: number) => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",currencyDisplay:"code"}).format(cents/100);
function renderCatalog(model: CatalogModel | null, events: CheckoutEvent[], partial: boolean, observed: ObservedPurchases | null) {
  catalogModel = model; observedPurchases = observed;
  if (!model) {
    text("catalog-summary","Product prices are not loaded. Revenue estimates are unavailable.");
    text("catalog-aov","—"); text("catalog-recovery","—"); text("catalog-dedup","");
    element("catalog-details-button").toggleAttribute("disabled",true);
    return;
  }
  const calculated = modelCatalog(model);
  const impact = estimateCatalogImpact(events,buildMissions(events),model,observed);
  text("catalog-recovery-label","Recovery scenario · 1–5%");
  text("catalog-summary",`Based on inspected snowboard prices and an assumed basket mix. Prices checked ${model.checkedOn}; this is a saved snapshot, not measured average order value.${partial ? " Partial event window; earlier steps may be missing." : ""}`);
  text("catalog-aov",money(calculated.aovCents));
  text("catalog-recovery",recoveryRange(impact.combined.atRiskCents));
  text("catalog-dedup",`${impact.combined.eligibleSessions} unique unfinished checkouts · duplicates counted once`);
  text("catalog-method",`${money(calculated.modeledSalesCents)} across 100 hypothetical purchases ÷ 100 = ${money(calculated.aovCents)} modeled average order value. More weight goes to lower and middle-priced boards; these weights are assumptions.`);
  element("catalog-details-button").removeAttribute("disabled");
  if (observed) {
    const aov=observedAverageOrderValue(observed);
    element("catalog-scenario").setAttribute("heading","Revenue estimates from observed test purchases");
    text("catalog-aov-label","Average test order value");
    text("catalog-aov",money(aov));
    text("catalog-summary",`${observed.orderCount} paid test orders from ${observed.periodStart} to ${observed.periodEnd}, imported ${observed.importedOn}. This is a saved demo-order snapshot, not live customer behavior.${partial ? " The checkout event window is partial." : ""}`);
    text("catalog-details-heading","Observed test basket mix");
    text("catalog-mix-description",`${observed.orderCount} paid test purchases across ${observed.baskets.length} observed basket type${observed.baskets.length===1 ? "" : "s"}. Shares below come from the exported orders, replacing the assumed basket weights.`);
    text("catalog-method",`${money(observed.totalProductCents)} in product subtotals ÷ ${observed.orderCount} paid test orders = ${money(aov)} observed test-order average. All orders used the test gateway; these amounts are not real sales revenue.`);
    text("catalog-exclusions","Only paid, uncancelled, unrefunded USD test-gateway orders without discounts are included. Shipping and tax are excluded. Buyer details and order identifiers are not stored. This is an imported snapshot; Refresh test data does not fetch new Shopify orders.");
    element("catalog-source-link").setAttribute("href","https://admin.shopify.com/store/build-sprint-demo/orders");
    text("catalog-source-link","View demo store orders in Shopify");
  }
  text("catalog-details-button",element("catalog-details").hidden ? (observed ? "See observed purchases" : "See basket assumptions") : (observed ? "Hide observed purchases" : "Hide basket assumptions"));
  element("catalog-baskets").innerHTML = `<s-table variant="auto"><s-table-header-row><s-table-header listSlot="primary">Modeled basket</s-table-header><s-table-header listSlot="labeled">Assumed share</s-table-header><s-table-header listSlot="labeled" format="currency">Product subtotal</s-table-header></s-table-header-row><s-table-body>${calculated.baskets.map(basket=>`<s-table-row><s-table-cell>${escape(basket.label)}</s-table-cell><s-table-cell>${basket.weight}%</s-table-cell><s-table-cell>${money(basket.subtotalCents)}</s-table-cell></s-table-row>`).join("")}</s-table-body></s-table>`;
  if (observed) element("catalog-baskets").innerHTML=`<s-table variant="auto"><s-table-header-row><s-table-header listSlot="primary">Observed test basket</s-table-header><s-table-header listSlot="labeled">Paid orders</s-table-header><s-table-header listSlot="labeled">Observed share</s-table-header><s-table-header listSlot="labeled" format="currency">Average product subtotal</s-table-header></s-table-header-row><s-table-body>${observed.baskets.map(basket=>`<s-table-row><s-table-cell>${escape(basket.label)}</s-table-cell><s-table-cell>${basket.orderCount}</s-table-cell><s-table-cell>${new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(basket.orderCount/observed.orderCount*100)}%</s-table-cell><s-table-cell>${money(Math.round(basket.totalProductCents/basket.orderCount))}</s-table-cell></s-table-row>`).join("")}</s-table-body></s-table>`;
}
element("catalog-details-button").addEventListener("click",()=>{
  const panel=element("catalog-details"); panel.hidden=!panel.hidden;
  element("catalog-details-button").setAttribute("aria-expanded",String(!panel.hidden));
  text("catalog-details-button",panel.hidden ? (observedPurchases ? "See observed purchases" : "See basket assumptions") : (observedPurchases ? "Hide observed purchases" : "Hide basket assumptions"));
});

function renderMissions(events: CheckoutEvent[]) {
  const expanded = new Set(Array.from(element("mission-list").querySelectorAll<HTMLElement>("[data-action-body]")).filter(item => !item.hidden).map(item => item.id));

  const summary = summarize(events);
  const unfinishedIds = new Set(summary.journeys.filter(session => session.started && !session.completed).map(session => session.id));
  const unfinishedCount = (mission: Mission) => mission.sessionIds.filter(id => unfinishedIds.has(id)).length;
  const impact = catalogModel ? estimateCatalogImpact(events,buildMissions(events),catalogModel,observedPurchases) : null;
  const recorded = recordedImpact(events,buildMissions(events),abandonedCheckouts ?? {importedOn:"",emailSent:0,emailNotSent:0,records:[]});
  missions = buildMissions(events).sort((a,b) => a.id === "unfinished" ? 1 : b.id === "unfinished" ? -1 : unfinishedCount(b) - unfinishedCount(a));
  element("mission-list").innerHTML = missions.map((mission, index) => {
    const open = expanded.has(`body-${mission.id}`);
    const estimate = (recorded ?? impact)?.actions.find(item=>item.id===mission.id);
    const actual = recorded?.actions.find(item=>item.id===mission.id);
    const basketCents = estimate?.atRiskCents;
    const hasAmount = !!estimate && (!recorded || !!actual?.matchedSessions || !estimate.eligibleSessions);
    const percent = summary.sessionCount ? Math.round(mission.count / summary.sessionCount * 100) : 0;
    return `<s-section id="mission-${mission.id}">
      <s-stack gap="base">
        <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr auto, 1fr" gap="base" alignItems="start">
          <s-stack gap="small">
            <s-stack direction="inline" gap="small" alignItems="center"><s-heading>${escape(mission.title)}</s-heading><s-badge id="mission-badge-${mission.id}" tone="caution" size="base" color="base">Needs attention</s-badge></s-stack>
          </s-stack>
          <s-button variant="secondary" data-toggle-action="${mission.id}" aria-expanded="${open}" aria-controls="body-${mission.id}" accessibilityLabel="${open ? "Hide" : "Show"} details: ${mission.title}">${open ? "Hide details" : "Show details"}</s-button>
        </s-grid></s-query-container>
        <s-divider></s-divider>
        <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="base">
          <s-stack gap="small"><s-text color="subdued">Affected checkouts</s-text><s-number fontSize="large-100" fontWeight="bold">${percent}%</s-number><s-text color="subdued">${mission.count} of ${summary.sessionCount} checkouts</s-text></s-stack>
          <s-stack gap="small"><s-text color="subdued">${actual?.browserPricedSessions ? "Observed basket value" : "Linked basket value"}</s-text><s-number fontSize="large-100" fontWeight="bold" id="risk-${mission.id}">${hasAmount ? money(basketCents!) : "Unknown"}</s-number><s-text color="subdued">${recorded ? `${actual?.serverLinkedSessions ?? 0} server-linked · ${actual?.browserPricedSessions ?? 0} browser-priced · ${actual?.unknownSessions ?? 0} unpriced` : `${unfinishedCount(mission)} matching checkouts without completion`}</s-text></s-stack>
          <s-stack gap="small"><s-text color="subdued">Recovery scenario · 1–5%</s-text><s-number tone="success" fontSize="large-100" fontWeight="bold" id="recovery-${mission.id}">${hasAmount ? recoveryRange(basketCents!) : "Unknown"}</s-number><s-text color="subdued">If 1–5% of this basket value converts</s-text></s-stack>
        </s-grid></s-query-container>
        <s-stack id="body-${mission.id}" data-action-body gap="base" ${open ? "" : "hidden"}>
          <s-divider></s-divider>
          <s-paragraph color="subdued">${escape(mission.description)}</s-paragraph>
          <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1fr 1fr, 1fr" gap="base" alignItems="stretch">
            <s-box background="subdued" borderRadius="large" padding="base"><s-stack gap="small" data-explanation="why"><s-heading>Why it matters</s-heading><s-paragraph>${mission.why}</s-paragraph></s-stack></s-box>
            <s-box background="subdued" borderRadius="large" padding="base"><s-stack gap="small" data-explanation="next"><s-heading>What to do</s-heading><s-paragraph>${mission.next}</s-paragraph></s-stack></s-box>
          </s-grid></s-query-container>
          <s-paragraph color="subdued">${recorded ? "Only linked basket values are included; unlinked values are not recorded as zero. " : estimate ? `${estimate.eligibleSessions} unfinished checkouts × ${money(impact!.aovCents)} modeled order value. ` : ""}The 1–5% range is a what-if assumption, not a measured recovery probability or confidence interval. Completed checkouts are excluded. Action groups overlap; do not add their amounts. No lost sales or savings have been verified.</s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button variant="primary" data-start="${mission.id}" ${mission.count ? "" : "disabled"}>${mission.id === "payment" ? "Investigate payment errors" : mission.id === "validation" ? "Review validation alerts" : "Review unfinished journeys"}</s-button>
            <s-button variant="secondary" data-mission="${mission.id}" ${mission.count ? "" : "disabled"}>See ${mission.count} affected checkouts</s-button>
          </s-stack>
          <s-stack id="steps-${mission.id}" gap="base" hidden>
            <s-divider></s-divider><s-heading>Action checklist</s-heading><s-text id="mission-progress-${mission.id}" color="subdued">0 / 3 steps</s-text>
            ${mission.steps.map(step => `<s-checkbox id="${step.id}" data-step="${step.id}" label="${escape(step.label)}" disabled></s-checkbox>`).join("")}
            <s-paragraph color="subdued">Saved for this browser. Checking a task does not change Shopify or verify savings.</s-paragraph>
          </s-stack>
        </s-stack>
      </s-stack>
    </s-section>`;
  }).join("");
  renderProgress();
}
function applyMissionFilter() {
  const mission = missions.find(item => item.id === selectedMission);
  element("mission-filter").hidden = !mission;
  if (mission) text("mission-filter-label", `${mission.title}: ${mission.count} matching test checkouts`);
  const rows = Array.from(element("journey-list").querySelectorAll<HTMLElement>("[data-session]"));
  for (const row of rows) row.hidden = !!mission && !mission.sessionIds.includes(row.dataset.session!);
  text("journey-count", `${rows.filter(row => !row.hidden).length} test checkouts`);
}
element("clear-mission-filter").addEventListener("click", () => { selectedMission = null; applyMissionFilter(); });
element("mission-list").addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-mission]");
  const start = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-start]");
  const toggle = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-toggle-action]");
  if (toggle) { togglePanel(toggle, `body-${toggle.dataset.toggleAction}`); toggle.setAttribute("accessibilityLabel", `${element(`body-${toggle.dataset.toggleAction}`).hidden ? "Show" : "Hide"} details: ${missions.find(item=>item.id===toggle.dataset.toggleAction)!.title}`); return; }
  if (start) { const steps = element(`steps-${start.dataset.start}`); steps.hidden = false; steps.querySelector<HTMLElement>("s-checkbox")?.focus(); return; }
  if (!target) return;
  selectedMission = target.dataset.mission as MissionId;
  applyMissionFilter(); showView("journeys", true);
  element("journeys").scrollIntoView({ behavior: "instant", block: "start" });
});
async function progressRequest(path: string, body: object) {
  const response = await fetch(`${backendOrigin}/api/action-progress/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || data.error || !Array.isArray(data.completed)) throw new Error("Progress request failed.");
  return data as { completed: string[]; updatedAt: number | null;  };
}
async function loadProgress() {
  if (!viewerId) { text("progress-status", "Browser storage is unavailable. Enable it to save checklist progress; you can still inspect the evidence."); renderProgress(); return; }
  try {
    const data = await progressRequest("read", { viewerId });
    completedSteps = data.completed; progressLoaded = true;
    element("progress-error").hidden = true;
    text("progress-status", "");
  } catch {
    element("progress-error").hidden = false;
    text("progress-error-message", "Could not load your checklist. Check your connection, then retry.");
  }
  renderProgress();
}
element("retry-progress").addEventListener("click", () => { void loadProgress(); });
element("mission-list").addEventListener("change", async event => {
  const input = event.target as HTMLElementTagNameMap["s-checkbox"];
  if (!input.dataset.step || !viewerId || savingProgress || !progressLoaded) return;

  const requested = input.checked;
  savingProgress = true; renderProgress(); text("progress-status", "Saving your checklist…");
  try {
    const data = await progressRequest("update", { viewerId, stepId: input.dataset.step as ActionStep, completed: requested });
    completedSteps = data.completed;
    element("progress-error").hidden = true;
    text("progress-status", "Checklist saved.");
  } catch {
    element("progress-error").hidden = false;
    text("progress-error-message", "Could not save that step. Your previous progress is shown. Check your connection and try the checkbox again.");
    text("progress-status", "Step was not saved.");
  } finally { savingProgress = false; renderProgress(); }
});
function render(data: EvidenceResponse) {
  abandonedCheckouts=data.abandonedCheckouts??null;
  const summary = summarize(data.events);
  element("catalog-summary").hidden=!!abandonedCheckouts;
  element("abandoned-value-metric").hidden=!abandonedCheckouts;
  element("catalog-metrics").setAttribute("gridTemplateColumns",abandonedCheckouts ? "@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" : "@container (inline-size > 600px) 1fr 1fr, 1fr");
  renderCatalog(data.catalogModel ?? null,data.events,data.truncated,data.observedPurchases ?? null);
  {const snap=abandonedCheckouts ?? {importedOn:"",emailSent:0,emailNotSent:0,records:[]};const priced=recordedImpact(data.events,buildMissions(data.events),snap); const total=priced.combined.atRiskCents;
    text("abandoned-value",priced.combined.matchedSessions ? money(total) : "Unknown");
    text("abandoned-count",`${priced.combined.matchedSessions} of ${priced.combined.eligibleSessions} unfinished checkouts priced`);
    element("abandoned-source").hidden=false;
    text("abandoned-source",`Legacy Shopify snapshot imported ${snap.importedOn || "not available"}. ${snap.emailSent} recovery emails sent, ${snap.emailNotSent} not sent. Summary and action values include server-linked baskets and browser-observed subtotals for unfinished tracked sessions. Browser values are unverified client evidence. Unlinked basket values are unknown and excluded; the test-order average is context only. Overlapping action groups are counted once in the summary.`);
    text("catalog-recovery-label","Recovery scenario · 1–5%");
    text("catalog-recovery",priced.combined.matchedSessions ? recoveryRange(total) : "Unknown");
    text("catalog-dedup",`${priced.combined.serverLinkedSessions} server-linked · ${priced.combined.browserPricedSessions} browser-priced · ${priced.combined.unknownSessions} unpriced`);
    element("catalog-scenario").setAttribute("heading","Abandoned checkout value");
  }
  text("session-count", summary.sessionCount);
  text("completed-count", summary.completed);
  text("incomplete-count", summary.noCompletionObserved);
  text("event-count", summary.eventCount);
  text("stored-count", data.totalStored);
  text("collection-state", data.enabled ? "Enabled" : "Paused");
  text("request-status", `Updated ${time(data.sampledAt)} · ${summary.eventCount} test events in this view`);
  text("coverage-note", `${data.truncated ? `Partial view: only the latest ${EVIDENCE_EVENT_LIMIT.toLocaleString()} events are shown. Earlier session steps may be missing.` : "This view includes all stored test events."}${summary.sessionsWithoutStart ? ` ${summary.sessionsWithoutStart} ${summary.sessionsWithoutStart === 1 ? "session has" : "sessions have"} no start event in this view.` : ""} A missing completion is not proof of abandonment.`);
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

  const hasSessions=summary.sessionCount>0;
  element("summary-title").hidden=hasSessions;
  element("completion-summary").hidden=!hasSessions;
  element("summary-description").hidden=hasSessions;
  text("completion-label",`${summary.completed} of ${summary.sessionCount} · ${hasSessions ? Math.round(summary.completed/summary.sessionCount*100) : 0}%`);
  element("completion-progress").setAttribute("max",String(Math.max(1,summary.sessionCount)));
  element("completion-progress").setAttribute("value",String(summary.completed));
  element("completion-progress").setAttribute("accessibilityLabel",`${summary.completed} of ${summary.sessionCount} test checkouts recorded completion`);
  element("journey-list").innerHTML = summary.journeys.length ? summary.journeys.reverse().map((session, index) => {
    const alerts = session.events.filter(event => event.name === "alert_displayed" && event.category);
    const detail = describeJourney(session.events);
    const status = detail.outcome;
    const id = `timeline-${index}`;
    const matches = abandonedCheckouts?.records.filter(record => record.sessionId === session.id) ?? [];
    const record = matches.length===1 ? matches[0] : undefined;
    const browserPrice = session.events.filter(event=>event.currency==='USD'&&Number.isSafeInteger(event.subtotalCents)&&event.subtotalCents!>=0).sort((a,b)=>b.timestamp-a.timestamp)[0]?.subtotalCents;
    const basketCents = record?.subtotalCents ?? browserPrice;
    return `<s-box data-session="${escape(session.id)}" accessibilityRole="list-item">
      <s-stack gap="base">
        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr auto, 1fr" gap="small" alignItems="center">
            <s-stack gap="small-200">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-heading>Test checkout ${index + 1}</s-heading>
                <s-badge tone="${session.completed ? "success" : "neutral"}">${status}</s-badge>
              </s-stack>
              <s-text color="subdued">${escape(time(session.events[0].timestamp))} · ${session.events.length} ${session.events.length === 1 ? "event" : "events"}</s-text>
            </s-stack>
            <s-button variant="secondary" data-timeline="${id}" aria-expanded="false" aria-controls="${id}" accessibilityLabel="Show details: test checkout ${index+1}">Show details</s-button>
          </s-grid>
        </s-query-container>
        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="base">
            <s-stack gap="small-200"><s-text color="subdued">Last recorded progress</s-text><s-text>${escape(detail.lastProgress)}</s-text></s-stack>
            <s-stack gap="small-200"><s-text color="subdued">Errors observed</s-text><s-text>${detail.categories.length ? detail.categories.map(category => categoryLabels[category]).join(", ") : "None recorded"}${alerts.length ? ` · ${alerts.length} error events` : ""}</s-text></s-stack>
            <s-stack gap="small-200"><s-text color="subdued">Shopify basket value</s-text><s-text>${basketCents===undefined ? "Unknown" : money(basketCents)}</s-text></s-stack>
          </s-grid>
        </s-query-container>
        <s-stack id="${id}" gap="base" hidden>
          <s-divider></s-divider>
          <s-heading>Recorded events</s-heading>
          <s-paragraph color="subdued">${session.completed ? "Completion was recorded. Errors before completion do not mean the checkout was lost." : "Recording stops at the last event shown. This does not establish that the customer left or why."}</s-paragraph>
          <s-paragraph color="subdued">${record ? "Shopify abandoned checkout subtotal · verified record match" : browserPrice===undefined ? "Basket value unknown · no recorded amount" : "Browser-observed product subtotal · not server-verified"}</s-paragraph>
          <s-paragraph color="subdued">Anonymous checkout ID: ${escape(session.id.slice(0, 12))}…</s-paragraph>
          <s-table variant="auto">
            <s-table-header-row><s-table-header listSlot="primary">Event</s-table-header><s-table-header listSlot="labeled">Category</s-table-header><s-table-header listSlot="labeled">Recorded at</s-table-header></s-table-header-row>
            <s-table-body>${session.events.map(event => `<s-table-row><s-table-cell>${escape(eventLabels[event.name])}</s-table-cell><s-table-cell>${event.category ? categoryLabels[event.category] : "—"}</s-table-cell><s-table-cell>${escape(time(event.timestamp))}</s-table-cell></s-table-row>`).join("")}</s-table-body>
          </s-table>
        </s-stack>
      </s-stack>
      <s-box paddingBlockStart="base"><s-divider></s-divider></s-box>
    </s-box>`;
  }).join("") : "<s-paragraph>No test checkouts collected yet. Start a checkout in the demo store, then refresh this page.</s-paragraph>";
  renderMissions(data.events);
  applyMissionFilter();
}

const embeddedShopify = location.pathname === '/api/shopify/app';
async function shopifyRequest(path:string,method='GET') {
  const bridge=(window as unknown as {shopify?:{idToken:()=>Promise<string>}}).shopify;
  if(!bridge)throw Error('Open this app inside Shopify admin.');
  const token=await bridge.idToken();
  const response=await fetch(`${backendOrigin}/api/shopify/${path}`,{method,headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Shopify connection needs attention.');
  return response;
}
if(embeddedShopify){
  element('shopify-connection').hidden=false;
  element('enable-pixel').addEventListener('click',async()=>{
    const button=element('enable-pixel');button.setAttribute('loading','');button.setAttribute('disabled','');
    try{await shopifyRequest('pixel/enable','POST');text('shopify-status','Connected to build-sprint-demo · Checkout collection enabled');}
    catch{text('shopify-status','Collection could not be enabled. Check the released extension and Shopify permissions.');}
    finally{button.removeAttribute('loading');button.removeAttribute('disabled');}
  });
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
    if(embeddedShopify){
      await shopifyRequest('sync','POST');
      text('shopify-status','Connected to build-sprint-demo · Read-only Shopify data');
    }
    const response = embeddedShopify ? await shopifyRequest('evidence') : await fetch(`${backendOrigin}/api/test-evidence`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Could not read checkout evidence.");
    const data: EvidenceResponse = await response.json();
    if (data.store !== STORE || !Array.isArray(data.events)) throw new Error("Unexpected evidence response.");
    render(data);
    if(embeddedShopify){
      const snapshot=(data as EvidenceResponse & {shopifySnapshot?:{syncedAt:number;orders:{subtotalCents:number|null;paid:boolean;cancelled:boolean;test:boolean}[];abandoned:{subtotalCents:number|null;recovered:boolean}[]}}).shopifySnapshot;
      if(snapshot){
        const unpaid=snapshot.abandoned.filter(r=>!r.recovered),priced=unpaid.filter(r=>r.subtotalCents!==null);
        text('shopify-records',`Shopify records · Last 30 days: ${snapshot.orders.length} orders, ${unpaid.length} unrecovered checkouts. Recorded baskets: ${priced.length ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(priced.reduce((sum,r)=>sum+r.subtotalCents!,0)/100) : 'Unknown'} (${priced.length} priced). This is a separate cohort from the session action cards.`);
        element('shopify-records').hidden=false;
      }
    }
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
element("journey-list").addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-timeline]");
  if (button) { togglePanel(button, button.dataset.timeline!); button.setAttribute("accessibilityLabel", `${element(button.dataset.timeline!).hidden ? "Show" : "Hide"} details: ${button.closest("s-box")?.querySelector("s-heading")?.textContent}`); }
});
// Register component setters before applying saved checkbox values.
await Promise.all(["s-checkbox", "s-button", "s-section", "s-badge", "s-table", "s-table-header", "s-table-header-row", "s-table-body", "s-table-row", "s-table-cell"].map(tag => customElements.whenDefined(tag)));
void loadProgress();
void refresh();
