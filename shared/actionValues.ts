import type {OutcomeOrder} from './checkoutOutcome.ts';
import {buildRecommendations} from './recommendations.ts';
import type {AbandonedSnapshot} from './abandoned.ts';
import type {CheckoutPrice} from './checkoutPrice.ts';
import {checkoutCohort} from './dateRange.ts';
import {summarize,type CheckoutEvent} from './evidence.ts';
import {basketPricer,type SavedBasket} from './basketValue.ts';

// Uses the shared basket precedence. Never fill an unknown
// basket with an average, or present a partial sum as the full affected value.
// Public callers receive only aggregate counts and amounts, never identities.
export function actionValues(events:CheckoutEvent[],legacy:AbandonedSnapshot|null,
 records:(SavedBasket&{recordHash:string})[],prices:CheckoutPrice[],currency:string,start:number,end:number,orders:OutcomeOrder[]=[],asOf=Date.now()){
 const facts={orders,prices,asOf};
 const cohort=checkoutCohort(events,{start,end}),journeys=new Map(summarize(cohort,facts).journeys.map(j=>[j.id,j]));
 const purchased=new Set([...records.filter(r=>r.recovered&&r.sessionId).map(r=>r.sessionId!),...Array.from(journeys.values()).filter(j=>j.outcome.serverCompleted).map(j=>j.id)]);
 // Orders are omitted: only unfinished checkouts are valued here.
 const basketPrice=basketPricer({currency,abandoned:records,prices,legacy:legacy?.records});
 const amounts=(ids:string[])=>{
  const values=ids.map(id=>basketPrice(journeys.get(id)!));
  const matched=values.filter((n):n is number=>n!==undefined),sum=matched.reduce((total,n)=>total+n,0);
  return {eligibleSessions:ids.length,matchedSessions:matched.length,unknownSessions:ids.length-matched.length,totalCents:matched.length===ids.length&&Number.isSafeInteger(sum)?sum:null};
 };
 const all=new Set<string>();
 const actions=buildRecommendations(cohort,facts).map(m=>{
  const ids=[...new Set(m.sessionIds)].filter(id=>!journeys.get(id)!.completed&&!purchased.has(id));ids.forEach(id=>all.add(id));
  return {id:m.id,...amounts(ids)};
 });
 return {actions,combined:amounts([...all]),rangeStart:start,rangeEnd:end};
}
