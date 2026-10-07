import {buildRecommendations} from './recommendations.ts';
import type {AbandonedSnapshot} from './abandoned.ts';
import {checkoutBaskets,type CheckoutPrice} from './checkoutPrice.ts';
import {checkoutCohort} from './dateRange.ts';
import {summarize,type CheckoutEvent} from './evidence.ts';
import {journeyPrice,type SavedBasket} from './journeyPrice.ts';

// The same exact price precedence as the checkout table. Never fill an unknown
// basket with an average, or present a partial sum as the full affected value.
// Public callers receive only aggregate counts and amounts, never identities.
export function actionValues(events:CheckoutEvent[],legacy:AbandonedSnapshot|null,
 records:(SavedBasket&{recordHash:string})[],prices:CheckoutPrice[],currency:string,start:number,end:number){
 const cohort=checkoutCohort(events,{start,end}),journeys=new Map(summarize(cohort).journeys.map(j=>[j.id,j]));
 const baskets=checkoutBaskets(records,prices,currency);
 const purchased=new Set([...records.filter(r=>r.recovered&&r.sessionId).map(r=>r.sessionId!),...prices.filter(p=>p.recovered&&p.currency===currency).map(p=>p.sessionId)]);
 const historical=(legacy?.records??[]).filter(r=>r.currency===currency&&!r.recovered&&r.sessionId).map(r=>({...r,sessionId:r.sessionId!}));
 const notifications=prices.filter(p=>p.currency===currency);
 const amounts=(ids:string[])=>{
  const values=ids.map(id=>{const j=journeys.get(id)!;return journeyPrice(id,j.completed,j.events,currency,[],baskets,historical,notifications);});
  const matched=values.filter((n):n is number=>n!==undefined),sum=matched.reduce((total,n)=>total+n,0);
  return {eligibleSessions:ids.length,matchedSessions:matched.length,unknownSessions:ids.length-matched.length,totalCents:matched.length===ids.length&&Number.isSafeInteger(sum)?sum:null};
 };
 const all=new Set<string>();
 const actions=buildRecommendations(cohort).map(m=>{
  const ids=[...new Set(m.sessionIds)].filter(id=>!journeys.get(id)!.completed&&!purchased.has(id));ids.forEach(id=>all.add(id));
  return {id:m.id,...amounts(ids)};
 });
 return {actions,combined:amounts([...all]),rangeStart:start,rangeEnd:end};
}
