import {validMonitoring,validMonitoringEvents,type MonitoringEvidence} from './monitoringHealth.ts';
import {currencyScale} from './money.ts';
import type {CheckoutEvent} from './evidence.ts';
import type {actionValues} from './actionValues.ts';
import type {inventoryValue} from './inventoryValue.ts';
import type {abandonedSummary} from './abandonedSummary.ts';
import type {CheckoutPrice} from './checkoutPrice.ts';
import type {AbandonedSnapshot} from './abandoned.ts';
import type {OrderPattern} from './orderPattern.ts';
import type {SavedBasket} from './basketValue.ts';
import type {OverviewSummary} from './overviewSummary.ts';
import type {CheckoutTable} from './checkoutTable.ts';
import {funnelFilters} from './checkoutFunnel.ts';
export interface EvidenceResponse {
  monitoring?:MonitoringEvidence; storeName?:string; store: string; events: CheckoutEvent[]; totalStored: number; truncated: boolean;
  abandonedCheckouts?:AbandonedSnapshot|null; enabled: boolean; sampledAt: number; 
  actionBasketValue?:(ReturnType<typeof actionValues>)|null;
  inventoryItemValue?:(ReturnType<typeof inventoryValue>&{rangeStart:number;rangeEnd:number})|null;
  abandonedBasketSummary?:(ReturnType<typeof abandonedSummary>&{syncedAt:number;currency?:string})|null;
  checkoutPrices?:CheckoutPrice[];
  orderPatterns?:OrderPattern|null;
  overview?:OverviewSummary;
  table?:CheckoutTable;
  shopifySnapshot?:{timeZone?:string;currency?:string;syncedAt:number;periodStart:string;orders:({subtotalCents:number|null;test:boolean;paid:boolean;cancelled:boolean;recordHash:string;createdAt:string;sessionId?:string;orderName?:string;orderId?:string;totalCents?:number|null;conversion?:{shopMinor:number;buyerMinor:number;buyerCurrency:string}})[];abandoned:(SavedBasket&{recordHash:string;createdAt:string;recovered:boolean})[]}|null;
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const count=(v:unknown):v is number=>finite(v)&&Number.isSafeInteger(v);
const money=(v:unknown)=>v===null||count(v);
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const string=(v:unknown)=>typeof v==='string';
const optional=(v:unknown,valid:(v:unknown)=>boolean)=>v===undefined||valid(v);
const nullable=(v:unknown,valid:(v:unknown)=>boolean)=>v===undefined||v===null||valid(v);
const list=(v:unknown,valid:(v:unknown)=>boolean)=>Array.isArray(v)&&v.every(valid);
const currency=(v:unknown)=>string(v)&&currencyScale(v as string)!==null;
const zone=(v:unknown)=>{if(!string(v))return false;try{new Intl.DateTimeFormat('en',{timeZone:v as string});return true;}catch{return false;}};
const session=(v:unknown)=>string(v)&&/^[a-f0-9]{64}$/.test(v as string);
const conversion=(v:unknown)=>object(v)&&count(v.shopMinor)&&count(v.buyerMinor)&&currency(v.buyerCurrency);
const native=(v:unknown)=>object(v)&&string(v.recordHash)&&date(v.createdAt)&&money(v.subtotalCents)&&optional(v.totalCents,money)&&optional(v.sessionId,session);
const order=(v:unknown)=>native(v)&&object(v)&&typeof v.paid==='boolean'&&typeof v.cancelled==='boolean'&&typeof v.test==='boolean'&&optional(v.orderName,string)&&optional(v.orderId,string)&&optional(v.conversion,conversion);
const basket=(v:unknown)=>native(v)&&object(v)&&typeof v.recovered==='boolean';
const price=(v:unknown)=>object(v)&&session(v.sessionId)&&currency(v.currency)&&date(v.createdAt)&&finite(v.updatedAt)&&optional(v.completedAt,finite)&&money(v.subtotalCents)&&money(v.totalCents)&&typeof v.recovered==='boolean';
const range=(v:Record<string,unknown>)=>finite(v.rangeStart)&&finite(v.rangeEnd)&&v.rangeEnd>v.rangeStart;
const amount=(v:unknown)=>object(v)&&string(v.id)&&count(v.eligibleSessions)&&count(v.matchedSessions)&&count(v.unknownSessions)&&money(v.totalCents);
const line=(v:unknown)=>object(v)&&session(v.itemHash)&&count(v.quantity)&&v.quantity!==0&&count(v.minor)&&currency(v.currency);
const eventDetails=(v:unknown)=>object(v)&&optional(v.deviceClass,x=>x==='mobile'||x==='desktop'||x==='tablet')&&optional(v.expressPay,x=>x===true)&&optional(v.subtotalCents,count)&&optional(v.currency,currency)&&optional(v.items,x=>list(x,line))&&optional(v.extensionAppName,string)&&optional(v.extensionAppHash,session)&&optional(v.discountCodeHash,session)&&optional(v.discountOfferCode,string)&&optional(v.shippingBlocker,x=>x==='no_shipping_available');
const funnelRow=(v:unknown)=>object(v)&&string(v.label)&&count(v.count)&&finite(v.percent)&&(v.drop===null||typeof v.drop==='number'&&Number.isInteger(v.drop));
const funnel=(v:unknown)=>object(v)&&list(v.rows,funnelRow)&&(v.rows as unknown[]).length===5&&count(v.count)&&count(v.total)&&count(v.unknownDevice)&&count(v.completed);
const overview=(v:unknown)=>object(v)&&range(v)&&count(v.sessionCount)&&count(v.completed)&&count(v.noCompletionObserved)&&count(v.eventCount)&&object(v.funnels)&&funnelFilters.every(f=>funnel((v.funnels as Record<string,unknown>)[f]));
const bool=(v:unknown)=>typeof v==='boolean';
const outcome=(v:unknown)=>object(v)&&bool(v.serverCompleted)&&list(v.sources,x=>x==='browser'||x==='paid_order'||x==='signed_checkout')&&bool(v.legacySignedCompletion)&&bool(v.conflicting);
const tableRow=(v:unknown)=>object(v)&&session(v.id)&&string(v.label)&&(v.orderHref===null||typeof v.orderHref==='string'&&/^shopify:\/\/admin\/orders\/[1-9]\d*$/.test(v.orderHref))&&finite(v.startedAt)&&bool(v.completed)&&string(v.outcomeText)&&outcome(v.outcome)&&list(v.categories,x=>['discount','payment','delivery','validation','inventory','extension'].includes(x as string))&&bool(v.shippingBlocker)&&string(v.lastStep)&&bool(v.simulated)&&count(v.eventCount)&&v.eventCount!==0&&count(v.alertCount)&&optional(v.basketCents,count);
const table=(v:unknown)=>object(v)&&range(v)&&finite(v.asOf)&&list(v.rows,tableRow);
const pattern=(v:unknown)=>object(v)&&string(v.day)&&zone(v.timeZone)&&count(v.baselineDays)&&finite(v.syncedAt)&&count(v.testOrders)&&count(v.totalOrders)&&Array.isArray(v.hours)&&v.hours.length===24&&v.hours.every(h=>object(h)&&count(h.hour)&&h.hour<24&&money(h.count)&&(h.average===null||finite(h.average)));

// Validate every nested structure consumed by filtering, calculations and UI
// before it can replace the last successful response. No partial coercion.
export function prepareEvidence(value:unknown,store:string):EvidenceResponse {
 if(!object(value)||value.store!==store||!validMonitoringEvents(value.events)||!value.events.every(eventDetails)||!optional(value.storeName,string)||typeof value.enabled!=='boolean'||!finite(value.sampledAt)||!count(value.totalStored)||typeof value.truncated!=='boolean'||!optional(value.monitoring,validMonitoring))throw Error('Invalid evidence response.');
 if(!nullable(value.shopifySnapshot,s=>object(s)&&optional(s.timeZone,zone)&&optional(s.currency,currency)&&finite(s.syncedAt)&&date(s.periodStart)&&list(s.orders,order)&&list(s.abandoned,basket))||!optional(value.checkoutPrices,p=>list(p,price))||!nullable(value.orderPatterns,pattern)||!optional(value.overview,overview)||!optional(value.table,table))throw Error('Invalid server evidence.');
 if(!nullable(value.abandonedCheckouts,s=>object(s)&&string(s.importedOn)&&count(s.emailSent)&&count(s.emailNotSent)&&list(s.records,r=>object(r)&&string(r.recordHash)&&nullable(r.sessionId,session)&&count(r.subtotalCents)&&r.currency==='USD'&&typeof r.recovered==='boolean'))||!nullable(value.abandonedBasketSummary,s=>object(s)&&range(s)&&finite(s.syncedAt)&&optional(s.currency,currency)&&count(s.count)&&money(s.totalCents)&&money(s.averageCents)&&count(s.unpricedCount)))throw Error('Invalid basket evidence.');
 if(!nullable(value.actionBasketValue,s=>object(s)&&range(s)&&list(s.actions,amount)&&object(s.combined)&&amount({...s.combined,id:'combined'}))||!nullable(value.inventoryItemValue,s=>object(s)&&range(s)&&money(s.totalMinor)&&count(s.priced)&&count(s.missing)&&currency(s.currency)))throw Error('Invalid aggregate evidence.');
 return value as unknown as EvidenceResponse;
}

// Events fetched for one checkout's details or the events export.
export function prepareEvents(value:unknown):CheckoutEvent[] {
 if(!object(value)||!validMonitoringEvents(value.events)||!value.events.every(eventDetails))throw Error('Invalid checkout activity.');
 return value.events as CheckoutEvent[];
}

import {FIX_MISSIONS,type AppliedFix} from './fixTracking.ts';
export function prepareFixes(value:unknown):{fixes:AppliedFix[];history:(AppliedFix&{active:boolean;withdrawnAt?:number})[]} {
 const fix=(v:unknown)=>object(v)&&typeof v.missionId==='string'&&FIX_MISSIONS.includes(v.missionId as AppliedFix['missionId'])&&finite(v.appliedAt)&&object(v.baseline)&&count(v.baseline.checkouts)&&count(v.baseline.affected)&&count(v.baseline.completed)&&list(v.affectedIds,session)&&typeof v.partial==='boolean'&&optional(v.retestedAt,finite)&&optional(v.signal,x=>x==='shipping_unavailable');
 if(!object(value)||!list(value.fixes,fix)||!optional(value.history,h=>list(h,r=>fix(r)&&object(r)&&typeof r.active==='boolean'&&optional(r.withdrawnAt,finite))))throw Error('Invalid fix history.');
 const fixes=value.fixes as AppliedFix[];
 return {fixes,history:value.history===undefined?fixes.map(f=>({...f,active:true})):value.history as (AppliedFix&{active:boolean;withdrawnAt?:number})[]};
}
