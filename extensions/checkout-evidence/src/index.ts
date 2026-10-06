import {register} from '@shopify/web-pixels-extension';
import {recordDigest,usdCents} from '../../../shared/shopifyRecords';
const store='build-sprint-demo.myshopify.com';
const endpoint='https://neighborly-nightingale-843.convex.site/api/shopify/pixel-events';
type SafeEvent={id:string;name:string;timestamp:string;context:{document:{location:{hostname:string}}};data?:{checkout?:{token?:string|null;subtotalPrice?:{amount:number;currencyCode:string}|null};alert?:{type?:string}}};
register(({analytics,browser,settings})=>{
  if(settings.endpoint!==endpoint)return;
  let sequence=Promise.resolve();
  const storage='keval-test-app-checkout';
  const collect=(event:SafeEvent)=>{
    sequence=sequence.then(async()=>{
      if(event.context.document.location.hostname!==store)return;
      const token=event.data?.checkout?.token;
      if(event.name==='checkout_started')await browser.sessionStorage.removeItem(storage);
      let sessionId:string|null=null;
      if(token){
        // Preserve the legacy checkout hash convention for exact identities.
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${store}:${token}`));
        sessionId=[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
        await browser.sessionStorage.setItem(storage,JSON.stringify({sessionId,at:Date.now()}));
      }else if(event.name==='alert_displayed'){
        const saved=await browser.sessionStorage.getItem(storage);
        if(saved){const value=JSON.parse(saved);if(Date.now()-value.at<15*60000 && value.at<=Date.now())sessionId=value.sessionId;}
      }
      if(!sessionId)return;
      const type=event.data?.alert?.type;
      const category=type==='DISCOUNT_ERROR'?'discount':type==='PAYMENT_ERROR'?'payment':type==='DELIVERY_ERROR'?'delivery':['INPUT_INVALID','INPUT_REQUIRED','CONTACT_ERROR'].includes(type??'')?'validation':null;
      const money=event.data?.checkout?.subtotalPrice;
      const subtotalCents=money?usdCents({amount:String(money.amount),currencyCode:money.currencyCode}):null;
      const payload={eventId:await recordDigest('pixel-event',event.id),sessionId,name:event.name,timestamp:Date.parse(event.timestamp),category:event.name==='alert_displayed'?category:null,...(subtotalCents===null?{}:{subtotalCents,currency:'USD'})};
      await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});
      if(event.name==='checkout_completed')await browser.sessionStorage.removeItem(storage);
    }).catch(()=>{/* Never log Shopify payloads or buyer data. */});
  };
  analytics.subscribe('checkout_started',collect);
  analytics.subscribe('checkout_contact_info_submitted',collect);
  analytics.subscribe('checkout_address_info_submitted',collect);
  analytics.subscribe('checkout_shipping_info_submitted',collect);
  analytics.subscribe('payment_info_submitted',collect);
  analytics.subscribe('checkout_completed',collect);
  analytics.subscribe('alert_displayed',collect);
});
