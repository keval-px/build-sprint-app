import type {OrderPattern} from '../shared/orderPattern';
import type {MonitoringHealth} from '../shared/monitoringHealth';
import type {CheckoutEvent} from '../shared/evidence';
import type {OutcomeFacts} from '../shared/checkoutOutcome';
import {fixAssessment,fixResults,type AppliedFix} from '../shared/fixTracking.ts';

export function storeAccessErrorCopy(status:number){
 return status===401?'We couldn’t verify your session. Reopen the app from Shopify admin. If this continues, contact app support.':'This app couldn’t access your store data. Contact app support if this continues.';
}
export function baselineCopy(pattern:OrderPattern){
 const scope=`Paid orders, excluding cancellations. Times shown in ${pattern.timeZone}. ${pattern.testOrders?'Includes test orders. ':''}Using the last saved update. Future hours are blank.`;
 const learning=pattern.baselineDays===0
  ? 'The hourly average will appear when a full day of history is available.'
  : `Each hour is compared with the same hour across ${pattern.baselineDays} full day${pattern.baselineDays===1?'':'s'} from the previous 30 days, including hours with no orders.`;
 return `${learning} ${scope}`;
}
export function baselineStateCopy(pattern:OrderPattern){
 return pattern.baselineDays===0?'Learning · waiting for a full day':pattern.baselineDays<30?`Learning · ${pattern.baselineDays} of 30 full days available`:'';
}
export function metricStatusCopy(health:MonitoringHealth){
 return health.state==='Healthy'?'':health.state==='Needs attention'?'Data not current · refresh needed':health.state==='Partial'?'Partial data · available records only':'Limited data · waiting for observations';
}
export function monitoringCopy(health:MonitoringHealth){
 return health.state==='Healthy'?'Recent data is current. Monitoring does not confirm that checkout is error-free.':`${health.reasons[0]??'Monitoring is unavailable.'} Outcomes are not assessed. See monitoring details for all collection limits and next steps.`;
}
export function fixOutcomeCopy(fix:AppliedFix,events:CheckoutEvent[],now:number,health:MonitoringHealth,facts:OutcomeFacts={}){
 const assessment=fixAssessment(fix,events,now,health,facts);
 const prefix=fix.retestedAt!==undefined?'Marked done · retest reported':'Marked done';
 if(assessment.returned)return `${prefix} · ${assessment.returned} checkout${assessment.returned===1?'':'s'} had alerts after ${fix.retestedAt!==undefined?'the retest':'marking done'}. Review again; result not verified.`;
 if(!health.canAssess||fix.partial)return `${prefix} · result not verified: data is limited.`;
 const results=fixResults(fix,events,now,facts);
 if(!assessment.canAssess)return `${prefix} · waiting for more checkout activity. Result not verified.`;
 if(fix.missionId==='unfinished')return `${prefix} · ${results.after.completed} of ${results.after.checkouts} new checkouts completed. Result not verified.`;
 return `${prefix} · no new matching alerts recorded.${results.affectedCompleted?` ${results.affectedCompleted} previously affected checkout${results.affectedCompleted===1?'':'s'} completed later.`:''} Result not verified.`;
}
