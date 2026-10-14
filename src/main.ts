/// <reference types="@shopify/polaris-types" />
import {checkoutTrends,type CheckoutTrend} from '../shared/checkoutTrends';
import {checkoutTrendsMarkup} from './checkoutTrends';
import {appPages,appPageAt,appPageHref,type AppPage} from '../shared/appPages';
import {isFixMission} from '../shared/fixTracking';
let trends:CheckoutTrend[]=[];
let selectedTrend:string|null=null;
let trendHealthy:boolean|undefined;
import {bindChartHelp} from './chartHelp';
import {baselineCopy,storeAccessErrorCopy} from './dashboardCopy';
import {shopifyRequestInit} from '../shared/shopifyRequest';
import {simulationRecords} from '../shared/simulationDashboard';
import {prepareEvidence,prepareEvents,prepareFixes,type EvidenceResponse} from '../shared/evidenceResponse';
import {monitoringHealth,type MonitoringHealth} from '../shared/monitoringHealth';
import {type OutcomeFacts} from '../shared/checkoutOutcome';
import {actionValues} from '../shared/actionValues';
import "./style.css";
import {focusedAlerts,issueLabels} from '../shared/dashboardInsights';
import {checkoutCSV,checkoutEventsCSV} from '../shared/checkoutExport';
import {historyMarkup,alertsMarkup,type FixHistoryRow} from './dashboardPanels';
import {abandonedPattern} from '../shared/abandonedPattern';
import {orderPattern} from "../shared/orderPattern";
import {buildRecommendations} from "../shared/recommendations";
import {actionState,type AppliedFix} from "../shared/fixTracking";
import {recentRange,dateBounds,checkoutCohort} from '../shared/dateRange';
import {inventoryValue} from '../shared/inventoryValue';
import {formatMoney} from '../shared/money';
import {abandonedSummary} from "../shared/abandonedSummary";
import {renderFunnel} from './checkoutFunnel';
import {overviewSummary,type OverviewSummary} from '../shared/overviewSummary';
import {funnelFilters,type FunnelFilter} from '../shared/checkoutFunnel';
let funnelFilter:FunnelFilter='all';
import {rowMarkup,timelineHeader,timelineMarkup,categoryLabels} from "./checkoutRows";
import {checkoutTable,type CheckoutTable,type CheckoutTableRow} from "../shared/checkoutTable";
import {insightCard,insightList,type CardContext} from "./insightCards";
import {filterJourneyRows,paginateRows,issueChips,blockerSameAsShipping} from "../shared/journeyTable";
import {browserBackendOrigin,deployment} from '../shared/deployment';
import { STORE, summarize } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";
import { buildMissions, missionRecommendation, missionSignal, isViewerId } from "../shared/actions";
import type { Mission, MissionId } from "../shared/actions";

