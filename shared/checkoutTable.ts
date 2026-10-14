import {summarize,describeJourney,type CheckoutEvent} from './evidence.ts';
import {checkoutCohort} from './dateRange.ts';
import {outcomeLabel,type CheckoutOutcome,type CompletionSource,type OutcomeFacts} from './checkoutOutcome.ts';
import {lastObservedStep} from './dashboardInsights.ts';
import {journeyLabel,journeyOrderHref} from './journeyLabel.ts';
import {basketPricer,type BasketSources} from './basketValue.ts';

// What the table, its details header and the checkouts CSV need about one checkout,
// without its events. Details fetch the events only when a merchant opens them.
export interface RowOutcome {serverCompleted:boolean;sources:CompletionSource[];legacySignedCompletion:boolean;conflicting:boolean}
export interface CheckoutTableRow {
 id:string;label:string;orderHref:string|null;startedAt:number;completed:boolean;
 outcomeText:string;outcome:RowOutcome;categories:string[];shippingBlocker:boolean;lastStep:string;simulated:boolean;
 eventCount:number;alertCount:number;basketCents?:number;
}
export interface CheckoutTable {rangeStart:number;rangeEnd:number;asOf:number;rows:CheckoutTableRow[]}
type Order={sessionId?:string;orderName?:string;orderId?:string};

// Fields worked out from a checkout's events. The table and the CSV share them.
export function eventFields(events:CheckoutEvent[],completed:boolean,outcome?:CheckoutOutcome){
 return {
  outcomeText:outcome?outcomeLabel(outcome):completed?'Completed · recorded in checkout':'No completion recorded',
  categories:describeJourney(events).categories as string[],
  shippingBlocker:events.some(e=>e.shippingBlocker==='no_shipping_available'),
  lastStep:lastObservedStep(events),
  simulated:events.some(e=>e.simulated),
  eventCount:events.length,
  alertCount:events.filter(e=>e.category!==null).length,
 };
}

// Rows for checkouts started in the dates, newest first, with the same completion
// facts, order labels and basket prices the page used when it built them itself.
export function checkoutTable(events:CheckoutEvent[],facts:OutcomeFacts&{asOf:number},range:{start:number;end:number},pricing:BasketSources&{orders?:Order[]}):CheckoutTable {
 const orders=new Map<string,Order[]>();
 for(const order of pricing.orders??[])if(order.sessionId!==undefined)orders.set(order.sessionId,[...orders.get(order.sessionId)??[],order]);
 const price=basketPricer(pricing);
 const rows=summarize(checkoutCohort(events,range),facts).journeys.reverse().map(session=>{
  const sessionOrders=orders.get(session.id)??[],basketCents=price(session),{outcome}=session;
  return {id:session.id,label:journeyLabel(session.id,sessionOrders),orderHref:journeyOrderHref(session.id,sessionOrders),
   startedAt:session.events[0].timestamp,completed:session.completed,...eventFields(session.events,session.completed,outcome),
   outcome:{serverCompleted:outcome.serverCompleted,sources:outcome.sources,legacySignedCompletion:outcome.legacySignedCompletion,conflicting:outcome.conflicting},
   ...(basketCents===undefined?{}:{basketCents})};
 });
 return {rangeStart:range.start,rangeEnd:range.end,asOf:facts.asOf,rows};
}
