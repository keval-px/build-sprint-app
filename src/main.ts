/// <reference types="@shopify/polaris-types" />
import {recordedFindings} from '../shared/dashboardInsights';
import {checkoutBaskets,type CheckoutPrice} from '../shared/checkoutPrice';
import "./style.css";
import {lastObservedStep,stepTimings,durationText,focusedAlerts,issueLabels,type FocusedAlert} from '../shared/dashboardInsights';
import {checkoutCSV,checkoutEventsCSV} from '../shared/checkoutExport';
import {diagnosticsMarkup,historyMarkup,alertsMarkup,type FixHistoryRow} from './dashboardPanels';
import {orderPattern,type OrderPattern} from "../shared/orderPattern";
import {buildRecommendations} from "../shared/recommendations";
import {fixResults,retestResults,actionState,type AppliedFix} from "../shared/fixTracking";
import {recentRange,dateBounds,checkoutCohort} from '../shared/dateRange';
import {inventoryValue} from '../shared/inventoryValue';
import {formatMoney} from '../shared/money';
import {recordedImpact,linkedAbandoned} from "../shared/abandoned";
import {abandonedSummary} from "../shared/abandonedSummary";
import {RECOVERY_CASES} from "../shared/recovery";
import type {AbandonedSnapshot} from "../shared/abandoned";
import {journeyLabel,journeyOrderHref} from "../shared/journeyLabel";
import {sortJourneys} from "../shared/journeySort";
import {journeyDate} from "../shared/journeyDate";
import {journeyPrice,type SavedBasket} from "../shared/journeyPrice";
import {journeyDuration} from "../shared/journeyDuration";
import { STORE, summarize, describeJourney, EVIDENCE_EVENT_LIMIT } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";
import { ACTION_CHECKS, ACTION_DESTINATIONS, buildMissions, missionRecommendation, missionSignal, isViewerId } from "../shared/actions";
import { modelCatalog, estimateCatalogImpact } from "../shared/catalog";
import {observedAverageOrderValue,syncedAverageOrderValue} from "../shared/purchases";
import type {ObservedPurchases,SyncedPurchase} from "../shared/purchases";
import type { CatalogModel } from "../shared/catalog";
import type { Mission, ActionStep, MissionId } from "../shared/actions";

