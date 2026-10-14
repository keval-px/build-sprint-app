import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {getFunctionName} from 'convex/server';
import {summarize,STORE} from '../shared/evidence.ts';
import {checkoutCohort} from '../shared/dateRange.ts';
import {orderHistoryStart} from '../shared/orderPattern.ts';
import {monitoringHealth} from '../shared/monitoringHealth.ts';
import {readPages,REPORT_WINDOW_MS,REPORT_BYTES} from '../shared/capacity.ts';
const require=createRequire(import.meta.url);
const hash=(i:number)=>i.toString(16).padStart(64,'0');
async function harness(){
 const clock={now:Date.now()},tables=new Map<string,any[]>(),scheduled:any[]=[];let serial=0,failFetch=false,nativeLists:Record<string,any[]>|null=null;const requests:any[]=[];let queryHook:((name:string,args:any)=>Promise<void>)|null=null;
 const rows=(t:string)=>{if(!tables.has(t))tables.set(t,[]);return tables.get(t)!;};
 const indexes:Record<string,string[]>={by_store_status:['store','status','startedAt'],by_install_kind_hash:['store','connectedAt','kind','recordHash'],by_install_kind_created:['store','connectedAt','kind','createdAt'],by_head_updated:['head','sourceUpdatedAt','revision'],by_job_head:['job','head'],by_job_kind:['job','kind'],by_job_kind_hash:['job','kind','recordHash'],by_store_timestamp:['store','timestamp'],by_store_created:['store','createdAt'],by_store_session_name:['store','sessionId','name','timestamp'],by_session:['store','dataset','sessionId'],by_last:['store','dataset','lastAt'],by_dataset:['store','dataset']};
 const db={
  get:async(id:string)=>{for(const [name,list] of tables)if(id.startsWith(name+'-'))return list.find(r=>r._id===id)??null;for(const list of tables.values()){const row=list.find(r=>r._id===id);if(row)return row;}return null;},
  query:(t:string)=>{
   let filters:Function[]=[],index:string[]=['_creationTime'],direction=1;
   const range:any={};for(const op of ['eq','gte','lte','gt','lt'])range[op]=(k:string,v:any)=>{filters.push((r:any)=>op==='eq'?r[k]===v:op==='gte'?r[k]>=v:op==='lte'?r[k]<=v:op==='gt'?r[k]>v:r[k]<v);return range;};
   const expr={field:(k:string)=>k,neq:(k:string,v:any)=>(r:any)=>r[k]!==v,lte:(k:string,v:any)=>(r:any)=>r[k]<=v};
   const selected=()=>rows(t).filter(r=>filters.every(fn=>fn(r))).sort((a,b)=>{for(const k of index){if(a[k]!==b[k])return (a[k]<b[k]?-1:1)*direction;}return (a._id<b._id?-1:1)*direction;});
   const q:any={withIndex:(name:string,fn?:Function)=>{index=indexes[name]??['_creationTime'];fn?.(range);return q;},filter:(fn:Function)=>{filters.push(fn(expr));return q;},order:(d:string)=>{direction=d==='desc'?-1:1;return q;},unique:async()=>{const r=selected();assert.ok(r.length<=1);return r[0]??null;},first:async()=>selected()[0]??null,take:async(n:number)=>selected().slice(0,n),collect:async()=>selected(),paginate:async(o:any)=>{assert.ok(o.numItems<=200);assert.ok(o.maximumBytesRead<=256000);const at=Number(o.cursor??0),r=selected();return {page:r.slice(at,at+o.numItems),isDone:at+o.numItems>=r.length,continueCursor:String(at+o.numItems)};}};return q;
  },
  insert:async(t:string,value:any)=>{const id=`${t}-${++serial}`;rows(t).push({...value,_id:id,_creationTime:clock.now});return id;},
  patch:async(id:string,value:any)=>{const row=await db.get(id);assert.ok(row);Object.assign(row,value);},
  replace:async(id:string,value:any)=>{const row=await db.get(id);assert.ok(row);for(const k of Object.keys(row))if(!['_id','_creationTime'].includes(k))delete row[k];Object.assign(row,value);},
  delete:async(id:string)=>{for(const list of tables.values()){const i=list.findIndex(r=>r._id===id);if(i>=0)list.splice(i,1);}}
 };
 const native=(i:number)=>({id:`gid://shopify/Order/${i+1}`,name:`#${i+1}`,checkoutToken:`synthetic-${i}`,createdAt:new Date(clock.now-(i%29+1)*86400000).toISOString(),updatedAt:new Date(clock.now-(i%29+1)*86400000).toISOString(),test:false,displayFinancialStatus:'PAID',currentTotalPriceSet:{shopMoney:{amount:'100.00',currencyCode:'USD'}},currentSubtotalPriceSet:{shopMoney:{amount:'90.00',currencyCode:'USD'}}});
 const fetch=async(_url:any,options:any)=>{
  const {query,variables}=JSON.parse(options.body);requests.push({query,variables});if(failFetch)return {ok:false};let data:any;
  if(query.includes('ConnectionIdentity'))data={shop:{name:'Synthetic',myshopifyDomain:STORE,currencyCode:'USD',ianaTimezone:'UTC'},currentAppInstallation:{app:{id:'gid://shopify/App/1',title:'Synthetic'},accessScopes:[{handle:'read_orders'},{handle:'read_customer_events'},{handle:'write_pixels'}]}};
  else if(nativeLists){const field=query.includes('OrderEvidence')?'orders':'abandonedCheckouts',key=variables.filter.startsWith('updated_at')?'updatedAt':'createdAt',bounds=[...variables.filter.matchAll(/(?:created_at|updated_at):[<>]="([^"]+)"/g)].map(m=>Date.parse(m[1])),list=nativeLists[field].filter(r=>Date.parse(r[key])>=bounds[0]&&Date.parse(r[key])<=bounds[1]).sort((a,b)=>Date.parse(a[key])-Date.parse(b[key])||a.id.localeCompare(b.id)),at=Number(variables.after??0);data={[field]:{nodes:list.slice(at,at+100),pageInfo:{hasNextPage:at+100<list.length,endCursor:at+100<list.length?String(at+100):null}}};}
  else {const field=query.includes('OrderEvidence')?'orders':'abandonedCheckouts',count=field==='orders'?3100:2200,at=Number(variables.after??0);data={[field]:{nodes:Array.from({length:Math.min(100,count-at)},(_,i)=>field==='orders'?native(at+i):{...native(at+i),id:`gid://shopify/AbandonedCheckout/${at+i+1}`,subtotalPriceSet:{shopMoney:{amount:'90.00',currencyCode:'USD'}},totalPriceSet:{shopMoney:{amount:'100.00',currencyCode:'USD'}}}),pageInfo:{hasNextPage:at+100<count,endCursor:at+100<count?String(at+100):null}}};}
  return {ok:true,text:async()=>JSON.stringify({data})};
 };
 const modules:Record<string,any>={};
 for(const file of ['capacity','shopify','shopifyEvents','events','checkoutPrices','abandoned','fixes','checkoutGroups','http']){
  const code=(await build({entryPoints:[`convex/${file}.ts`],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,plugins:file==='http'?[{name:'synthetic-session',setup(build:any){build.onLoad({filter:/lib\/shopifyAuth\.ts$/},()=>({contents:"export const REQUIRED_SCOPES=['read_orders','read_customer_events','write_pixels'];export async function verifyMerchant(){return {shop:'build-sprint-demo.myshopify.com'}};export async function verifyLifecycle(){return false};export async function exchangeMerchant(){throw Error('Synthetic auth only')};export async function refreshMerchant(){throw Error('Synthetic auth only')};",loader:'ts'}));}}]:[]})).outputFiles[0].text,module={exports:{}};
  const dates=new Proxy(Date,{get:(target,key)=>key==='now'?()=>clock.now:Reflect.get(target,key)});
  runInNewContext(code,{module,exports:module.exports,require,Date:dates,console,process,URL,TextEncoder,TextDecoder,fetch,AbortSignal,Response,Request,Headers,crypto:globalThis.crypto,Error});modules[file]=module.exports;
 }
 const invoke=async(ref:any,args:any)=>{const [file,fn]=getFunctionName(ref).split(':');const value=await modules[file][fn]._handler(ctx,args);if(queryHook)await queryHook(`${file}:${fn}`,args);return value;};
 const ctx:any={db,runQuery:invoke,runMutation:invoke,scheduler:{runAfter:async(_delay:any,ref:any,args:any)=>scheduled.push({ref,args})}};
 rows('shopifyConnections').push({_id:'connection',store:STORE,connectedAt:clock.now-60*86400000,accessToken:'synthetic',scopes:['read_orders','read_customer_events','write_pixels'],_creationTime:clock.now-60*86400000});
 return {clock,rows,db,ctx,modules,scheduled,requests,setNative:(orders:any[],abandonedCheckouts:any[]=[])=>{nativeLists={orders,abandonedCheckouts};},hook:(fn:typeof queryHook)=>{queryHook=fn;},fail:(value:boolean)=>{failFetch=value;}};
}
test('actual collectors pass 10000, deduplicate replay and retain old-cap gap; no historical data deleted',async()=>{
 const h=await harness();for(let i=0;i<10000;i++)h.rows('shopifyCheckoutEvents').push({_id:`existing-${i}`,store:STORE,eventId:hash(i+100),_creationTime:h.clock.now-1000});h.rows('pixelCollectionState').push({_id:'state',store:STORE,eventCount:10000,lastCapAt:h.clock.now-1000,firstReceivedAt:h.clock.now-50*86400000,lastReceivedAt:h.clock.now-2000});
 const event={eventId:hash(1),sessionId:hash(2),name:'checkout_started',timestamp:h.clock.now,category:null};
 assert.equal(await h.modules.shopifyEvents.record._handler(h.ctx,event),'recorded');assert.equal(await h.modules.shopifyEvents.record._handler(h.ctx,event),'duplicate');assert.equal(h.rows('pixelCollectionState')[0].eventCount,10001);assert.equal(h.rows('shopifyCheckoutEvents').length,10001);assert.equal(h.rows('pixelCollectionState')[0].resumedAt,h.clock.now);
 h.rows('testCollectionState').push({_id:'legacy-state',store:STORE,eventCount:10000});assert.equal(await h.modules.events.recordTestEvent._handler(h.ctx,event),'recorded');assert.equal(h.rows('testCollectionState')[0].eventCount,10001);
});
test('real paginated report reconciles 18600 events, 6200 prices, late arrivals, full journeys and older boundary starts',async()=>{
 const h=await harness(),start=h.clock.now-30*86400000;
 for(let session=0;session<3100;session++)for(let step=0;step<6;step++)h.rows('shopifyCheckoutEvents').push({_id:`e-${session}-${step}`,_creationTime:h.clock.now-1000,store:STORE,receivedAt:h.clock.now-1000,eventId:hash(session*6+step+1),sessionId:hash(session+1),name:step===0?'checkout_started':step===5?'checkout_completed':'checkout_shipping_info_submitted',timestamp:start+(session%29)*86400000+step,category:null});
 // A late, out-of-order original start prevents an old journey becoming a fresh checkout.
 h.rows('shopifyCheckoutEvents').push({_id:'older-start',_creationTime:h.clock.now-100,store:STORE,receivedAt:h.clock.now-100,eventId:hash(50000),sessionId:hash(1),name:'checkout_started',timestamp:h.clock.now-REPORT_WINDOW_MS-1000,category:null});
 for(let i=0;i<14;i++)await h.modules.shopify.syncAutomatically._handler(h.ctx,{});
 const asOf=h.clock.now;h.clock.now++;
 h.rows('shopifyCheckoutEvents').push({_id:'arriving-after-watermark',_creationTime:h.clock.now,store:STORE,receivedAt:h.clock.now,eventId:hash(50001),sessionId:hash(50000),name:'checkout_started',timestamp:asOf-1000,category:null});
 for(let i=0;i<6200;i++)h.rows('shopifyCheckoutPrices').push({_id:`p-${i}`,_creationTime:asOf-100,store:STORE,sessionId:hash(i+1),currency:'USD',createdAt:new Date(start+1000).toISOString(),updatedAt:asOf-100,subtotalCents:9000,totalCents:10000,recovered:false});
 const result=await h.modules.capacity.readWindow(h.ctx,asOf);
 assert.equal(result.pixel.events.length,18601);assert.equal(result.prices.length,6200);assert.equal(result.snapshot.orders.length,3100);assert.equal(result.snapshot.abandoned.length,2200);
 assert.ok(new TextEncoder().encode(JSON.stringify(result)).length<8*1024*1024);assert.equal(result.pixel.events.some((e:any)=>e.eventId===hash(50001)),false);
 const totals=summarize(checkoutCohort(result.pixel.events,{start,end:asOf}));assert.equal(totals.started,3099);assert.equal(totals.completed,3099);assert.equal(totals.journeys.length,3099);assert.ok(totals.journeys.every(j=>j.events.length===6));
 const after=await h.modules.capacity.readWindow(h.ctx,h.clock.now);assert.equal(after.pixel.events.length,18602);
});
test('actual Shopify action persists cursors, resumes interrupted 3100-order/2200-abandoned scan, publishes only complete generations',async()=>{
 const h=await harness();
 for(let i=0;i<6;i++)assert.equal((await h.modules.shopify.syncAutomatically._handler(h.ctx,{})).status,'syncing');
 assert.equal(h.rows('shopifySyncRows').length,2400);assert.equal(await h.modules.shopify.snapshot._handler(h.ctx,{}),null);
 const job=h.rows('shopifySyncJobs')[0],cursor=job.ordersCursor;h.fail(true);
 await assert.rejects(()=>h.modules.shopify.syncAutomatically._handler(h.ctx,{}));assert.equal(job.ordersCursor,cursor);assert.equal(await h.modules.shopify.snapshot._handler(h.ctx,{}),null);
 h.fail(false);for(let i=0;i<8;i++)await h.modules.shopify.syncAutomatically._handler(h.ctx,{});
 const snapshot=await h.modules.shopify.snapshot._handler(h.ctx,{});assert.equal(snapshot.orderCount,3100);assert.equal(snapshot.abandonedCount,2200);assert.equal(h.rows('shopifySyncRows').length,5300);assert.ok(h.scheduled.length>0);
 const stable=await h.modules.shopify.syncAutomatically._handler(h.ctx,{});assert.equal(stable.status,'synced');assert.equal(h.rows('shopifySyncJobs').length,1,'fresh polling reuses the generation');
 const report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,3100);assert.equal(report.snapshot.abandoned.length,2200);assert.equal(report.snapshot.orders.reduce((sum:number,o:any)=>sum+o.totalCents,0),31000000);
 // Replayed terminal page cannot change counts or publish again.
 assert.equal(await h.modules.capacity.accept._handler(h.ctx,{id:job._id,kind:'orders',cursor,next:null,done:true,rows:[]}),false);
 h.clock.now+=240001;const newJob=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-30*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});
 await h.modules.capacity.accept._handler(h.ctx,{id:newJob,kind:'orders',cursor:null,next:'1',done:false,rows:[report.snapshot.orders[0],report.snapshot.orders[0]]});assert.equal(h.rows('shopifySyncJobs')[1].orderCount,1);
 assert.equal((await h.modules.shopify.snapshot._handler(h.ctx,{})).generation,snapshot.generation);
 h.rows('shopifyConnections')[0].connectedAt=h.clock.now+1000;
 await assert.rejects(()=>h.modules.capacity.accept._handler(h.ctx,{id:newJob,kind:'abandoned',cursor:null,next:null,done:true,rows:[]}));assert.equal(await h.modules.shopify.snapshot._handler(h.ctx,{}),null);
});
test('bounded reader rejects repeated cursor, byte overflow, and prices changed during a read',async()=>{
 const h=await harness();const id=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-30*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:null,next:'cursor',done:false,rows:[]});
 await assert.rejects(()=>h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:'cursor',next:'cursor',done:false,rows:[]}),/pagination/);
 h.rows('shopifyCheckoutPrices').push({_id:'p',_creationTime:h.clock.now-100,store:STORE,sessionId:hash(1),createdAt:new Date(h.clock.now-1000).toISOString(),updatedAt:h.clock.now+100,currency:'USD',subtotalCents:100,totalCents:100,recovered:false});
 await assert.rejects(()=>h.modules.capacity.readWindow(h.ctx,h.clock.now),/safe payload/);
 await assert.rejects(()=>readPages(async()=>({page:['x'.repeat(2048)],isDone:true,continueCursor:''}),1024));
});

