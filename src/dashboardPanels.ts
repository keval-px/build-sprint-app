import type {MonitoringHealth} from '../shared/monitoringHealth';
import type {OutcomeFacts} from '../shared/checkoutOutcome';
import {type FocusedAlert} from '../shared/dashboardInsights.ts';
import {fixResults,fixAssessment,actionState,type AppliedFix} from '../shared/fixTracking.ts';
import type {CheckoutEvent} from '../shared/evidence';
export interface FixHistoryRow extends AppliedFix {active:boolean;withdrawnAt?:number}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const date=(n:number)=>new Date(n).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const rate=(n:number,total:number)=>total?`${Math.round(n/total*100)}% (${n}/${total})`:'No checkouts';
export function historyMarkup(rows:FixHistoryRow[],events:CheckoutEvent[],ready:boolean,facts:OutcomeFacts={},health?:MonitoringHealth){
 if(!ready)return '<s-paragraph>Fix history could not load. Reload the page to try again.</s-paragraph>';
 if(!rows.length)return '<s-paragraph>No actions marked done yet.</s-paragraph>';
 const labels:Record<string,string>={extension:'Checkout app failed',delivery:'Shipping alerts',payment:'Payment',discount:'Discount or gift card',validation:'Form errors',inventory:'Item availability',unfinished:'No completion recorded'};
 return `<s-table><s-table-header-row><s-table-header listSlot="primary">Action</s-table-header><s-table-header listSlot="kicker">Marked done</s-table-header><s-table-header listSlot="secondary">Status</s-table-header><s-table-header listSlot="labeled">Retested</s-table-header><s-table-header listSlot="labeled">Before</s-table-header><s-table-header listSlot="labeled">After</s-table-header><s-table-header listSlot="inline">Details</s-table-header></s-table-header-row><s-table-body>${[...rows].sort((a,b)=>b.appliedAt-a.appliedAt).map(f=>{
 const end=Math.min(Date.now(),f.withdrawnAt??Infinity),results=fixResults(f,events,end,facts),state=actionState(f,events,end);
 const status=!f.active?'Reopened':state.returned?'Alerts after '+(f.retestedAt?'retest':'marking done'):f.retestedAt?'Retest reported · result not verified':'Marked done · result not verified';
 const assessment=fixAssessment(f,events,end,health??{canAssess:false},facts);
 const after=!assessment.canAssess?'Not enough data to assess':!f.active&&f.withdrawnAt===undefined?'Reopened date unavailable':`${rate(results.after.affected,results.after.checkouts)}${results.after.checkouts?' affected':''}${f.partial?' · Some history is missing':''}`;
 return `<s-table-row><s-table-cell>${escape(f.signal?'Shipping unavailable':labels[f.missionId]??f.missionId)}</s-table-cell><s-table-cell>${escape(date(f.appliedAt))}</s-table-cell><s-table-cell><s-badge tone="${!f.active?'neutral':state.returned?'caution':'neutral'}">${status}</s-badge></s-table-cell><s-table-cell>${f.retestedAt?escape(date(f.retestedAt)):'Not recorded'}</s-table-cell><s-table-cell>${rate(f.baseline.affected,f.baseline.checkouts)} affected</s-table-cell><s-table-cell><s-text data-current-assessment ${health?.canAssess?'':'hidden'}>${after}</s-text><s-text data-assessment-unavailable ${health?.canAssess?'hidden':''}>Result not verified · data is limited</s-text></s-table-cell><s-table-cell><s-button variant="secondary" data-history-mission="${f.missionId}" accessibilityLabel="View checkouts: ${escape(labels[f.missionId])}">View checkouts</s-button></s-table-cell></s-table-row>`;
 }).join('')}</s-table-body></s-table><s-paragraph color="subdued">Before covers the previous 30 days. After covers new checkouts for up to 30 days after marking done, or until reopened. Retests are reported by your team. Showing the latest 100 actions.</s-paragraph>`;
}
export function alertsMarkup(alerts:FocusedAlert[],health?:MonitoringHealth){
 return alerts.length?alerts.map(a=>`<s-banner tone="${a.tone}" heading="${escape(a.title)}"><s-stack gap="small"><s-paragraph>${escape(a.message)}</s-paragraph><s-text color="subdued">Last recorded ${escape(date(a.at))}</s-text><s-stack direction="inline" gap="small"><s-button variant="secondary" data-alert-category="${a.category}">View affected checkouts</s-button><s-button variant="tertiary" data-dismiss-alert="${escape(a.key)}">Dismiss for this hour</s-button></s-stack></s-stack></s-banner>`).join(''):`<s-paragraph>${health?.canAssess?'No new alerts in the recorded activity. This doesn’t confirm checkout is error-free.':'Not enough current data to assess alerts.'}</s-paragraph>`;
}
