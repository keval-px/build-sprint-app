import {shopifyOrigin,frontendStorageUrl,isLocal} from './lib/deployment';
import {ReportLimit,reportJSON,coversPeriod} from '../shared/capacity';
import {readEvidence,readCheckout} from './capacity';
import {monitoringHealth} from '../shared/monitoringHealth';
import {orderPattern} from '../shared/orderPattern';
import {actionValues} from '../shared/actionValues';
import {checkoutPrice} from '../shared/checkoutPrice';
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { parseTestEvent } from "../shared/evidence";
import {inventoryValue} from '../shared/inventoryValue';
import {checkoutCohort} from '../shared/dateRange';
import {summarize} from '../shared/evidence';
import {abandonedSummary} from '../shared/abandonedSummary';
import {overviewSummary} from '../shared/overviewSummary';
import {checkoutTable} from '../shared/checkoutTable';
import {insightReport} from '../shared/insightReport';
import type {MonitoringEvidence} from '../shared/monitoringHealth';
import type {CheckoutEvent} from '../shared/evidence';
import type {ActionCtx} from './_generated/server';

import { isViewerId } from "../shared/actions";

import {authorizedAccess,syncStore,adminRead,enableLocalPixel} from './shopify';
import {verifyMerchant,verifyLifecycle} from './lib/shopifyAuth';
import {invalidSessionResponse} from '../shared/shopifyRequest';
import {pixelQuery,pixelCreate} from './lib/shopifyQueries';
import {canReadShopifyEvidence} from '../shared/checkoutIdentity';
import {STORE,parseTestEvent as parsePixelBase} from '../shared/evidence';