test('cache retention removes only redundant derived generations and preserves real source history',async()=>{
 const h=await harness(),original={_id:'old-original',store:STORE,eventId:hash(1),sessionId:hash(2),timestamp:h.clock.now-60*86400000};h.rows('shopifyCheckoutEvents').push(original);
 const jobs=[];
 for(let i=0;i<3;i++){
  h.clock.now+=240001;const id=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-30*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});jobs.push(id);
  const row={recordHash:hash(i+1),createdAt:new Date(h.clock.now-100).toISOString(),subtotalCents:100,totalCents:100,paid:true,test:true,cancelled:false};
  await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:null,next:null,done:true,rows:[row]});await h.modules.capacity.accept._handler(h.ctx,{id,kind:'abandoned',cursor:null,next:null,done:true,rows:[]});
 }
 await h.modules.capacity.cleanSyncCache._handler(h.ctx,{});assert.equal(h.rows('shopifySyncJobs').length,3);
 h.clock.now+=3600001;for(let i=0;i<3;i++)await h.modules.capacity.cleanSyncCache._handler(h.ctx,{});
 assert.equal(h.rows('shopifySyncJobs').length,2);assert.equal(h.rows('shopifySyncRows').length,2);assert.equal((await h.modules.shopify.snapshot._handler(h.ctx,{})).generation,jobs[2]);assert.equal(h.rows('shopifyCheckoutEvents')[0],original);
});
test('late signed price writes from a revoked installation cannot affect a reinstall',async()=>{
 const h=await harness(),installed=h.clock.now;h.rows('shopifyConnections')[0].connectedAt=installed;
 const price={sessionId:hash(1),currency:'USD',createdAt:new Date(h.clock.now-1000).toISOString(),updatedAt:h.clock.now-100,subtotalCents:100,totalCents:100,recovered:false};
 await h.modules.checkoutPrices.save._handler(h.ctx,{price,triggeredAt:installed-1});assert.equal(h.rows('shopifyCheckoutPrices').length,0);
 await h.modules.checkoutPrices.save._handler(h.ctx,{price,triggeredAt:installed});assert.equal(h.rows('shopifyCheckoutPrices').length,1);assert.equal(h.rows('shopifyCheckoutPrices')[0].receivedAt,h.clock.now);
});