declare global { interface ImportMeta { readonly env: Record<string, string | undefined> } }
interface EvidenceResponse {
  store: string; events: CheckoutEvent[]; totalStored: number; truncated: boolean;
  abandonedCheckouts?:AbandonedSnapshot|null; enabled: boolean; sampledAt: number; catalogModel?: CatalogModel | null; observedPurchases?: ObservedPurchases | null;
  actionBasketValue?:(ReturnType<typeof recordedImpact>&{rangeStart:number;rangeEnd:number})|null;
  inventoryItemValue?:(ReturnType<typeof inventoryValue>&{rangeStart:number;rangeEnd:number})|null;
  abandonedBasketSummary?:(ReturnType<typeof abandonedSummary>&{syncedAt:number;currency?:string})|null;
  checkoutPrices?:CheckoutPrice[];
  orderPatterns?:OrderPattern|null;
  shopifySnapshot?:{timeZone?:string;currency?:string;syncedAt:number;periodStart:string;orders:(SyncedPurchase&{recordHash:string;createdAt:string;sessionId?:string;orderName?:string;orderId?:string;totalCents?:number|null;conversion?:{shopMinor:number;buyerMinor:number;buyerCurrency:string}})[];abandoned:(SavedBasket&{recordHash:string;createdAt:string;recovered:boolean})[]}|null;
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
const backendOrigin = ["localhost", "127.0.0.1"].includes(location.hostname) ? "https://neighborly-nightingale-843.convex.site" : location.origin;
let selectedRange=recentRange(30);
const openOverlays=new Set<string>();
for(const id of ['date-range-popover','journey-modal']){
 element(id).addEventListener('show',()=>openOverlays.add(id));
 element(id).addEventListener('hide',()=>openOverlays.delete(id));
}
let latestEvidence:EvidenceResponse|null=null;
function filteredEvidence(data:EvidenceResponse):EvidenceResponse{
  const {start,end}=dateBounds(selectedRange);
  const within=(value:string)=>{const at=Date.parse(value);return at>=start&&at<end;};
  const observed=data.observedPurchases;
  return {...data,events:checkoutCohort(data.events,selectedRange),observedPurchases:observed&&within(observed.periodStart)&&within(observed.periodEnd)?observed:null,
    shopifySnapshot:data.shopifySnapshot?{...data.shopifySnapshot,orders:data.shopifySnapshot.orders.filter(row=>within(row.createdAt)),abandoned:data.shopifySnapshot.abandoned.filter(row=>within(row.createdAt))}:null};
}
function updateDateSelection(value:string){
  selectedRange=value;
  journeyPage=0;
  const label=value===recentRange(30)?'Last 30 days':value===recentRange(7)?'Last 7 days':value.split('--').map(date=>new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})).join(' – ');
  text('date-range-button',label);
  if(latestEvidence)render(filteredEvidence(latestEvidence));
}
let appliedFixes:AppliedFix[]=[];
let fixesReady=false,fixSaving=false;
let fixError="";
let missions: Mission[] = [];
let selectedMission: MissionId | null = null;
let journeyPage = 0;
const JOURNEYS_PER_PAGE = 24;
let filteredJourneyRows: typeof journeyRows = [];
let selectedQuickIssue:string|null=null;
let selectedFinding:string|null=null;
let fixHistory:FixHistoryRow[]=[];
let journeyRows: {events:CheckoutEvent[];shippingBlocker:boolean;startedAt: number; basketCents?: number; id: string; label: string; completed: boolean; categories: string[]; row: string; timeline: string}[] = [];
let completedSteps: string[] = [];
let progressLoaded = false;
let savingProgress = false;
let abandonedCheckouts:AbandonedSnapshot|null=null;
let catalogModel: CatalogModel | null = null;
let observedPurchases: ObservedPurchases | null = null;
let syncedPurchasesShown=false;
let viewerId: string | null = null;
try {
  const stored = localStorage.getItem("checkout-demo-viewer");
  viewerId = isViewerId(stored) ? stored : [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("checkout-demo-viewer", viewerId);
} catch { /* Checklist remains disabled; viewing evidence still works. */ }
const categoryLabels = { discount: "Discount or gift-card", payment: "Payment", delivery: "Delivery", validation: "Form errors", inventory: "Item availability" };

const dashboardViews=["overview","journeys","history","alerts"] as const;
function showView(view: typeof dashboardViews[number], focus = false) {
  for (const name of dashboardViews) {
    element(name).hidden = name !== view;
    element(`${name}-tab`).setAttribute("aria-pressed", String(name === view));
    element(`${name}-tab`).setAttribute("variant", !embeddedShopify&&name === view ? "primary" : "secondary");
  }
  text('page-title',({overview:'Jimmy’s Bakery',journeys:'Checkout drill-down',history:'Fix history',alerts:'Alerts'})[view]);
  if (focus) element(`${view}-tab`).focus();
}
for (const view of dashboardViews) element(`${view}-tab`).addEventListener("click", () => showView(view));
element("open-journeys").addEventListener("click", () => showView("journeys", true));
element("coverage-details-button").addEventListener("click",()=>togglePanel(element("coverage-details-button"),"coverage-details"));

function togglePanel(button: HTMLElement, panelId: string) {
  const panel = element(panelId);
  panel.hidden = !panel.hidden;
  button.setAttribute("aria-expanded", String(!panel.hidden));
  button.textContent = panel.hidden ? (panelId === "coverage-details" ? "Data details" : "Show details") : "Hide details";
}

function renderDone(mission:Mission){
  return `<s-checkbox id="done-${mission.id}" data-fix-done="${mission.id}" label="Mark as done" accessibilityLabel="Mark as done: ${escape(mission.title)}" ${appliedFixes.some(f=>f.missionId===mission.id)?'checked':''} ${!fixesReady||fixSaving||loading||(!embeddedShopify&&!viewerId)?'disabled':''}></s-checkbox>`;
}
function renderFix(mission:Mission){
  const fix=appliedFixes.find(f=>f.missionId===mission.id);
  if(!fix)return '';
  const results=fixResults(fix,latestEvidence?.events??[],Date.now());
  const retest=retestResults(fix,latestEvidence?.events??[],Date.now());
  const checked=fix.retestedAt!==undefined;
  const retestPanel=mission.id==='unfinished'?'':`<s-stack gap="small"><s-stack direction="inline" gap="small" alignItems="center">${checked?`<s-badge tone="${retest?.returned?'caution':'success'}">${retest?.returned?'Alerts after retest':'Retest passed'}</s-badge><s-text color="subdued">Confirmed by ${embeddedShopify?'your team':'this demo viewer'} · ${escape(time(fix.retestedAt!))}</s-text>`:'<s-text>Repeat the affected checkout and confirm the problem no longer appears.</s-text>'}</s-stack>${retest?.returned?`<s-text>${retest.returned} checkout${retest.returned===1?'':'s'} recorded matching alerts after the retest. Check again.</s-text>`:''}<s-stack direction="inline" gap="small"><s-button data-fix="${mission.id}" data-fix-operation="retest" variant="secondary" ${!fixesReady||fixSaving||loading?'disabled':''}>${checked?'I retested again successfully':'I retested successfully'}</s-button>${checked?`<s-button data-fix="${mission.id}" data-fix-operation="undo-retest" variant="tertiary" ${fixSaving||loading?'disabled':''}>Undo retest</s-button>`:''}</s-stack></s-stack>`;
  const rate=(n:number,d:number)=>d?`${Math.round(n/d*100)}% (${n}/${d})`:'No checkouts yet';
  const returned = actionState(fix, latestEvidence?.events??[], Date.now()).returned;
  const resultMessage = returned
    ? `${returned} checkout${returned===1?'':'s'} had new alerts since your last check. Review the fix.`
    : !results.after.checkouts && !results.affectedCompleted
      ? 'Waiting for checkout activity to check the result.'
      : mission.id==='unfinished'
        ? 'Review completed checkouts below and check any that still stop progressing.'
        : 'No new matching alerts recorded since your last check. Keep checking new checkouts.';
  return `<s-divider></s-divider><s-stack gap="base"><s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Results after your fix</s-heading></s-stack>
    ${retestPanel}
    <s-banner tone="${returned?'warning':'info'}"><s-paragraph>${escape(resultMessage)}</s-paragraph></s-banner>
    <s-text color="subdued">Marked ${escape(time(fix.appliedAt))} · Before: 30 days · After: ${results.ended?'30 days':'since your marker'}</s-text>
    <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="base">
      <s-stack gap="small"><s-text>Previously affected checkouts</s-text><s-text type="strong">${results.affectedTotal?`${results.affectedCompleted} of ${results.affectedTotal} completed after your change`:"No unfinished checkouts to follow"}</s-text></s-stack>
      <s-stack gap="small"><s-text>${mission.id==='unfinished'?'Unfinished checkouts':'Checkouts with alerts'}</s-text><s-text>Before ${rate(fix.baseline.affected,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${rate(results.after.affected,results.after.checkouts)}</s-text></s-stack>
      <s-stack gap="small"><s-text>New checkout completion</s-text><s-text>Before ${rate(fix.baseline.completed,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${rate(results.after.completed,results.after.checkouts)}</s-text></s-stack>
    </s-grid></s-query-container>
    <s-text color="subdued">${results.after.checkouts||results.affectedCompleted?'Purchases after a change do not prove recovered revenue.':'Previously affected customers may still return and complete checkout.'}${fix.partial||latestEvidence?.truncated?' Counts cover available events only; some history is missing.':''}</s-text>
    <s-button data-fix-refresh variant="secondary" ${loading||fixSaving?'disabled':''}>Update results</s-button></s-stack>`;
}
async function fixRequest(operation:'read'|'mark'|'undo'|'retest'|'undo-retest',missionId?:MissionId){
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(embeddedShopify){const bridge=(window as unknown as {shopify:{idToken:()=>Promise<string>}}).shopify;headers.Authorization=`Bearer ${await bridge.idToken()}`;}
  const response=await fetch(`${backendOrigin}/api/${embeddedShopify?'shopify':'demo'}/fixes`,{method:'POST',headers,body:JSON.stringify({operation,...(embeddedShopify?{}:{viewerId}),...(missionId?{missionId}:{})}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!Array.isArray(data.fixes))throw Error('Fix request failed.');
  appliedFixes=data.fixes;fixHistory=Array.isArray(data.history)?data.history:data.fixes.map((f:AppliedFix)=>({...f,active:true}));fixesReady=true;
}
element('mission-list').addEventListener('click',async event=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('s-button[data-fix],s-button[data-fix-refresh]');
  if(!target||fixSaving||loading)return;
  if(target.hasAttribute('data-fix-refresh')){void loadEvidence();return;}
  await saveFixUpdate(target.dataset.fixOperation as 'mark'|'undo'|'retest'|'undo-retest',target.dataset.fix as MissionId);
});
element('mission-list').addEventListener('change',async event=>{
  const input=(event.target as HTMLElement).closest<HTMLElementTagNameMap['s-checkbox']>('s-checkbox[data-fix-done]');
  if(!input||fixSaving||loading||!fixesReady)return;
  await saveFixUpdate(input.checked?'mark':'undo',input.dataset.fixDone as MissionId);
});
async function saveFixUpdate(operation:'mark'|'undo'|'retest'|'undo-retest',missionId:MissionId){
  fixSaving=true;fixError='';element('action-save-error').hidden=true;text('action-save-status','Saving action…');
  (element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=true;
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-checkbox']|HTMLElementTagNameMap['s-button']>('s-checkbox[data-fix-done],s-button[data-fix],s-button[data-fix-refresh]').forEach(control=>{control.disabled=true;});
  try{await fixRequest(operation,missionId);if(operation==='mark')element(`body-${missionId}`).hidden=true;text('action-save-status',operation==='mark'?'Marked as done.':operation==='undo'?'Action reopened.':'Retest updated.');}
  catch{fixError='Your change was not saved. Check your connection and try again.';text('action-save-error',fixError);element('action-save-error').hidden=false;text('action-save-status','Change was not saved.');}
  finally{fixSaving=false;(element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=loading;if(latestEvidence)render(filteredEvidence(latestEvidence));element(`${element(`body-${missionId}`).hidden?'toggle':'done'}-${missionId}`).focus({preventScroll:true});}
}

function signalBoundary(id:MissionId){const fix=appliedFixes.find(f=>f.missionId===id);return fix?.retestedAt??fix?.appliedAt;}
function renderProgress() {
  for (const mission of missions) {
    const severity = missionSignal(mission, latestEvidence ? filteredEvidence(latestEvidence).events : [], signalBoundary(mission.id)).severity;
    text(`mission-badge-${mission.id}`, severity.label);
    element(`mission-badge-${mission.id}`).setAttribute("tone", severity.tone);


  }
}
let storeCurrency='USD';
const money = (minor:number)=>formatMoney(minor,storeCurrency);
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
  text("catalog-summary",`Based on inspected snowboard prices and an assumed basket mix. Prices checked ${model.checkedOn}; this is a saved snapshot, not measured average order value.${partial ? " Partial event window; earlier steps may be missing." : ""}`);
  text("catalog-aov",money(calculated.aovCents));
  text("catalog-recovery","—");
  text("catalog-dedup",`${impact.combined.eligibleSessions} unique unfinished checkouts · duplicates counted once`);
  text("catalog-method",`${money(calculated.modeledSalesCents)} across 100 hypothetical purchases ÷ 100 = ${money(calculated.aovCents)} modeled average order value. More weight goes to lower and middle-priced boards; these weights are assumptions.`);
  element("catalog-details-button").removeAttribute("disabled");
  if (observed) {
    const aov=observedAverageOrderValue(observed);
    text("abandoned-heading","Revenue estimates from observed test purchases");
    text("catalog-aov-label","Average test order value");
    text("catalog-aov",money(aov));
    text("catalog-summary",`${observed.orderCount} paid test orders from ${observed.periodStart} to ${observed.periodEnd}, imported ${observed.importedOn}. This is a saved demo-order snapshot, not live customer behavior.${partial ? " The checkout event window is partial." : ""}`);
    text("catalog-details-heading","Observed test basket mix");
    text("catalog-mix-description",`${observed.orderCount} paid test purchases across ${observed.baskets.length} observed basket type${observed.baskets.length===1 ? "" : "s"}. Shares below come from the exported orders, replacing the assumed basket weights.`);
    text("catalog-method",`${money(observed.totalProductCents)} in product subtotals ÷ ${observed.orderCount} paid test orders = ${money(aov)} observed test-order average. All orders used the test gateway; these amounts are not real sales revenue.`);
    text("catalog-exclusions","Only paid, uncancelled, unrefunded USD test-gateway orders without discounts are included. Shipping and tax are excluded. Buyer details and order identifiers are not stored. This public demo uses a saved purchase snapshot.");
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
  text("catalog-details-button",panel.hidden ? (observedPurchases||syncedPurchasesShown ? "See observed purchases" : "See basket assumptions") : (observedPurchases||syncedPurchasesShown ? "Hide observed purchases" : "Hide basket assumptions"));
});

function renderSyncedPurchases(snapshot:NonNullable<EvidenceResponse['shopifySnapshot']>){
  syncedPurchasesShown=true;
  const purchases=syncedAverageOrderValue(snapshot.orders);
  text('catalog-aov-label','Average test order value');
  text('catalog-aov',purchases.aovCents===null?'Unknown':money(purchases.aovCents));
  text('catalog-details-heading','Synced test purchases');
  text('catalog-summary',`${purchases.orderCount} priced paid test orders · Selected dates · Updated ${time(snapshot.syncedAt)}.`);
  text('catalog-mix-description',`Read directly from Shopify. ${purchases.unpricedCount} eligible orders without a valid store-currency subtotal are excluded.`);
  text('catalog-method',purchases.aovCents===null?'No paid test orders with recorded prices in these dates.':`${money(purchases.totalProductCents)} in current product subtotals ÷ ${purchases.orderCount} paid test orders = ${money(purchases.aovCents)}. These are test purchases, not real revenue.`);
  text('catalog-exclusions','Paid, uncancelled test orders in the selected dates. Shipping and tax excluded. The average updates when you open the app or apply dates; it is not used to fill missing basket values.');
  element('catalog-source-link').setAttribute('href','https://admin.shopify.com/store/build-sprint-demo/orders');
  text('catalog-source-link','View demo store orders in Shopify');
  element('catalog-baskets').innerHTML='';
  element('catalog-details-button').removeAttribute('disabled');
  text('catalog-details-button',element('catalog-details').hidden?'See observed purchases':'Hide observed purchases');
}

function renderMissions(events: CheckoutEvent[]) {
  const expanded = new Set(Array.from(element("mission-list").querySelectorAll<HTMLElement>("[data-action-body]")).filter(item => !item.hidden).map(item => item.id));

  const summary = summarize(events);
  const unfinishedIds = new Set(summary.journeys.filter(session => session.started && !session.completed).map(session => session.id));
  const unfinishedCount = (mission: Mission) => mission.sessionIds.filter(id => unfinishedIds.has(id)).length;
  const recommendations=buildRecommendations(events);
  const impact = catalogModel ? estimateCatalogImpact(events,recommendations,catalogModel,observedPurchases) : null;
  const bounds=dateBounds(selectedRange),sharedValues=latestEvidence?.actionBasketValue;
  const recorded = !embeddedShopify&&sharedValues?.rangeStart===bounds.start&&sharedValues.rangeEnd===bounds.end
    ? sharedValues
    : recordedImpact(events,recommendations,abandonedCheckouts ?? {importedOn:"",emailSent:0,emailNotSent:0,records:[]},0,storeCurrency);
  const priority:Record<MissionId,number>={delivery:0,payment:0,inventory:0,discount:1,validation:2,unfinished:3};
  const severityRank = {Critical:0, Warning:1, Info:2};
  const state=(mission:Mission)=>actionState(appliedFixes.find(f=>f.missionId===mission.id),latestEvidence?.events??events,Date.now());
  missions = recommendations.sort((a,b)=>Number(state(a).done)-Number(state(b).done)||severityRank[missionSignal(a,events,signalBoundary(a.id)).severity.label]-severityRank[missionSignal(b,events,signalBoundary(b.id)).severity.label]||priority[a.id]-priority[b.id]||unfinishedCount(b)-unfinishedCount(a));
  element("mission-list").innerHTML = missions.map((mission, index) => {
    const open = expanded.has(`body-${mission.id}`);
    const destination = ACTION_DESTINATIONS[mission.id];
    const status=state(mission);
    const signal = missionSignal(mission, events, signalBoundary(mission.id));
    const severity = signal.severity;
    const recommendation = missionRecommendation(mission, events, signalBoundary(mission.id));
    const shippingBlockers = new Set(events.filter(event=>mission.sessionIds.includes(event.sessionId)&&event.shippingBlocker==='no_shipping_available').map(event=>event.sessionId)).size;
    const estimate = (recorded ?? impact)?.actions.find(item=>item.id===mission.id);
    const actual = recorded?.actions.find(item=>item.id===mission.id);
    const basketCents = estimate?.atRiskCents;
    const hasAmount = !!estimate && (!recorded || !!actual?.matchedSessions || !estimate.eligibleSessions);
    const dates=dateBounds(selectedRange),aggregate=latestEvidence?.inventoryItemValue;
    const inventory=aggregate&&aggregate.rangeStart===dates.start&&aggregate.rangeEnd===dates.end?aggregate:inventoryValue(events,mission.sessionIds,storeCurrency,(latestEvidence?.shopifySnapshot?.orders??[]).flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency:storeCurrency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]));
    const percent = summary.sessionCount ? Math.round(mission.count / summary.sessionCount * 100) : 0;
    const brief = `${mission.count}/${summary.sessionCount} checkouts impacted${signal.latestAlert!==null?` · Last observed ${time(signal.latestAlert)}`:""}`;
    return `${status.done&&(index===0||!state(missions[index-1]).done)?'<s-divider></s-divider><s-heading>Marked as done</s-heading>':''}<s-section id="mission-${mission.id}">
      <s-stack gap="base">
        <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr auto, 1fr" gap="small" alignItems="center">
          <s-stack gap="small">
            <s-stack direction="inline" gap="small" alignItems="center"><s-heading>${escape(mission.title)}</s-heading><s-badge id="mission-badge-${mission.id}" tone="${severity.tone}" size="base" color="base">${severity.label}</s-badge></s-stack>
            <s-text color="subdued" data-recommendation-summary>${escape(brief)}</s-text>
          </s-stack>
          <s-stack direction="inline" gap="large-200" alignItems="center">
            <s-stack gap="small" data-action-value><s-text color="subdued">${mission.id==="inventory"?"Item value before alert":"Affected basket value"}</s-text><s-number fontSize="large-100" fontWeight="bold" id="risk-${mission.id}">${mission.id==="inventory"?(inventory.totalMinor===null?"Not recorded":money(inventory.totalMinor)):hasAmount ? money(basketCents!) : "Not recorded"}</s-number></s-stack>
            <s-stack gap="small" alignItems="start" data-action-metric><s-text color="subdued">Affected checkouts</s-text><s-number fontSize="large-100" fontWeight="bold">${percent}%</s-number></s-stack>
            <s-button id="toggle-${mission.id}" variant="secondary" data-toggle-action="${mission.id}" aria-expanded="${open}" aria-controls="metrics-${mission.id} body-${mission.id}" accessibilityLabel="${open ? "Hide" : "Show"} details: ${escape(mission.title)}">${open ? "Hide details" : "Show details"}</s-button>
          </s-stack>
        </s-grid></s-query-container>
        ${status.returned?`<s-text tone="caution">${status.returned} checkout${status.returned===1?'':'s'} with new alerts since your last check. Review again.</s-text>`:''}
        <s-stack id="metrics-${mission.id}" gap="base" ${open?'':'hidden'}>${appliedFixes.some(f=>f.missionId===mission.id)?`<s-divider></s-divider>${renderFix(mission)}`:''}</s-stack>
        <s-stack id="body-${mission.id}" data-action-body gap="base" ${open ? "" : "hidden"}>
          <s-divider></s-divider>
          ${mission.id==='delivery'&&mission.count>shippingBlockers?`<s-text color="subdued">${shippingBlockers} confirmed shipping blocker${shippingBlockers===1?'':'s'} · ${mission.count-shippingBlockers} checkouts with general shipping alerts</s-text>`:''}
          <s-banner tone="${severity.label==='Critical'?'critical':severity.label==='Warning'?'warning':'info'}"><s-paragraph>${escape(severity.reason)}</s-paragraph></s-banner>
          <s-query-container><s-grid gridTemplateColumns="1fr" gap="base" alignItems="stretch">
            <s-box background="subdued" borderRadius="large" padding="base"><s-stack gap="small" data-explanation="next"><s-heading>What to do</s-heading><s-paragraph>${escape(recommendation)}</s-paragraph>${mission.id==='payment'?`<s-unordered-list><s-list-item><s-text type="strong">Card declined: </s-text>Check whether another payment method is available. A decline does not prove checkout is broken.</s-list-item><s-list-item><s-text type="strong">Provider or setup fault: </s-text>Correct the confirmed fault or contact the provider, then retest.</s-list-item></s-unordered-list>`:''}<s-divider></s-divider><s-text type="strong">Check the fix</s-text><s-paragraph>${escape(ACTION_CHECKS[mission.id])}</s-paragraph>${destination?`<s-button variant="secondary" href="https://admin.shopify.com/store/${STORE.replace(".myshopify.com", "")}/${destination.path}" target="_blank" accessibilityLabel="${destination.label} (opens in a new tab)">${destination.label}</s-button>`:""}</s-stack></s-box>
          </s-grid></s-query-container>
          <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
            <s-button variant="primary" data-mission="${mission.id}" ${mission.count ? "" : "disabled"}>View ${mission.count} affected checkout${mission.count===1?"":"s"}</s-button>
            ${renderDone(mission)}
          </s-stack>

        </s-stack>
      </s-stack>
    </s-section>`;
  }).join("") || `<s-section><s-paragraph>No issues to investigate in these dates.</s-paragraph></s-section>`;
  renderProgress();
}
function applyMissionFilter() {
  const mission = missions.find(item => item.id === selectedMission)??(latestEvidence?buildMissions(filteredEvidence(latestEvidence).events).find(item=>item.id===selectedMission):undefined);
  const finding=selectedFinding?recordedFindings(journeyRows.flatMap(row=>row.events)).find(row=>row.key===selectedFinding):undefined;
  element("mission-filter").hidden = !mission && !selectedFinding;
  if(selectedFinding)text('mission-filter-label',finding?`${finding.label} · ${finding.step}`:'No matching findings in these dates.');
  if (mission) text("mission-filter-label", `${mission.title}: ${mission.count} matching checkout${mission.count===1?"":"s"}`);
  const query = (element('journey-search') as HTMLElementTagNameMap['s-search-field']).value.trim().toLowerCase();
  const status = (element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value;
  const alert = (element('journey-alert-filter') as HTMLElementTagNameMap['s-select']).value;
  const hasFilters = !!mission || !!query || status !== 'all' || alert !== 'all' || !!selectedQuickIssue || !!selectedFinding;
  element('clear-journey-filters').hidden = !hasFilters;
  const sort = (element('journey-sort') as HTMLElementTagNameMap['s-select']).value;
  const filtered = sortJourneys(journeyRows.filter(row =>
    (!mission || mission.sessionIds.includes(row.id)) &&
    (!selectedFinding || !!finding?.sessionIds.includes(row.id)) &&
    (!query || row.id.toLowerCase().includes(query) || row.label.toLowerCase().includes(query)) &&
    (status === 'all' || (status === 'completed' ? row.completed : !row.completed)) &&
    (!selectedQuickIssue || row.shippingBlocker) &&
    (alert === 'all' || (alert === 'any' ? row.categories.length > 0 : alert === 'none' ? row.categories.length === 0 : row.categories.includes(alert)))
  ), sort);
  filteredJourneyRows=filtered;
  renderQuickFilters();
  for(const id of ['export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=!filtered.length||loading;
  const pages = Math.max(1, Math.ceil(filtered.length / JOURNEYS_PER_PAGE));
  journeyPage = Math.min(journeyPage, pages - 1);
  const start = journeyPage * JOURNEYS_PER_PAGE;
  element("journey-list").innerHTML = filtered.slice(start, start + JOURNEYS_PER_PAGE).map(row => row.row).join("");
  const table = element('journey-table') as HTMLElementTagNameMap['s-table'];
  (element('journey-previous') as HTMLElementTagNameMap['s-button']).disabled = journeyPage === 0;
  (element('journey-next') as HTMLElementTagNameMap['s-button']).disabled = journeyPage >= pages - 1;
  table.hidden = filtered.length === 0;
  element('journey-empty').hidden = filtered.length !== 0;
  text('journey-empty', hasFilters ? 'No matching checkouts. Clear filters or try another search.' : 'No checkouts in these dates. Choose another date range.');
  text('journey-page-status', filtered.length ? `${start + 1}–${Math.min(start + JOURNEYS_PER_PAGE, filtered.length)} of ${filtered.length} · Page ${journeyPage + 1}/${pages}` : '0 checkouts');
}
function renderQuickFilters(){
 const query=(element('journey-search') as HTMLElementTagNameMap['s-search-field']).value.trim().toLowerCase();
 const status=(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value;
 const alert=(element('journey-alert-filter') as HTMLElementTagNameMap['s-select']).value;
 const base=journeyRows.filter(row=>(!query||row.id.toLowerCase().includes(query)||row.label.toLowerCase().includes(query))&&(status==='all'||(status==='completed'?row.completed:!row.completed)));
 const choices=[{id:'all',label:'All',count:base.length},...Object.keys(categoryLabels).map(id=>({id,label:issueLabels[id],count:base.filter(row=>row.categories.includes(id)).length})),{id:'shipping_blocker',label:'Shipping unavailable',count:base.filter(row=>row.shippingBlocker).length}].filter(c=>c.id==='all'||c.count);
 element('quick-issue-filters').innerHTML=choices.map(c=>{
  const selected=!selectedMission&&(selectedQuickIssue?c.id===selectedQuickIssue:c.id===alert);
  return `<s-button variant="${selected?'primary':'secondary'}" data-quick-issue="${c.id}" aria-pressed="${selected}">${escape(c.label)} · ${c.count}</s-button>`;
 }).join('');
}
function viewCategory(category:string){
 resetJourneyFilters();
 if(category==='shipping_blocker')selectedQuickIssue=category;
 else (element('journey-alert-filter') as HTMLElementTagNameMap['s-select']).value=category;
 applyMissionFilter();showView('journeys',true);
}
element('quick-issue-filters').addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLElement>('s-button[data-quick-issue]');if(!button)return;
 selectedFinding=null;selectedMission=null;selectedQuickIssue=button.dataset.quickIssue==='shipping_blocker'?'shipping_blocker':null;
 (element('journey-alert-filter') as HTMLElementTagNameMap['s-select']).value=selectedQuickIssue?'all':button.dataset.quickIssue!;
 journeyPage=0;applyMissionFilter();
});
element('error-summary').addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLElement>('[data-diagnostic]');if(button){resetJourneyFilters();selectedFinding=button.dataset.diagnostic!;applyMissionFilter();showView('journeys',true);}});
function openMission(id:MissionId){resetJourneyFilters();selectedMission=id;applyMissionFilter();showView('journeys',true);}
element('fix-history-content').addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLElement>('[data-history-mission]');if(button)openMission(button.dataset.historyMission as MissionId);});
function exportFiltered(events:boolean){
 if(!filteredJourneyRows.length)return;
 const content=events?checkoutEventsCSV(filteredJourneyRows):checkoutCSV(filteredJourneyRows,storeCurrency);
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download=`jimmys-bakery-${events?'events':'checkouts'}-${selectedRange}.csv`;link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 text('export-status',`Exported ${filteredJourneyRows.length} filtered checkout${filteredJourneyRows.length===1?'':'s'}${events?' with their recorded events':''}.`);
}
element('export-checkouts').addEventListener('click',()=>exportFiltered(false));
element('export-events').addEventListener('click',()=>exportFiltered(true));
function resetJourneyFilters() {
  selectedMission = null;selectedQuickIssue=null;selectedFinding=null;
  (element('journey-search') as HTMLElementTagNameMap['s-search-field']).value = '';
  (element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value = 'all';
  (element('journey-alert-filter') as HTMLElementTagNameMap['s-select']).value = 'all';
  journeyPage = 0;
}
for (const id of ['clear-mission-filter','clear-journey-filters']) element(id).addEventListener('click', () => {resetJourneyFilters(); applyMissionFilter();});
element('journey-search').addEventListener('input', () => {journeyPage = 0; applyMissionFilter();});
for (const id of ['journey-status-filter','journey-alert-filter','journey-sort']) element(id).addEventListener('change', () => {if(id==='journey-alert-filter'){selectedQuickIssue=null;selectedFinding=null;}journeyPage = 0; applyMissionFilter();});
element("mission-list").addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-mission]");
  const toggle = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-toggle-action]");
  if (toggle) { togglePanel(toggle, `body-${toggle.dataset.toggleAction}`); const metrics=element(`metrics-${toggle.dataset.toggleAction}`);metrics.hidden=element(`body-${toggle.dataset.toggleAction}`).hidden; toggle.setAttribute("accessibilityLabel", `${element(`body-${toggle.dataset.toggleAction}`).hidden ? "Show" : "Hide"} details: ${missions.find(item=>item.id===toggle.dataset.toggleAction)!.title}`); return; }
  if (!target) return;
  resetJourneyFilters();
  selectedMission = target.dataset.mission as MissionId;
  journeyPage = 0;
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
element('recovery-library-button').addEventListener('click',()=>{
  const panel=element('recovery-library');panel.hidden=!panel.hidden;
  element('recovery-library-button').setAttribute('aria-expanded',String(!panel.hidden));
});
element('recovery-library').innerHTML=RECOVERY_CASES.map(item=>`<s-section><s-stack gap="small"><s-heading>${escape(item.title)}</s-heading><s-badge tone="neutral">${item.mechanism==='functional'?'Possible buying blocker':item.mechanism==='expectation'?'Customer expectations':item.mechanism==='friction'?'Checkout friction':'Cause unconfirmed'}</s-badge><s-paragraph>${escape(item.psychology)}</s-paragraph><s-paragraph><s-text type="strong">Evidence: </s-text>${escape(item.signal)}</s-paragraph><s-paragraph><s-text type="strong">Next action: </s-text>${escape(item.action)}</s-paragraph><s-paragraph color="subdued"><s-text type="strong">Estimated recovery: </s-text>${escape(item.estimate)}</s-paragraph></s-stack></s-section>`).join('');
element("retry-progress").addEventListener("click", () => { void loadProgress(); });
let alertSource:EvidenceResponse|null=null,checkingAlerts=false;
let alertPreferences={shipping:true,spikes:true},dismissedAlertKeys:string[]=[],alertStorageAvailable=true;
try{
 const saved=JSON.parse(localStorage.getItem('checkout-alert-preferences')??'{}');
 alertPreferences={shipping:saved.shipping!==false,spikes:saved.spikes!==false};
 const dismissed=JSON.parse(localStorage.getItem('checkout-dismissed-alerts')??'[]');
 dismissedAlertKeys=Array.isArray(dismissed)?dismissed.filter((key:unknown)=>typeof key==='string').slice(-48):[];
}catch{alertStorageAvailable=false;}
(element('shipping-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked=alertPreferences.shipping;
(element('spike-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked=alertPreferences.spikes;
(element('check-alerts') as HTMLElementTagNameMap['s-button']).disabled=!alertPreferences.shipping&&!alertPreferences.spikes;
function renderFocusedAlerts(data:EvidenceResponse){
 alertSource=data;
 const boundaries=Object.fromEntries(appliedFixes.map(f=>[f.missionId,f.retestedAt??f.appliedAt]));
 const list=focusedAlerts(data.events,Date.now(),data.truncated,boundaries).filter(a=>!dismissedAlertKeys.includes(a.key)&&(a.category==='shipping_blocker'?alertPreferences.shipping:alertPreferences.spikes));
 element('focused-alert-list').innerHTML=!alertPreferences.shipping&&!alertPreferences.spikes?'<s-paragraph>Alerts are paused. Enable an alert type to resume checks.</s-paragraph>':alertsMarkup(list);
 text('alerts-tab',list.length?`Alerts (${list.length})`:'Alerts');
 text('alerts-checked-at',`Last checked ${time(data.sampledAt)}`);
 if(!alertStorageAvailable)text('alert-preference-note','Preferences and dismissals last for this session; browser storage is unavailable.');
}
async function checkFocusedAlerts(){
 if(checkingAlerts||loading||openOverlays.size>0||!latestEvidence||!alertPreferences.shipping&&!alertPreferences.spikes)return;
 checkingAlerts=true;(element('check-alerts') as HTMLElementTagNameMap['s-button']).loading=true;
 try{
  const response=embeddedShopify?await shopifyRequest('evidence'):await fetch(`${backendOrigin}/api/test-evidence?start=${dateBounds(selectedRange).start}&end=${dateBounds(selectedRange).end}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error();const data:EvidenceResponse=await response.json();if(data.store!==STORE||!Array.isArray(data.events))throw Error();
  renderFocusedAlerts(data);element('alerts-error').hidden=true;
 }catch{element('alerts-error').hidden=false;}
 finally{checkingAlerts=false;(element('check-alerts') as HTMLElementTagNameMap['s-button']).loading=false;}
}
for(const id of ['shipping-alerts-enabled','spike-alerts-enabled'])element(id).addEventListener('change',()=>{
 alertPreferences={shipping:(element('shipping-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked,spikes:(element('spike-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked};
 try{localStorage.setItem('checkout-alert-preferences',JSON.stringify(alertPreferences));}catch{alertStorageAvailable=false;}
 if(alertSource)renderFocusedAlerts(alertSource);
 (element('check-alerts') as HTMLElementTagNameMap['s-button']).disabled=!alertPreferences.shipping&&!alertPreferences.spikes;
});
element('focused-alert-list').addEventListener('click',async event=>{
 const dismiss=(event.target as HTMLElement).closest<HTMLElement>('[data-dismiss-alert]');
 if(dismiss){dismissedAlertKeys=[...new Set([...dismissedAlertKeys,dismiss.dataset.dismissAlert!])].slice(-48);try{localStorage.setItem('checkout-dismissed-alerts',JSON.stringify(dismissedAlertKeys));}catch{alertStorageAvailable=false;}if(alertSource)renderFocusedAlerts(alertSource);return;}
 const button=(event.target as HTMLElement).closest<HTMLElement>('[data-alert-category]');
 if(button){await loadEvidence(true);viewCategory(button.dataset.alertCategory!);}
});
element('check-alerts').addEventListener('click',()=>void checkFocusedAlerts());
window.setInterval(()=>{if(document.visibilityState==='visible')void checkFocusedAlerts();},60000);
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
function renderOrderPattern(data:EvidenceResponse){
  const snapshot=latestEvidence?.shopifySnapshot??data.shopifySnapshot;
  const pattern=snapshot?orderPattern(snapshot.orders,snapshot.periodStart,snapshot.syncedAt,snapshot.timeZone??'UTC'):data.orderPatterns;
  element('order-chart-content').hidden=!pattern;
  element('order-chart-empty').hidden=!!pattern;
  if(!pattern)return;
  element('order-chart-viz').setAttribute('aria-label',`Hourly paid orders on ${pattern.day} compared with ${pattern.baselineDays} matching weekdays from the previous 30 days, in ${pattern.timeZone}`);
  element('order-chart-error').hidden=true;
  void import('./orderChart').then(({renderOrderChart})=>renderOrderChart(element('order-chart-viz'),pattern)).catch(()=>{
    text('order-chart-error','The chart could not load. Reload the page to try again.');element('order-chart-error').hidden=false;
  });
}
function render(data: EvidenceResponse) {
  renderOrderPattern(data);
  const updated=data.shopifySnapshot?.syncedAt??data.abandonedBasketSummary?.syncedAt??data.sampledAt;
  text('store-meta',`Store: ${data.store.replace('.myshopify.com','')} · Updated ${time(updated)}`);
  element('error-summary').innerHTML=diagnosticsMarkup(data.events);
  element('fix-history-content').innerHTML=historyMarkup(fixHistory,latestEvidence?.events??data.events,fixesReady);
  renderFocusedAlerts(latestEvidence??data);
  // Match the selected journey against the full synced records, even when its
  // order/contact date falls outside the journey start-date filter.
  const nativeSnapshot=latestEvidence?.shopifySnapshot??data.shopifySnapshot;
  storeCurrency=data.shopifySnapshot?.currency??data.abandonedBasketSummary?.currency??'USD';
  text('report-currency',`Reporting currency: ${storeCurrency}. Synced purchases use Shopify's store-currency amounts. Item conversions require matching Shopify checkout amounts.`);
  const baskets=checkoutBaskets(nativeSnapshot?.abandoned??[],latestEvidence?.checkoutPrices??data.checkoutPrices??[],storeCurrency);
  abandonedCheckouts=linkedAbandoned(data.abandonedCheckouts??null,baskets,storeCurrency);
  const summary = summarize(data.events);
  element("catalog-summary").hidden=!!abandonedCheckouts;
  element("abandoned-value-metric").hidden=!abandonedCheckouts;
  element("catalog-metrics").setAttribute("gridTemplateColumns",abandonedCheckouts ? "@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" : "@container (inline-size > 600px) 1fr 1fr, 1fr");
  renderCatalog(storeCurrency==='USD'?data.catalogModel??null:null,data.events,data.truncated,storeCurrency==='USD'?data.observedPurchases??null:null);
  syncedPurchasesShown=false;
  if(data.shopifySnapshot)renderSyncedPurchases(data.shopifySnapshot);
  else if(!data.observedPurchases){
    text('catalog-aov-label','Average test order value');text('catalog-aov','Unknown');
    text('catalog-method','No purchases recorded in these dates.');
  }
  if(data.shopifySnapshot){
    const snapshot=data.shopifySnapshot,unpaid=snapshot.abandoned.filter(row=>!row.recovered),priced=unpaid.map(row=>row.totalCents===undefined?row.subtotalCents:row.totalCents).filter((value):value is number=>value!==null);
    text('shopify-records',`${snapshot.orders.length} orders · ${unpaid.length} abandoned checkouts in the selected dates. Recorded basket value: ${priced.length?money(priced.reduce((sum,value)=>sum+value,0)):'Unknown'}. Separate from the tracked checkout baskets below.`);
    element('shopify-records').hidden=false;
  }
  {
    const {start,end}=dateBounds(selectedRange);
    const aggregate=data.shopifySnapshot?abandonedSummary(data.shopifySnapshot.abandoned,start,end):data.abandonedBasketSummary;
    const current=aggregate&&aggregate.rangeStart===start&&aggregate.rangeEnd===end?aggregate:null;
    element("catalog-summary").hidden=true;
    element("abandoned-value-metric").hidden=false;
    element("catalog-details-button").hidden=true;
    element("catalog-details").hidden=true;
    element("catalog-metrics").setAttribute("gridTemplateColumns","@container (inline-size > 600px) 1fr 1fr 1fr, 1fr");
    text("abandoned-value-label","Total abandoned basket value");
    text("abandoned-value",current?.totalCents!=null?money(current.totalCents):"Unknown");
    text("catalog-aov-label","Abandoned checkouts");
    text("catalog-aov",current?current.count:"Unknown");
    text("catalog-recovery-label","Average abandoned basket value");
    text("catalog-recovery",current?.averageCents!=null?money(current.averageCents):"—");
    element("catalog-recovery").setAttribute("tone","auto");
    element("catalog-dedup").hidden=true;
    text("abandoned-count",current?.unpricedCount?`${current.unpricedCount} baskets without a recorded value`:"");
    element("abandoned-count").hidden=!current?.unpricedCount;
    text("abandoned-heading","Abandoned checkout");
  }
  text("session-count", summary.sessionCount);
  text("completed-count", summary.completed);
  text("incomplete-count", summary.noCompletionObserved);
  text("event-count", summary.eventCount);
  text("stored-count", data.totalStored);
  text("collection-state", data.enabled ? "Enabled" : "Paused");
  text("request-status",'');element('request-status').hidden=true;
  text("coverage-note", `${data.truncated ? `Partial view: only the latest ${EVIDENCE_EVENT_LIMIT.toLocaleString()} events are available. Earlier session steps may be missing.` : "Checkouts are grouped by their start date in the selected period."} Later recorded completions are retained. A missing completion is not proof of abandonment.`);
  element("open-journeys").toggleAttribute("disabled", summary.sessionCount === 0);

  if (!data.enabled) {
    text("summary-title", "Test collection is paused");
    text("summary-description", "The backend is ready. Connect the Shopify test pixel and enable collection before starting your checkout tests.");
  } else if (summary.sessionCount === 0) {
    text("summary-title", "No checkouts in these dates");
    text("summary-description", "Choose another date range to see checkout activity.");
  } else {
    text("summary-title", `${summary.sessionCount} test checkout${summary.sessionCount === 1 ? "" : "s"} observed`);
    text("summary-description", "Open a checkout to review its activity.");
  }

  const hasSessions=summary.sessionCount>0;
  element("summary-title").hidden=hasSessions;
  element("completion-summary").hidden=!hasSessions;
  element("summary-description").hidden=hasSessions;
  text("completion-label",`${summary.completed} of ${summary.sessionCount} · ${hasSessions ? Math.round(summary.completed/summary.sessionCount*100) : 0}%`);
  element("completion-progress").setAttribute("max",String(Math.max(1,summary.sessionCount)));
  element("completion-progress").setAttribute("value",String(summary.completed));
  element("completion-progress").setAttribute("accessibilityLabel",`${summary.completed} of ${summary.sessionCount} checkouts recorded completion`);
  journeyRows = summary.journeys.reverse().map(session => {
    const alerts = session.events.filter(event => event.name === "alert_displayed" && event.category);
    const detail = describeJourney(session.events);
    const status = session.completed ? (detail.outcome === "Completed after an observed error" ? "Completed after an error" : "Completed") : "Unfinished";
    const basketCents = journeyPrice(session.id,session.completed,session.events,storeCurrency,nativeSnapshot?.orders??[],baskets,(data.abandonedCheckouts?.records??[]).filter(row=>row.currency===storeCurrency&&row.sessionId).map(row=>({...row,sessionId:row.sessionId!})),(latestEvidence?.checkoutPrices??data.checkoutPrices??[]).filter(row=>row.currency===storeCurrency));
    const label = journeyLabel(session.id, nativeSnapshot?.orders ?? []);
    const orderHref = journeyOrderHref(session.id, nativeSnapshot?.orders ?? []);
    const row = `<s-table-row data-session="${escape(session.id)}">
      <s-table-cell>${orderHref ? `<s-link href="${escape(orderHref)}" target="_top" accessibilityLabel="Open ${escape(label)} in Shopify">${escape(label)}</s-link>` : `<s-text type="strong">${escape(label)}</s-text>`}</s-table-cell>
      <s-table-cell>${escape(journeyDate(session.events[0].timestamp))}</s-table-cell>
      <s-table-cell><s-badge tone="${session.completed ? "success" : "neutral"}">${status}</s-badge></s-table-cell>
      <s-table-cell>${escape(lastObservedStep(session.events))}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center">${detail.categories.length ? detail.categories.map(category => `<s-badge tone="${category === "validation" ? "caution" : "neutral"}">${escape(categoryLabels[category])}</s-badge>`).join("") : '<s-text color="subdued">No errors recorded</s-text>'}</s-stack></s-table-cell>
      <s-table-cell>${basketCents===undefined ? "Unknown" : escape(money(basketCents))}</s-table-cell>
      <s-table-cell><s-button variant="secondary" data-journey="${escape(session.id)}" accessibilityLabel="Show details: ${escape(label)}">Show details</s-button></s-table-cell>
    </s-table-row>`;
    const timing=`<s-stack gap="small"><s-heading>Time between checkout steps</s-heading><s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="small">${stepTimings(session.events).map(t=>`<s-stack gap="small"><s-text type="strong">${t.step}</s-text><s-text>${durationText(t.seconds)}</s-text><s-text color="subdued">${t.note}</s-text></s-stack>`).join('')}</s-grid></s-query-container><s-text color="subdued">Intervals between recorded events; they do not measure time spent typing in a field.</s-text></s-stack><s-divider></s-divider>`;
    const timeline = timing+`          <s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Recorded events</s-heading><s-text color="subdued">${journeyDuration(session.events)} · ${session.events.length} ${session.events.length === 1 ? "event" : "events"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}</s-text></s-stack>
          <s-stack gap="none" accessibilityRole="ordered-list" accessibilityLabel="Recorded checkout events, oldest first">
            ${session.events.map((event, eventIndex) => `<s-grid gridTemplateColumns="24px 1fr auto" gap="base" accessibilityRole="list-item">
              <s-box data-timeline-marker="${event.name === "checkout_completed" ? "completed" : "neutral"}" data-first="${eventIndex === 0}" data-last="${eventIndex === session.events.length - 1}" accessibilityVisibility="hidden"></s-box>
              <s-stack direction="inline" gap="small" paddingBlock="small-100" alignItems="center">
                <s-text>${escape(eventLabels[event.name])}</s-text>
                ${event.category ? `<s-badge tone="${event.shippingBlocker ? "critical" : event.category === "validation" ? "caution" : "neutral"}">${event.shippingBlocker ? "Shipping unavailable" : escape(categoryLabels[event.category])}</s-badge>` : ""}
              </s-stack>
              <s-box paddingBlock="small-100">
                <s-text color="subdued">${escape(time(event.timestamp).replaceAll(" ", "\u00a0"))}</s-text>
              </s-box>
            </s-grid>`).join("")}
          </s-stack>`;
    return {events:session.events,shippingBlocker:session.events.some(e=>e.shippingBlocker==='no_shipping_available'),startedAt:session.events[0].timestamp,basketCents,id:session.id,label,completed:session.completed,categories:detail.categories,row,timeline};
  });
  renderMissions(data.events);
  applyMissionFilter();
}

const embeddedShopify = location.pathname === '/api/shopify/app';
async function shopifyRequest(path:string,method='GET') {
  const bridge=(window as unknown as {shopify?:{idToken:()=>Promise<string>}}).shopify;
  if(!bridge)throw Error('Open this app inside Shopify admin.');
  const token=await bridge.idToken();
  const response=await fetch(`${backendOrigin}/api/shopify/${path}`,{method,headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(90000)});
  if(!response.ok){
    const body=await response.json().catch(()=>null);
    const reasons=['Shopify authorization failed. Check installation and permissions.','Install the requested Shopify permissions first.','Shopify could not return data. Check permissions and retry; previous results are retained.','Unexpected store or missing Shopify permissions.'];
    const safeBlock=typeof body?.error==='string'&&/^Shopify blocked (abandoned checkouts|orders|app settings): (protected customer data approval required|access denied|query rejected)\.$/.test(body.error);
    text('shopify-status',response.status===401 ? 'Shopify sign-in verification failed. Check that the Convex settings belong to keval-test-app.' : reasons.includes(body?.error)||safeBlock?body.error:`${path==='sync'?'Shopify data refresh':'Shopify request'} failed (${response.status}).`);
    throw Error('Shopify connection needs attention.');
  }
  return response;
}
if(embeddedShopify){
  for(const name of dashboardViews){
    const button=element(`${name}-tab`);button.setAttribute('variant','secondary');button.setAttribute('slot','secondary-actions');
    document.querySelector('s-page')!.append(button);
  }
  element('view-navigation').hidden=true;
  element('shopify-connection').hidden=false;
  element('enable-pixel').addEventListener('click',async()=>{
    const button=element('enable-pixel');button.setAttribute('loading','');button.setAttribute('disabled','');
    try{await shopifyRequest('pixel/enable','POST');text('shopify-status','Connected to build-sprint-demo · Checkout collection enabled');}
    catch{text('shopify-status','Collection could not be enabled. Check the released extension and Shopify permissions.');}
    finally{button.removeAttribute('loading');button.removeAttribute('disabled');}
  });
}
let loading = false;
async function loadEvidence(background=false) {
  if (loading||background&&openOverlays.size>0) return;
  loading = true;
  if(!background)setLoadingControls(true);
  if(!background)element("request-error").hidden = true;
  if(!background){text("request-status", "Loading checkouts…");element('request-status').hidden=false;}
  try {
    if(embeddedShopify&&!background){
      await shopifyRequest('sync','POST');
      text('shopify-status','Connected to build-sprint-demo · Read-only Shopify data');
    }
    const response = embeddedShopify ? await shopifyRequest('evidence') : await fetch(`${backendOrigin}/api/test-evidence?start=${dateBounds(selectedRange).start}&end=${dateBounds(selectedRange).end}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Could not read checkout evidence.");
    const data: EvidenceResponse = await response.json();
    if (data.store !== STORE || !Array.isArray(data.events)) throw new Error("Unexpected evidence response.");
    latestEvidence=data;
    try{await fixRequest('read');fixError='';element('action-save-error').hidden=true;}catch{fixesReady=false;fixError='Action status could not load. Try loading the data again before making changes.';text('action-save-error',fixError);element('action-save-error').hidden=false;}
    render(filteredEvidence(data));
    if(embeddedShopify){
      const snapshot=filteredEvidence(data).shopifySnapshot;
      if(snapshot){
        const unpaid=snapshot.abandoned.filter(r=>!r.recovered),priced=unpaid.map(row=>row.totalCents===undefined?row.subtotalCents:row.totalCents).filter((value):value is number=>value!==null);
        text('shopify-records',`${snapshot.orders.length} orders · ${unpaid.length} abandoned checkouts in the selected dates. Recorded basket value: ${priced.length ? money(priced.reduce((sum,value)=>sum+value,0)) : 'Unknown'}. Separate from the tracked checkout baskets below.`);
        element('shopify-records').hidden=false;
      }
    }
  } catch {
    if(background)return;
    element("request-error").hidden = false;
    element("request-error").innerHTML='<s-paragraph>Check your connection and try again. Previous results have not been updated.</s-paragraph><s-button data-retry-evidence variant="secondary">Try again</s-button>';
    text("request-status", "Evidence could not be refreshed.");
  } finally {
    loading = false;setLoadingControls(false);
  }
}
function setLoadingControls(busy:boolean){
  for(const id of ['export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=busy||!filteredJourneyRows.length;
  (element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=busy||fixSaving;
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-button']>('s-button[data-fix-refresh]').forEach(button=>{button.disabled=busy||fixSaving;button.loading=busy;});
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-button']>('s-button[data-fix]').forEach(button=>{button.disabled=busy||fixSaving||!fixesReady;});
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-checkbox']>('s-checkbox[data-fix-done]').forEach(input=>{input.disabled=busy||fixSaving||!fixesReady||(!embeddedShopify&&!viewerId);});
}
element('request-error').addEventListener('click',event=>{if((event.target as HTMLElement).closest('[data-retry-evidence]'))void loadEvidence();});
element("journey-list").addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-journey]");
  const journey = journeyRows.find(row => row.id === button?.dataset.journey);
  if (!journey) return;
  const modal = element('journey-modal') as HTMLElementTagNameMap['s-modal'];
  modal.heading = journey.label;
  element('journey-modal-content').innerHTML = journey.timeline;
  modal.showOverlay();
});
element('journey-next').addEventListener('click', () => {
  journeyPage++; applyMissionFilter();
  element('journey-page-status').scrollIntoView({block:'nearest'});
});
element('journey-previous').addEventListener('click', () => {
  journeyPage = Math.max(0, journeyPage - 1); applyMissionFilter();
  element('journey-page-status').scrollIntoView({block:'nearest'});
});
// Register component setters before applying saved checkbox values.
await Promise.all(["s-search-field", "s-select", "s-modal", "s-checkbox", "s-button", "s-section", "s-badge", "s-table", "s-table-header", "s-table-header-row", "s-table-body", "s-table-row", "s-table-cell"].map(tag => customElements.whenDefined(tag)));
await customElements.whenDefined('s-date-picker');
const datePicker=element('date-range-picker') as HTMLElementTagNameMap['s-date-picker'];
datePicker.value=selectedRange;datePicker.allow=recentRange(30);
for(const days of [7,30])element(`last-${days}-days`).addEventListener('click',()=>{datePicker.value=recentRange(days);});
element('apply-date-range').addEventListener('click',event=>{
  try{
    const bounds=dateBounds(datePicker.value),available=dateBounds(recentRange(30));
    if(bounds.start<available.start||bounds.end>available.end)throw Error('Choose dates within the last 30 days.');
    if(loading||fixSaving){event.preventDefault();event.stopImmediatePropagation();return;}
    updateDateSelection(datePicker.value);element('date-range-error').hidden=true;
    window.setTimeout(()=>void loadEvidence(),0);
  }catch(error){event.preventDefault();event.stopImmediatePropagation();text('date-range-error',error instanceof Error?error.message:'Choose valid dates.');element('date-range-error').hidden=false;}
},{capture:true});
void loadProgress();
void loadEvidence();

// The backend sync runs even when the merchant closes the app. This read-only
// refresh updates an open overview without starting another Shopify sync.
window.setInterval(()=>{
 if(document.visibilityState==='visible'&&!fixSaving&&!element('overview').hidden)void loadEvidence(true);
},60000);