import {fixBaseline,isFixMission} from '../shared/fixTracking';
const http = httpRouter();
// Dates the page asked for, as epoch milliseconds. Anything else gets no overview,
// and the page falls back to counting the events itself.
function requestedRange(params:URLSearchParams){
 const start=Number(params.get('start')),end=Number(params.get('end'));
 return params.has('start')&&params.has('end')&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<end?{start,end}:null;
}
type EvidenceRead=Awaited<ReturnType<typeof readEvidence>>;
// Saved markers for a scope, keeping only known missions.
async function savedFixes(ctx:ActionCtx,scope:string){
 return (await ctx.runQuery(internal.fixes.read,{scope})).flatMap(fix=>isFixMission(fix.missionId)?[{...fix,missionId:fix.missionId}]:[]);
}
// Trend checks need data health at read time. Simulated runs are judged on read success alone.
function trendInputs(events:CheckoutEvent[],monitoring:MonitoringEvidence,asOf:number,range:{start:number;end:number},truncated:boolean){
 const simulationMode=isLocal&&events.some(e=>e.simulated);
 return {simulationMode,healthy:simulationMode?!truncated:monitoringHealth({evidence:monitoring,events:checkoutCohort(events,range),sampledAt:asOf,truncated,rangeStart:range.start,now:asOf}).canAssess};
}
// The merchant's evidence for the dates asked about. `read` reuses a read already made.
async function merchantEvidence(ctx:ActionCtx,params:URLSearchParams,read?:EvidenceRead){
 const {window,events:combined,orphan}=read??await readEvidence(ctx,'merchant'),original=window.legacy,pixel=window.pixel;
 const abandonedCheckouts=await ctx.runQuery(internal.abandoned.read,{});
 const historyUnavailable=window.historyUnavailable,checkoutPrices=window.prices,completeSnapshot=window.snapshot;
 const sync=await ctx.runQuery(internal.capacity.reportMonitoring,window.syncHeader);
 const selectedStart=params.get('start');const outside=selectedStart!==null&&Number.isFinite(Number(selectedStart))&&Number(selectedStart)<window.start;const serverHistoryMissing=selectedStart!==null&&!!completeSnapshot&&!coversPeriod(completeSnapshot.periodStart,Number(selectedStart));
 const shopifySnapshot=completeSnapshot&&!serverHistoryMissing?{timeZone:completeSnapshot.timeZone,currency:completeSnapshot.currency??'USD',syncedAt:completeSnapshot.syncedAt,periodStart:completeSnapshot.periodStart,orders:completeSnapshot.orders,abandoned:completeSnapshot.abandoned}:null;
 const monitoring={collection:pixel.collection,sync,historyUnavailable:historyUnavailable||serverHistoryMissing},truncated=outside||serverHistoryMissing||orphan||original.truncated||pixel.truncated;
 // Same completion facts the page uses: the orders it receives and the checkout prices.
 const range=requestedRange(params),facts={orders:shopifySnapshot?.orders??[],prices:checkoutPrices??[],asOf:window.asOf},currency=shopifySnapshot?.currency??'USD';
 const overview=range?overviewSummary(combined,facts,range):undefined;
 const table=range?checkoutTable(combined,facts,range,{currency,orders:shopifySnapshot?.orders,abandoned:shopifySnapshot?.abandoned,prices:checkoutPrices,legacy:abandonedCheckouts?.records}):undefined;
 const insights=range?insightReport({events:combined,facts,now:window.asOf,range,fixes:await savedFixes(ctx,STORE),currency,
  values:{abandonedCheckouts,abandoned:shopifySnapshot?.abandoned??[],prices:checkoutPrices??[],orders:shopifySnapshot?.orders??[]},trends:trendInputs(combined,monitoring,window.asOf,range,truncated)}):undefined;
 return {...original,overview,table,insights,monitoring,events:combined,truncated,totalStored:combined.length,abandonedCheckouts,checkoutPrices,storeName:completeSnapshot?.storeName,shopifySnapshot,enabled:true,sampledAt:window.asOf};
}
// The public demo's evidence. Correct categories only on identities already public in
// the legacy demo feed; do not publish additional private sessions, prices, or Shopify records.
async function publicEvidence(ctx:ActionCtx,params:URLSearchParams,read?:EvidenceRead){
  const {window,events,orphan}=read??await readEvidence(ctx,'public'),evidence=window.legacy,pixel=window.pixel;
  const abandonedCheckouts = await ctx.runQuery(internal.abandoned.read, {});
  const start=Number(params.get('start')),end=Number(params.get('end'));
  let storeName:string|undefined,serverHistoryMissing=false;
  let abandonedBasketSummary:(ReturnType<typeof abandonedSummary>&{syncedAt:number;currency:string})|null=null,inventoryItemValue:(ReturnType<typeof inventoryValue>&{rangeStart:number;rangeEnd:number})|null=null,actionBasketValue:ReturnType<typeof actionValues>|null=null,orderPatterns:ReturnType<typeof orderPattern>|null=null;
  // Publish only aggregate test-store metrics. Private order/checkout records stay private.
  if(params.has('start')&&params.has('end')&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<end&&end-start<=31*86400000){
    const connection=await ctx.runQuery(internal.shopify.connection,{});
    const available=canReadShopifyEvidence(connection)?window.snapshot:null;serverHistoryMissing=!!available&&!coversPeriod(available.periodStart,start);const snapshot=serverHistoryMissing?null:available;
    storeName=snapshot?.storeName;
    if(snapshot)abandonedBasketSummary={...abandonedSummary(snapshot.abandoned,start,end),syncedAt:snapshot.syncedAt,currency:snapshot.currency??'USD'};
    if(snapshot){
      orderPatterns=orderPattern(snapshot.orders,snapshot.periodStart,snapshot.syncedAt,snapshot.timeZone??'UTC');
      const currency=snapshot.currency??'USD';
      const prices=window.prices;
      actionBasketValue=actionValues(events,abandonedCheckouts,snapshot.abandoned,prices,currency,start,end,snapshot.orders);
      // Same completion facts as the recommendations, so a paid order is never counted as unfinished.
      const ids=summarize(checkoutCohort(events,{start,end}),{orders:snapshot.orders,prices}).journeys.filter(j=>!j.completed&&j.events.some(e=>e.category==='inventory')).map(j=>j.id);
      const quotes=snapshot.orders.flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]);
      // Aggregate only the existing public test-session cohort; never publish item identities or buyer amounts.
      inventoryItemValue={...inventoryValue(pixel.events,ids,currency,quotes),rangeStart:start,rangeEnd:end};
    }
  }
  const monitoring={collection:evidence.collection,historyUnavailable:window.historyUnavailable||serverHistoryMissing},truncated=serverHistoryMissing||orphan||evidence.truncated||(params.has('start')&&start<window.start);
  // The public page receives no Shopify orders or prices, so it counts browser evidence only.
  const range=requestedRange(params),facts={asOf:window.asOf},currency=abandonedBasketSummary?.currency??'USD';
  const overview=range?overviewSummary(events,facts,range):undefined;
  const table=range?checkoutTable(events,facts,range,{currency,legacy:abandonedCheckouts?.records}):undefined;
  // Demo markers belong to one browser, named by its anonymous viewer ID.
  const viewer=params.get('viewer'),fixes=isViewerId(viewer)?await savedFixes(ctx,`demo:${viewer}`):[];
  const insights=range?insightReport({events,facts,now:window.asOf,range,fixes,currency,
   values:{abandonedCheckouts,abandoned:[],prices:[],orders:[],shared:actionBasketValue,sharedInventory:inventoryItemValue&&inventoryItemValue.rangeStart===range.start&&inventoryItemValue.rangeEnd===range.end?inventoryItemValue:null},trends:trendInputs(events,monitoring,window.asOf,range,truncated)}):undefined;
  return { ...evidence,overview,table,insights,totalStored:events.length,truncated, monitoring, storeName, events, abandonedCheckouts, abandonedBasketSummary, inventoryItemValue, actionBasketValue, orderPatterns, enabled: process.env.SHOPIFY_TEST_COLLECTION_ENABLED === "true", sampledAt:window.asOf };
}
// A checkout the page is showing, read as of the same moment as its table row.
function requestedCheckout(url:string){
 const params=new URL(url).searchParams,id=params.get('id')??'',asOf=Number(params.get('asOf'));
 return /^[a-f0-9]{64}$/.test(id)&&Number.isSafeInteger(asOf)&&asOf>0&&asOf<=Date.now()?{id,asOf}:null;
}
const privateReply=(body:unknown,status=200,bounded=false)=>new Response(bounded?reportJSON(body):JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const bearer=(request:Request)=>request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]??'';
for(const page of ['', '/checkouts', '/fix-history', '/alerts'])http.route({path:`/shopify/app${page}`,method:'GET',handler:httpAction(async(ctx,request)=>{
  const id=process.env.SHOPIFY_CLIENT_ID;
  if(!id || !process.env.SHOPIFY_CLIENT_SECRET)return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connect keval-test-app</title><script src="https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js"></script></head><body><s-page heading="Connect keval-test-app"><s-section heading="Add the app settings in Convex"><s-paragraph>Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET from keval-test-app's Overview in Convex Settings → Environment Variables. Keep both values private. Then reopen this app from Shopify.</s-paragraph></s-section></s-page></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`frame-ancestors https://${STORE} https://admin.shopify.com;`}});
  const shop=new URL(request.url).searchParams.get('shop');
  if(shop && shop!==STORE)return new Response(`This app supports ${STORE} only.`,{status:403});
  const asset=await ctx.runQuery(components.staticHosting.lib.resolveAssetForHttp,{path:'/index.html'});
  if(!asset?.storageUrl)return new Response('App frontend is not deployed.',{status:503});
  const html=await(await fetch(frontendStorageUrl(asset.storageUrl))).text();
  const safeId=id.replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
  return new Response(html.replace('<head>',`<head><meta name="shopify-api-key" content="${safeId}"><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`frame-ancestors https://${STORE} https://admin.shopify.com;`}});
})});
http.route({path:'/shopify/session',method:'GET',handler:httpAction(async(_ctx,request)=>{
 try{await verifyMerchant(bearer(request));return privateReply({authenticated:true,store:STORE});}catch{return privateReply({error:'Authentication required'},401);}
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
      if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(key=>!['operation','viewerId','missionId','start','end'].includes(key))||!['read','mark','undo','retest','undo-retest'].includes(data.operation)||(mode==='demo'&&!isViewerId(data.viewerId)))return respond({error:'Invalid fix request.'},400);
      const scope=mode==='shopify'?STORE:`demo:${data.viewerId}`;
      let read:EvidenceRead|undefined;
      if(data.operation==='retest'||data.operation==='undo-retest'){
        if(!isFixMission(data.missionId))return respond({error:'Invalid action.'},400);
        await ctx.runMutation(internal.fixes.retest,{scope,missionId:data.missionId,passed:data.operation==='retest'});
      }else if(data.operation!=='read'){
        if(!isFixMission(data.missionId))return respond({error:'Invalid action.'},400);
        read=await readEvidence(ctx,mode==='shopify'?'merchant':'public');
        const {window,events,facts}=read,original=window.legacy,pixel=window.pixel;
        const historyUnavailable=window.historyUnavailable;
        const now=Date.now(),sync=mode==='shopify'?await ctx.runQuery(internal.capacity.reportMonitoring,window.syncHeader):undefined;
        const health=monitoringHealth({evidence:{collection:mode==='shopify'?pixel.collection:original.collection,sync,historyUnavailable},events,sampledAt:window.asOf,now,rangeStart:now-30*86400000,truncated:original.truncated||pixel.truncated});
        const fix=fixBaseline(events,data.missionId,now,!health.canAssess,data.missionId==='delivery'?'shipping_unavailable':undefined,facts);
        await ctx.runMutation(internal.fixes.mark,{scope,...fix,active:data.operation==='mark'});
      }
      // A change returns the page's evidence too, so cards show the new state in one round trip.
      const params=new URLSearchParams({start:String(data.start),end:String(data.end),...(mode==='demo'?{viewer:data.viewerId}:{})});
      // The change is already saved; if the evidence can't be built, the page reloads it instead.
      const evidence=data.operation!=='read'&&requestedRange(params)?await (mode==='shopify'?merchantEvidence:publicEvidence)(ctx,params,read).catch(()=>undefined):undefined;
      return respond({fixes:await ctx.runQuery(internal.fixes.read,{scope}),history:await ctx.runMutation(internal.fixes.history,{scope}),evidence},200,true);
    }catch{return respond({error:'Could not save or load fix tracking.'},400);}
  })});
}
for(const operation of ['status','sync','evidence','pixel/enable']){
  http.route({path:`/shopify/${operation}`,method:operation==='status'||operation==='evidence'?'GET':'POST',handler:httpAction(async(ctx,request)=>{
    const token=bearer(request);
    try{await verifyMerchant(token);}catch{return invalidSessionResponse(operation==='evidence');}
    try{
      if(operation==='sync')return privateReply(await syncStore(ctx,token));
      if(operation==='pixel/enable'){
        const access=await authorizedAccess(ctx,token);
        if(isLocal)return privateReply(await enableLocalPixel(ctx,access));
        const settings=JSON.stringify({endpoint:`${shopifyOrigin()}/api/shopify/pixel-events`});
        let exists=false;
        try{const current=await adminRead<{webPixel:{id:string;settings:unknown}|null}>(access,pixelQuery);exists=!!current.webPixel;}catch{/* Shopify errors when no app pixel exists. Creation below remains bounded. */}
        if(exists){await ctx.runMutation(internal.shopifyEvents.configured,{});return privateReply({enabled:true});}
        const result=await adminRead<{webPixelCreate:{webPixel:{id:string}|null;userErrors:unknown[]}}>(access,pixelCreate,{settings});
        if(result.webPixelCreate.userErrors.length||!result.webPixelCreate.webPixel)throw Error('Pixel could not be enabled. Check the released extension and permissions.');
        await ctx.runMutation(internal.shopifyEvents.configured,{});
        return privateReply({enabled:true});
      }
      const connection=await ctx.runQuery(internal.shopify.connection,{});
      const snapshot=await ctx.runQuery(internal.shopify.snapshot,{});
      if(operation==='status')return privateReply({store:STORE,connected:!!connection,lastSyncedAt:snapshot?.syncedAt??null});
      if(!canReadShopifyEvidence(connection))return privateReply({error:'Shopify installation is disconnected or permissions were removed.'},403);
      return privateReply(await merchantEvidence(ctx,new URL(request.url).searchParams),200,true);
    }catch(error){
      const message=error instanceof Error ? error.message : '';
      const reasons=['Shopify authorization failed. Check installation and permissions.','Install the requested Shopify permissions first.','Shopify could not return data. Check permissions and retry; previous results are retained.','Unexpected store or missing Shopify permissions.'];
      const safeBlock=/^Shopify blocked (abandoned checkouts|orders|app settings): (protected customer data approval required|access denied|query rejected)\.$/.test(message);
      return privateReply({error:error instanceof ReportLimit?message:reasons.includes(message)||safeBlock?message:'Shopify connection needs attention. Check credentials, installation and permissions; previous results are retained.'},503);
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
    const input=JSON.parse(body);const {subtotalCents,currency,items,appliedDiscountCount,...base}=input;
    if(!parsePixelBase(base,Date.now())||((subtotalCents!==undefined||currency!==undefined)&&(!Number.isSafeInteger(subtotalCents)||subtotalCents<0||currency!=='USD')))throw Error();
    if(!await ctx.runQuery(internal.shopify.connection,{}))return new Response('{}',{status:503,headers:cors});
    const result=await ctx.runMutation(internal.shopifyEvents.record,{...base,...(appliedDiscountCount===undefined?{}:{appliedDiscountCount}),...(items===undefined?{}:{items}),...(subtotalCents===undefined?{}:{subtotalCents,currency})});
    return new Response(JSON.stringify({result}),{status:result==='invalid'?400:result==='unavailable'?503:200,headers:cors});
  }catch{return new Response('{}',{status:400,headers:cors});}
})});
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200,bounded=false) => new Response(bounded?reportJSON(body):JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

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
  return reply({ result }, result === "invalid" ? 400 : 200);
}) });
http.route({ path: "/test-evidence", method: "GET", handler: httpAction(async (ctx,request) => {
  try{
  // Correct categories only on identities already public in the legacy demo feed.
  // Do not publish additional private sessions, prices, or Shopify records.
  return reply(await publicEvidence(ctx,new URL(request.url).searchParams),200,true);
  }catch(error){return reply({error:error instanceof ReportLimit?error.message:"Evidence could not be read. Previous results are retained."},503);}
}) });