test('expired staged jobs cannot publish and do not erase the last complete generation',async()=>{
 const h=await harness();const id=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-30*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});
 h.clock.now+=86400000;await assert.rejects(()=>h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:null,next:null,done:true,rows:[]}),/installation changed/);
 const next=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-30*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});assert.notEqual(id,next);assert.equal(h.rows('shopifySyncJobs').length,2);
});

test('legacy migration snapshot participates in the same 8 MiB budget as paged events',async()=>{
 const h=await harness(),createdAt=new Date(h.clock.now-1000).toISOString();
 const basket={recordHash:hash(1),sessionId:hash(1),createdAt,subtotalCents:100,totalCents:100,recovered:false};
 const basketCount=Math.floor(752000/(JSON.stringify(basket).length+1));
 const legacy={_id:'legacy',_creationTime:h.clock.now-1000,store:STORE,syncedAt:h.clock.now-1000,periodStart:new Date(h.clock.now-30*86400000).toISOString(),orders:[],abandoned:Array.from({length:basketCount},(_,i)=>({...basket,recordHash:hash(i+1),sessionId:hash(i+1)}))};
 h.rows('shopifySnapshots').push(legacy);
 const first={eventId:hash(1),sessionId:hash(1),name:'checkout_started',timestamp:h.clock.now-1000,category:null};
 const count=Math.floor(8285975/(JSON.stringify(first).length+1));
 const events=Array.from({length:count},(_,i)=>({...first,eventId:hash(i+1),sessionId:hash(i+1)}));
 const original=h.ctx.runQuery;h.ctx.runQuery=async(ref:any,args:any)=>{
  if(getFunctionName(ref)==='capacity:page'){
   const at=Number(args.cursor??0),page=args.dataset==='legacy'?events.slice(at,at+200):[];
   assert.ok(new TextEncoder().encode(JSON.stringify(page)).length<256000);
   return {page,isDone:args.dataset!=='legacy'||at+200>=events.length,continueCursor:String(at+200),splitCursor:null,pageStatus:null};
  }
  return original(ref,args);
 };
 const eventBytes=new TextEncoder().encode(JSON.stringify(events)).length,legacyBytes=new TextEncoder().encode(JSON.stringify(legacy)).length;
 assert.ok(eventBytes<REPORT_BYTES);assert.ok(legacyBytes<1024*1024);assert.ok(eventBytes+legacyBytes>REPORT_BYTES);
 console.info(`Migration overflow regression: ${eventBytes} event bytes + ${legacyBytes} legacy bytes > ${REPORT_BYTES} budget.`);
 await assert.rejects(()=>h.modules.capacity.readWindow(h.ctx),/safe payload budget/);
});

