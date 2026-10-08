import test from 'node:test';
import assert from 'node:assert/strict';
import {recentCheckout} from '../shared/pixelSession.ts';
import {parseTestEvent,type CheckoutEvent} from '../shared/evidence.ts';
import {buildRecommendations} from '../shared/recommendations.ts';
import {publicCheckoutEvents} from '../shared/checkoutIdentity.ts';
const id='a'.repeat(64),client='b'.repeat(64),app='c'.repeat(64),now=1000000;
const saved=JSON.stringify({sessionId:id,clientHash:client,at:now});
test('app failures associate only with the same recent client, never stale, future or malformed storage',()=>{
 assert.equal(recentCheckout(saved,now+1,client,true),id);
 for(const [at,hash] of [[now-1,client],[now+900000,client],[now+1,null],[now+1,id]] as const)assert.equal(recentCheckout(saved,at,hash,true),null);
 assert.equal(recentCheckout('bad',now,client,true),null);
 assert.equal(recentCheckout(JSON.stringify({sessionId:'buyer@example.com',at:now,clientHash:client}),now,client,true),null);
});
const failure=(sessionId:string,eventId:string,timestamp=now):CheckoutEvent=>({sessionId,eventId,timestamp,name:'ui_extension_errored',category:'extension',extensionAppHash:app});
test('receiver rejects raw errors and app identifiers, and requires an anonymous app identity',()=>{
 const event=failure(id,client);assert.ok(parseTestEvent(event,now));
 assert.equal(parseTestEvent({...event,message:'private customer details'},now),null);
 assert.equal(parseTestEvent({...event,extensionAppHash:'123'},now),null);
 assert.equal(parseTestEvent({...event,category:'validation'},now),null);
 assert.equal(parseTestEvent({...event,name:'alert_displayed'},now),null);
});
test('same app must fail in two distinct unfinished checkouts; retries and unrelated apps do not qualify',()=>{
 const a=failure(id,'1'),b=failure(client,'2');
 assert.deepEqual(buildRecommendations([a,{...a,eventId:'retry'}]),[]);
 assert.deepEqual(buildRecommendations([a,{...b,extensionAppHash:id}]),[]);
 assert.equal(buildRecommendations([a,b])[0].id,'extension');
 assert.equal(buildRecommendations([a,b])[0].count,2);
 assert.deepEqual(buildRecommendations([a,b,{...a,eventId:'done',timestamp:now+1,name:'checkout_completed',category:null,extensionAppHash:undefined}]),[]);
});
test('public view adds app failures only to already-public checkout identities and strips prices',()=>{
 const start:CheckoutEvent={sessionId:id,eventId:'start',timestamp:now-1,name:'checkout_started',category:null};
 const result=publicCheckoutEvents([start],[{...failure(id,'failure'),subtotalCents:60000,currency:'USD'},failure(client,'private')]);
 assert.equal(result.length,2);assert.equal(result[1].name,'ui_extension_errored');assert.equal(result[1].subtotalCents,undefined);
});

test('compiled pixel collects app failures without transmitting raw error details and clears completed checkout identity',async()=>{
 const {buildSync}=await import('esbuild');const {runInNewContext}=await import('node:vm');
 const output=buildSync({entryPoints:['extensions/checkout-evidence/src/index.ts'],bundle:true,platform:'browser',format:'cjs',external:['@shopify/web-pixels-extension'],write:false}).outputFiles[0].text;
 const subscriptions=new Map<string,(e:unknown)=>void>(),storage=new Map<string,string>(),payloads:CheckoutEvent[]=[];
 const endpoint='https://neighborly-nightingale-843.convex.site/api/shopify/pixel-events';
 runInNewContext(output,{require:()=>({register:(cb:Function)=>cb({settings:{endpoint},analytics:{subscribe:(name:string,handler:(e:unknown)=>void)=>subscriptions.set(name,handler)},browser:{sessionStorage:{getItem:(key:string)=>Promise.resolve(storage.get(key)),setItem:(key:string,value:string)=>{storage.set(key,value);return Promise.resolve();},removeItem:(key:string)=>{storage.delete(key);return Promise.resolve();}}}})}),fetch:async(_url:string,options:{body:string})=>{payloads.push(JSON.parse(options.body));return {};}});
 const raw={id:'start',clientId:'fixture-client',timestamp:new Date(now).toISOString(),context:{document:{location:{hostname:'build-sprint-demo.myshopify.com'}}}};
 const emit=async(name:string,data:unknown,id:string,at:number,clientId='fixture-client')=>{subscriptions.get(name)!({...raw,name,data,id,clientId,timestamp:new Date(at).toISOString()});await new Promise(resolve=>setImmediate(resolve));};
 await emit('checkout_started',{checkout:{token:'fixture-checkout'}},'start',now);
 await emit('ui_extension_errored',{error:{appId:'123',appName:'Checkout Helper',message:'customer@example.com',trace:'private trace'}},'error',now+1);
 assert.equal(payloads.length,2);assert.equal(payloads[1].category,'extension');assert.equal(payloads[1].extensionAppName,'Checkout Helper');assert.match(payloads[1].extensionAppHash!,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(payloads).includes('customer@example.com'),false);assert.equal(JSON.stringify(payloads).includes('private trace'),false);
 await emit('ui_extension_errored',{error:{appId:'123'}},'other-client',now+2,'different-client');assert.equal(payloads.length,2);
 await emit('checkout_completed',{checkout:{token:'fixture-checkout'}},'done',now+3);
 await emit('ui_extension_errored',{error:{appId:'123'}},'after',now+4);assert.equal(payloads.length,3);
});

test('app names identify only qualifying app failures, never an unrelated one-off failure',()=>{
 const a={...failure(id,'a'),extensionAppName:'Checkout Helper'},b={...failure(client,'b'),extensionAppName:'Checkout Helper'};
 const other={...failure('d'.repeat(64),'other'),extensionAppHash:id,extensionAppName:'Unrelated app'};
 const recommendation=buildRecommendations([a,b,other])[0];
 assert.equal(recommendation.title,'Check Checkout Helper in checkout');
 assert.deepEqual(recommendation.appNames,['Checkout Helper']);assert.match(recommendation.next,/Review Checkout Helper/);
 assert.equal(recommendation.next.includes('Unrelated app'),false);
});
test('app names are bounded display text; raw messages and malformed metadata stay rejected',()=>{
 const row=failure(id,client);
 assert.ok(parseTestEvent({...row,extensionAppName:'Checkout Helper'},now));
 for(const name of ['','x'.repeat(121),'unsafe\nname','<script>',' padded '])assert.equal(parseTestEvent({...row,extensionAppName:name},now),null);
 const publicRows=publicCheckoutEvents([{...row,eventId:'start',name:'checkout_started',category:null,extensionAppHash:undefined}],[{...row,extensionAppName:'Checkout Helper'}]);
 assert.equal(publicRows[1].extensionAppName,'Checkout Helper');
});
test('historical app name lookup matches exact numeric and global App IDs only',async()=>{
 const {appIdentityHashes,appDisplayName}=await import('../shared/extensionApp.ts');
 const {checkoutIdentity}=await import('../shared/checkoutIdentity.ts');
 assert.deepEqual(appIdentityHashes('gid://shopify/App/123'),[checkoutIdentity('123'),checkoutIdentity('gid://shopify/App/123')]);
 assert.deepEqual(appIdentityHashes('123'),appIdentityHashes('gid://shopify/App/123'));
 assert.deepEqual(appIdentityHashes('gid://shopify/Order/123'),[]);
 assert.equal(appDisplayName(' Checkout Helper '),'Checkout Helper');
});
