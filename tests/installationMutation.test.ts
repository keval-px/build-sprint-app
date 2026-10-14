import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
const require=createRequire(import.meta.url);
function load(file:string,clock:{now:number}){
 const code=buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',packages:'external',write:false}).outputFiles[0].text;
 const module={exports:{} as any},dates=new Proxy(Date,{construct:(target,args)=>Reflect.construct(target,args.length?args:[clock.now]),get:(target,key)=>key==='now'?()=>clock.now:Reflect.get(target,key)});
 runInNewContext(code,{module,exports:module.exports,require,Date:dates,console,process,URL,TextEncoder,TextDecoder});return module.exports;
}
test('real connection/receipt mutations preserve coverage on renewal, reset only on reinstall and reject revoked background writes',async()=>{
 const clock={now:Date.now()},installed=clock.now-40*86400000;
 const tables=new Map<string,any[]>([['shopifyConnections',[{_id:'connection',store:'build-sprint-demo.myshopify.com',connectedAt:installed,accessToken:'synthetic-old',scopes:['read_orders']}]],['pixelCollectionState',[{_id:'collection',store:'build-sprint-demo.myshopify.com',eventCount:2,firstReceivedAt:installed+1000,lastReceivedAt:clock.now-1000}]]]);
 const rows=(table:string)=>{if(!tables.has(table))tables.set(table,[]);return tables.get(table)!;};
 const db={query:(table:string)=>{const filters:Record<string,unknown>={};const q:any={eq:(key:string,value:unknown)=>{filters[key]=value;return q;}};const result:any={withIndex:(_name:string,fn?:Function)=>{fn?.(q);return result;},unique:async()=>rows(table).find(r=>Object.entries(filters).every(([k,v])=>r[k]===v))??null,take:async(n:number)=>rows(table).slice(0,n)};return result;},replace:async(id:string,value:any)=>{for(const list of tables.values()){const i=list.findIndex(r=>r._id===id);if(i>=0){list[i]={...value,_id:id};return;}}},patch:async(id:string,value:any)=>{for(const list of tables.values()){const row=list.find(r=>r._id===id);if(row)Object.assign(row,value);}},insert:async(table:string,value:any)=>{rows(table).push({...value,_id:`${table}-${rows(table).length}`});},delete:async(id:string)=>{for(const list of tables.values()){const i=list.findIndex(r=>r._id===id);if(i>=0)list.splice(i,1);}}};
 const ctx={db},shopify=load('convex/shopify.ts',clock),pixel=load('convex/shopifyEvents.ts',clock);
 const connect=(issuedAt:number)=>shopify.saveConnection._handler(ctx,{accessToken:'synthetic-renewed',scopes:['read_orders'],issuedAt});
 const event=(id:string)=>({sessionId:'a'.repeat(64),eventId:id.repeat(64),name:'checkout_started',timestamp:clock.now,category:null});
 await connect(clock.now-500);assert.equal(rows('shopifyConnections')[0].connectedAt,installed);
 assert.equal(await pixel.record._handler(ctx,event('b')),'recorded');assert.equal(rows('pixelCollectionState')[0].firstReceivedAt,installed+1000);
 const revokedAt=clock.now+1000;clock.now+=1000;await shopify.revoke._handler(ctx,{eventId:'synthetic-uninstall',triggeredAt:revokedAt});assert.equal(rows('shopifyConnections').length,0);
 await assert.rejects(()=>connect(revokedAt-1),/installation changed/);
 clock.now+=1000;await connect(clock.now-1);assert.equal(rows('shopifyConnections')[0].connectedAt,clock.now);
 await assert.rejects(()=>connect(revokedAt+50),/installation changed/);
 await assert.rejects(()=>shopify.saveSnapshot._handler(ctx,{syncedAt:revokedAt-1,periodStart:new Date(installed).toISOString(),orders:[],abandoned:[]}),/installation changed/);
 clock.now+=100;assert.equal(await pixel.record._handler(ctx,event('c')),'recorded');assert.equal(rows('pixelCollectionState')[0].firstReceivedAt,clock.now);
});
