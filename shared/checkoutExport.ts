import type {CheckoutEvent} from './evidence.ts';
import {lastObservedStep} from './dashboardInsights.ts';
import {currencyScale} from './money.ts';
export interface ExportJourney {id:string;label:string;startedAt:number;completed:boolean;basketCents?:number;events:CheckoutEvent[]}
export function csvCell(value:unknown){
 let text=String(value??'');
 if(/^\s*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return `"${text.replaceAll('"','""')}"`;
}
const csv=(rows:unknown[][])=>'\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
export function checkoutCSV(rows:ExportJourney[],currency:string){
 const scale=currencyScale(currency);
 return csv([['Checkout / order','Anonymous checkout ID','Started (UTC)','Status','Last observed step','Alert types','Events','Alerts','Basket value','Currency'],...rows.map(row=>[row.label,row.id,new Date(row.startedAt).toISOString(),row.completed?'Completed':'Unfinished',lastObservedStep(row.events),[...new Set(row.events.flatMap(e=>e.category?[e.category]:[]))].join('; '),row.events.length,row.events.filter(e=>e.category!==null).length,row.basketCents===undefined||scale===null?'':(row.basketCents/scale).toFixed(Math.log10(scale)),currency])]);
}
export function checkoutEventsCSV(rows:ExportJourney[]){
 return csv([['Checkout / order','Anonymous checkout ID','Event (UTC)','Event','Alert category','Shipping unavailable'],...rows.flatMap(row=>row.events.map(event=>[row.label,row.id,new Date(event.timestamp).toISOString(),event.name,event.category??'',event.shippingBlocker?'Yes':'']))]);
}