// Details and the events export read events only when a merchant asks for them.
http.route({path:'/shopify/checkout',method:'GET',handler:httpAction(async(ctx,request)=>{
  try{await verifyMerchant(bearer(request));}catch{return invalidSessionResponse();}
  const checkout=requestedCheckout(request.url);if(!checkout)return privateReply({error:'Invalid checkout.'},400);
  try{
    if(!canReadShopifyEvidence(await ctx.runQuery(internal.shopify.connection,{})))return privateReply({error:'Shopify installation is disconnected or permissions were removed.'},403);
    return privateReply({events:await readCheckout(ctx,'merchant',checkout.id,checkout.asOf)});
  }catch{return privateReply({error:'Checkout details could not be read.'},503);}
})});
http.route({path:'/shopify/checkout-events',method:'GET',handler:httpAction(async(ctx,request)=>{
  try{await verifyMerchant(bearer(request));}catch{return invalidSessionResponse();}
  const range=requestedRange(new URL(request.url).searchParams);if(!range)return privateReply({error:'Choose a start and end date.'},400);
  try{
    if(!canReadShopifyEvidence(await ctx.runQuery(internal.shopify.connection,{})))return privateReply({error:'Shopify installation is disconnected or permissions were removed.'},403);
    const {events}=await readEvidence(ctx,'merchant');
    return privateReply({events:checkoutCohort(events,range)},200,true);
  }catch(error){return privateReply({error:error instanceof ReportLimit?error.message:'Checkout activity could not be read.'},503);}
})});
http.route({path:'/test-checkout',method:'GET',handler:httpAction(async(ctx,request)=>{
  const checkout=requestedCheckout(request.url);if(!checkout)return reply({error:'Invalid checkout.'},400);
  try{return reply({events:await readCheckout(ctx,'public',checkout.id,checkout.asOf)});}
  catch{return reply({error:'Checkout details could not be read.'},503);}
})});
http.route({path:'/test-checkout-events',method:'GET',handler:httpAction(async(ctx,request)=>{
  const range=requestedRange(new URL(request.url).searchParams);if(!range)return reply({error:'Choose a start and end date.'},400);
  try{const {events}=await readEvidence(ctx,'public');return reply({events:checkoutCohort(events,range)},200,true);}
  catch(error){return reply({error:error instanceof ReportLimit?error.message:'Checkout activity could not be read.'},503);}
})});

export default http;