async function published(h:Awaited<ReturnType<typeof harness>>,label:string){
 const id=await h.modules.capacity.begin._handler(h.ctx,{connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:new Date(h.clock.now-40*86400000).toISOString(),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});
 const row={recordHash:label,createdAt:new Date(h.clock.now-1000).toISOString(),subtotalCents:100,totalCents:100,paid:true,test:true,cancelled:false};
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:null,next:null,done:true,rows:[row]});await h.modules.capacity.accept._handler(h.ctx,{id,kind:'abandoned',cursor:null,next:null,done:true,rows:[]});return id;
}
async function merchantEvidence(h:Awaited<ReturnType<typeof harness>>){
 const [handler]=h.modules.http.default.lookup('/shopify/evidence','GET');
 return handler._handler(h.ctx,new Request(`https://fixture.invalid/shopify/evidence?start=${h.clock.now-30*86400000}&end=${h.clock.now}`,{headers:{Authorization:'Bearer synthetic-session'}}));
}
test('actual HTTP handler cannot borrow a fresh publication to certify its pinned six-minute-old generation',async()=>{
 const h=await harness();h.clock.now-=360000;const old=await published(h,'old-returned-order');h.clock.now+=360000;
 h.rows('pixelCollectionState').push({_id:'collection',store:STORE,eventCount:2,firstReceivedAt:h.clock.now-50*86400000,lastReceivedAt:h.clock.now-1000});
 for(let i=0;i<2;i++)h.rows('shopifyCheckoutEvents').push({_id:`e${i}`,store:STORE,_creationTime:h.clock.now-1000,eventId:hash(i+1),sessionId:hash(i+1),name:'checkout_started',timestamp:h.clock.now-1000,category:null,receivedAt:h.clock.now-1000});
 let switched=false;
 h.hook(async(name,args)=>{if(!switched&&name==='capacity:page'&&args.dataset==='pixel'){switched=true;await published(h,'fresh-but-not-returned-order');}});
 const response=await merchantEvidence(h);assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.shopifySnapshot.orders[0].recordHash,'old-returned-order');assert.equal(body.shopifySnapshot.syncedAt,h.clock.now-360000);assert.notEqual(h.rows('shopifySyncJobs').find(j=>j.status==='published'&&j.startedAt===h.clock.now)._id,old);
 const health=monitoringHealth({evidence:body.monitoring,events:body.events,sampledAt:body.sampledAt,rangeStart:h.clock.now-30*86400000,now:h.clock.now});
 assert.equal(health.canAssess,false);assert.notEqual(health.state,'Healthy');assert.equal(body.monitoring.sync.coverageEnd,body.shopifySnapshot.syncedAt);assert.equal(body.monitoring.sync.lastSuccessAt,h.clock.now-360000);
 for(const status of ['failed','reconnect','limit']){
  h.rows('shopifyMonitoring')[0].status=status;const guarded=await merchantEvidence(h);assert.equal(guarded.status,200);assert.equal((await guarded.json()).monitoring.sync.status,status);
 }
});
test('actual HTTP handler refuses a report when reinstall replaces its pinned installation during paging',async()=>{
 const h=await harness();await published(h,'old-installation');let switched=false;
 h.hook(async(name,args)=>{if(!switched&&name==='capacity:page'&&args.dataset==='abandoned'){switched=true;h.rows('shopifyConnections')[0].connectedAt=h.clock.now+1;}});
 assert.equal((await merchantEvidence(h)).status,503);
});

