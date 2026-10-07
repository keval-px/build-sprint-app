export interface MoneyAmount {minor:number;currency:string}
export interface ShopifyConversion {sessionId:string;shop:MoneyAmount;buyer:MoneyAmount}
const supportedCurrencies=new Set(Intl.supportedValuesOf('currency'));
const currencyScales=new Map<string,number>();
export function currencyScale(currency:string){
 const cached=currencyScales.get(currency);if(cached!==undefined)return cached;
 if(!/^[A-Z]{3}$/.test(currency)||!supportedCurrencies.has(currency))return null;
 const scale=10**new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
 currencyScales.set(currency,scale);return scale;
}
export function moneyMinor(amount:unknown,currency:string):number|null{
 const scale=currencyScale(currency);if(scale===null||typeof amount!=='string'||!/^\d+(\.\d+)?$/.test(amount))return null;
 const [whole,fraction='']=amount.split('.'),digits=Math.log10(scale);
 if(fraction.slice(digits).replace(/0/g,'').length)return null;
 const value=Number(whole)*scale+Number(fraction.slice(0,digits).padEnd(digits,'0'));
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
export function convertMoney(value:MoneyAmount,storeCurrency:string,sessionId:string,quote?:ShopifyConversion):number|null{
 if(currencyScale(value.currency)===null||currencyScale(storeCurrency)===null||!Number.isSafeInteger(value.minor)||value.minor<0)return null;
 if(value.currency===storeCurrency)return value.minor;
 if(!quote||quote.sessionId!==sessionId||quote.shop.currency!==storeCurrency||quote.buyer.currency!==value.currency||![quote.shop.minor,quote.buyer.minor].every(n=>Number.isSafeInteger(n)&&n>0))return null;
 // Only Shopify's paired amounts from this checkout; never today's or another buyer's rate.
 const numerator=BigInt(value.minor)*BigInt(quote.shop.minor),denominator=BigInt(quote.buyer.minor);
 const rounded=(numerator+denominator/BigInt(2))/denominator;
 return rounded<=BigInt(Number.MAX_SAFE_INTEGER)?Number(rounded):null;
}
export function formatMoney(minor:number,currency:string){const scale=currencyScale(currency);return scale===null?'Not available':new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:currency==='USD'?'narrowSymbol':'symbol'}).format(minor/scale);}
