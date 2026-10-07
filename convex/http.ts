import {checkoutPrice} from '../shared/checkoutPrice';
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { parseTestEvent } from "../shared/evidence";
import {inventoryValue} from '../shared/inventoryValue';
import {checkoutCohort} from '../shared/dateRange';
import {summarize} from '../shared/evidence';
import {abandonedSummary} from '../shared/abandonedSummary';

import { isViewerId, isActionStep } from "../shared/actions";

import {authorizedAccess,syncStore,adminRead} from './shopify';
import {verifyMerchant,verifyLifecycle} from './lib/shopifyAuth';
import {pixelQuery,pixelCreate} from './lib/shopifyQueries';
import {canReadShopifyEvidence,mergeCheckoutEvents} from '../shared/checkoutIdentity';
import {STORE,parseTestEvent as parsePixelBase} from '../shared/evidence';

import {fixBaseline,isFixMission} from '../shared/fixTracking';
const http = httpRouter();
const privateReply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(status===401?{'X-Shopify-Retry-Invalid-Session-Request':'1'}:{})}});
const bearer=(request:Request)=>request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]??'';
http.route({path:'/shopify/app',method:'GET',handler:httpAction(async(ctx,request)=>{
  const id=process.env.SHOPIFY_CLIENT_ID;
  if(!id || !process.env.SHOPIFY_CLIENT_SECRET)return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connect keval-test-app</title><script src="https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js"></script></head><body><s-page heading="Connect keval-test-app"><s-section heading="Add the app settings in Convex"><s-paragraph>Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET from keval-test-app's Overview in Convex Settings → Environment Variables. Keep both values private. Then reopen this app from Shopify.</s-paragraph></s-section></s-page></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`frame-ancestors https://${STORE} https://admin.shopify.com;`}});
  const shop=new URL(request.url).searchParams.get('shop');
  if(shop && shop!==STORE)return new Response('This test app supports build-sprint-demo only.',{status:403});
  const asset=await ctx.runQuery(components.staticHosting.lib.resolveAssetForHttp,{path:'/index.html'});
  if(!asset?.storageUrl)return new Response('App frontend is not deployed.',{status:503});
  const html=await(await fetch(asset.storageUrl)).text();
  const safeId=id.replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
  return new Response(html.replace('<head>',`<head><meta name="shopify-api-key" content="${safeId}"><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`frame-ancestors https://${STORE} https://admin.shopify.com;`}});
})});
// Store markers require a valid Shopify session; public demo markers are browser-specific.
http.route({path:'/demo/fixes',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}))});
for(const mode of ['shopify','demo'] as const){
  http.route({path:`/${mode}/fixes`,method:'POST',handler:httpAction(async(ctx,request)=>{
    const respond=mode==='shopify'?privateReply:reply;
    try{
      if(mode==='shopify'){await verifyMerchant(bearer(request));const connection=await ctx.runQuery(internal.shopify.connection,{});if(!canReadShopifyEvidence(connection))return respond({error:'Shopify installation is disconnected.'},403);}
      const body=await request.text();if(body.length>500)return respond({error:'Invalid fix request.'},400);
      const data=JSON.parse(body);
      if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(key=>!['operation','viewerId','missionId'].includes(key))||!['read','mark','undo','retest','undo-retest'].includes(data.operation)||(mode==='demo'&&!isViewerId(data.viewerId)))return respond({error:'Invalid fix request.'},400);
      const scope=mode==='shopify'?STORE:`demo:${data.viewerId}`;
      if(data.operation==='retest'||data.operation==='undo-retest'){
        if(!isFixMission(data.missionId))return respond({error:'Invalid action.'},400);
        await ctx.runMutation(internal.fixes.retest,{scope,missionId:data.missionId,passed:data.operation==='retest'});
      }else if(data.operation!=='read'){
        if(!isFixMission(data.missionId))return respond({error:'Invalid action.'},400);
        const original=await ctx.runQuery(internal.events.readTestEvidence,{});
        const pixel=mode==='shopify'?await ctx.runQuery(internal.shopifyEvents.read,{}):null;
        const events=pixel?mergeCheckoutEvents(original.events,pixel.events):original.events;
        const fix=fixBaseline(events,data.missionId,Date.now(),original.truncated||!!pixel?.truncated);
        await ctx.runMutation(internal.fixes.mark,{scope,...fix,active:data.operation==='mark'});
      }
      return respond({fixes:await ctx.runQuery(internal.fixes.read,{scope})});
    }catch{return respond({error:'Could not save or load fix tracking.'},400);}
  })});
}
for(const operation of ['status','sync','evidence','pixel/enable']){
  http.route({path:`/shopify/${operation}`,method:operation==='status'||operation==='evidence'?'GET':'POST',handler:httpAction(async(ctx,request)=>{
    const token=bearer(request);
    try{await verifyMerchant(token);}catch{return privateReply({error:'Shopify session is invalid or expired.'},401);}
    try{
      if(operation==='sync')return privateReply(await syncStore(ctx,token));
      if(operation==='pixel/enable'){
        const access=await authorizedAccess(ctx,token);
        const settings=JSON.stringify({endpoint:'https://neighborly-nightingale-843.convex.site/api/shopify/pixel-events'});
        let exists=false;
        try{const current=await adminRead<{webPixel:{id:string;settings:unknown}|null}>(access,pixelQuery);exists=!!current.webPixel;}catch{/* Shopify errors when no app pixel exists. Creation below remains bounded. */}
        if(exists)return privateReply({enabled:true});
        const result=await adminRead<{webPixelCreate:{webPixel:{id:string}|null;userErrors:unknown[]}}>(access,pixelCreate,{settings});
        if(result.webPixelCreate.userErrors.length||!result.webPixelCreate.webPixel)throw Error('Pixel could not be enabled. Check the released extension and permissions.');
        return privateReply({enabled:true});
      }
      const connection=await ctx.runQuery(internal.shopify.connection,{});
      const snapshot=await ctx.runQuery(internal.shopify.snapshot,{});
      if(operation==='status')return privateReply({store:STORE,connected:!!connection,lastSyncedAt:snapshot?.syncedAt??null});
      if(!canReadShopifyEvidence(connection))return privateReply({error:'Shopify installation is disconnected or permissions were removed.'},403);
      const original=await ctx.runQuery(internal.events.readTestEvidence,{});
      const pixel=await ctx.runQuery(internal.shopifyEvents.read,{});
      const catalogModel=await ctx.runQuery(internal.catalog.read,{});
      const abandonedCheckouts=await ctx.runQuery(internal.abandoned.read,{});
      const observedPurchases=await ctx.runQuery(internal.purchases.read,{});
      const checkoutPrices=await ctx.runQuery(internal.checkoutPrices.read,{});
      return privateReply({...original,events:mergeCheckoutEvents(original.events,pixel.events),truncated:original.truncated||pixel.truncated,totalStored:original.totalStored+pixel.events.length,catalogModel,abandonedCheckouts,observedPurchases,checkoutPrices,shopifySnapshot:snapshot?{currency:snapshot.currency??'USD',syncedAt:snapshot.syncedAt,periodStart:snapshot.periodStart,orders:snapshot.orders,abandoned:snapshot.abandoned}:null,enabled:true,source:'Demo Shopify browser and server evidence.',sampledAt:Date.now()});
    }catch(error){
      const message=error instanceof Error ? error.message : '';
      const reasons=['Shopify authorization failed. Check installation and permissions.','Install the requested Shopify permissions first.','Shopify could not return data. Check permissions and retry; previous results are retained.','Unexpected store or missing Shopify permissions.'];
      const safeBlock=/^Shopify blocked (abandoned checkouts|orders|app settings): (protected customer data approval required|access denied|query rejected)\.$/.test(message);
      return privateReply({error:reasons.includes(message)||safeBlock?message:'Shopify connection needs attention. Check credentials, installation and permissions; previous results are retained.'},503);
    }
  })});
}
http.route({path:'/shopify/webhooks',method:'POST',handler:httpAction(async(ctx,request)=>{
  const body=await request.text();if(body.length>100000)return privateReply({error:'Payload too large.'},413);
  const valid=await verifyLifecycle(request,body);if(!valid)return privateReply({error:'Invalid Shopify notification.'},401);
  const topic=request.headers.get('X-Shopify-Topic');
  if(topic==='app/uninstalled'||topic==='app/scopes_update'){
    const triggeredAt=Date.parse(request.headers.get('X-Shopify-Triggered-At')??'');
    const eventId=request.headers.get('X-Shopify-Event-Id')??request.headers.get('X-Shopify-Webhook-Id');
    if(!eventId||!Number.isFinite(triggeredAt))return privateReply({error:'Missing notification identity.'},400);
    await ctx.runMutation(internal.shopify.revoke,{eventId,triggeredAt});
  }else if(topic==='checkouts/create'||topic==='checkouts/update'){
    if(process.env.SHOPIFY_CHECKOUT_PRICES_ENABLED!=='true')return privateReply({error:'Checkout notifications are not activated.'},503);
    const triggeredAt=Date.parse(request.headers.get('X-Shopify-Triggered-At')??'');
    let price;try{price=checkoutPrice(JSON.parse(body));}catch{return privateReply({error:'Invalid checkout notification.'},400);}
    if(!price||!Number.isFinite(triggeredAt))return privateReply({error:'Invalid checkout notification.'},400);
    await ctx.runMutation(internal.checkoutPrices.save,{price,triggeredAt});
  }return privateReply({received:true});
})});
http.route({path:'/shopify/pixel-events',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}))});
http.route({path:'/shopify/pixel-events',method:'POST',handler:httpAction(async(ctx,request)=>{
  const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'no-store'};
  const body=await request.text();if(body.length>12000)return new Response('{}',{status:413,headers:cors});
  try{
    const input=JSON.parse(body);const {subtotalCents,currency,items,...base}=input;
    if(!parsePixelBase(base,Date.now())||((subtotalCents!==undefined||currency!==undefined)&&(!Number.isSafeInteger(subtotalCents)||subtotalCents<0||currency!=='USD')))throw Error();
    if(!await ctx.runQuery(internal.shopify.connection,{}))return new Response('{}',{status:503,headers:cors});
    const result=await ctx.runMutation(internal.shopifyEvents.record,{...base,...(items===undefined?{}:{items}),...(subtotalCents===undefined?{}:{subtotalCents,currency})});
    return new Response(JSON.stringify({result}),{status:result==='full'?429:result==='invalid'?400:200,headers:cors});
  }catch{return new Response('{}',{status:400,headers:cors});}
})});
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

