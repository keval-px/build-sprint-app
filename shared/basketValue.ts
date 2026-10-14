import type {CheckoutEvent} from './evidence.ts';
import {checkoutBaskets,type CheckoutPrice} from './checkoutPrice.ts';

export interface SavedBasket {
  sessionId?: string;
  subtotalCents: number | null;
  totalCents?: number | null;
  recovered?: boolean;
}
export interface LegacyBasket {sessionId:string|null;subtotalCents:number;currency:string;recovered:boolean}
// Every source a checkout's basket value may come from. Omitted sources are simply unavailable.
export interface BasketSources {
  currency:string;
  orders?:SavedBasket[];
  abandoned?:SavedBasket[];
  prices?:CheckoutPrice[];
  legacy?:LegacyBasket[];
}
export interface PricedJourney {id:string;completed:boolean;events:CheckoutEvent[]}
const valid=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0;

// One price precedence for every view: the checkout table, action values and simulation.
// Prefer a unique exact Shopify match. Equal dates, amounts, or list positions never
// establish an identity. Browser prices remain independent observations.
// Unfinished checkouts ignore records Shopify marks recovered; unknown stays undefined.
export function basketPricer(sources:BasketSources):(journey:PricedJourney)=>number|undefined {
  const {currency}=sources;
  const prices=(sources.prices??[]).filter(p=>p.currency===currency);
  const orders=bySession(sources.orders??[]);
  const abandoned=bySession(checkoutBaskets(sources.abandoned??[],prices,currency).filter(row=>!row.recovered));
  const notifications=bySession(prices);
  const legacy=bySession((sources.legacy??[]).flatMap(row=>row.currency===currency&&row.sessionId&&!row.recovered?[{...row,sessionId:row.sessionId}]:[]));
  return ({id,completed,events})=>{
    const saved=price(unique(completed?orders:abandoned,id));
    if(saved!==undefined)return saved;
    const notified=price(unique(notifications,id,!completed));
    if(notified!==undefined)return notified;
    const historical=price(unique(legacy,id));
    if(historical!==undefined&&!completed)return historical;
    return events.filter(event=>event.name!=='alert_displayed'&&event.currency===currency&&valid(event.subtotalCents)).sort((a,b)=>b.timestamp-a.timestamp)[0]?.subtotalCents;
  };
}
function bySession<T extends {sessionId?:string}>(rows:T[]){
  const groups=new Map<string,T[]>();
  for(const row of rows)if(row.sessionId!==undefined){const group=groups.get(row.sessionId);if(group)group.push(row);else groups.set(row.sessionId,[row]);}
  return groups;
}
function unique<T extends SavedBasket>(rows:Map<string,T[]>,id:string,unrecovered=false){
  const matches=(rows.get(id)??[]).filter(row=>!unrecovered||!row.recovered);
  return matches.length===1?matches[0]:undefined;
}
function price(row:SavedBasket|undefined){
  if(!row)return undefined;
  const value=row.totalCents===undefined?row.subtotalCents:row.totalCents;
  return valid(value)?value:undefined;
}