test('actual HTTP handler fails safely on a Convex SplitRequired terminal page before returning a report',async()=>{
 const h=await harness(),original=h.ctx.runQuery;
 h.ctx.runQuery=async(ref:any,args:any)=>getFunctionName(ref)==='capacity:page'?{page:[{eventId:'first',sessionId:hash(1),name:'checkout_started',timestamp:h.clock.now-1000,category:null}],isDone:true,continueCursor:'end',splitCursor:'middle',pageStatus:'SplitRequired'}:original(ref,args);
 const response=await merchantEvidence(h);assert.equal(response.status,503);const body=await response.json();assert.match(body.error,/safe payload budget/);assert.equal(body.events,undefined);assert.equal(body.shopifySnapshot,undefined);
});

test('actual HTTP response budget also includes the separately read legacy abandoned snapshot',async()=>{
 const h=await harness(),record={recordHash:hash(1),sessionId:null,subtotalCents:100,currency:'USD',recovered:false};
 const records=Array.from({length:Math.floor(900000/(JSON.stringify(record).length+1))},(_,i)=>({...record,recordHash:hash(i+1)}));
 const legacy={_id:'manual-legacy',_creationTime:h.clock.now-1000,importedOn:new Date(h.clock.now).toISOString(),emailSent:0,emailNotSent:records.length,records};
 assert.ok(new TextEncoder().encode(JSON.stringify(legacy)).length<1024*1024);h.rows('demoAbandonedSnapshots').push(legacy);
 const first={eventId:hash(1),sessionId:hash(1),name:'checkout_started',timestamp:h.clock.now-1000,category:null};
 const events=Array.from({length:Math.floor(7800000/(JSON.stringify(first).length+1))},(_,i)=>({...first,eventId:hash(i+1),sessionId:hash(i+1)}));
 const original=h.ctx.runQuery;h.ctx.runQuery=async(ref:any,args:any)=>{
  if(getFunctionName(ref)==='capacity:page'){
   const at=Number(args.cursor??0);return {page:args.dataset==='legacy'?events.slice(at,at+200):[],isDone:args.dataset!=='legacy'||at+200>=events.length,continueCursor:String(at+200),pageStatus:null,splitCursor:null};
  }
  return original(ref,args);
 };
 const window=await h.modules.capacity.readWindow(h.ctx);assert.equal(window.legacy.events.length,events.length);
 const response=await merchantEvidence(h);assert.equal(response.status,503);const body=await response.json();assert.match(body.error,/safe payload budget/);assert.equal(body.events,undefined);
});

