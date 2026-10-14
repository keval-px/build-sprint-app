import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createAuthentication} from './auth.mjs';
import {identity} from './dev-identity.mjs';
import {request} from 'node:http';
import {createGateway, routes} from './gateway.mjs';

// Public test vector, NOT a generated credential or accepted runtime secret.
const key = 'PUBLIC-TEST-VECTOR-NOT-A-SHOPIFY-CREDENTIAL';
const shop = identity.storeDomain;
const aud = identity.clientId;
const now = Math.floor(Date.now()/1000);
const sign = s => createHmac('sha256', key).update(s).digest();
const base = {iss: `https://${shop}/admin`, dest: `https://${shop}`, aud, sub:'fixture-user', exp:now+60, nbf:now-1};
function token(claims = {}, header = {alg:'HS256',typ:'JWT'}) {
  const s = [header, {...base,...claims}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return `${s}.${sign(s).toString('base64url')}`;
}
// Exercise the real official-library adapter using only a public test vector.
const {verifySession,verifyWebhook} = createAuthentication(key);
async function withServer(options, run) {
  const server = createGateway(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port = server.address().port;
  const call = (path, method='GET', headers={}, body='') => new Promise((resolve,reject)=>{
    const r = request({host:'127.0.0.1',port,path,method,headers}, res=>{
      let text=''; res.on('data',x=>text+=x); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
    }); r.on('error',reject); r.end(body);
  });
  try { await run(call); } finally { await new Promise(resolve=>server.close(resolve)); }
}

test('unconfigured runtime fails closed and shell contains no data or remote resources', async()=>withServer({},async call=>{
  const shell = await call('/api/shopify/app');
  assert.equal(shell.status,200);
  assert.equal(shell.headers['content-security-policy'].includes("default-src 'none'"),true);
  assert.equal(shell.headers['access-control-allow-origin'],undefined);
  assert.doesNotMatch(shell.text,/convex|<script|src=|href=|customer|orderId/);
  assert.equal((await call('/api/shopify/session')).status,401);
  assert.equal((await call('/api/shopify/session','GET',{authorization:`Bearer ${token()}`})).status,503);
  for (const path of ['/api/shopify/auth','/api/shopify/auth/callback','/api/shopify/webhooks','/api/shopify/pixel'])
    assert.equal((await call(path,routes[path])).status,503);
}));

test('exact route and method allowlist blocks history, database, dashboard, files and proxy aliases', async()=>withServer({verifySession,verifyWebhook},async call=>{
  const forbidden = ['/', '/version','/api/query','/api/mutation','/api/action','/api/test-evidence','/api/demo/fixes', '/api/shopify/history', '/api/shopify/app/history', '/dashboard', '/admin', '/.env.local', '/local/private/admin.env', '/backups/immutable-raw-source.zip', '/api/storage/x', '/api/shopify/app/', '//api/shopify/app', '/api/shopify/%61pp', '/api/shopify/app/../session', '/api/shopify/app%2f..%2fhistory', 'http://127.0.0.1:3211/api/test-evidence'];
  for (const path of forbidden) for (const method of ['GET','POST','OPTIONS','HEAD']) {
    const r = await call(path,method,{authorization:`Bearer ${token()}`,host:'127.0.0.1:3211','x-forwarded-host':'127.0.0.1:3210'});
    assert.equal(r.status,404,`${method} ${path}`);
    assert.ok(r.text === '' || r.text === '{"message":"Not found"}');
  }
  for (const [path,method] of Object.entries(routes)) for (const wrong of ['PUT','DELETE','OPTIONS',method==='GET'?'POST':'GET'])
    assert.equal((await call(path,wrong)).status,405);
}));

test('session authentication rejects invalid signature, algorithm, tenant, audience and time claims',async()=>withServer({verifySession},async call=>{
  const variants = ['bad',`${token()}x`,token({aud:'live-app'}),token({dest:'https://build-sprint-demo.myshopify.com'}),token({iss:'https://foreign.myshopify.com/admin'}),token({exp:now}),token({nbf:now+60}),token({exp:'forever'}),token({exp:undefined}),token({nbf:undefined}),token({sub:''}),token({}, {alg:'none'}),token({}, {alg:'HS512'})];
  for (const value of variants) assert.equal((await call('/api/shopify/session','GET',{authorization:`Bearer ${value}`})).status,401);
  const r = await call('/api/shopify/session','GET',{authorization:`Bearer ${token()}`});
  assert.equal(r.status,200); assert.equal(r.text,'{"message":"Authenticated synthetic fixture; no database access"}');
}));

test('official adapter verifies locally without outbound fetch or leaking invalid tokens',async()=>{
  const original=globalThis.fetch; let requests=0;
  globalThis.fetch=()=>{ requests++; throw Error('Network forbidden in authentication tests'); };
  try {
    assert.equal(await verifySession(token()),true);
    assert.equal(await verifySession('public-invalid-token'),false);
    const raw=Buffer.from('{"synthetic":"café"}');
    const headers={'x-shopify-shop-domain':shop,'x-shopify-topic':'app/scopes_update','x-shopify-api-version':'2026-10','x-shopify-webhook-id':'12345678-1234-1234-1234-123456789012','x-shopify-hmac-sha256':sign(raw).toString('base64')};
    assert.equal(await verifyWebhook(headers,raw),true);
    assert.equal(await verifyWebhook({...headers,'x-shopify-webhook-id':undefined},raw),false);
    assert.equal(await verifyWebhook({...headers,'x-shopify-api-version':'2025-01'},raw),false);
    assert.equal(await verifyWebhook(headers,Buffer.from([0xff])),false);
    assert.equal(requests,0);
  } finally { globalThis.fetch=original; }
});

test('duplicate auth headers and query-string tokens do not authenticate',async()=>withServer({verifySession,verifyWebhook},async call=>{
  assert.equal((await call('/api/shopify/session?token='+token())).status,401);
  assert.equal((await call('/api/shopify/session','GET',{authorization:[`Bearer ${token()}`,`Bearer ${token()}`]})).status,400);
}));

test('embedded route is opt-in, rejects foreign browser origins and still blocks private paths',async()=>{
  await withServer({},async call=>assert.equal((await call('/api/shopify/app.js')).status,404));
  const origin='https://fixture.trycloudflare.com';
  await withServer({verifySession,verifyWebhook,embeddedOrigin:origin},async call=>{
    const shell=await call('/api/shopify/app'); assert.equal(shell.status,200); assert.match(shell.text,/shopify-api-key/);
    assert.equal((await call('/api/shopify/app.js')).status,200);
    assert.equal((await call('/api/shopify/session','GET',{origin:'https://foreign.example',authorization:`Bearer ${token()}`})).status,403);
    assert.equal((await call('/api/shopify/session','GET',{origin,authorization:`Bearer ${token()}`})).status,200);
    assert.equal((await call('/api/test-evidence','GET',{origin,authorization:`Bearer ${token()}`})).status,404);
  });
});

test('webhook authentication checks exact raw bytes, store and topic; valid delivery has no processing',async()=>withServer({verifyWebhook},async call=>{
  const raw = '{"synthetic":true}';
  const headers = {'x-shopify-shop-domain':shop,'x-shopify-topic':'app/uninstalled','x-shopify-hmac-sha256':sign(raw).toString('base64'),'x-shopify-api-version':'2026-10','x-shopify-webhook-id':'12345678-1234-1234-1234-123456789012'};
  for (const [h,b] of [[{},raw],[{...headers,'x-shopify-shop-domain':'build-sprint-demo.myshopify.com'},raw],[{...headers,'x-shopify-topic':'orders/create'},raw],[headers,raw+' ']])
    assert.equal((await call('/api/shopify/webhooks','POST',h,b)).status,401);
  assert.equal((await call('/api/shopify/webhooks','POST',headers,raw)).status,200);
  assert.equal((await call('/api/shopify/webhooks','POST',headers,'x'.repeat(65537))).status,413);
  assert.equal((await call('/api/shopify/pixel','POST',headers,raw)).status,503);
}));