http.route({ path: "/test-events", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers })) });
http.route({ path: "/test-events", method: "POST", handler: httpAction(async (ctx, request) => {
  if (process.env.SHOPIFY_TEST_COLLECTION_ENABLED !== "true") return reply({ error: "Test collection is disabled." }, 503);
  const body = await request.text();
  if (body.length > 1500) return reply({ error: "Payload too large." }, 413);
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return reply({ error: "Invalid JSON." }, 400); }
  const event = parseTestEvent(parsed, Date.now());
  if (!event) return reply({ error: "Invalid anonymous test event." }, 400);
  const result = await ctx.runMutation(internal.events.recordTestEvent, event);
  return reply({ result }, result === "full" ? 429 : result === "invalid" ? 400 : 200);
}) });
http.route({ path: "/test-evidence", method: "GET", handler: httpAction(async (ctx,request) => {
  const evidence = await ctx.runQuery(internal.events.readTestEvidence, {});
  // Correct categories only on identities already public in the legacy demo feed.
  // Do not publish additional private sessions, prices, or Shopify records.
  const pixel=await ctx.runQuery(internal.shopifyEvents.read,{});
  const categories=new Map(pixel.events.map(event=>[event.eventId,event]));
  const events=evidence.events.map(event=>categories.has(event.eventId)?{...event,category:categories.get(event.eventId)!.category,...(categories.get(event.eventId)!.shippingBlocker?{shippingBlocker:categories.get(event.eventId)!.shippingBlocker}:{})}:event);
  const catalogModel = await ctx.runQuery(internal.catalog.read, {});
  const abandonedCheckouts = await ctx.runQuery(internal.abandoned.read, {});
  const observedPurchases = await ctx.runQuery(internal.purchases.read, {});
  const params=new URL(request.url).searchParams,start=Number(params.get('start')),end=Number(params.get('end'));
  let abandonedBasketSummary=null,inventoryItemValue=null;
  // Publish only aggregate test-store metrics. Private order/checkout records stay private.
  if(params.has('start')&&params.has('end')&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<end&&end-start<=31*86400000){
    const connection=await ctx.runQuery(internal.shopify.connection,{});
    const snapshot=canReadShopifyEvidence(connection)?await ctx.runQuery(internal.shopify.snapshot,{}):null;
    if(snapshot)abandonedBasketSummary={...abandonedSummary(snapshot.abandoned,start,end),syncedAt:snapshot.syncedAt,currency:snapshot.currency??'USD'};
    if(snapshot){
      const currency=snapshot.currency??'USD';
      const ids=summarize(checkoutCohort(events,{start,end})).journeys.filter(j=>!j.completed&&j.events.some(e=>e.category==='inventory')).map(j=>j.id);
      const quotes=snapshot.orders.flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]);
      // Aggregate only the existing public test-session cohort; never publish item identities or buyer amounts.
      inventoryItemValue={...inventoryValue(pixel.events,ids,currency,quotes),rangeStart:start,rangeEnd:end};
    }
  }
  return reply({ ...evidence, events, catalogModel, observedPurchases, abandonedCheckouts, abandonedBasketSummary, inventoryItemValue, enabled: process.env.SHOPIFY_TEST_COLLECTION_ENABLED === "true", source: "Unverified browser test events. No live merchant data.", sampledAt: Date.now() });
}) });

for (const path of ["/action-progress/read", "/action-progress/update"]) {
  http.route({ path, method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers })) });
  http.route({ path, method: "POST", handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (body.length > 500) return reply({error: "Payload too large."}, 413);
    let input: unknown;
    try { input = JSON.parse(body); } catch { return reply({error: "Invalid JSON."}, 400); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply({error: "Invalid progress request."}, 400);
    const data = input as Record<string, unknown>;
    const allowed = path.endsWith("/read") ? ["viewerId"] : ["viewerId", "stepId", "completed"];
    if (Object.keys(data).some(key => !allowed.includes(key)) || !isViewerId(data.viewerId)) return reply({error: "Invalid anonymous viewer."}, 400);
    if (path.endsWith("/read")) return reply(await ctx.runQuery(internal.progress.read, {viewerId: data.viewerId}));
    if (!isActionStep(data.stepId) || typeof data.completed !== "boolean") return reply({error: "Invalid checklist step."}, 400);
    const result = await ctx.runMutation(internal.progress.setStep, {viewerId: data.viewerId, stepId: data.stepId, completed: data.completed});
    return reply(result, result.error ? 429 : 200);
  }) });
}

export default http;