function nativeFixture(h:Awaited<ReturnType<typeof harness>>,id:number,abandoned=false,extra:any={}){
 const money={shopMoney:{amount:'100.00',currencyCode:'USD'}};
 return {id:`gid://shopify/${abandoned?'AbandonedCheckout':'Order'}/${id}`,name:`#${id}`,checkoutToken:`synthetic-${id}`,createdAt:new Date(h.clock.now-86400000).toISOString(),updatedAt:new Date(h.clock.now-1000).toISOString(),test:true,displayFinancialStatus:'PAID',currentTotalPriceSet:money,currentSubtotalPriceSet:money,totalPriceSet:money,subtotalPriceSet:money,...extra};
}
const syncNative=(h:Awaited<ReturnType<typeof harness>>)=>h.modules.shopify.syncAutomatically._handler(h.ctx,{});
test('canonical import resumes, preserves legacy fallback, and cached HTTP reads never query Shopify',async()=>{
 const h=await harness();await published(h,'legacy-preserved');h.clock.now+=60001;
 h.setNative(Array.from({length:301},(_,i)=>nativeFixture(h,i+1)),Array.from({length:201},(_,i)=>nativeFixture(h,i+1,true)));
 assert.equal((await syncNative(h)).status,'syncing');const pending=h.rows('shopifySyncJobs').find(j=>j.canonical),cursor=pending.abandonedCursor;
 assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0].recordHash,'legacy-preserved');
 h.fail(true);await assert.rejects(()=>syncNative(h));assert.equal(pending.abandonedCursor,cursor);
 h.fail(false);assert.equal((await syncNative(h)).status,'synced');const requestCount=h.requests.length;
 assert.equal((await syncNative(h)).status,'synced');assert.equal(h.requests.length,requestCount,'fresh polling makes no Shopify request');
 const response=await merchantEvidence(h);assert.equal(response.status,200);const body=await response.json();assert.equal(body.shopifySnapshot.orders.length,301);assert.equal(body.shopifySnapshot.abandoned.length,201);assert.equal(body.monitoring.sync.reconciliationVerified,false);
 await h.modules.capacity.readWindow(h.ctx,h.clock.now);assert.equal(h.requests.length,requestCount,'evidence reads use only the database');assert.ok(h.rows('shopifySyncJobs').some(j=>!j.canonical),'legacy cache retained');
});
test('incremental upserts recover baskets, cancel orders and retain published values across failure/retry',async()=>{
 const h=await harness(),order=nativeFixture(h,1),basket=nativeFixture(h,1,true);h.setNative([order],[basket]);await syncNative(h);
 const initial=await h.modules.capacity.readWindow(h.ctx);h.clock.now+=60001;
 const changed={...order,updatedAt:new Date(h.clock.now-1).toISOString(),cancelledAt:new Date(h.clock.now-1).toISOString(),currentTotalPriceSet:{shopMoney:{amount:'40.00',currencyCode:'USD'}}},recovered={...basket,updatedAt:new Date(h.clock.now-1).toISOString(),completedAt:new Date(h.clock.now-1).toISOString()};h.setNative([changed,nativeFixture(h,2)],[recovered]);
 const invoke=h.ctx.runMutation;let interrupted=false;
 h.ctx.runMutation=async(ref:any,args:any)=>{const result=await invoke(ref,args);if(!interrupted&&getFunctionName(ref)==='capacity:accept'&&args.kind==='orders'){interrupted=true;h.fail(true);}return result;};
 await assert.rejects(()=>syncNative(h));const retained=await h.modules.capacity.readWindow(h.ctx);assert.equal(retained.snapshot.generation,initial.snapshot.generation);assert.equal(retained.snapshot.orders[0].totalCents,10000);assert.equal(retained.snapshot.abandoned[0].recovered,false);
 h.fail(false);await syncNative(h);const updated=await h.modules.capacity.readWindow(h.ctx);assert.equal(updated.snapshot.orders.length,2);assert.equal(updated.snapshot.orders.find((r:any)=>r.orderName==='#1').totalCents,4000);assert.equal(updated.snapshot.orders.find((r:any)=>r.orderName==='#1').cancelled,true);assert.equal(updated.snapshot.abandoned[0].recovered,true);
 const identities=h.requests.filter(r=>r.query.includes('ConnectionIdentity')).length;assert.equal(identities,1,'ordinary updates reuse persisted metadata');assert.ok(h.requests.some(r=>r.query.includes('sortKey: UPDATED_AT')&&r.variables.filter.includes('updated_at')));
 const versions=h.rows('shopifyNativeVersions').length;h.clock.now+=60001;await syncNative(h);assert.equal(h.rows('shopifyNativeVersions').length,versions,'overlap replay is idempotent');assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders.length,2);
});
test('overlap captures delayed indexing and periodic reconciliation captures older delayed records without deletion',async()=>{
 const h=await harness(),original=nativeFixture(h,1);h.setNative([original]);await syncNative(h);const first=h.clock.now;
 h.clock.now+=60001;const delayed=nativeFixture(h,2,false,{createdAt:new Date(first-86400000).toISOString(),updatedAt:new Date(first-30*60000).toISOString()}),older=nativeFixture(h,3,false,{createdAt:new Date(first-2*86400000).toISOString(),updatedAt:new Date(first-2*3600000).toISOString()});h.setNative([delayed,older]);await syncNative(h);
 let report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,2,'original retained when absent; delayed overlap imported');
 h.clock.now+=6*3600000;await syncNative(h);report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,3);assert.equal(h.rows('shopifySyncJobs').at(-1).mode,'reconcile');assert.equal(h.requests.filter(r=>r.query.includes('ConnectionIdentity')).length,2);
});
test('versioned pages remain pinned across concurrent publications and reject previous installation records',async()=>{
 const h=await harness(),order=nativeFixture(h,1);h.setNative([order]);await syncNative(h);const base=h.rows('shopifySyncJobs')[0];h.clock.now+=60001;
 h.setNative([{...order,updatedAt:new Date(h.clock.now-1).toISOString(),currentTotalPriceSet:{shopMoney:{amount:'25.00',currencyCode:'USD'}}}]);await syncNative(h);
 const pinned=await h.modules.capacity.page._handler(h.ctx,{dataset:'orders',generation:base._id,start:h.clock.now-30*86400000,asOf:h.clock.now,cursor:null});assert.equal(pinned.page[0].totalCents,10000);assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0].totalCents,2500);
 h.rows('shopifyConnections')[0].connectedAt=h.clock.now+1;await assert.rejects(()=>h.modules.capacity.page._handler(h.ctx,{dataset:'orders',generation:base._id,start:h.clock.now-30*86400000,asOf:h.clock.now,cursor:null}));
 h.clock.now+=60001;h.setNative([]);await syncNative(h);assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders.length,0,'reinstall does not inherit another installation');
});
test('older versions and expired staging never overwrite good data; cleanup retains canonical publication headers',async()=>{
 const h=await harness(),order=nativeFixture(h,1);h.setNative([order]);await syncNative(h);const first=h.rows('shopifySyncJobs')[0],good=(await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0];
 h.clock.now+=60001;const args={canonical:true,connectedAt:first.connectedAt,startedAt:h.clock.now,periodStart:first.periodStart,storeName:first.storeName,timeZone:first.timeZone,currency:first.currency};
 const stale=await h.modules.capacity.begin._handler(h.ctx,args);await h.modules.capacity.accept._handler(h.ctx,{id:stale,kind:'orders',cursor:null,next:null,done:true,rows:[{...good,totalCents:1}],sourceUpdatedAt:[Date.parse(order.updatedAt)-1]});await h.modules.capacity.accept._handler(h.ctx,{id:stale,kind:'abandoned',cursor:null,next:null,done:true,rows:[],sourceUpdatedAt:[]});assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0].totalCents,10000);
 h.clock.now+=60001;const expired=await h.modules.capacity.begin._handler(h.ctx,{...args,startedAt:h.clock.now});await h.modules.capacity.accept._handler(h.ctx,{id:expired,kind:'orders',cursor:null,next:'unfinished',done:false,rows:[{...good,totalCents:2}],sourceUpdatedAt:[h.clock.now-1]});h.clock.now+=86400001;
 await assert.rejects(()=>h.modules.capacity.accept._handler(h.ctx,{id:expired,kind:'abandoned',cursor:null,next:null,done:true,rows:[],sourceUpdatedAt:[]}));
 h.setNative([order]);await syncNative(h);assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0].totalCents,10000,'unpublished version cannot leak through a later job');
 for(let i=0;i<10;i++)await h.modules.capacity.cleanSyncCache._handler(h.ctx,{});
 assert.ok(await h.db.get(first._id),'canonical source publication retained after staging cleanup');assert.equal((await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0].totalCents,10000);
});

