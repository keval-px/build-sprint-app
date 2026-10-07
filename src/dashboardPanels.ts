import {errorDiagnostics,issueLabels,type FocusedAlert} from '../shared/dashboardInsights';
import {fixResults,actionState,type AppliedFix} from '../shared/fixTracking';
import type {CheckoutEvent} from '../shared/evidence';
import type {Mission} from '../shared/actions';
export interface FixHistoryRow extends AppliedFix {active:boolean;withdrawnAt?:number}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const date=(n:number)=>new Date(n).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const rate=(n:number,total:number)=>total?`${Math.round(n/total*100)}% (${n}/${total})`:'No checkouts';
export function priorityMarkup(missions:Mission[],fixes:AppliedFix[],events:CheckoutEvent[]){
 const current=missions.filter(m=>!actionState(fixes.find(f=>f.missionId===m.id),events,Date.now()).done).slice(0,3);
 return current.length?`<s-text color="subdued">${current.length} issue${current.length===1?'':'s'} qualifies for investigation · Ranked by severity and affected checkouts</s-text>${current.map(m=>`<s-button variant="secondary" data-top-mission="${m.id}">${escape(m.title)} · ${m.count} checkout${m.count===1?'':'s'}</s-button>`).join('')}`:'<s-paragraph>No issues to investigate in these dates.</s-paragraph>';
}
export function diagnosticsMarkup(events:CheckoutEvent[]){
 const rows=errorDiagnostics(events);
 return rows.length?`<s-table><s-table-header-row><s-table-header listSlot="primary">Error type</s-table-header><s-table-header listSlot="secondary">Checkouts</s-table-header><s-table-header listSlot="labeled">First seen</s-table-header><s-table-header listSlot="labeled">Last seen</s-table-header><s-table-header listSlot="labeled">Completed after last alert</s-table-header><s-table-header listSlot="inline">Details</s-table-header></s-table-header-row><s-table-body>${rows.map(r=>`<s-table-row><s-table-cell>${escape(r.label)}</s-table-cell><s-table-cell>${r.count}</s-table-cell><s-table-cell>${escape(date(r.firstSeen))}</s-table-cell><s-table-cell>${escape(date(r.lastSeen))}</s-table-cell><s-table-cell>${r.completedAfter}</s-table-cell><s-table-cell><s-button variant="secondary" data-diagnostic="${r.category}" accessibilityLabel="View checkouts: ${escape(r.label)}">View checkouts</s-button></s-table-cell></s-table-row>`).join('')}</s-table-body></s-table>`:'<s-paragraph>No errors recorded in these dates.</s-paragraph>';
}
export function historyMarkup(rows:FixHistoryRow[],events:CheckoutEvent[],ready:boolean){
 if(!ready)return '<s-paragraph>Fix history could not load. Refresh the dashboard to try again.</s-paragraph>';
 if(!rows.length)return '<s-paragraph>No fixes marked as done yet. Mark an action as done after fixing it.</s-paragraph>';
 const labels:Record<string,string>={delivery:'Shipping availability',payment:'Payment',discount:'Discount or gift-card',validation:'Form validation',inventory:'Item availability',unfinished:'Unfinished checkouts'};
 return `<s-table><s-table-header-row><s-table-header listSlot="primary">Fix</s-table-header><s-table-header listSlot="kicker">Applied</s-table-header><s-table-header listSlot="secondary">Status</s-table-header><s-table-header listSlot="labeled">Retested</s-table-header><s-table-header listSlot="labeled">Before</s-table-header><s-table-header listSlot="labeled">After</s-table-header><s-table-header listSlot="inline">Details</s-table-header></s-table-header-row><s-table-body>${[...rows].sort((a,b)=>b.appliedAt-a.appliedAt).map(f=>{
 const end=Math.min(Date.now(),f.withdrawnAt??Infinity),results=fixResults(f,events,end),state=actionState(f,events,end);
 const status=!f.active?'Undone':state.returned?'Alerts returned':f.retestedAt?'Retested':'Watching';
 const after=!f.active&&f.withdrawnAt===undefined?'End date not recorded':`${rate(results.after.affected,results.after.checkouts)}${results.after.checkouts?' affected':''}${f.partial?' · Partial history':''}`;
 return `<s-table-row><s-table-cell>${escape(labels[f.missionId]??f.missionId)}</s-table-cell><s-table-cell>${escape(date(f.appliedAt))}</s-table-cell><s-table-cell><s-badge tone="${!f.active?'neutral':state.returned?'caution':f.retestedAt?'success':'info'}">${status}</s-badge></s-table-cell><s-table-cell>${f.retestedAt?escape(date(f.retestedAt)):'Not recorded'}</s-table-cell><s-table-cell>${rate(f.baseline.affected,f.baseline.checkouts)} affected</s-table-cell><s-table-cell>${after}</s-table-cell><s-table-cell><s-button variant="secondary" data-history-mission="${f.missionId}" accessibilityLabel="View checkouts: ${escape(labels[f.missionId])}">View checkouts</s-button></s-table-cell></s-table-row>`;
 }).join('')}</s-table-body></s-table><s-paragraph color="subdued">Before uses the saved 30-day baseline; after covers new checkouts since each marker, for up to 30 days or until it was undone. Retested means your team recorded a successful test. Older undone markers may not have a recorded end date. The latest 100 markers are shown.</s-paragraph>`;
}
export function alertsMarkup(alerts:FocusedAlert[]){
 return alerts.length?alerts.map(a=>`<s-banner tone="${a.tone}" heading="${escape(a.title)}"><s-stack gap="small"><s-paragraph>${escape(a.message)}</s-paragraph><s-text color="subdued">Last recorded ${escape(date(a.at))}</s-text><s-stack direction="inline" gap="small"><s-button variant="secondary" data-alert-category="${a.category}">View affected checkouts</s-button><s-button variant="tertiary" data-dismiss-alert="${escape(a.key)}">Dismiss for this hour</s-button></s-stack></s-stack></s-banner>`).join(''):'<s-paragraph>No new alerts to investigate in the last hour.</s-paragraph>';
}
