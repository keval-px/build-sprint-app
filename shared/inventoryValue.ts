import type {CheckoutEvent} from './evidence.ts';
import {convertMoney} from './money.ts';import type {ShopifyConversion} from './money.ts';
export interface CapturedLine {itemHash:string;quantity:number;minor:number;currency:string}
export function inventoryValue(events:CheckoutEvent[],ids:string[],currency:string,quotes:ShopifyConversion[]=[]){
 let totalMinor=0,priced=0,missing=0;
 for(const id of new Set(ids)){
  const rows=events.filter(e=>e.sessionId===id).sort((a,b)=>a.timestamp-b.timestamp);
  if(rows.some(e=>e.name==='checkout_completed'))continue;
  const alert=rows.filter(e=>e.category==='inventory').at(-1);if(!alert)continue;
  const states=rows.filter(e=>e.timestamp<=alert.timestamp&&e.name!=='alert_displayed');
  const after=states.at(-1),before=states.filter(e=>e.items?.length&&e.timestamp<(after?.timestamp??0)).at(-1);
  if(!after||!before||alert.timestamp-before.timestamp>15*60000){missing++;continue;}
  const remaining=after.items?new Set(after.items.map(i=>i.itemHash)):null;
  // Shopify may omit priced lines while removing an unavailable item. Only a
  // single previously observed line plus a zero eligible subtotal is attributable.
  const removed=remaining?before.items!.filter(i=>!remaining.has(i.itemHash)):
    after.subtotalCents===0&&before.items!.length===1?before.items!:[];
  if(!removed.length){missing++;continue;}
  // Round once for each checkout/currency subtotal, not once per line.
  const subtotals=new Map<string,number>();
  for(const item of removed)subtotals.set(item.currency,(subtotals.get(item.currency)??0)+item.minor);
  const amounts=[...subtotals].map(([source,minor])=>convertMoney({minor,currency:source},currency,id,quotes.find(q=>q.sessionId===id)));
  if(amounts.some(n=>n===null)){missing++;continue;}
  const subtotal=amounts.reduce<number>((sum,n)=>sum+n!,0);
  if(!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(totalMinor+subtotal)){missing++;continue;}
  totalMinor+=subtotal;priced++;
 }
 return {totalMinor:priced?totalMinor:null,priced,missing,currency};
}
