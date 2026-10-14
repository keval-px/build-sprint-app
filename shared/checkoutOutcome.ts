import type {CheckoutEvent} from './evidence.ts';

// Callers may supply only facts read from the authenticated Shopify snapshot
// or the HMAC-verified checkout receiver. Browser payloads cannot supply these.
export interface OutcomeOrder {sessionId?:string;paid:boolean;createdAt:string;cancelled?:boolean}
export interface OutcomePrice {sessionId:string;recovered:boolean;createdAt:string;updatedAt:number;completedAt?:number}
export interface OutcomeFacts {orders?:OutcomeOrder[];prices?:OutcomePrice[];asOf?:number}
export type CompletionSource='browser'|'paid_order'|'signed_checkout';
export interface CheckoutOutcome {completed:boolean;serverCompleted:boolean;sources:CompletionSource[];completedAt?:number;asOf:number;completionTimes:number[];legacySignedCompletion:boolean;conflicting:boolean}

export function checkoutOutcome(sessionId:string,events:CheckoutEvent[],facts:OutcomeFacts={}):CheckoutOutcome {
 return outcomeResolver(facts)(sessionId,events);
}

// Index the server facts once, then resolve any number of sessions against them.
export function outcomeResolver(facts:OutcomeFacts={}){
 const asOf=facts.asOf??Date.now(),orders=bySession(facts.orders??[]),prices=bySession(facts.prices??[]);
 return (sessionId:string,events:CheckoutEvent[])=>resolve(sessionId,events,orders.get(sessionId)??[],prices.get(sessionId)??[],asOf);
}
function bySession<T extends {sessionId?:string}>(rows:T[]){
 const groups=new Map<string,T[]>();
 for(const row of rows)if(row.sessionId!==undefined){const group=groups.get(row.sessionId);if(group)group.push(row);else groups.set(row.sessionId,[row]);}
 return groups;
}
function resolve(sessionId:string,events:CheckoutEvent[],sessionOrders:OutcomeOrder[],sessionPrices:OutcomePrice[],asOf:number):CheckoutOutcome {
 const rows=events.filter(e=>e.sessionId===sessionId&&e.timestamp<=asOf);
 const browser=rows.filter(e=>e.name==='checkout_completed');
 const sources:CompletionSource[]=browser.length?['browser']:[];
 const start=Math.min(...rows.filter(e=>e.name==='checkout_started').map(e=>e.timestamp));
 const lower=Number.isFinite(start)?start:-Infinity;
 const exact=/^[a-f0-9]{64}$/.test(sessionId);
 const orders=exact?sessionOrders:[];
 const prices=exact?sessionPrices:[];
 const order=orders.length===1?orders[0]:undefined;
 const price=prices.length===1?prices[0]:undefined;
 const orderAt=order?Date.parse(order.createdAt):NaN;
 const paid=!!order&&order.paid===true&&Number.isFinite(orderAt)&&orderAt>=lower&&orderAt<=asOf;
 const priceCreated=price?Date.parse(price.createdAt):NaN;
 const validPrice=!!price&&Number.isFinite(priceCreated)&&Number.isFinite(price.updatedAt)&&price.updatedAt>=priceCreated&&price.updatedAt>=lower&&price.updatedAt<=asOf;
 // Historical recovered rows lack the original timestamp. They remain price
 // records, but cannot independently prove a valid completion until refreshed.
 const signedAt=price?.completedAt;
 const signed=validPrice&&price!.recovered===true&&signedAt!==undefined&&Number.isFinite(signedAt)&&signedAt>=priceCreated&&signedAt>=lower&&signedAt<=price!.updatedAt&&signedAt<=asOf;
 if(paid)sources.push('paid_order');
 if(signed)sources.push('signed_checkout');
 // A negative/stale snapshot does not undo a positively observed purchase.
 // Expose disagreements; never choose one of several exact order identities.
 const conflicting=orders.length>1||prices.length>1||!!order&&order.paid&&(!Number.isFinite(orderAt)||orderAt<lower||orderAt>asOf)||!!price&&price.recovered&&!signed||!!(paid&&validPrice&&!price!.recovered&&price!.updatedAt>=orderAt);
 const times=[...browser.map(e=>e.timestamp),...(paid?[orderAt]:[]),...(signed?[signedAt!]:[])];
 return {asOf,completionTimes:times,legacySignedCompletion:!!price?.recovered&&price.completedAt===undefined,completed:sources.length>0,serverCompleted:paid||signed,sources,...(times.length?{completedAt:Math.min(...times)}:{}),conflicting};
}

export function outcomeLabel(outcome:CheckoutOutcome){
 if(outcome.sources.includes('paid_order'))return 'Completed · paid order';
 if(outcome.sources.includes('signed_checkout'))return 'Completed · checkout confirmation';
 return outcome.completed?'Completed · recorded in checkout':'No completion recorded';
}

export function completionAfter(outcome:CheckoutOutcome,_events:CheckoutEvent[],at:number){
 // Only validated original completion times can establish recovery.
 // Historical flags and notification update times are not completion times.
 return outcome.completionTimes.some(time=>time>at&&time<=outcome.asOf);
}
