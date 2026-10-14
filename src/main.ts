/// <reference types="@shopify/polaris-types" />
import {checkoutTrends,type CheckoutTrend} from '../shared/checkoutTrends';
import {checkoutTrendsMarkup} from './checkoutTrends';
import {appPages,appPageAt,appPageHref,type AppPage} from '../shared/appPages';
import {isFixMission} from '../shared/fixTracking';
let trends:CheckoutTrend[]=[];
let selectedTrend:string|null=null;
let trendHealthy:boolean|undefined;
import {bindChartHelp} from './chartHelp';
import {baselineCopy,fixOutcomeCopy,storeAccessErrorCopy} from './dashboardCopy';
import {shopifyRequestInit} from '../shared/shopifyRequest';
import {simulationRecords} from '../shared/simulationDashboard';
import {prepareEvidence,prepareFixes,type EvidenceResponse} from '../shared/evidenceResponse';
import {monitoringHealth,type MonitoringHealth} from '../shared/monitoringHealth';
import {outcomeLabel,type OutcomeFacts,type CheckoutOutcome} from '../shared/checkoutOutcome';
import {actionValues} from '../shared/actionValues';
import {checkoutBaskets} from '../shared/checkoutPrice';
import "./style.css";
import {lastObservedStep,stepTimings,durationText,focusedAlerts,issueLabels} from '../shared/dashboardInsights';
import {checkoutCSV,checkoutEventsCSV} from '../shared/checkoutExport';
import {historyMarkup,alertsMarkup,type FixHistoryRow} from './dashboardPanels';
import {abandonedPattern} from '../shared/abandonedPattern';
import {orderPattern} from "../shared/orderPattern";
import {buildRecommendations} from "../shared/recommendations";
import {fixResults,fixAssessment,retestResults,actionState,type AppliedFix} from "../shared/fixTracking";
import {recentRange,dateBounds,checkoutCohort} from '../shared/dateRange';
import {inventoryValue} from '../shared/inventoryValue';
import {formatMoney} from '../shared/money';
import {abandonedSummary} from "../shared/abandonedSummary";
import {renderFunnel} from './checkoutFunnel';
import {funnelFilters,type FunnelFilter} from '../shared/checkoutFunnel';
let funnelFilter:FunnelFilter='all';
import {journeyLabel,journeyOrderHref} from "../shared/journeyLabel";
import {filterJourneyRows,paginateRows} from "../shared/journeyTable";
import {journeyDate} from "../shared/journeyDate";
import {journeyPrice} from "../shared/journeyPrice";
import {journeyDuration} from "../shared/journeyDuration";
import {browserBackendOrigin,deployment} from '../shared/deployment';
import { STORE, summarize, describeJourney } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";
import { ACTION_CHECKS, ACTION_DESTINATIONS, buildMissions, missionRecommendation, missionSignal, isViewerId } from "../shared/actions";
import type { Mission, MissionId } from "../shared/actions";

