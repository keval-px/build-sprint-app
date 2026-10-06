import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { parseTestEvent } from "../shared/evidence";

import { isViewerId, isActionStep } from "../shared/actions";

import {authorizedAccess,syncStore,adminRead} from './shopify';
import {verifyMerchant,verifyLifecycle} from './lib/shopifyAuth';
import {pixelQuery,pixelCreate} from './lib/shopifyQueries';
import {STORE,parseTestEvent as parsePixelBase} from '../shared/evidence';

const http = httpRouter();
const privateReply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(status===401?{'X-Shopify-Retry-Invalid-Session-Request':'1'}:{})}});
const bearer=(request:Request)=>request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]??'';
http.route({path:'/shopify/app',method:'GET',handler:httpAction(async(ctx,request)=>{
  const id=process.env.SHOPIFY_CLIENT_ID;
  if(!id)return new Response('Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in Convex, then reopen this app.',{status:503});
  const shop=new URL(request.url).searchParams.get('shop');
  if(shop && shop!==STORE)return new Response('This test app supports build-sprint-demo only.',{status:403});
  const asset=await ctx.runQuery(components.staticHosting.lib.resolveAssetForHttp,{path:'/index.html'});
  if(!asset?.storageUrl)return new Response('App frontend is not deployed.',{status:503});
  const html=await(await fetch(asset.storageUrl)).text();
  const safeId=id.replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
  return new Response(html.replace('<head>',`<head><meta name="shopify-api-key" content="${safeId}"><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`frame-ancestors https://${STORE} https://admin.shopify.com;`}});
})});
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
      const original=await ctx.runQuery(internal.events.readTestEvidence,{});
      const pixel=await ctx.runQuery(internal.shopifyEvents.read,{});
      const catalogModel=await ctx.runQuery(internal.catalog.read,{});
      const abandonedCheckouts=await ctx.runQuery(internal.abandoned.read,{});
      const observedPurchases=await ctx.runQuery(internal.purchases.read,{});
      return privateReply({...original,events:[...original.events,...pixel.events],truncated:original.truncated||pixel.truncated,totalStored:original.totalStored+pixel.events.length,catalogModel,abandonedCheckouts,observedPurchases,shopifySnapshot:snapshot?{syncedAt:snapshot.syncedAt,periodStart:snapshot.periodStart,orders:snapshot.orders,abandoned:snapshot.abandoned}:null,enabled:true,source:'Demo Shopify browser and server evidence.',sampledAt:Date.now()});
    }catch{return privateReply({error:'Shopify connection needs attention. Check credentials, installation and permissions; previous results are retained.'},503);}
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
  }return privateReply({received:true});
})});
http.route({path:'/shopify/pixel-events',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}))});
http.route({path:'/shopify/pixel-events',method:'POST',handler:httpAction(async(ctx,request)=>{
  const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'no-store'};
  const body=await request.text();if(body.length>1800)return new Response('{}',{status:413,headers:cors});
  try{
    const input=JSON.parse(body);const {subtotalCents,currency,...base}=input;
    if(!parsePixelBase(base,Date.now())||((subtotalCents!==undefined||currency!==undefined)&&(!Number.isSafeInteger(subtotalCents)||subtotalCents<0||currency!=='USD')))throw Error();
    if(!await ctx.runQuery(internal.shopify.connection,{}))return new Response('{}',{status:503,headers:cors});
    const result=await ctx.runMutation(internal.shopifyEvents.record,{...base,...(subtotalCents===undefined?{}:{subtotalCents,currency})});
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
http.route({ path: "/test-evidence", method: "GET", handler: httpAction(async (ctx) => {
  const evidence = await ctx.runQuery(internal.events.readTestEvidence, {});
  const catalogModel = await ctx.runQuery(internal.catalog.read, {});
  const abandonedCheckouts = await ctx.runQuery(internal.abandoned.read, {});
  const observedPurchases = await ctx.runQuery(internal.purchases.read, {});
  return reply({ ...evidence, catalogModel, observedPurchases, abandonedCheckouts, enabled: process.env.SHOPIFY_TEST_COLLECTION_ENABLED === "true", source: "Unverified browser test events. No live merchant data.", sampledAt: Date.now() });
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