declare global { interface ImportMeta { readonly env: Record<string, string | undefined> } }
function outcomeFacts(data:EvidenceResponse|null):OutcomeFacts {
  // Public demo responses contain no private identity-linked server facts.
  return {orders:data?.shopifySnapshot?.orders??[],prices:data?.checkoutPrices??[]};
}
const element = (id: string) => document.getElementById(id)!;
const text = (id: string, value: string | number) => { element(id).textContent = String(value); };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const backendOrigin = browserBackendOrigin(location);
let selectedRange=recentRange(30);
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
 text('data-availability',latestEvidence&&latestEvidenceRange!==selectedRange?'Results for these dates are not current yet.':health.canAssess?'':health.state==='Needs attention'?'Data may be out of date. Results are not verified.':health.state==='Partial'?'Some data is missing. Results are not verified.':'Waiting for enough checkout activity to assess results.');
 return health;
}
const chartHelp=bindChartHelp(element('order-chart-help'),element('order-chart-tooltip'),document);
// Data loads when the page opens and when dates change; merchants reload for newer data.
function filteredEvidence(data:EvidenceResponse):EvidenceResponse{
  const {start,end}=dateBounds(selectedRange);
  const within=(value:string)=>{const at=Date.parse(value);return at>=start&&at<end;};
  return {...data,events:checkoutCohort(data.events,selectedRange),
    shopifySnapshot:data.shopifySnapshot?{...data.shopifySnapshot,orders:data.shopifySnapshot.orders.filter(row=>within(row.createdAt)),abandoned:data.shopifySnapshot.abandoned.filter(row=>within(row.createdAt))}:null};
}
// Overview counts come from the server for the dates it was asked about. Until the
// next read arrives for newly chosen dates, count the loaded events here instead.
function currentOverview(data:EvidenceResponse):OverviewSummary{
  const range=dateBounds(selectedRange),overview=latestEvidence?.overview;
  return overview&&overview.rangeStart===range.start&&overview.rangeEnd===range.end?overview:overviewSummary(data.events,outcomeFacts(latestEvidence??data),range);
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
let journeyRows: CheckoutTableRow[] = [];
let journeyTable: CheckoutTable | null = null;
let viewerId: string | null = null;
try {
  const stored = localStorage.getItem("checkout-demo-viewer");
  viewerId = isViewerId(stored) ? stored : [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("checkout-demo-viewer", viewerId);
} catch { /* Checklist remains disabled; viewing evidence still works. */ }

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
  // Each mission's fix, state and signal are computed once rather than per sort comparison.
  const now=Date.now(),fixes=new Map(appliedFixes.map(f=>[f.missionId,f]));
  const derived=new Map(recommendations.map(mission=>{const fix=fixes.get(mission.id),boundary=fix?.retestedAt??fix?.appliedAt;return [mission.id,{fix,boundary,status:actionState(fix,latestEvidence?.events??events,now),signal:missionSignal(mission,events,boundary,facts),unfinished:unfinishedCount(mission)}];}));
  const state=(mission:Mission)=>derived.get(mission.id)!.status;
  missions = recommendations.sort((a,b)=>{const x=derived.get(a.id)!,y=derived.get(b.id)!;return Number(x.status.done)-Number(y.status.done)||severityRank[x.signal.severity.label]-severityRank[y.signal.severity.label]||priority[a.id]-priority[b.id]||y.unfinished-x.unfinished;});
  const pendingCount=missions.filter(mission=>!state(mission).done).length;
  const dates=dateBounds(selectedRange),aggregate=latestEvidence?.inventoryItemValue;
  const sharedInventory=aggregate&&aggregate.rangeStart===dates.start&&aggregate.rangeEnd===dates.end?aggregate:null;
  const orderQuotes=sharedInventory?[]:(latestEvidence?.shopifySnapshot?.orders??[]).flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency:storeCurrency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]);
  const reviewCount=pendingCount+trends.filter(trend=>trend.state==='review').length;
  text('recommendation-count',reviewCount?`${reviewCount} item${reviewCount===1?'':'s'} to review`:missions.length?'All marked as done':'');
  element('recommendation-value-note').hidden=missions.length===0;
  const health=currentMonitoring();
  const ctx:CardContext={embedded:embeddedShopify,busy:fixSaving||loading,retestDisabled:!fixesReady||fixSaving||loading,events:latestEvidence?.events??events,facts,now,health,truncated:!!latestEvidence?.truncated,money,storeHandle:STORE.replace('.myshopify.com','')};
  const missionCards = missions.map(mission => {
    const open = expanded.has(`body-${mission.id}`);
    const {status,fix,signal,boundary}=derived.get(mission.id)!;
    const severity = signal.severity;
    const recommendation = missionRecommendation(mission, events, boundary, facts);
    const affected=new Set(mission.sessionIds);
    const shippingBlockers = new Set(events.filter(event=>event.shippingBlocker==='no_shipping_available'&&affected.has(event.sessionId)).map(event=>event.sessionId)).size;
    const estimate = recorded.actions.find(item=>item.id===mission.id);
    const basketCents = estimate?.totalCents;
    const inventory=sharedInventory??inventoryValue(events,mission.sessionIds,storeCurrency,orderQuotes);
    const percent = summary.sessionCount ? Math.round(mission.count / summary.sessionCount * 100) : 0;
    return {done:status.done,rank:severityRank[severity.label],html:insightCard({mission,open,fix,status,signal,recommendation,shippingBlockers,basketCents,inventoryMinor:inventory.totalMinor,percent,sessionCount:summary.sessionCount,controlsDisabled:!fixesReady||fixSaving||loading||(!embeddedShopify&&!viewerId)},ctx)};
  });
  element('mission-list').innerHTML=insightList([...missionCards,...(trendCards?[{done:false,rank:1,html:trendCards}]:[])],health.canAssess);
}
function applyMissionFilter() {
  const trend=trends.find(t=>t.id===selectedTrend);
  const mission = missions.find(item => item.id === selectedMission)??(latestEvidence?buildMissions(filteredEvidence(latestEvidence).events,outcomeFacts(latestEvidence)).find(item=>item.id===selectedMission):undefined);
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
  for(const id of ['export-button','export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=!filtered.length||loading||exporting;
  const page=paginateRows(filtered,journeyPage,JOURNEYS_PER_PAGE);journeyPage=page.page;
  element("journey-list").innerHTML=page.rows.map(row=>rowMarkup(row,money)).join('');
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
 const query=(element('journey-search') as HTMLElementTagNameMap['s-search-field']).value;
 const status=(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value;
 const alert=selectedAlertCategory;
 const choices=issueChips(journeyRows,{query,status},Object.fromEntries(Object.keys(categoryLabels).map(id=>[id,issueLabels[id]])));
 element('quick-issue-filters').setAttribute('gridTemplateColumns',`repeat(${choices.length}, max-content)`);
 element('quick-issue-filters').innerHTML=choices.map(c=>{
  const selected=selectedMission?c.id===missionChip():selectedQuickIssue?c.id===selectedQuickIssue:c.id===alert;
  return `<s-button variant="${selected?'primary':'secondary'}" data-quick-issue="${c.id}" aria-pressed="${selected}" accessibilityLabel="${escape(c.label)}, ${c.count.toLocaleString()} checkouts${selected?', selected':''}">${escape(c.label)} · ${c.count.toLocaleString()}</s-button>`;
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
 renderFunnel(element('checkout-funnel'),currentOverview(filteredEvidence(latestEvidence)).funnels[funnelFilter],funnelFilter);
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
// Checkout events are read only for details and the events export, not with the page.
async function readActivity(path:string):Promise<CheckoutEvent[]>{
 const response=embeddedShopify?await shopifyRequest(path):await fetch(`${backendOrigin}/api/test-${path}`,{cache:'no-store',signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Checkout activity could not be read.');
 return prepareEvents(await response.json());
}
// Each checkout's events as the table saw them: deduplicated, oldest first, up to the read time.
function eventsBySession(events:CheckoutEvent[],asOf:number){
 return new Map(summarize(events,{asOf}).journeys.map(j=>[j.id,j.events]));
}
let exporting=false;
async function exportFiltered(events:boolean){
 if(!filteredJourneyRows.length||!journeyTable||exporting)return;
 const rows=filteredJourneyRows,table=journeyTable;
 let content:string;
 if(events){
  exporting=true;setLoadingControls(loading);text('export-status','Preparing the export…');
  try{
   const activity=eventsBySession(await readActivity(`checkout-events?start=${table.rangeStart}&end=${table.rangeEnd}`),table.asOf);
   content=checkoutEventsCSV(rows.map(row=>({id:row.id,label:row.label,events:activity.get(row.id)??[]})));
  }catch{text('export-status','The export couldn’t be prepared. Try again.');return;}
  finally{exporting=false;setLoadingControls(loading);}
 }else content=checkoutCSV(rows,storeCurrency);
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download=`checkout-data-${events?'events':'checkouts'}-${selectedRange}.csv`;link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 text('export-status',`Exported ${rows.length} filtered checkout${rows.length===1?'':'s'}${events?' with their recorded activity':''}.`);
}
element('export-checkouts').addEventListener('click',()=>void exportFiltered(false));
element('export-events').addEventListener('click',()=>void exportFiltered(true));
// Cards count unfinished checkouts. When every affected checkout is unfinished, show the
// Abandoned status so the chip counts match the card instead of including completed checkouts.
function matchMissionStatus(){
  const mission=missions.find(item=>item.id===selectedMission);
  const completed=new Set(journeyRows.filter(row=>row.completed).map(row=>row.id));
  if(mission?.sessionIds.length&&mission.sessionIds.every(id=>!completed.has(id)))(element('journey-status-filter') as HTMLElementTagNameMap['s-select']).value='unfinished';
}
function missionChip(){
  const mission=missions.find(item=>item.id===selectedMission);
  if(mission?.signal==='shipping_unavailable')return blockerSameAsShipping(journeyRows)?'delivery':'shipping_blocker';
  return mission&&mission.id!=='unfinished'?mission.id:null;
}
// "Shipping unavailable" is a subset of shipping alerts; show it only when it narrows the list.
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
  matchMissionStatus();
  applyMissionFilter(); showView("journeys", true);
  element("journeys").scrollIntoView({ behavior: "instant", block: "start" });
});
let alertSource:EvidenceResponse|null=null;
let alertPreferences={shipping:true,spikes:true},dismissedAlertKeys:string[]=[],alertStorageAvailable=true;
try{
 const saved=JSON.parse(localStorage.getItem('checkout-alert-preferences')??'{}');
 alertPreferences={shipping:saved.shipping!==false,spikes:saved.spikes!==false};
 const dismissed=JSON.parse(localStorage.getItem('checkout-dismissed-alerts')??'[]');
 dismissedAlertKeys=Array.isArray(dismissed)?dismissed.filter((key:unknown)=>typeof key==='string').slice(-48):[];
}catch{alertStorageAvailable=false;}
(element('shipping-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked=alertPreferences.shipping;
(element('spike-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked=alertPreferences.spikes;
function renderFocusedAlerts(data:EvidenceResponse){
 alertSource=data;
 const boundaries=Object.fromEntries(appliedFixes.map(f=>[f.missionId,f.retestedAt??f.appliedAt]));
 const list=focusedAlerts(data.events,Date.now(),data.truncated,boundaries,outcomeFacts(data)).filter(a=>!dismissedAlertKeys.includes(a.key)&&(a.category==='shipping_blocker'?alertPreferences.shipping:alertPreferences.spikes));
 element('focused-alert-list').innerHTML=!alertPreferences.shipping&&!alertPreferences.spikes?'<s-paragraph>Alerts are paused. Enable an alert type to resume checks.</s-paragraph>':alertsMarkup(list,currentMonitoring());
 text('alerts-tab',list.length?`Alerts (${list.length})`:'Alerts');
 text('alerts-checked-at',currentMonitoring().canAssess?'':'Not enough current data to assess alerts.');
 if(!alertStorageAvailable)text('alert-preference-note','These choices will last until you close this page.');
}
for(const id of ['shipping-alerts-enabled','spike-alerts-enabled'])element(id).addEventListener('change',()=>{
 alertPreferences={shipping:(element('shipping-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked,spikes:(element('spike-alerts-enabled') as HTMLElementTagNameMap['s-checkbox']).checked};
 try{localStorage.setItem('checkout-alert-preferences',JSON.stringify(alertPreferences));}catch{alertStorageAvailable=false;}
 if(alertSource)renderFocusedAlerts(alertSource);
});
element('focused-alert-list').addEventListener('click',event=>{
 const dismiss=(event.target as HTMLElement).closest<HTMLElement>('[data-dismiss-alert]');
 if(dismiss){dismissedAlertKeys=[...new Set([...dismissedAlertKeys,dismiss.dataset.dismissAlert!])].slice(-48);try{localStorage.setItem('checkout-dismissed-alerts',JSON.stringify(dismissedAlertKeys));}catch{alertStorageAvailable=false;}if(alertSource)renderFocusedAlerts(alertSource);return;}
 const button=(event.target as HTMLElement).closest<HTMLElement>('[data-alert-category]');
 if(button)viewCategory(button.dataset.alertCategory!);
});
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
  void orderChartModule.then(({renderOrderChart})=>{if(version===chartRenderVersion)renderOrderChart(element('order-chart-viz'),pattern,abandoned);}).catch(()=>{
    if(version!==chartRenderVersion)return;
    text('order-chart-error','The chart could not load. Reload the page to try again.');element('order-chart-error').hidden=false;
  });
}
// Start downloading the chart bundle with the page instead of after the first render.
const orderChartModule=import('./orderChart');
orderChartModule.catch(()=>{/* Reported when the chart renders. */});
// Table rows come from the server for the dates it was asked about. Until the next
// read arrives for newly chosen dates, build them from the loaded events instead.
function currentTable(data:EvidenceResponse):CheckoutTable{
  const range=dateBounds(selectedRange),table=latestEvidence?.table;
  if(table&&table.rangeStart===range.start&&table.rangeEnd===range.end)return table;
  // Match each checkout against the full synced records, even when its order date
  // falls outside the selected dates.
  const snapshot=latestEvidence?.shopifySnapshot??data.shopifySnapshot;
  return checkoutTable(data.events,{...outcomeFacts(latestEvidence??data),asOf:Date.now()},range,{currency:storeCurrency,orders:snapshot?.orders,abandoned:snapshot?.abandoned,prices:latestEvidence?.checkoutPrices??data.checkoutPrices,legacy:data.abandonedCheckouts?.records});
}
function render(data: EvidenceResponse) {
  const facts=outcomeFacts(latestEvidence??data);
  const summary=currentOverview(data);
  renderFunnel(element('checkout-funnel'),summary.funnels[funnelFilter],funnelFilter);
  renderMonitoring();
  const storeName=data.storeName?.trim()||'Checkout Health';
  element('demo-label').hidden=embeddedShopify;
  if(embeddedShopify)text('shopify-status',`Store: ${data.storeName?.trim()||data.store}`);
  element('enable-pixel').hidden=data.enabled;
  document.title=storeName==='Checkout Health'?storeName:`${storeName} · Checkout Health`;
  renderOrderPattern(data);
  element('fix-history-content').innerHTML=historyMarkup(fixHistory,latestEvidence?.events??data.events,fixesReady,facts,currentMonitoring());
  renderFocusedAlerts(latestEvidence??data);
  storeCurrency=data.shopifySnapshot?.currency??data.abandonedBasketSummary?.currency??'USD';
  text('report-currency',data.events.some(e=>e.simulated)?'Test view · all recorded sessions are included. Generated basket values and Shopify basket values are shown in USD.':`Values are shown in ${storeCurrency}.`);
  {
    const {start,end}=dateBounds(selectedRange);
    const sim=data.events.some(e=>e.simulated)?simulationRecords(data.events,data.sampledAt,latestEvidence??data):null;
    const aggregate=sim?abandonedSummary(sim.abandoned,start,end):data.shopifySnapshot?abandonedSummary(data.shopifySnapshot.abandoned,start,end):data.abandonedBasketSummary;
    const current=aggregate&&aggregate.rangeStart===start&&aggregate.rangeEnd===end?aggregate:null;
    text("abandoned-value",current?.totalCents!=null?money(current.totalCents):"Unavailable");
    text("abandoned-value-note",!current?"Abandoned checkout data is unavailable.":current.unpricedCount?"Some abandoned checkouts have no recorded value, so the total is unavailable.":current.count===0?"No abandoned checkouts in these dates. Total value is zero.":sim?"Generated test basket values saved with simulated checkouts.":"Imported totals may differ from those in your admin.");
    // The value comes from Shopify's abandoned-checkout records, a different population from
    // observed unfinished journeys. Say so whenever the two counts differ.
    const basis=current&&current.count!==summary.noCompletionObserved?`Value based on ${current.count.toLocaleString()} abandoned checkout${current.count===1?'':'s'} recorded by ${sim?'the simulation':'Shopify'}.`:'';
    text("abandoned-basis",basis);element("abandoned-basis").hidden=!basis;
    text("abandoned-count",current?.unpricedCount?`${current.unpricedCount.toLocaleString()} checkouts without a recorded value`:"");
    element("abandoned-count").hidden=!current?.unpricedCount;
  }
  text("session-count", summary.sessionCount.toLocaleString());
  text("completed-count", summary.completed.toLocaleString());
  text("incomplete-count", summary.noCompletionObserved.toLocaleString());
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
  text("completion-label",`${hasSessions ? Math.round(summary.completed/summary.sessionCount*100) : 0}%`);
  element("completion-progress").setAttribute("max",String(Math.max(1,summary.sessionCount)));
  element("completion-progress").setAttribute("value",String(summary.completed));
  element("completion-progress").setAttribute("accessibilityLabel",`${summary.completed} of ${summary.sessionCount} checkouts have completion evidence`);
  // Order labels only match rows by session, so give each journey its own rows.
  journeyTable = currentTable(data);
  journeyRows = journeyTable.rows;
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
async function loadEvidence() {
  if(loading){pendingEvidenceRead=true;return;}
  const readRange=selectedRange;
  loading = true;
  setLoadingControls(true);
  if(!latestEvidence){text("request-status", "Loading checkouts…");element('request-status').hidden=false;}
  // Saved statuses load alongside the evidence; one retry covers a brief network or session hiccup.
  const fixesRead=fixRequest('read').catch(()=>fixRequest('read')).then(()=>true,()=>false);
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
    if(await fixesRead){fixError='';element('action-save-error').hidden=true;}else{fixesReady=false;fixError='Saved action statuses couldn’t load. Reopen the app before changing them.';text('action-save-error',fixError);element('action-save-error').hidden=false;}
    if(readRange!==selectedRange){pendingEvidenceRead=true;return;}
    latestEvidence=data;
    latestEvidenceRange=readRange;
    try{render(prepared);}catch(error){latestEvidence=previous;latestEvidenceRange=previousRange;throw error;}

  } catch(error) {
    if(readRange!==selectedRange){pendingEvidenceRead=true;return;}
    evidenceReadFailed=true;
    if(latestEvidence){try{render(filteredEvidence(latestEvidence));}catch{renderMonitoring();}}
    else {renderMonitoring();text('order-chart-empty','Order history couldn’t be loaded.');element('checkout-funnel').innerHTML='<s-paragraph color="subdued">Checkout stages are unavailable until checkout activity loads.</s-paragraph>';text('summary-title','Checkout data unavailable');text('summary-description','Checkout activity couldn’t be loaded.');element('summary-description').hidden=false;text('mission-list','Findings are unavailable until checkout activity loads.');text('focused-alert-list','Alerts are unavailable until checkout activity loads.');text('fix-history-content','Fix history is unavailable until checkout activity loads.');}
  } finally {
    loading = false;setLoadingControls(false);text("request-status", "");element("request-status").hidden=true;
    if(pendingEvidenceRead){pendingEvidenceRead=false;void loadEvidence();}
  }
}
function setLoadingControls(busy:boolean){
  for(const id of ['export-button','export-checkouts','export-events'])(element(id) as HTMLElementTagNameMap['s-button']).disabled=busy||exporting||!filteredJourneyRows.length;
  (element('apply-date-range') as HTMLElementTagNameMap['s-button']).disabled=busy||fixSaving;
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-button']>('s-button[data-fix]').forEach(button=>{button.disabled=busy||fixSaving||!fixesReady;});
  element('mission-list').querySelectorAll<HTMLElementTagNameMap['s-checkbox']>('s-checkbox[data-fix-done]').forEach(input=>{input.disabled=busy||fixSaving||!fixesReady||(!embeddedShopify&&!viewerId);});
}
let openJourney:string|null=null;
element("journey-list").addEventListener("click", async event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("s-button[data-journey]");
  const journey = journeyRows.find(row => row.id === button?.dataset.journey),asOf=journeyTable?.asOf;
  if (!journey||asOf===undefined) return;
  const modal = element('journey-modal') as HTMLElementTagNameMap['s-modal'];
  modal.heading = journey.label.startsWith('Order ') ? 'Order details' : 'Checkout reference';
  modal.setAttribute('accessibilityLabel',`${modal.heading}: ${journey.label}`);
  // Show what the row already knows, then add the timeline once its events arrive.
  openJourney=journey.id;
  element('journey-modal-content').innerHTML = timelineHeader(journey)+'<s-paragraph color="subdued">Loading recorded activity…</s-paragraph>';
  modal.showOverlay();
  let content:string;
  try{content=timelineMarkup(journey,eventsBySession(await readActivity(`checkout?id=${journey.id}&asOf=${asOf}`),asOf).get(journey.id)??[]);}
  catch{content=timelineHeader(journey)+'<s-paragraph color="subdued">Recorded activity couldn’t be loaded. Close and try again.</s-paragraph>';}
  if(openJourney===journey.id)element('journey-modal-content').innerHTML=content;
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

