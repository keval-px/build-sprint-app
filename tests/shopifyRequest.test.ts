import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {shopifyRequestInit,invalidSessionResponse} from '../shared/shopifyRequest.ts';
const origin='https://neighborly-nightingale-843.convex.site';
const fixture=await readFile(new URL('./fixtures/shopify-fetch-interceptor-0.39.2.js',import.meta.url),'utf8');
function interceptor(replies:Response[]){
  const calls:Request[]=[],messages:unknown[]=[],logs:unknown[]=[],tokens:string[]=[];
  const nativeFetch=async(request:Request)=>{calls.push(request);return replies[Math.min(calls.length-1,replies.length-1)].clone();};
  const context={self:{fetch:nativeFetch},fetch:nativeFetch,Request,Response,Headers,URL,location:{protocol:'https:',hostname:'neighborly-nightingale-843.convex.site',href:origin+'/api/shopify/app'},console:{error:(...args:unknown[])=>logs.push(args)},fixtureProtocol:{send:(...args:unknown[])=>messages.push(args)},fixtureApi:{config:{},idToken:async()=>{const token=`synthetic-session-${tokens.length+1}`;tokens.push(token);return token;}}};
  runInNewContext(fixture,context);
  return {fetch:context.fetch,calls,tokens,logs,messages};
}
test('official App Bridge interceptor refreshes evidence authentication once and stops on a second 401',async()=>{
  for(const terminal of [new Response('{}'),invalidSessionResponse(true)]){
    const bridge=interceptor([invalidSessionResponse(true),terminal]);
    const init=await shopifyRequestInit('evidence?start=1&end=2','GET',origin,origin,{idToken:async()=>{throw Error('App must not fetch the token manually');}});
    const response=await bridge.fetch(origin+'/api/shopify/evidence?start=1&end=2',init);
    assert.equal(response.status,terminal.status);
    assert.equal(bridge.calls.length,2);
    assert.deepEqual(bridge.calls.map(request=>request.headers.get('Authorization')),['Bearer synthetic-session-1','Bearer synthetic-session-2']);
    assert.deepEqual(bridge.logs,[]);assert.deepEqual(bridge.messages,[]);
  }
});
test('permission failures, unrelated 401s, upstream failures and mutations are never replayed',async()=>{
  for(const status of [401,403,429,500]){
    const bridge=interceptor([new Response('{}',{status})]);
    await bridge.fetch(origin+'/api/shopify/evidence',await shopifyRequestInit('evidence','GET',origin,origin,{idToken:async()=>''}));
    assert.equal(bridge.calls.length,1);
  }
  for(const path of ['sync','pixel/enable','status']){
    const method=path==='status'?'GET':'POST';
    const bridge=interceptor([invalidSessionResponse(true)]);
    await bridge.fetch(origin+'/api/shopify/'+path,await shopifyRequestInit(path,method,origin,origin,{idToken:async()=>'synthetic-explicit-session'}));
    assert.equal(bridge.calls.length,1);
    assert.equal(bridge.tokens.length,0);
    assert.equal(bridge.calls[0].headers.get('Authorization'),'Bearer synthetic-explicit-session');
  }
  assert.equal(invalidSessionResponse().headers.get('X-Shopify-Retry-Invalid-Session-Request'),null);
});
test('local cross-origin preview retains explicit auth; concurrent evidence reads recover independently',async()=>{
  let manualTokens=0;
  const init=await shopifyRequestInit('evidence','GET',origin,'http://localhost:4178',{idToken:async()=>{manualTokens++;return 'synthetic-local-session';}});
  assert.equal(new Headers(init.headers).get('Authorization'),'Bearer synthetic-local-session');
  assert.equal(manualTokens,1);
  const bridges=[interceptor([invalidSessionResponse(true),new Response('{}')]),interceptor([invalidSessionResponse(true),invalidSessionResponse(true)])];
  const results=await Promise.all(bridges.map(async bridge=>bridge.fetch(origin+'/api/shopify/evidence',await shopifyRequestInit('evidence','GET',origin,origin,{idToken:async()=>''}))));
  assert.deepEqual(results.map(response=>response.status),[200,401]);
  for(const bridge of bridges){assert.equal(bridge.calls.length,2);assert.equal(bridge.tokens.length,2);assert.deepEqual(bridge.logs,[]);}
});
test('actual HTTP routes grant retry only for evidence session validation, before installation or report reads',async()=>{
  const code=(await build({entryPoints:['convex/http.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,plugins:[{name:'isolated-session-verifier',setup(builder){builder.onLoad({filter:/lib\/shopifyAuth\.ts$/},()=>({loader:'ts',contents:"export const REQUIRED_SCOPES=['read_orders','read_customer_events','write_pixels'];export async function verifyMerchant(token){if(token!=='valid-fixture')throw Error('invalid session')};export async function verifyLifecycle(){return false};export async function exchangeMerchant(){throw Error('unused')};export async function refreshMerchant(){throw Error('unused')};"}));}}]})).outputFiles[0].text;
  const module={exports:{} as any};
  runInNewContext(code,{module,exports:module.exports,require:createRequire(import.meta.url),Request,Response,Headers,URL,TextEncoder,TextDecoder,AbortSignal,process,console,crypto:globalThis.crypto});
  const router=module.exports.default;
  let queries=0;
  const ctx={runQuery:async()=>{queries++;return null;},runMutation:async()=>{throw Error('No writes allowed');}};
  for(const [path,method,retry] of [['evidence','GET',true],['status','GET',false],['sync','POST',false],['pixel/enable','POST',false]] as const){
    const [handler]=router.lookup('/shopify/'+path,method);
    const response=await handler._handler(ctx,new Request(origin+'/shopify/'+path,{method,headers:{Authorization:'Bearer invalid-fixture'}}));
    assert.equal(response.status,401);
    assert.equal(response.headers.get('X-Shopify-Retry-Invalid-Session-Request'),retry?'1':null);
    assert.deepEqual(await response.json(),{error:'Shopify session is invalid or expired.'});
  }
  assert.equal(queries,0);
  const [evidence]=router.lookup('/shopify/evidence','GET');
  const disconnected=await evidence._handler(ctx,new Request(origin+'/shopify/evidence',{headers:{Authorization:'Bearer valid-fixture'}}));
  assert.equal(disconnected.status,403);
  assert.equal(disconnected.headers.get('X-Shopify-Retry-Invalid-Session-Request'),null);
  assert.equal(queries,2); // Existing connection and snapshot checks only.
});
