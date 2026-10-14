import type {CheckoutOutcome} from './checkoutOutcome.ts';
import type {CheckoutEvent} from './evidence.ts';
import {currencyScale} from './money.ts';
import {eventFields,type CheckoutTableRow} from './checkoutTable.ts';
export interface ExportJourney {id:string;label:string;startedAt:number;completed:boolean;outcome?:CheckoutOutcome;basketCents?:number;events:CheckoutEvent[]}
type CSVRow=Pick<CheckoutTableRow,'id'|'label'|'startedAt'|'outcomeText'|'simulated'|'lastStep'|'categories'|'eventCount'|'alertCount'|'basketCents'>;
export function csvCell(value:unknown){
 let text=String(value??'');
 if(/^\s*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return `"${text.replaceAll('"','""')}"`;
}
const csv=(rows:unknown[][])=>'﻿'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
// A checkout with its events, in the shape the checkouts CSV reads.
export function exportRow(journey:ExportJourney):CSVRow {
 return {...eventFields(journey.events,journey.completed,journey.outcome),id:journey.id,label:journey.label,startedAt:journey.startedAt,basketCents:journey.basketCents};
}
export function checkoutCSV(rows:CSVRow[],currency:string){
 const scale=currencyScale(currency);
 return csv([['Checkout / order','Anonymous checkout ID','Started (UTC)','Status','Last observed step','Alert types','Events','Alerts','Basket value','Currency'],...rows.map(row=>[row.label,row.id,new Date(row.startedAt).toISOString(),row.outcomeText+(row.simulated?' · Simulated':''),row.lastStep,row.categories.join('; '),row.eventCount,row.alertCount,row.basketCents===undefined||scale===null?'':(row.basketCents/scale).toFixed(Math.log10(scale)),currency])]);
}
export function checkoutEventsCSV(rows:{id:string;label:string;events:CheckoutEvent[]}[]){
 return csv([['Checkout / order','Anonymous checkout ID','Event (UTC)','Event','Alert category','Shipping unavailable'],...rows.flatMap(row=>row.events.map(event=>[row.label,row.id,new Date(event.timestamp).toISOString(),event.name,event.category??'',event.shippingBlocker?'Yes':'']))]);
}
