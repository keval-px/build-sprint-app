import {discountCodeHash} from '../../../shared/discountOffer';
import {appDisplayName} from '../../../shared/extensionApp';
import {recentCheckout} from '../../../shared/pixelSession';
import {register} from '@shopify/web-pixels-extension';
import {moneyMinor} from '../../../shared/money';
import {usdCents} from '../../../shared/shopifyRecords';
import {checkoutIdentity} from '../../../shared/checkoutIdentity';
import {alertCategory,shippingBlocker} from '../../../shared/alertCategory';
const store='build-sprint-demo.myshopify.com';
const endpoint='https://neighborly-nightingale-843.convex.site/api/shopify/pixel-events';
type SafeEvent={clientId?:string;id:string;name:string;timestamp:string;context:{document:{location:{hostname:string}}};data?:{error?:{appId?:string;appName?:string};checkout?:{token?:string|null;discountApplications?:unknown[];lineItems?:{id?:string|null;quantity:number;finalLinePrice?:{amount:number;currencyCode:string}}[];subtotalPrice?:{amount:number;currencyCode:string}|null};alert?:{type?:string;target?:string;message?:string;value?:string|null}}};
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
        sessionId=checkoutIdentity(token);
        await browser.sessionStorage.setItem(storage,JSON.stringify({sessionId,at:Date.parse(event.timestamp),clientHash:event.clientId?checkoutIdentity(event.clientId):null,subtotal:event.data?.checkout?.subtotalPrice??null,discountCount:Array.isArray(event.data?.checkout?.discountApplications)?event.data!.checkout!.discountApplications!.length:null}));
      }else if(event.name==='alert_displayed'||event.name==='ui_extension_errored'){
        const saved=await browser.sessionStorage.getItem(storage);
        if(saved)sessionId=recentCheckout(saved,Date.parse(event.timestamp),event.clientId?checkoutIdentity(event.clientId):null,event.name==='ui_extension_errored');
      }
      if(!sessionId)return;
      const extensionAppId=event.data?.error?.appId;
      if(event.name==='ui_extension_errored'&&(!extensionAppId||!/^(?:gid:\/\/shopify\/App\/)?[0-9]{1,30}$/.test(extensionAppId)))return;
      const extensionAppName=appDisplayName(event.data?.error?.appName);
      const alert=event.data?.alert;
      const category=alertCategory(alert?.type,alert?.target,alert?.message);
      const codeHash=event.name==='alert_displayed'&&category==='discount'?discountCodeHash(alert?.target,alert?.value,alert?.message):undefined;
      let discountBasis:{subtotal?:{amount:number;currencyCode:string};discountCount?:number}|undefined;
      if(codeHash){const saved=await browser.sessionStorage.getItem(storage);if(saved&&recentCheckout(saved,Date.parse(event.timestamp),event.clientId?checkoutIdentity(event.clientId):null,true)===sessionId)discountBasis=JSON.parse(saved);}
      const money=event.data?.checkout?.subtotalPrice??discountBasis?.subtotal;
      const subtotalCents=money?usdCents({amount:String(money.amount),currencyCode:money.currencyCode}):null;
      const lines=event.data?.checkout?.lineItems;
      const items=lines?.length!==undefined&&lines.length<=20?lines.map(line=>({itemHash:line.id?checkoutIdentity(line.id):null,quantity:line.quantity,minor:line.finalLinePrice?moneyMinor(String(line.finalLinePrice.amount),line.finalLinePrice.currencyCode):null,currency:line.finalLinePrice?.currencyCode})):undefined;
      const validItems=items?.every(i=>i.itemHash&&i.minor!==null&&Number.isSafeInteger(i.quantity)&&i.quantity>0);
      const blocker=event.name==='alert_displayed'?shippingBlocker(alert?.type,alert?.message):undefined;
      const payload={...(codeHash?{discountCodeHash:codeHash,...(typeof discountBasis?.discountCount==='number'?{appliedDiscountCount:discountBasis.discountCount}:{})}:{}),...(event.name==='ui_extension_errored'?{extensionAppHash:checkoutIdentity(extensionAppId!),...(extensionAppName?{extensionAppName}:{})}:{}),...(blocker?{shippingBlocker:blocker}:{}),...(validItems?{items}:{}),eventId:checkoutIdentity(event.id),sessionId,name:event.name,timestamp:Date.parse(event.timestamp),category:event.name==='ui_extension_errored'?'extension':event.name==='alert_displayed'?category:null,...(subtotalCents===null?{}:{subtotalCents,currency:'USD'})};
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
  analytics.subscribe('ui_extension_errored',collect);
});
