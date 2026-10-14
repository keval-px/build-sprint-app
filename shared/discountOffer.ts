import {checkoutIdentity} from './checkoutIdentity.ts';
// Only a discount field's short code is hashed. Never retain arbitrary input.
export function discountCodeHash(target:unknown,value:unknown,message?:unknown):string|undefined {
 const field=typeof target==='string'&&/^\$?\.?cart\.discountCodes(?:\[\d+\])?(?:\.code)?$/i.test(target);
 const knownMessage=typeof message==='string'&&/^Enter a valid discount code(?: or gift card)?[.!]?$/i.test(message.trim());
 if((!field&&!knownMessage)||typeof value!=='string')return;
 const code=value.trim().toUpperCase();
 return /^[A-Z0-9_-]{4,32}$/.test(code)?checkoutIdentity(`discount:${code}`):undefined;
}
export interface PromisedOffer {code:string;codeHash:string;currency:string;minimumCents:number;startsAt:number;endsAt:number;verifiedAt:number}
export function promisedDiscount(offer:PromisedOffer|undefined,at:number,subtotalCents:unknown,currency:unknown,otherDiscounts:unknown):string|undefined {
 if(!offer||!Number.isFinite(at)||at<offer.startsAt||at>=offer.endsAt||at<offer.verifiedAt||currency!==offer.currency||!Number.isSafeInteger(subtotalCents)||Number(subtotalCents)<offer.minimumCents||otherDiscounts!==0)return;
 return offer.code;
}
