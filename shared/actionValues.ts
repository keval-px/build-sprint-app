import {buildRecommendations} from './recommendations.ts';
import {linkedAbandoned,recordedImpact,type AbandonedSnapshot} from './abandoned.ts';
import {checkoutBaskets,type CheckoutPrice} from './checkoutPrice.ts';
import {checkoutCohort} from './dateRange.ts';
import type {CheckoutEvent} from './evidence.ts';

// Return only totals for already-public demo sessions. Never return private
// checkout identities, line items or per-checkout prices to the public preview.
export function actionValues(events:CheckoutEvent[],legacy:AbandonedSnapshot|null,
  records:{recordHash:string;sessionId?:string;subtotalCents:number|null;recovered?:boolean}[],
  prices:CheckoutPrice[],currency:string,start:number,end:number) {
  const cohort=checkoutCohort(events,{start,end});
  const baskets=checkoutBaskets(records,prices,currency);
  const linked=linkedAbandoned(legacy,baskets,currency)??{importedOn:'',emailSent:0,emailNotSent:0,records:[]};
  return {...recordedImpact(cohort,buildRecommendations(cohort),linked,0,currency),rangeStart:start,rangeEnd:end};
}