test('canonical versions preserve verified order links when an update omits the checkout token',async()=>{
 const h=await harness(),order=nativeFixture(h,1);h.setNative([order]);await syncNative(h);const before=(await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0];h.clock.now+=60001;
 h.setNative([{...order,checkoutToken:null,updatedAt:new Date(h.clock.now-1).toISOString(),displayFinancialStatus:'PENDING'}]);await syncNative(h);const after=(await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0];assert.equal(after.sessionId,before.sessionId);assert.equal(after.orderName,before.orderName);assert.equal(after.orderId,before.orderId);assert.equal(after.paid,false);
});
test('bounded canonical version lookup rejects invisible history instead of silently omitting records',async()=>{
 const h=await harness();h.setNative([nativeFixture(h,1)]);await syncNative(h);const head=h.rows('shopifyNativeHeads')[0],version=h.rows('shopifyNativeVersions')[0];
 for(let i=0;i<128;i++)h.rows('shopifyNativeVersions').push({...version,_id:`invisible-${i}`,job:'missing-publication',revision:h.clock.now+1000+i,sourceUpdatedAt:h.clock.now+1000+i});
 await assert.rejects(()=>h.modules.capacity.readWindow(h.ctx),/safe payload budget/);
});

test('canonical imports enforce frozen creation bounds and reject a foreign tenant generation',async()=>{
 const h=await harness(),inside=nativeFixture(h,1),now=new Date(h.clock.now).toISOString(),boundary=orderHistoryStart(h.clock.now,'UTC');h.setNative([inside,nativeFixture(h,2,false,{createdAt:now,updatedAt:now}),nativeFixture(h,3,false,{createdAt:boundary,updatedAt:boundary}),nativeFixture(h,4,false,{createdAt:new Date(Date.parse(boundary)-1).toISOString(),updatedAt:boundary})]);await syncNative(h);
 const report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,3);assert.equal(report.snapshot.orders.some((r:any)=>r.orderName==='#4'),false);const original=h.rows('shopifySyncJobs')[0];const foreign=await h.db.insert('shopifySyncJobs',{...original,store:'foreign.myshopify.com'});
 await assert.rejects(()=>h.modules.capacity.page._handler(h.ctx,{dataset:'orders',generation:foreign,start:h.clock.now-30*86400000,asOf:h.clock.now,cursor:null}),/installation/);
});

test('creation-window updates during backfill and reconciliation defer safely and import on the next overlap',async()=>{
 for(const reconcile of [false,true]){
  const h=await harness(),original=nativeFixture(h,1);h.setNative([original]);if(reconcile){await syncNative(h);h.clock.now+=6*3600000;}
  const frozen=h.clock.now;let changed=false;
  h.hook(async(name)=>{if(name==='capacity:job'&&!changed){changed=true;h.clock.now+=1000;h.setNative([{...original,updatedAt:new Date(h.clock.now).toISOString(),currentTotalPriceSet:{shopMoney:{amount:'200.00',currencyCode:'USD'}}}]);}});
  assert.equal((await syncNative(h)).status,'synced','mid-scan update must not strand the frozen job');h.hook(null);
  const job=h.rows('shopifySyncJobs').at(-1);assert.equal(job.mode,reconcile?'reconcile':'backfill');assert.equal(job.startedAt,frozen);assert.equal(job.deferredUntil,frozen+1000);assert.ok(job.pages>0);
  let report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,reconcile?1:0);if(reconcile)assert.equal(report.snapshot.orders[0].totalCents,10000,'good saved version retained');
  let response=await merchantEvidence(h);assert.equal((await response.json()).monitoring.sync.pendingUpdates,true,'coverage explicitly discloses deferred records');
  h.clock.now+=60001;assert.equal((await syncNative(h)).status,'synced');report=await h.modules.capacity.readWindow(h.ctx);assert.equal(report.snapshot.orders.length,1);assert.equal(report.snapshot.orders[0].totalCents,20000);response=await merchantEvidence(h);assert.equal((await response.json()).monitoring.sync.pendingUpdates,false);
 }
});
test('pending order identities survive newer pages, same-time omitted links and reject conflicting links',async()=>{
 const h=await harness(),id=await h.modules.capacity.begin._handler(h.ctx,{canonical:true,connectedAt:h.rows('shopifyConnections')[0].connectedAt,startedAt:h.clock.now,periodStart:orderHistoryStart(h.clock.now,'UTC'),storeName:'Synthetic',timeZone:'UTC',currency:'USD'});
 const row={recordHash:hash(1),sessionId:hash(2),orderName:'#test',orderId:'1',createdAt:new Date(h.clock.now-86400000).toISOString(),subtotalCents:100,totalCents:100,paid:false,test:true,cancelled:false};const at=h.clock.now-1000;
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:null,next:'one',done:false,rows:[row],sourceUpdatedAt:[at]});const {sessionId,orderName,orderId,...withoutLinks}=row;
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:'one',next:'two',done:false,rows:[{...withoutLinks,paid:true}],sourceUpdatedAt:[at+1]});
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:'two',next:'three',done:false,rows:[{...withoutLinks,paid:true}],sourceUpdatedAt:[at+1]});
 await assert.rejects(()=>h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:'three',next:null,done:true,rows:[{...row,sessionId:hash(3),paid:true}],sourceUpdatedAt:[at+2]}),/Conflicting Shopify record identity/);
 await h.modules.capacity.accept._handler(h.ctx,{id,kind:'orders',cursor:'three',next:null,done:true,rows:[],sourceUpdatedAt:[]});await h.modules.capacity.accept._handler(h.ctx,{id,kind:'abandoned',cursor:null,next:null,done:true,rows:[],sourceUpdatedAt:[]});
 const saved=(await h.modules.capacity.readWindow(h.ctx)).snapshot.orders[0];assert.equal(saved.sessionId,sessionId);assert.equal(saved.orderName,orderName);assert.equal(saved.orderId,orderId);assert.equal(saved.paid,true);assert.equal(h.rows('shopifySyncJobs')[0].orderCount,1);
});

