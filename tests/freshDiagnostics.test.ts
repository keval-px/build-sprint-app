import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {buildSync} from 'esbuild';
const require=createRequire(import.meta.url);
const sessions=['b12c3b946293d92562181b91fcd3eed117b8a5a8e170988a8972089550a5c80f','fc92b53c02a7befd28e6b27584dadbc0fd01a405c83524b010eeba20267b1945'];
const STORE='build-sprint-demo.myshopify.com';
const hashes=['order:gid://shopify/Order/18937951617250','abandoned-gql:gid://shopify/AbandonedCheckout/66832565436642'].map(v=>createHash('sha256').update(`${STORE}:${v}`).digest('hex'));
const code=buildSync({entryPoints:['convex/freshDiagnostics.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false}).outputFiles[0].text;
function fixture(canonical=false){
 const now=Date.now(),job={_id:'publication',store:STORE,connectedAt:now-86400000,status:'published',startedAt:now-60000,periodStart:new Date(now-30*86400000).toISOString(),currency:'USD',timeZone:'UTC',canonical},tables:Record<string,any[]>={shopifyConnections:[{_id:'connection',store:STORE,connectedAt:job.connectedAt,scopes:['read_orders','read_customer_events'],accessToken:'FORBIDDEN_SECRET'}],shopifyInstallState:[],shopifySyncJobs:[job],shopifyCheckoutPrices:[],shopifySyncRows:[],shopifyNativeHeads:[],shopifyNativeVersions:[]},trace:any[]=[];
 for(let i=0;i<2;i++){
  tables.shopifyCheckoutPrices.push({_id:`price${i}`,store:STORE,sessionId:sessions[i],receivedAt:now-1,createdAt:new Date(now-3600000).toISOString(),updatedAt:now-2,currency:'USD',subtotalCents:i?74995:60000,totalCents:i?76495:60000,recovered:!i,completedAt:i?undefined:now-1000,email:'FORBIDDEN_CUSTOMER',rawToken:'FORBIDDEN_TOKEN'});
  const row={recordHash:hashes[i],sessionId:sessions[i],createdAt:new Date(now-3600000).toISOString(),subtotalCents:i?74995:60000,totalCents:i?76495:60000,...(i?{recovered:false}:{orderName:'#1029',orderId:'18937951617250',paid:true,test:true,cancelled:false}),email:'FORBIDDEN_CUSTOMER',rawToken:'FORBIDDEN_TOKEN'};
  if(canonical){tables.shopifyNativeHeads.push({_id:`head${i}`,store:STORE,connectedAt:job.connectedAt,kind:i?'abandoned':'orders',recordHash:hashes[i],createdAt:row.createdAt});tables.shopifyNativeVersions.push({_id:`version${i}`,head:`head${i}`,job:job._id,revision:job.startedAt,currency:'USD',sourceUpdatedAt:now-120000,row});}
  else tables.shopifySyncRows.push({_id:`row${i}`,job:job._id,kind:i?'abandoned':'orders',recordHash:hashes[i],row});
 }
 const db={get:async(id:string)=>{trace.push({get:id});return Object.values(tables).flat().find(r=>r._id===id)??null;},query:(table:string)=>{
  const filters:Record<string,any>={};let direction=1;
  const range:any={eq:(key:string,value:any)=>{filters[key]=value;return range;}};
  const selected=()=>tables[table].filter(row=>Object.entries(filters).every(([k,v])=>row[k]===v)).sort((a,b)=>direction*((a.sourceUpdatedAt??0)-(b.sourceUpdatedAt??0)||a.revision-b.revision));
  const q:any={withIndex:(index:string,fn:Function)=>{fn(range);trace.push({table,index,filters});return q;},order:(order:string)=>{direction=order==='desc'?-1:1;return q;},unique:async()=>{const rows=selected();assert.ok(rows.length<=1);return rows[0]??null;},take:async(n:number)=>{assert.ok(n<=128);return selected().slice(0,n);}};return q;
 }};
 const module={exports:{}};runInNewContext(code,{module,exports:module.exports,require,Date,TextEncoder,Error,process});
 const read=(generation='publication')=>(module.exports as any).read._handler({db},{generation});
 return {job,tables,trace,read,now};
}
test('internal diagnostic projects at most four fixed QA records and excludes customer/credential/token fields',async()=>{
 for(const canonical of [false,true]){
  const h=fixture(canonical);h.tables.shopifyCheckoutPrices.push({...h.tables.shopifyCheckoutPrices[0],_id:'unrelated',sessionId:'a'.repeat(64),email:'OTHER_CUSTOMER'});
  const result=await h.read();assert.equal(result.records.length,4);assert.ok(result.records.every((r:any)=>r.present));assert.equal(result.records[1].orderId,'18937951617250');assert.equal(result.records[1].matchesExpectedSession,true);assert.equal(result.records[3].totalCents,76495);assert.equal(result.reconciliationVerified,false);assert.ok(!JSON.stringify(result).includes('FORBIDDEN'));assert.ok(!JSON.stringify(result).includes('OTHER_CUSTOMER'));
  const reads=h.trace.filter(t=>t.table==='shopifyCheckoutPrices');assert.equal(reads.length,2);assert.deepEqual(reads.map(t=>t.filters.sessionId),sessions);assert.ok(reads.every(t=>t.index==='by_store_session'&&t.filters.store===STORE));
  const native=h.trace.filter(t=>t.table===(canonical?'shopifyNativeHeads':'shopifySyncRows'));assert.equal(native.length,2);assert.deepEqual(native.map(t=>t.filters.recordHash),hashes);assert.ok(native.every(t=>canonical?t.filters.connectedAt===h.job.connectedAt:t.filters.job===h.job._id));
 }
});
test('canonical diagnostic pins publication, excludes pending/newer versions and old reporting-window identities',async()=>{
 const h=fixture(true),good=h.tables.shopifyNativeVersions[0];h.tables.shopifyNativeVersions.push({...good,_id:'unpublished',job:'missing',sourceUpdatedAt:good.sourceUpdatedAt+1,revision:good.revision,row:{...good.row,totalCents:1}});h.tables.shopifyNativeVersions.push({...good,_id:'later',job:h.job._id,sourceUpdatedAt:good.sourceUpdatedAt+2,revision:h.job.startedAt+1,row:{...good.row,totalCents:2}});
 assert.equal((await h.read()).records[1].totalCents,60000);h.tables.shopifyNativeVersions[1].row.createdAt=new Date(h.now-31*86400000).toISOString();assert.equal((await h.read()).records[3].present,false);
});
test('missing records return fixed empty slots without borrowing another session or installation price',async()=>{
 const h=fixture();h.tables.shopifyCheckoutPrices[0].receivedAt=h.job.connectedAt-1;h.tables.shopifyCheckoutPrices.splice(1);h.tables.shopifySyncRows=[];const result=await h.read();assert.equal(result.records.length,4);assert.ok(result.records.every((r:any)=>r.present===false));assert.ok(result.records.every((r:any)=>r.totalCents===undefined));
});
test('revoked, replacement, foreign and unfinished publications reject before any test-record reads',async()=>{
 for(const change of [(h:any)=>h.tables.shopifyInstallState.push({store:STORE,revokedAt:h.now}), (h:any)=>h.job.connectedAt--,(h:any)=>h.job.store='foreign.myshopify.com',(h:any)=>h.job.status='running']){
  const h=fixture();change(h);await assert.rejects(()=>h.read(),/Pinned test publication/);assert.equal(h.trace.some(t=>['shopifyCheckoutPrices','shopifySyncRows','shopifyNativeHeads'].includes(t.table)),false);
 }
});
test('conflicting native identity rejects rather than projecting a different record',async()=>{
 const h=fixture();h.tables.shopifySyncRows[0].row.recordHash='b'.repeat(64);await assert.rejects(()=>h.read(),/Unexpected test record identity/);
});