declare global { interface ImportMeta { readonly env: Record<string, string | undefined> } }
function outcomeFacts(data:EvidenceResponse|null):OutcomeFacts {
  // Public demo responses contain no private identity-linked server facts.
  return {orders:data?.shopifySnapshot?.orders??[],prices:data?.checkoutPrices??[]};
}
const element = (id: string) => document.getElementById(id)!;
const text = (id: string, value: string | number) => { element(id).textContent = String(value); };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const time = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const eventLabels: Record<CheckoutEvent["name"], string> = {
  checkout_started: "Checkout started", checkout_contact_info_submitted: "Contact information submitted",
  checkout_address_info_submitted: "Address information submitted", checkout_shipping_info_submitted: "Shipping information submitted",
  payment_info_submitted: "Payment information submitted", checkout_completed: "Checkout completed", alert_displayed: "Checkout alert displayed", ui_extension_errored: "Checkout app failed to load",
};
const backendOrigin = browserBackendOrigin(location);
let selectedRange=recentRange(30);
const openOverlays=new Set<string>();
for(const id of ['date-range-popover','journey-modal','export-menu','insight-method']){
 element(id).addEventListener('show',()=>openOverlays.add(id));
 element(id).addEventListener('hide',()=>openOverlays.delete(id));
}
let latestEvidence:EvidenceResponse|null=null;
let latestEvidenceRange:string|null=null;
let evidenceReadFailed=false;
function currentMonitoring():MonitoringHealth {
 const data=latestEvidence;
 return monitoringHealth({evidence:data?.monitoring?{...data.monitoring,historyUnavailable:data.monitoring.historyUnavailable||!fixesReady}:null,events:data?checkoutCohort(data.events,selectedRange):[],sampledAt:data?.sampledAt,readFailed:evidenceReadFailed,truncated:data?.truncated||!!data&&latestEvidenceRange!==selectedRange,rangeStart:dateBounds(selectedRange).start,now:Date.now()});
}
function renderMonitoring(){
 const health=currentMonitoring();
 const snapshot=latestEvidence?.shopifySnapshot;
 const pattern=snapshot?orderPattern(snapshot.orders,snapshot.periodStart,snapshot.syncedAt,snapshot.timeZone??'UTC'):latestEvidence?.orderPatterns;
 const abandoned=pattern?abandonedPattern(snapshot?.abandoned??null,pattern):null;
 text('chart-data-detail',latestEvidence?.events.some(e=>e.simulated)?'Recorded completions and abandoned checkouts, grouped by hour in India time.':abandoned?.observed?'Abandoned checkout counts may be incomplete.':'No abandoned checkout data is available for this day.');
 text('data-availability',latestEvidence&&latestEvidenceRange!==selectedRange?'Results for these dates are not current yet.':health.canAssess?'Showing saved checkout activity.':health.state==='Needs attention'?'Data may be out of date. Results are not verified.':health.state==='Partial'?'Some data is missing. Results are not verified.':'Waiting for enough checkout activity to assess results.');
 return health;
}
const chartHelp=bindChartHelp(element('order-chart-help'),element('order-chart-tooltip'),document,open=>{if(open)openOverlays.add('chart-help');else openOverlays.delete('chart-help');});
function tickMonitoring(){
 const health=renderMonitoring();
 if(latestEvidence&&trendHealthy!==health.canAssess)renderMissions(filteredEvidence(latestEvidence).events);
 document.querySelectorAll<HTMLElement>('[data-fix-outcome]').forEach(node=>{const fix=appliedFixes.find(f=>f.missionId===node.dataset.fixOutcome);if(fix)node.textContent=fixOutcomeCopy(fix,latestEvidence?.events??[],Date.now(),health,outcomeFacts(latestEvidence));});
 document.querySelectorAll<HTMLElement>('[data-current-assessment]').forEach(node=>{node.hidden=!health.canAssess;});
 document.querySelectorAll<HTMLElement>('[data-assessment-unavailable]').forEach(node=>{node.hidden=health.canAssess;});
 text('alerts-checked-at',health.canAssess?'Checked using saved checkout activity.':'Not enough current data to assess alerts.');
}
function filteredEvidence(data:EvidenceResponse):EvidenceResponse{
  const {start,end}=dateBounds(selectedRange);
  const within=(value:string)=>{const at=Date.parse(value);return at>=start&&at<end;};
  return {...data,events:checkoutCohort(data.events,selectedRange),
    shopifySnapshot:data.shopifySnapshot?{...data.shopifySnapshot,orders:data.shopifySnapshot.orders.filter(row=>within(row.createdAt)),abandoned:data.shopifySnapshot.abandoned.filter(row=>within(row.createdAt))}:null};
}
function updateDateSelection(value:string){
  chartHelp.dismiss();
  selectedRange=value;
  journeyPage=0;
  const label=value===recentRange(30)?'Last 30 days':value===recentRange(7)?'Last 7 days':[...new Set(value.split('--').map(date=>new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})))].join(' – ');
  for(const id of ['date-range-button','journey-date-range-button'])text(id,label);
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
let selectedAlertCategory='all';
let fixHistory:FixHistoryRow[]=[];
let journeyRows: {events:CheckoutEvent[];shippingBlocker:boolean;startedAt: number; basketCents?: number; id: string; label: string; completed: boolean; outcome:CheckoutOutcome; categories: string[]; row: string; timeline: string}[] = [];
let viewerId: string | null = null;
try {
  const stored = localStorage.getItem("checkout-demo-viewer");
  viewerId = isViewerId(stored) ? stored : [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("checkout-demo-viewer", viewerId);
} catch { /* Checklist remains disabled; viewing evidence still works. */ }
const categoryLabels = { discount: "Discount or gift card", payment: "Payment", delivery: "Shipping", validation: "Form errors", inventory: "Item availability", extension: "Checkout app failed" };

const dashboardViews=["overview","journeys","history","alerts"] as const;
function activateView(view: AppPage, focus = false) {
  for (const name of dashboardViews) {
    element(name).hidden = name !== view;
    element(`${name}-tab`).setAttribute("aria-pressed", String(name === view));
    element(`${name}-tab`).setAttribute("variant", !embeddedShopify&&name === view ? "primary" : "secondary");
  }
  if (embeddedShopify) document.querySelector('s-page')!.setAttribute('heading',appPages[view].title);
  if (focus&&!embeddedShopify) element(`${view}-tab`).focus();
}
function showView(view:AppPage,focus=false){
  activateView(view,focus);
  if(embeddedShopify)window.open(pageHref(view),'_self');
}
function pageHref(view:AppPage){
  return appPageHref(view,{range:selectedRange,...(view==='journeys'?{
    mission:selectedMission,trend:selectedTrend,issue:selectedQuickIssue,
    category:selectedAlertCategory==='all'?null:selectedAlertCategory,
    q:(element('journey-search') as HTMLElementTagNameMap['s-search-field']).value,
    status:(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value,
    sort:(element('journey-sort') as HTMLElementTagNameMap['s-select']).value,
  }: {})});
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
  const results=fixResults(fix,latestEvidence?.events??[],Date.now(),outcomeFacts(latestEvidence));
  const retest=retestResults(fix,latestEvidence?.events??[],Date.now());
  const health=currentMonitoring();
  const assessment=fixAssessment(fix,latestEvidence?.events??[],Date.now(),health,outcomeFacts(latestEvidence));
  const checked=fix.retestedAt!==undefined;
  const retestPanel=mission.id==='unfinished'?'':`<s-stack gap="small"><s-stack direction="inline" gap="small" alignItems="center">${checked?`<s-badge tone="${retest?.returned?'caution':'neutral'}">${retest?.returned?'Alerts after retest':'Retest reported'}</s-badge><s-text color="subdued">Reported by ${embeddedShopify?'your team':'this demo viewer'} · ${escape(time(fix.retestedAt!))}</s-text>`:'<s-text>Repeat the affected checkout and confirm the problem no longer appears.</s-text>'}</s-stack>${retest?.returned?`<s-text>${retest.returned} checkout${retest.returned===1?'':'s'} recorded matching alerts after the retest. Check again.</s-text>`:''}<s-stack direction="inline" gap="small"><s-button data-fix="${mission.id}" data-fix-operation="retest" variant="secondary" ${!fixesReady||fixSaving||loading?'disabled':''}>${checked?'Record another successful retest':'Record successful retest'}</s-button>${checked?`<s-button data-fix="${mission.id}" data-fix-operation="undo-retest" variant="tertiary" ${fixSaving||loading?'disabled':''}>Undo retest</s-button>`:''}</s-stack></s-stack>`;
  const rate=(n:number,d:number)=>d?`${Math.round(n/d*100)}% (${n}/${d})`:'No checkouts yet';
  const returned = actionState(fix, latestEvidence?.events??[], Date.now()).returned;
  const resultMessage = !assessment.canAssess
    ? `Result not verified: ${!health.canAssess||fix.partial?"data is limited":"waiting for more checkout activity"}.`
    : returned
    ? `${returned} checkout${returned===1?'':'s'} had new alerts since your last check. Review the fix.`
    : !results.after.checkouts && !results.affectedCompleted
      ? 'Waiting for checkout activity to check the result.'
      : mission.id==='unfinished'
        ? 'Review completed checkouts below and check any that still stop progressing.'
        : 'No new matching alerts recorded since your last check. Keep checking new checkouts.';
  return `<s-divider></s-divider><s-stack gap="base"><s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Activity after marking done</s-heading></s-stack>
    ${retestPanel}
    <s-paragraph data-assessment-unavailable ${health.canAssess?'hidden':''}>Result not verified: data is limited.</s-paragraph>
    <s-stack gap="base" data-current-assessment ${health.canAssess?'':'hidden'}>
    <s-banner tone="${returned?'warning':'info'}"><s-paragraph>${escape(resultMessage)}</s-paragraph></s-banner>
    <s-text color="subdued">Marked ${escape(time(fix.appliedAt))} · Before: 30 days · After: ${results.ended?'30 days':'since marking done'}</s-text>
    <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="base">
      <s-stack gap="small"><s-text>Previously affected checkouts</s-text><s-text type="strong">${results.affectedTotal?`${results.affectedCompleted} of ${results.affectedTotal} completed after marking done`:"No checkouts to follow"}</s-text></s-stack>
      <s-stack gap="small"><s-text>${mission.id==='unfinished'?'No completion recorded':'Checkouts with alerts'}</s-text><s-text>Before ${rate(fix.baseline.affected,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${assessment.canAssess?rate(results.after.affected,results.after.checkouts):'Not enough data'}</s-text></s-stack>
      <s-stack gap="small"><s-text>New checkout completion</s-text><s-text>Before ${rate(fix.baseline.completed,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${assessment.canAssess?rate(results.after.completed,results.after.checkouts):'Not enough data'}</s-text></s-stack>
    </s-grid></s-query-container>
    <s-text color="subdued">${results.after.checkouts||results.affectedCompleted?'Later purchases do not show whether a change worked.':'Previously affected customers may still return and complete checkout.'}${fix.partial||latestEvidence?.truncated?' Some activity is missing.':''}</s-text>
    </s-stack></s-stack>`;
}
async function fixRequest(operation:'read'|'mark'|'undo'|'retest'|'undo-retest',missionId?:MissionId){
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(embeddedShopify){const bridge=(window as unknown as {shopify:{idToken:()=>Promise<string>}}).shopify;headers.Authorization=`Bearer ${await bridge.idToken()}`;}
  const response=await fetch(`${backendOrigin}/api/${embeddedShopify?'shopify':'demo'}/fixes`,{method:'POST',headers,body:JSON.stringify({operation,...(embeddedShopify?{}:{viewerId}),...(missionId?{missionId}:{})}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Fix request failed.');
  const data=prepareFixes(await response.json());
  appliedFixes=data.fixes;fixHistory=data.history;fixesReady=true;
}
element('mission-list').addEventListener('click',async event=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('s-button[data-fix]');
  if(!target||fixSaving||loading)return;
  await saveFixUpdate(target.dataset.fixOperation as 'mark'|'undo'|'retest'|'undo-retest',target.dataset.fix as MissionId);
});
element('mission-list').addEventListener('change',async event=>{
  const input=(event.target as HTMLElement).closest<HTMLElementTagNameMap['s-checkbox']>('s-checkbox[data-fix-done]');
  if(!input||fixSaving||loading||!fixesReady)return;
  await saveFixUpdate(input.checked?'mark':'undo',input.dataset.fixDone as MissionId);
});
async function saveFixUpdate(operation:'mark'|'undo'|'retest'|'undo-retest',missionId:MissionId){
  fixSaving=true;fixError='';element('action-save-error').hidden=true;text('action-save-status','Saving…');
  (element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=true;
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-checkbox']|HTMLElementTagNameMap['s-button']>('s-checkbox[data-fix-done],s-button[data-fix]').forEach(control=>{control.disabled=true;});
  try{await fixRequest(operation,missionId);if(operation==='mark')element(`body-${missionId}`).hidden=true;text('action-save-status',operation==='mark'?'Marked as done.':operation==='undo'?'Action reopened.':'Retest updated.');}
  catch{fixError='Your change was not saved. Check your connection and try again.';text('action-save-error',fixError);element('action-save-error').hidden=false;text('action-save-status','Change was not saved.');}
  finally{fixSaving=false;(element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=loading;if(latestEvidence)render(filteredEvidence(latestEvidence));(document.getElementById(`toggle-${missionId}`)??element('overview-tab')).focus({preventScroll:true});}
}

function signalBoundary(id:MissionId){const fix=appliedFixes.find(f=>f.missionId===id);return fix?.retestedAt??fix?.appliedAt;}
let storeCurrency='USD';
const money = (minor:number)=>formatMoney(minor,storeCurrency);
function renderCheckoutTrends(){
 const trendRange=dateBounds(selectedRange),facts=outcomeFacts(latestEvidence),trendNow=Math.min(Date.now(),facts.asOf??Date.now());
 trendHealthy=currentMonitoring().canAssess;
 const simulated=latestEvidence?.events??[];
 const simulationMode=deployment.kind==='local'&&simulated.some(e=>e.simulated);
 if(simulationMode){
  trendRange.start=Math.max(trendRange.start,trendNow-6*3600000,Math.min(...simulated.filter(e=>e.name==='checkout_started').map(e=>e.timestamp)));
 }
 trends=checkoutTrends(simulationMode?simulated:latestEvidence?.events??[],{...facts,asOf:trendNow},trendRange,simulationMode?!evidenceReadFailed&&!latestEvidence?.truncated&&Date.now()-trendNow<120000:trendHealthy,trendNow);
 return checkoutTrendsMarkup(trends,{start:trendRange.start,end:Math.max(trendRange.start,Math.min(trendRange.end,trendNow-3600000)),simulationMode});
}
function renderMissions(events: CheckoutEvent[]) {
  const expanded = new Set(Array.from(element("mission-list").querySelectorAll<HTMLElement>("[data-action-body]")).filter(item => !item.hidden).map(item => item.id));

  const facts=outcomeFacts(latestEvidence);
  const summary = summarize(events,facts);
  const unfinishedIds = new Set(summary.journeys.filter(session => session.started && !session.completed).map(session => session.id));
  const unfinishedCount = (mission: Mission) => mission.sessionIds.filter(id => unfinishedIds.has(id)).length;
  const recommendations=buildRecommendations(events,facts);
  const trendCards=renderCheckoutTrends();
  const bounds=dateBounds(selectedRange),sharedValues=latestEvidence?.actionBasketValue;
  const recorded = !embeddedShopify&&sharedValues?.rangeStart===bounds.start&&sharedValues.rangeEnd===bounds.end
    ? sharedValues
    : actionValues(events,latestEvidence?.abandonedCheckouts??null,latestEvidence?.shopifySnapshot?.abandoned??[],latestEvidence?.checkoutPrices??[],storeCurrency,bounds.start,bounds.end,facts.orders);
  const priority:Record<MissionId,number>={delivery:0,payment:0,inventory:0,discount:1,validation:2,unfinished:3,extension:1};
  const severityRank = {Critical:0, Warning:1, Info:2};
  const state=(mission:Mission)=>actionState(appliedFixes.find(f=>f.missionId===mission.id),latestEvidence?.events??events,Date.now());
  missions = recommendations.sort((a,b)=>Number(state(a).done)-Number(state(b).done)||severityRank[missionSignal(a,events,signalBoundary(a.id)).severity.label]-severityRank[missionSignal(b,events,signalBoundary(b.id)).severity.label]||priority[a.id]-priority[b.id]||unfinishedCount(b)-unfinishedCount(a));
  const pendingCount=missions.filter(mission=>!state(mission).done).length;
  const reviewCount=pendingCount+trends.filter(trend=>trend.state==='review').length;
  text('recommendation-count',reviewCount?`${reviewCount} item${reviewCount===1?'':'s'} to review`:missions.length?'All marked as done':'');
  element('recommendation-value-note').hidden=missions.length===0;
  const missionCards = missions.map(mission => {
    const open = expanded.has(`body-${mission.id}`);
    const destination = ACTION_DESTINATIONS[mission.id];
    const status=state(mission);
    const fix=appliedFixes.find(f=>f.missionId===mission.id);
    const signal = missionSignal(mission, events, signalBoundary(mission.id));
    const severity = signal.severity;
    const recommendation = missionRecommendation(mission, events, signalBoundary(mission.id));
    const shippingBlockers = new Set(events.filter(event=>mission.sessionIds.includes(event.sessionId)&&event.shippingBlocker==='no_shipping_available').map(event=>event.sessionId)).size;
    const estimate = recorded.actions.find(item=>item.id===mission.id);
    const basketCents = estimate?.totalCents;
    const hasAmount = basketCents !== null && basketCents !== undefined;
    const dates=dateBounds(selectedRange),aggregate=latestEvidence?.inventoryItemValue;
    const inventory=aggregate&&aggregate.rangeStart===dates.start&&aggregate.rangeEnd===dates.end?aggregate:inventoryValue(events,mission.sessionIds,storeCurrency,(latestEvidence?.shopifySnapshot?.orders??[]).flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency:storeCurrency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]));
    const percent = summary.sessionCount ? Math.round(mission.count / summary.sessionCount * 100) : 0;
    const brief = `${mission.count} of ${summary.sessionCount} checkouts affected`;
    return {done:status.done,rank:severityRank[severity.label],html:`<s-section id="mission-${mission.id}">
      <s-stack gap="base">
        <s-stack direction="inline" justifyContent="space-between" gap="small" alignItems="center">
          <s-heading><s-text fontWeight="bold">${escape(mission.title)}</s-text></s-heading>
          <s-badge id="mission-badge-${mission.id}" tone="${status.done?'neutral':severity.tone}">${status.done?'Marked as done':severity.label}</s-badge>
        </s-stack>
        <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1.5fr 1fr, 1fr" gap="large-100" alignItems="start">
          <s-stack gap="small" data-explanation="next">
            <s-text type="strong" fontWeight="medium">What we detected</s-text>
            <s-paragraph>${escape(mission.description)}</s-paragraph>
            ${signal.latestAlert!==null?`<s-text color="subdued">Latest matching alert ${escape(time(signal.latestAlert))}</s-text>`:''}
            <s-text type="strong" fontWeight="medium">What you should do next</s-text>
            <s-paragraph data-recommendation-summary>${escape(recommendation)}</s-paragraph>
          </s-stack>
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-stack gap="small" data-action-metric><s-text color="subdued">Checkouts affected</s-text><s-number fontSize="large-100" fontWeight="bold">${mission.count}</s-number><s-text color="subdued">${percent}% of ${summary.sessionCount} checkouts</s-text></s-stack>
            <s-stack gap="small" data-action-value><s-text color="subdued">${mission.id==='inventory'?'Item value before alert':'Affected basket value'}</s-text><s-number fontSize="large-100" fontWeight="bold" id="risk-${mission.id}">${mission.id==='inventory'?(inventory.totalMinor===null?'Unavailable':money(inventory.totalMinor)):hasAmount?money(basketCents!):'Unavailable'}</s-number><s-text color="subdued">${(mission.id==='inventory'?inventory.totalMinor===null:!hasAmount)?'Some prices weren’t recorded':'Not confirmed lost revenue'}</s-text></s-stack>
          </s-grid>
        </s-grid></s-query-container>
        ${fix?`<s-text data-fix-outcome="${mission.id}" tone="${status.returned?'caution':'auto'}">${escape(fixOutcomeCopy(fix,latestEvidence?.events??events,Date.now(),currentMonitoring(),facts))}</s-text>`:''}
        <s-divider></s-divider>
        <s-stack direction="inline" justifyContent="space-between" gap="small" alignItems="center">
          <s-button variant="secondary" data-mission="${mission.id}" ${mission.count?'':'disabled'} accessibilityLabel="View ${mission.count} affected checkouts: ${escape(mission.title)}">View affected checkouts</s-button>
          <s-button id="toggle-${mission.id}" variant="tertiary" data-toggle-action="${mission.id}" aria-expanded="${open}" aria-controls="metrics-${mission.id} body-${mission.id}" accessibilityLabel="${open?'Hide':'Show'} details: ${escape(mission.title)}">${open?'Hide details':'Show details'}</s-button>
        </s-stack>
        <s-stack id="metrics-${mission.id}" gap="base" ${open?'':'hidden'}>${fix?`<s-divider></s-divider>${renderFix(mission)}`:''}</s-stack>
        <s-stack id="body-${mission.id}" data-action-body gap="base" ${open?'':'hidden'}>
          <s-divider></s-divider>
          <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1fr 1fr, 1fr" gap="large-100" alignItems="start">
            <s-stack gap="small"><s-heading>Why we flagged this</s-heading><s-paragraph>${escape(severity.reason)}</s-paragraph><s-text color="subdued">${escape(brief)}</s-text>${mission.id==='delivery'&&mission.count>shippingBlockers?`<s-text color="subdued">${shippingBlockers} confirmed shipping blocker${shippingBlockers===1?'':'s'} · ${mission.count-shippingBlockers} checkouts with general shipping alerts</s-text>`:''}${mission.id==='payment'?'<s-paragraph>A card decline does not prove checkout is broken. Check whether another payment method is available, and review payment settings before changing them.</s-paragraph>':''}</s-stack>
            <s-stack gap="small"><s-heading>How you can test your change</s-heading><s-paragraph>${escape(ACTION_CHECKS[mission.id])}</s-paragraph>${destination?`<s-stack direction="inline"><s-button variant="secondary" href="https://admin.shopify.com/store/${STORE.replace('.myshopify.com','')}/${destination.path}" target="_blank" accessibilityLabel="${destination.label} (opens in a new tab)">${destination.label}</s-button></s-stack>`:''}</s-stack>
          </s-grid></s-query-container>
          <s-divider></s-divider>
          <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">${renderDone(mission)}<s-text color="subdued">Marking done records your action; it doesn’t verify the result.</s-text></s-stack>
        </s-stack>
      </s-stack>
    </s-section>`};
  });
  const cards=[...missionCards,...(trendCards?[{done:false,rank:1,html:trendCards}]:[])].sort((a,b)=>Number(a.done)-Number(b.done)||a.rank-b.rank);
  element('mission-list').innerHTML=cards.map((card,index)=>`${card.done&&(index===0||!cards[index-1].done)?'<s-divider></s-divider><s-heading>Marked as done</s-heading>':''}${card.html}`).join('') || `<s-section><s-stack gap="small"><s-heading>No issues flagged in the checkouts we’ve recorded.</s-heading><s-paragraph color="subdued">${currentMonitoring().canAssess?'We’ll show comparisons here when enough data supports a warning.':'Some checks need more current data. See Data details below.'}</s-paragraph><s-stack direction="inline"><s-button variant="secondary" data-review-checkouts>Browse recorded checkouts</s-button></s-stack></s-stack></s-section>`;
}
function applyMissionFilter() {
  const trend=trends.find(t=>t.id===selectedTrend);
  const mission = missions.find(item => item.id === selectedMission)??(latestEvidence?buildMissions(filteredEvidence(latestEvidence).events).find(item=>item.id===selectedMission):undefined);
  const query = (element('journey-search') as HTMLElementTagNameMap['s-search-field']).value.trim().toLowerCase();
  const status = (element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value;
  const alert = selectedAlertCategory;
  const hasFilters = !!selectedTrend || !!mission || !!query || status !== 'all' || alert !== 'all' || !!selectedQuickIssue;
  element('clear-journey-filters').hidden = !hasFilters;
  const sort = (element('journey-sort') as HTMLElementTagNameMap['s-select']).value;
  const filtered=filterJourneyRows(journeyRows,{query,status,alert,shippingOnly:!!selectedQuickIssue,sort,
    missionIds:selectedTrend?(trend?.sessionIds??[]):mission?.sessionIds??(selectedMission?[]:undefined)});
  filteredJourneyRows=filtered;
  renderQuickFilters();
  for(const id of ['export-button','export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=!filtered.length||loading;
  const page=paginateRows(filtered,journeyPage,JOURNEYS_PER_PAGE);journeyPage=page.page;
  element("journey-list").innerHTML=page.rows.map(row=>row.row).join('');
  const table = element('journey-table') as HTMLElementTagNameMap['s-table'];
  (element('journey-previous') as HTMLElementTagNameMap['s-button']).disabled = journeyPage === 0;
  (element('journey-next') as HTMLElementTagNameMap['s-button']).disabled = journeyPage >= page.pages - 1;
  table.hidden = filtered.length === 0;
  element('journey-empty').hidden = filtered.length !== 0;
  text('journey-empty', hasFilters ? 'No matching checkouts. Clear filters or try another search.' : 'No checkouts in these dates. Choose another date range.');
  text('journey-page-status',page.label);
  if(embeddedShopify&&appPageAt(location.pathname)==='journeys')window.history.replaceState(null,'',pageHref('journeys'));
}
function renderQuickFilters(){
 const query=(element('journey-search') as HTMLElementTagNameMap['s-search-field']).value.trim().toLowerCase();
 const status=(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value;
 const alert=selectedAlertCategory;
 const base=journeyRows.filter(row=>(!query||row.id.toLowerCase().includes(query)||row.label.toLowerCase().includes(query))&&(status==='all'||(status==='completed'?row.completed:!row.completed)));
 const choices=[{id:'all',label:'All',count:base.length},...Object.keys(categoryLabels).map(id=>({id,label:issueLabels[id],count:base.filter(row=>row.categories.includes(id)).length})),{id:'shipping_blocker',label:'Shipping unavailable',count:base.filter(row=>row.shippingBlocker).length}].filter(c=>c.id==='all'||c.count);
 element('quick-issue-filters').setAttribute('gridTemplateColumns',`repeat(${choices.length}, max-content)`);
 element('quick-issue-filters').innerHTML=choices.map(c=>{
  const selected=!selectedMission&&(selectedQuickIssue?c.id===selectedQuickIssue:c.id===alert);
  return `<s-button variant="${selected?'primary':'secondary'}" data-quick-issue="${c.id}" aria-pressed="${selected}">${escape(c.label)} · ${c.count}</s-button>`;
 }).join('');
}
function viewCategory(category:string){
 resetJourneyFilters();
 if(category==='shipping_blocker')selectedQuickIssue=category;
 else selectedAlertCategory=category;
 applyMissionFilter();showView('journeys',true);
}
element('checkout-funnel').addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLElement>('[data-funnel-filter]');
 const selected=button?.dataset.funnelFilter;
 if(!selected||!funnelFilters.some(id=>id===selected)||!latestEvidence)return;
 funnelFilter=selected as FunnelFilter;
 renderFunnel(element('checkout-funnel'),filteredEvidence(latestEvidence).events,outcomeFacts(latestEvidence),funnelFilter);
 element('checkout-funnel').querySelector<HTMLElement>(`[data-funnel-filter="${funnelFilter}"]`)?.focus();
});
element('quick-issue-filters').addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLElement>('s-button[data-quick-issue]');if(!button)return;
 selectedTrend=null;selectedMission=null;selectedQuickIssue=button.dataset.quickIssue==='shipping_blocker'?'shipping_blocker':null;
 selectedAlertCategory=selectedQuickIssue?'all':button.dataset.quickIssue!;
 journeyPage=0;applyMissionFilter();
});
function openMission(id:MissionId){resetJourneyFilters();selectedMission=id;applyMissionFilter();showView('journeys',true);}
element('fix-history-content').addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLElement>('[data-history-mission]');if(button)openMission(button.dataset.historyMission as MissionId);});
function exportFiltered(events:boolean){
 if(!filteredJourneyRows.length)return;
 const content=events?checkoutEventsCSV(filteredJourneyRows):checkoutCSV(filteredJourneyRows,storeCurrency);
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download=`checkout-data-${events?'events':'checkouts'}-${selectedRange}.csv`;link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 text('export-status',`Exported ${filteredJourneyRows.length} filtered checkout${filteredJourneyRows.length===1?'':'s'}${events?' with their recorded activity':''}.`);
}
element('export-checkouts').addEventListener('click',()=>exportFiltered(false));
element('export-events').addEventListener('click',()=>exportFiltered(true));
function resetJourneyFilters() {
  selectedTrend=null;selectedMission = null;selectedQuickIssue=null;
  (element('journey-search') as HTMLElementTagNameMap['s-search-field']).value = '';
  (element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value = 'all';
  selectedAlertCategory = 'all';
  journeyPage = 0;
}
element('clear-journey-filters').addEventListener('click', () => {resetJourneyFilters(); applyMissionFilter();});
element('journey-search').addEventListener('input', () => {journeyPage = 0; applyMissionFilter();});
for (const id of ['journey-status-filter','journey-sort']) element(id).addEventListener('change', () => {journeyPage = 0; applyMissionFilter();});
element("mission-list").addEventListener("click", event => {
  const trend=(event.target as HTMLElement).closest<HTMLElement>('s-button[data-trend]');
  if(trend){resetJourneyFilters();selectedTrend=trend.dataset.trend!;applyMissionFilter();showView('journeys',true);element('journeys').scrollIntoView({behavior:'instant',block:'start'});return;}
  if ((event.target as HTMLElement).closest('s-button[data-review-checkouts]')) {resetJourneyFilters();applyMissionFilter();showView('journeys',true);element('journeys').scrollIntoView({behavior:'instant',block:'start'});return;}
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
 const list=focusedAlerts(data.events,Date.now(),data.truncated,boundaries,outcomeFacts(data)).filter(a=>!dismissedAlertKeys.includes(a.key)&&(a.category==='shipping_blocker'?alertPreferences.shipping:alertPreferences.spikes));
 element('focused-alert-list').innerHTML=!alertPreferences.shipping&&!alertPreferences.spikes?'<s-paragraph>Alerts are paused. Enable an alert type to resume checks.</s-paragraph>':alertsMarkup(list,currentMonitoring());
 text('alerts-tab',list.length?`Alerts (${list.length})`:'Alerts');
 text('alerts-checked-at',currentMonitoring().canAssess?'Checked using saved checkout activity.':'Not enough current data to assess alerts.');
 if(!alertStorageAvailable)text('alert-preference-note','These choices will last until you close this page.');
}
async function checkFocusedAlerts(){
 if(checkingAlerts||loading||fixSaving||openOverlays.size>0||!alertPreferences.shipping&&!alertPreferences.spikes)return;
 checkingAlerts=true;(element('check-alerts') as HTMLElementTagNameMap['s-button']).loading=true;
 try{await loadEvidence(true);}
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
let chartRenderVersion=0;
function renderOrderPattern(data:EvidenceResponse){
  const version=++chartRenderVersion;
  const snapshot=latestEvidence?.shopifySnapshot??data.shopifySnapshot;
  const sim=data.events.some(e=>e.simulated)?simulationRecords(data.events,data.sampledAt,latestEvidence??data):null;
  const pattern=sim?orderPattern(sim.orders,new Date(sim.start).toISOString(),data.sampledAt,'Asia/Kolkata'):snapshot?orderPattern(snapshot.orders,snapshot.periodStart,snapshot.syncedAt,snapshot.timeZone??'UTC'):data.orderPatterns;
  element('order-chart-content').hidden=!pattern;
  element('order-chart-empty').hidden=!!pattern;
  text('order-chart-empty','Order history is unavailable for these dates.');
  if(!pattern){text('order-chart-methodology','Order history is unavailable.');return;}
  text('order-chart-summary','Daily order pattern');
  text('order-chart-baseline','');
  element('order-chart-baseline').hidden=true;
  text('order-chart-methodology',baselineCopy(pattern));
  element('order-chart-viz').setAttribute('aria-label',`${sim?'Simulated completed checkouts':'Hourly paid orders'} today compared with the hourly average ${pattern.baselineDays?'over '+pattern.baselineDays+' previous complete days':'pending history'}, with abandoned checkouts grouped by creation hour; blank hours are unknown, in ${pattern.timeZone}`);
  element('order-chart-error').hidden=true;
  const abandoned=abandonedPattern(sim?.abandoned??snapshot?.abandoned??null,pattern);
  void import('./orderChart').then(({renderOrderChart})=>{if(version===chartRenderVersion)renderOrderChart(element('order-chart-viz'),pattern,abandoned);}).catch(()=>{
    if(version!==chartRenderVersion)return;
    text('order-chart-error','The chart could not load. Reload the page to try again.');element('order-chart-error').hidden=false;
  });
}
function render(data: EvidenceResponse) {
  renderFunnel(element('checkout-funnel'),data.events,outcomeFacts(latestEvidence??data),funnelFilter);
  renderMonitoring();
  const storeName=data.storeName?.trim()||'Checkout Health';
  element('demo-label').hidden=embeddedShopify;
  if(embeddedShopify)text('shopify-status',`Store: ${data.storeName?.trim()||data.store}`);
  element('enable-pixel').hidden=data.enabled;
  document.title=storeName==='Checkout Health'?storeName:`${storeName} · Checkout Health`;
  renderOrderPattern(data);
  element('fix-history-content').innerHTML=historyMarkup(fixHistory,latestEvidence?.events??data.events,fixesReady,outcomeFacts(latestEvidence??data),currentMonitoring());
  renderFocusedAlerts(latestEvidence??data);
  // Match the selected journey against the full synced records, even when its
  // order/contact date falls outside the journey start-date filter.
  const nativeSnapshot=latestEvidence?.shopifySnapshot??data.shopifySnapshot;
  storeCurrency=data.shopifySnapshot?.currency??data.abandonedBasketSummary?.currency??'USD';
  text('report-currency',data.events.some(e=>e.simulated)?'Test view · all recorded sessions are included. Generated basket values and Shopify basket values are shown in USD.':`Values are shown in ${storeCurrency}.`);
  const baskets=checkoutBaskets(nativeSnapshot?.abandoned??[],latestEvidence?.checkoutPrices??data.checkoutPrices??[],storeCurrency);
  const summary = summarize(data.events,outcomeFacts(latestEvidence??data));
  {
    const {start,end}=dateBounds(selectedRange);
    const sim=data.events.some(e=>e.simulated)?simulationRecords(data.events,data.sampledAt,latestEvidence??data):null;
    const aggregate=sim?abandonedSummary(sim.abandoned,start,end):data.shopifySnapshot?abandonedSummary(data.shopifySnapshot.abandoned,start,end):data.abandonedBasketSummary;
    const current=aggregate&&aggregate.rangeStart===start&&aggregate.rangeEnd===end?aggregate:null;
    element("abandoned-value-metric").hidden=false;
    element("abandoned-metrics").setAttribute("gridTemplateColumns","@container (inline-size > 600px) 1fr 1fr 1fr, 1fr");
    text("abandoned-value-label","Abandoned checkout value");
    text("abandoned-value",current?.totalCents!=null?money(current.totalCents):"Unavailable");
    text("abandoned-checkouts-label","Abandoned checkouts");
    text("abandoned-checkouts-count",current?current.count:"Unavailable");
    text("abandoned-average-label","Average checkout value");
    text("abandoned-average",current?.averageCents!=null?money(current.averageCents):current?.count===0?"No checkouts":"Unavailable");
    text("abandoned-value-note",!current?"Abandoned checkout data is unavailable.":current.unpricedCount?"Some abandoned checkouts have no recorded value. Total and average are unavailable.":current.count===0?"No abandoned checkouts in these dates. Total value is zero; there’s no average.":sim?"Generated test basket values saved with simulated checkouts.":"Imported totals may differ from those in your admin.");
    element("abandoned-average").setAttribute("tone","auto");
    text("abandoned-count",current?.unpricedCount?`${current.unpricedCount} checkouts without a recorded value`:"");
    element("abandoned-count").hidden=!current?.unpricedCount;
    text("abandoned-heading","Abandoned checkouts");
  }
  text("session-count", summary.sessionCount);
  text("completed-count", summary.completed);
  text("incomplete-count", summary.noCompletionObserved);
  text("event-count", summary.eventCount);
  text("stored-count", data.totalStored);
  text("collection-state", data.enabled ? "Set up" : "Paused");
  text("request-status",'');element('request-status').hidden=true;
  text("coverage-note", `${data.truncated?"Some checkout activity is missing. Results are not verified.":"Checkouts are grouped by when they started. Later completions are included."} No recorded completion does not mean a customer abandoned checkout.`);
  element("open-journeys").toggleAttribute("disabled", summary.sessionCount === 0);

  if (!data.enabled) {
    text("summary-title", "Checkout tracking is paused");
    text("summary-description", "Enable checkout tracking to collect activity.");
  } else if (summary.sessionCount === 0) {
    text("summary-title", "No checkouts in these dates");
    text("summary-description", "Choose another date range to see checkout activity.");
  } else {
    text("summary-title", `${summary.sessionCount} recorded checkout${summary.sessionCount === 1 ? "" : "s"} observed`);
    text("summary-description", "Open a checkout to review its activity.");
  }

  const hasSessions=summary.sessionCount>0;
  element("summary-title").hidden=hasSessions;
  element("completion-summary").hidden=!hasSessions;
  element("summary-description").hidden=hasSessions;
  text("completion-label",`${summary.completed} of ${summary.sessionCount} · ${hasSessions ? Math.round(summary.completed/summary.sessionCount*100) : 0}%`);
  element("completion-progress").setAttribute("max",String(Math.max(1,summary.sessionCount)));
  element("completion-progress").setAttribute("value",String(summary.completed));
  element("completion-progress").setAttribute("accessibilityLabel",`${summary.completed} of ${summary.sessionCount} checkouts have completion evidence`);
  journeyRows = summary.journeys.reverse().map(session => {
    const alerts = session.events.filter(event => event.category !== null);
    const detail = describeJourney(session.events);
    const status = session.completed ? 'Completed' : 'Abandoned';
    const basketCents = journeyPrice(session.id,session.completed,session.events,storeCurrency,nativeSnapshot?.orders??[],baskets,(data.abandonedCheckouts?.records??[]).filter(row=>row.currency===storeCurrency&&row.sessionId).map(row=>({...row,sessionId:row.sessionId!})),(latestEvidence?.checkoutPrices??data.checkoutPrices??[]).filter(row=>row.currency===storeCurrency));
    const label = journeyLabel(session.id, nativeSnapshot?.orders ?? []);
    const fullLabel = journeyLabel(session.id, nativeSnapshot?.orders ?? [], true);
    const orderHref = journeyOrderHref(session.id, nativeSnapshot?.orders ?? []);
    const detailReference = orderHref ? `<s-link href="${escape(orderHref)}" target="_top" accessibilityLabel="Open ${escape(fullLabel)} in Shopify">${escape(fullLabel)}</s-link>` : fullLabel.match(/.{1,16}/gu)!.map(escape).join('<wbr>');
    const detailHeader = `<s-stack direction="inline" gap="small" alignItems="center"><s-heading fontSize="large">${detailReference}</s-heading><s-badge tone="${session.completed ? 'success' : 'neutral'}">${status}</s-badge></s-stack>`;
    const row = `<s-table-row data-session="${escape(session.id)}">
      <s-table-cell>${orderHref ? `<s-link href="${escape(orderHref)}" target="_top" accessibilityLabel="Open ${escape(label)} in Shopify">${escape(label)}</s-link>` : `<s-text type="strong">${escape(label)}</s-text>`}</s-table-cell>
      <s-table-cell>${escape(journeyDate(session.events[0].timestamp))}</s-table-cell>
      <s-table-cell><s-badge tone="${session.completed ? "success" : "neutral"}">${status}</s-badge></s-table-cell>
      <s-table-cell>${escape(lastObservedStep(session.events))}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center">${detail.categories.length ? detail.categories.map(category => `<s-badge tone="${category === "validation" ? "caution" : "neutral"}">${escape(categoryLabels[category])}</s-badge>`).join("") : '<s-text color="subdued">No alerts recorded</s-text>'}</s-stack></s-table-cell>
      <s-table-cell>${basketCents===undefined ? "Unavailable" : escape(money(basketCents))}</s-table-cell>
      <s-table-cell><s-button variant="secondary" data-journey="${escape(session.id)}" accessibilityLabel="Show details: ${escape(label)}">Show details</s-button></s-table-cell>
    </s-table-row>`;
    const timing=`<s-stack gap="small"><s-heading>Time between checkout steps</s-heading><s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="small">${stepTimings(session.events).map(t=>`<s-stack gap="small"><s-text type="strong">${t.step}</s-text><s-text>${durationText(t.seconds)}</s-text><s-text color="subdued">${t.note}</s-text></s-stack>`).join('')}</s-grid></s-query-container><s-text color="subdued">Times show gaps between recorded steps, not time spent typing.</s-text></s-stack><s-divider></s-divider>`;
    const outcomeNote=`<s-paragraph color="subdued">${session.completed?`${escape(outcomeLabel(session.outcome))}.`:'Abandoned means no completed checkout has been recorded yet.'}${session.outcome.serverCompleted&&!session.outcome.sources.includes('browser')?' Completion was confirmed separately. The timeline shows activity recorded in checkout.':''}${session.outcome.legacySignedCompletion?' An earlier completion record has no original time, so it cannot confirm completion.':''}${session.outcome.conflicting?' Some completion details couldn’t be verified. Only confirmed completion is counted.':''}</s-paragraph>`;
    const timeline = detailHeader+outcomeNote+timing+`          <s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Recorded activity</s-heading><s-text color="subdued">${journeyDuration(session.events)} · ${session.events.length} ${session.events.length === 1 ? "update" : "updates"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}</s-text></s-stack>
          <s-stack gap="none" accessibilityRole="ordered-list" accessibilityLabel="Recorded checkout activity, oldest first">
            ${session.events.map((event, eventIndex) => `<s-grid gridTemplateColumns="24px 1fr auto" gap="base" accessibilityRole="list-item">
              <s-box data-timeline-marker="${event.name === "checkout_completed" ? "completed" : "neutral"}" data-first="${eventIndex === 0}" data-last="${eventIndex === session.events.length - 1}" accessibilityVisibility="hidden"></s-box>
              <s-stack direction="inline" gap="small" paddingBlock="small-100" alignItems="center">
                <s-text>${escape(eventLabels[event.name])}${event.extensionAppName?` · ${escape(event.extensionAppName)}`:""}${event.discountOfferCode?` · ${escape(event.discountOfferCode)}`:""}</s-text>
                ${event.category ? `<s-badge tone="${event.shippingBlocker ? "critical" : event.category === "validation" ? "caution" : "neutral"}">${event.shippingBlocker ? "Shipping unavailable" : escape(categoryLabels[event.category])}</s-badge>` : ""}
              </s-stack>
              <s-box paddingBlock="small-100">
                <s-text color="subdued">${escape(time(event.timestamp).replaceAll(" ", "\u00a0"))}</s-text>
              </s-box>
            </s-grid>`).join("")}
          </s-stack>`;
    return {events:session.events,shippingBlocker:session.events.some(e=>e.shippingBlocker==='no_shipping_available'),startedAt:session.events[0].timestamp,basketCents,id:session.id,label,completed:session.completed,outcome:session.outcome,categories:detail.categories,row,timeline};
  });
  renderMissions(data.events);
  applyMissionFilter();
}

const embeddedShopify = appPageAt(location.pathname)!==undefined;
async function shopifyRequest(path:string,method='GET') {
  const bridge=(window as unknown as {shopify?:{idToken:()=>Promise<string>}}).shopify;
  if(!bridge)throw Error('Open this app inside Shopify admin.');
  const response=await fetch(`${backendOrigin}/api/shopify/${path}`,await shopifyRequestInit(path,method,backendOrigin,location.origin,bridge));
  if(!response.ok){
    const body=await response.json().catch(()=>null);
    const message=storeAccessErrorCopy(response.status);
    text('shopify-status',message);
    throw Error(body?.error==='Reporting exceeds the safe payload budget. Previous results are retained.'?body.error:message);
  }
  return response;
}
if(embeddedShopify){
  const nav=document.createElement('s-app-nav');
  for(const name of dashboardViews){
    const link=document.createElement('s-link');link.setAttribute('href',appPages[name].path);link.textContent=appPages[name].title;
    if(name==='overview')link.setAttribute('rel','home');
    nav.append(link);
  }
  document.querySelector('s-page')!.prepend(nav);
  element('view-navigation').hidden=true;
  const query=new URLSearchParams(location.search);
  const range=query.get('range');
  if(range){try{dateBounds(range);updateDateSelection(range);}catch{/* Invalid links use the default dates. */}}
  if(appPageAt(location.pathname)==='journeys'){
    const mission=query.get('mission'),trend=query.get('trend'),category=query.get('category');
    selectedMission=isFixMission(mission)?mission:null;
    selectedTrend=trend&&['completion-drop','device-gap','shipping-drop'].includes(trend)?trend:null;
    selectedQuickIssue=query.get('issue')==='shipping_blocker'?'shipping_blocker':null;
    selectedAlertCategory=category&&Object.hasOwn(categoryLabels,category)?category:'all';
    (element('journey-search') as HTMLElementTagNameMap['s-search-field']).value=query.get('q')??'';
    const status=query.get('status'),sort=query.get('sort');
    if(status&&['all','completed','unfinished'].includes(status))(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value=status;
    if(sort&&['newest','oldest','value-high','value-low'].includes(sort))(element('journey-sort') as HTMLElementTagNameMap['s-select']).value=sort;
  }
  activateView(appPageAt(location.pathname)!);
  element('shopify-connection').hidden=false;
  if(deployment.kind==='local'){
    for(const [label,path,method] of [['Verify Shopify session','session','GET'],['Connect test store','sync','POST']] as const){
      const button=document.createElement('s-button');button.textContent=label;button.setAttribute('variant','secondary');
      button.addEventListener('click',async()=>{
        button.setAttribute('loading','');button.setAttribute('disabled','');
        try{await shopifyRequest(path,method);text('shopify-status',path==='session'?'Shopify session verified for the test store.':'Test store connected.');if(path==='sync')await loadEvidence();}
        catch{text('shopify-status',path==='session'?'Open this app from the Shopify test store to verify your session.':'Test store could not connect. Check the development app permissions.');}
        finally{button.removeAttribute('loading');button.removeAttribute('disabled');}
      });
      element('shopify-connection').prepend(button);
    }
  }
  element('enable-pixel').addEventListener('click',async()=>{
    const button=element('enable-pixel');button.setAttribute('loading','');button.setAttribute('disabled','');
    try{await shopifyRequest('pixel/enable','POST');text('shopify-status','Tracking is set up. Waiting for checkout activity.');}
    catch{text('shopify-status','Tracking couldn’t be enabled. Reopen the app and try again. Contact app support if this continues.');}
    finally{button.removeAttribute('loading');button.removeAttribute('disabled');}
  });
}
let loading = false;
let pendingEvidenceRead = false;
async function loadEvidence(background=false) {
  if(loading){if(!background)pendingEvidenceRead=true;return;}
  if(background&&(fixSaving||openOverlays.size>0))return;
  const readRange=selectedRange;
  loading = true;
  if(!background)setLoadingControls(true);
  if(!background&&!latestEvidence){text("request-status", "Loading checkouts…");element('request-status').hidden=false;}
  try {
    if(embeddedShopify&&!latestEvidence)text('shopify-status','Loading store data…');
    const response = embeddedShopify ? await shopifyRequest(`evidence?start=${dateBounds(selectedRange).start}&end=${dateBounds(selectedRange).end}`) : await fetch(`${backendOrigin}/api/test-evidence?start=${dateBounds(selectedRange).start}&end=${dateBounds(selectedRange).end}`, { cache: "no-store", signal: AbortSignal.timeout(90000) });
    if (!response.ok) {
      const body=await response.json().catch(()=>null);
      throw new Error(body?.error==='Reporting exceeds the safe payload budget. Previous results are retained.'?body.error:'Could not read checkout evidence.');
    }
    const data=prepareEvidence(await response.json(),STORE);
    if(readRange!==selectedRange){pendingEvidenceRead=true;return;}
    const prepared=filteredEvidence(data);
    const previous=latestEvidence;
    const previousRange=latestEvidenceRange;
    evidenceReadFailed=false;
    try{await fixRequest('read');fixError='';element('action-save-error').hidden=true;}catch{fixesReady=false;fixError='Saved action statuses couldn’t load. Reopen the app before changing them.';text('action-save-error',fixError);element('action-save-error').hidden=false;}
    if(readRange!==selectedRange){pendingEvidenceRead=true;return;}
    element('alerts-error').hidden=true;
    latestEvidence=data;
    latestEvidenceRange=readRange;
    try{render(prepared);}catch(error){latestEvidence=previous;latestEvidenceRange=previousRange;throw error;}

  } catch(error) {
    if(readRange!==selectedRange){pendingEvidenceRead=true;return;}
    evidenceReadFailed=true;
    if(latestEvidence){try{render(filteredEvidence(latestEvidence));}catch{renderMonitoring();}}
    else {renderMonitoring();text('summary-title','Checkout data unavailable');text('summary-description','Checkout activity couldn’t be loaded.');element('summary-description').hidden=false;text('mission-list','Findings are unavailable until checkout activity loads.');text('focused-alert-list','Alerts are unavailable until checkout activity loads.');text('fix-history-content','Fix history is unavailable until checkout activity loads.');}
    if(background)element('alerts-error').hidden=false;
  } finally {
    loading = false;setLoadingControls(false);text("request-status", "");element("request-status").hidden=true;
    if(pendingEvidenceRead){pendingEvidenceRead=false;void loadEvidence();}
  }
}
function setLoadingControls(busy:boolean){
  for(const id of ['export-button','export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=busy||!filteredJourneyRows.length;
  (element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=busy||fixSaving;
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-button']>('s-button[data-fix]').forEach(button=>{button.disabled=busy||fixSaving||!fixesReady;});
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-checkbox']>('s-checkbox[data-fix-done]').forEach(input=>{input.disabled=busy||fixSaving||!fixesReady||(!embeddedShopify&&!viewerId);});
}
element("journey-list").addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-journey]");
  const journey = journeyRows.find(row => row.id === button?.dataset.journey);
  if (!journey) return;
  const modal = element('journey-modal') as HTMLElementTagNameMap['s-modal'];
  modal.heading = journey.label.startsWith('Order ') ? 'Order details' : 'Checkout reference';
  modal.setAttribute('accessibilityLabel',`${modal.heading}: ${journey.label}`);
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
await Promise.all(["s-search-field", "s-select", "s-menu", "s-modal", "s-checkbox", "s-button", "s-section", "s-badge", "s-table", "s-table-header", "s-table-header-row", "s-table-body", "s-table-row", "s-table-cell"].map(tag => customElements.whenDefined(tag)));
await customElements.whenDefined('s-date-picker');
const datePicker=element('date-range-picker') as HTMLElementTagNameMap['s-date-picker'];
datePicker.value=selectedRange;datePicker.allow=recentRange(30);
for(const days of [7,30])element(`last-${days}-days`).addEventListener('click',()=>{datePicker.value=recentRange(days);});
element('apply-date-range').addEventListener('click',event=>{
  try{
    const bounds=dateBounds(datePicker.value),available=dateBounds(recentRange(30));
    if(bounds.start<available.start||bounds.end>available.end)throw Error('Choose dates within the last 30 days.');
    if(loading&&!latestEvidence||fixSaving){event.preventDefault();event.stopImmediatePropagation();return;}
    updateDateSelection(datePicker.value);element('date-range-error').hidden=true;
    window.setTimeout(()=>void loadEvidence(),0);
  }catch(error){event.preventDefault();event.stopImmediatePropagation();text('date-range-error',error instanceof Error?error.message:'Choose valid dates.');element('date-range-error').hidden=false;}
},{capture:true});
void loadEvidence();

// The backend sync runs even when the merchant closes the app. This read-only
// refresh updates an open overview without starting another Shopify sync.
window.setInterval(()=>{
 if(document.visibilityState==='visible'&&!fixSaving)void loadEvidence(true);
},60000);

// Local freshness keeps advancing even when an overlay pauses network reads.
window.setInterval(tickMonitoring,10000);
document.addEventListener('visibilitychange',tickMonitoring);