test('real sync restores exact persisted abandoned links at an unchanged Shopify version without altering totals or counts',async()=>{
 const h=await harness(),basket=nativeFixture(h,123,true);h.setNative([],[basket]);await syncNative(h);
 const before=(await h.modules.capacity.readWindow(h.ctx)).snapshot.abandoned[0],oldVersion=h.rows('shopifyNativeVersions')[0];assert.equal(before.sessionId,undefined);
 const {recordDigest}=await import('../shared/shopifyRecords.ts');
 const link={recordHash:await recordDigest('abandoned','123'),sessionId:hash(777),subtotalCents:10000,currency:'USD',recovered:false};
 h.rows('demoAbandonedSnapshots').push({_id:'compatibility',importedOn:'2026-10-09',emailSent:0,emailNotSent:1,records:[link]});
 h.clock.now+=60001;await syncNative(h);
 const report=(await h.modules.capacity.readWindow(h.ctx)).snapshot;assert.equal(report.abandoned.length,1);assert.equal(report.abandoned[0].sessionId,link.sessionId);assert.equal(report.abandoned[0].subtotalCents,before.subtotalCents);assert.equal(report.abandoned[0].totalCents,before.totalCents);assert.equal(report.abandoned[0].createdAt,before.createdAt);assert.equal(oldVersion.row.sessionId,undefined,'older pinned publication is immutable');
 h.clock.now+=60001;await syncNative(h);assert.equal(h.rows('shopifyNativeVersions').length,2,'same verified link is not republished repeatedly');
});

test('grouped checkouts give exactly the events the row read gives, before and after new writes',async()=>{
 const h=await harness(),asOf=h.clock.now,windowStart=asOf-REPORT_WINDOW_MS;let n=0;
 const add=(table:string,session:number,name:string,timestamp:number,extra:any={})=>h.rows(table).push({_id:`${table}-x${++n}`,_creationTime:extra.createdAt??asOf-5000+n,store:STORE,receivedAt:asOf,eventId:hash(100000+n),sessionId:hash(session),name,timestamp,category:null,...extra,createdAt:undefined});
 for(const table of ['testCheckoutEvents','shopifyCheckoutEvents']){
  for(let s=1;s<=40;s++){add(table,s,'checkout_started',windowStart+s*3600000);add(table,s,'checkout_contact_info_submitted',windowStart+s*3600000+500,{deviceClass:'mobile'});if(s%3===0)add(table,s,'checkout_completed',windowStart+s*3600000+900);}
  add(table,41,'checkout_started',windowStart-86400000);add(table,41,'alert_displayed',windowStart+5000,{category:'delivery',shippingBlocker:'no_shipping_available'});// original start before the window
  add(table,42,'checkout_started',windowStart-86400000);add(table,42,'checkout_started',windowStart+7000);// two starts across the boundary
  add(table,43,'checkout_started',windowStart-2*86400000);// entirely before the window
  add(table,44,'checkout_started',asOf-2000,{createdAt:asOf+10});// arrived after the read began
  add(table,45,'checkout_started',asOf+60000);// after the read time
 }
 add('testCheckoutEvents',46,'checkout_started',windowStart+9000,{auditOnly:true});add('testCheckoutEvents',5,'alert_displayed',windowStart+5*3600000+700,{category:'validation',auditOnly:true});
 const read=async()=>{const w=await h.modules.capacity.readWindow(h.ctx,asOf);return {legacy:w.legacy.events,pixel:w.pixel.events};};
 const rows=await read();
 assert.ok(rows.legacy.some((e:any)=>e.sessionId===hash(41)&&e.timestamp<windowStart),'boundary start included');
 assert.equal(rows.legacy.some((e:any)=>e.sessionId===hash(43)||e.sessionId===hash(44)||e.sessionId===hash(45)||e.sessionId===hash(46)),false);
 await h.modules.checkoutGroups.ensureBuilt._handler(h.ctx,{});
 for(let i=0;i<20;i++)for(const dataset of ['legacy','pixel'])await h.modules.checkoutGroups.buildStep._handler(h.ctx,{dataset});
 assert.ok(h.rows('checkoutGroupBuild').every((r:any)=>r.ready));
 assert.deepEqual(await read(),rows,'grouped read matches the row read');
 // Writes after the build keep the groups current.
 h.clock.now=asOf+1;
 await h.modules.events.recordTestEvent._handler(h.ctx,{eventId:hash(900001),sessionId:hash(7),name:'payment_info_submitted',timestamp:asOf-500,category:null});
 await h.modules.abandoned.markAuditEvents._handler(h.ctx,{eventIds:[h.rows('testCheckoutEvents').find((r:any)=>r.sessionId===hash(8)&&r.name==='checkout_contact_info_submitted').eventId],protectedIds:[]});
 await h.modules.shopifyEvents.record._handler(h.ctx,{eventId:hash(900002),sessionId:hash(9),name:'ui_extension_errored',timestamp:asOf-400,category:'extension',extensionAppHash:hash(777)});
 const later=h.clock.now+1;
 const grouped=await h.modules.capacity.readWindow(h.ctx,later);
 for(const r of h.rows('checkoutGroupBuild'))r.ready=false;
 const direct=await h.modules.capacity.readWindow(h.ctx,later);
 assert.deepEqual({legacy:grouped.legacy.events,pixel:grouped.pixel.events},{legacy:direct.legacy.events,pixel:direct.pixel.events},'groups follow new events and audit marks');
 assert.ok(grouped.legacy.events.some((e:any)=>e.eventId===hash(900001)));assert.ok(grouped.pixel.events.some((e:any)=>e.eventId===hash(900002)));
});
