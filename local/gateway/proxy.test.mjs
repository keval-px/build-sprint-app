import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createSandboxGateway} from './proxy.mjs';
const signedBody=Buffer.from('{"event":"synthetic-checkout"}');
async function fixture(t,extra={}){
  const calls=[];
  const server=createSandboxGateway({assets:['/assets/app.js'],authentication:{verifySession:async token=>token==='synthetic.session.token',verifyWebhook:async(_headers,bytes)=>bytes.equals(signedBody)},fetchUpstream:async(url,init)=>{calls.push({url,init});return new Response('fixture',{headers:{'Content-Type':'text/plain'}});},...extra});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  return {calls,send:(path,method='GET',headers={},body)=>new Promise((resolve,reject)=>{
    const req=request({host:'127.0.0.1',port:server.address().port,path,method,headers},res=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(parts).toString(),headers:res.headers}));});req.on('error',reject);req.end(body);
  })};
}
test('only listed pages and assets reach the fixed sandbox HTTP port',async t=>{
  const {send,calls}=await fixture(t);
  assert.equal((await send('/api/shopify/app?shop=checkout-gain-local-dev-sandbox.myshopify.com')).status,200);
  assert.equal((await send('/assets/app.js','GET',{'Host':'attacker.invalid','X-Forwarded-Host':'127.0.0.1:3211'})).status,200);
  assert.ok(calls.every(c=>c.url.startsWith('http://127.0.0.1:6211/')));
  assert.equal(calls[1].init.headers.host,undefined);
  for(const path of ['/','/api/query','/api/mutation','/api/test-evidence','/api/demo/fixes','/admin','/dashboard','/.env.local','/.local/convex/private/admin.key','/api/storage/anything','/assets/missing.js','/api/shopify/%61pp','/api/shopify/app/../session','//api/shopify/app','http://127.0.0.1:3211/api/test-evidence'])assert.equal((await send(path)).status,404,path);
  assert.equal(calls.length,2);
});
test('business reads and writes require verified sessions without forwarding failed requests',async t=>{
  const {send,calls}=await fixture(t);
  assert.equal((await send('/api/shopify/evidence')).status,401);
  assert.equal((await send('/api/shopify/evidence')).headers['x-shopify-retry-invalid-session-request'],'1');
  assert.equal((await send('/api/shopify/sync','POST')).headers['x-shopify-retry-invalid-session-request'],undefined);
  assert.equal((await send('/api/shopify/evidence','GET',{Authorization:'Bearer wrong'})).status,401);
  assert.equal((await send('/api/shopify/evidence?token=wrong')).status,400);
  assert.equal((await send('/api/shopify/evidence','GET',{Authorization:'Bearer synthetic.session.token'})).status,200);
  assert.equal((await send('/api/shopify/sync','GET',{Authorization:'Bearer synthetic.session.token'})).status,405);
  assert.equal((await send('/api/shopify/sync','POST',{Authorization:'Bearer synthetic.session.token'})).status,200);
  assert.equal(calls.length,2);
  assert.equal(calls[1].init.headers.authorization,'Bearer synthetic.session.token');
});
test('separate app pages serve only the app shell and keep session protection',async t=>{
 const {send,calls}=await fixture(t);
 for(const page of ['checkouts','fix-history','alerts']){
  const path=`/api/shopify/app/${page}`;
  assert.equal((await send(path+'?id_token=opening-token')).status,200);
  assert.equal((await send(path,'POST')).status,405);
  assert.equal((await send(path+'?shop=foreign.myshopify.com')).status,403);
 }
 assert.equal(calls.length,3);assert.ok(calls.every(c=>!c.url.includes('opening-token')));
 assert.equal((await send('/api/shopify/app/private')).status,404);
 assert.equal((await send('/api/shopify/app/alerts/nested')).status,404);
 assert.equal((await send('/api/shopify/evidence')).status,401);
});
test('Shopify opening links discard their bootstrap token but never authenticate data requests',async t=>{
  const {send,calls}=await fixture(t);
  assert.equal((await send('/api/shopify/app?shop=checkout-gain-local-dev-sandbox.myshopify.com&id_token=opening-token')).status,200);
  assert.ok(!calls[0].url.includes('opening-token'));
  assert.equal((await send('/api/shopify/session?id_token=opening-token')).status,400);
  assert.equal((await send('/api/shopify/app?access_token=secret')).status,400);
  assert.equal(calls.length,1);
});
test('signed notifications preserve bytes and invalid or oversized payloads never reach Convex',async t=>{
  const {send,calls}=await fixture(t);
  assert.equal((await send('/api/shopify/webhooks','POST',{},signedBody)).status,200);
  assert.deepEqual(calls[0].init.body,signedBody);
  assert.equal((await send('/api/shopify/webhooks','POST',{},signedBody.toString()+' ')).status,401);
  assert.equal((await send('/api/shopify/pixel-events','POST',{},'x'.repeat(12001))).status,413);
  assert.equal(calls.length,1);
});
test('upstream redirects cannot leak localhost storage or reach other destinations',async t=>{
  const {send}=await fixture(t,{fetchUpstream:async()=>new Response(null,{status:302,headers:{Location:'http://127.0.0.1:3210/admin'}})});
  const response=await send('/assets/app.js');assert.equal(response.status,502);assert.equal(response.headers.location,undefined);
});
