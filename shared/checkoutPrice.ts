import {checkoutIdentity} from './checkoutIdentity.ts';
import {moneyMinor,currencyScale} from './money.ts';

export interface CheckoutPrice {
 sessionId:string;currency:string;createdAt:string;updatedAt:number;
 subtotalCents:number|null;totalCents:number|null;recovered:boolean;
}
// Called only after Shopify's signature and store have been verified. Never
// retain raw tokens, recovery links, customer fields, or the original payload.
export function checkoutPrice(input:unknown):CheckoutPrice|null {
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const r=input as Record<string,unknown>;
 if(typeof r.token!=='string'||!r.token.length||r.token.length>512||typeof r.currency!=='string'||currencyScale(r.currency)===null)return null;
 if(typeof r.created_at!=='string'||typeof r.updated_at!=='string')return null;
 const created=Date.parse(r.created_at),updatedAt=Date.parse(r.updated_at);
 if(!Number.isFinite(created)||!Number.isFinite(updatedAt)||updatedAt<created)return null;
 if(r.completed_at!==null&&(typeof r.completed_at!=='string'||!Number.isFinite(Date.parse(r.completed_at))))return null;
 const subtotalCents=moneyMinor(r.subtotal_price,r.currency),totalCents=moneyMinor(r.total_price,r.currency);
 // Missing amounts remain unknown. Malformed supplied amounts reject delivery.
 if(r.subtotal_price!=null&&subtotalCents===null||r.total_price!=null&&totalCents===null)return null;
 return {sessionId:checkoutIdentity(r.token),currency:r.currency,createdAt:new Date(created).toISOString(),updatedAt,subtotalCents,totalCents,recovered:r.completed_at!==null};
}
export function shouldSaveCheckoutPrice(old:CheckoutPrice|null,next:CheckoutPrice):boolean {
 if(old?.recovered&&!next.recovered)return false;
 return !old||next.updatedAt>old.updatedAt||next.updatedAt===old.updatedAt&&next.recovered&&!old.recovered;
}
export function savedCheckoutSession(recordHash:string,records:{recordHash:string;sessionId?:string}[]):string|undefined {
 const matches=records.filter(r=>r.recordHash===recordHash);
 const id=matches.length===1?matches[0].sessionId:undefined;
 return id&&/^[a-f0-9]{64}$/.test(id)?id:undefined;
}
// Notification prices replace historical prices for the same session, while
// GraphQL totals stay the source for the aggregate abandoned-checkout count.
export function checkoutBaskets<T extends {sessionId?:string}>(historical:T[],prices:CheckoutPrice[],currency:string) {
 const rows=prices.filter(p=>p.currency===currency);
 const sessions=new Set(rows.map(p=>p.sessionId));
 return [...historical.filter(r=>!r.sessionId||!sessions.has(r.sessionId)),...rows.map(p=>({...p,recordHash:p.sessionId}))];
}
