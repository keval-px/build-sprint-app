import {createHmac} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import {verifyMerchant,verifyLifecycle} from '../convex/lib/shopifyAuth.ts';
import {usdCents} from '../shared/shopifyRecords.ts';
// Synthetic credentials and signed fixtures for isolated tests only; never deployed or stored.
process.env.SHOPIFY_CLIENT_ID='fixture-id';
process.env.SHOPIFY_CLIENT_SECRET='fixture-secret';
const signed=async(overrides:Record<string,unknown>={},secret='fixture-secret')=>new SignJWT({dest:'https://build-sprint-demo.myshopify.com',iss:'https://build-sprint-demo.myshopify.com/admin',sub:'fixture-staff',aud:'fixture-id',exp:Math.floor(Date.now()/1000)+60,nbf:Math.floor(Date.now()/1000)-5,...overrides}).setProtectedHeader({alg:'HS256'}).sign(new TextEncoder().encode(secret));
test('only correctly signed sessions for the intended app and store authorize',async()=>{
  assert.equal(await verifyMerchant(await signed()),'build-sprint-demo.myshopify.com');
  for(const claims of [{aud:'another-app'},{aud:undefined},{dest:undefined},{iss:undefined},{sub:undefined},{dest:'https://other.myshopify.com'},{iss:'https://other.myshopify.com/admin'},{exp:1},{nbf:9999999999},{dest:'https://build-sprint-demo.myshopify.com@attacker.test'},{dest:'https://build-sprint-demo.myshopify.com/extra'},{dest:'https://build-sprint-demo.myshopify.com?extra=1'},{dest:'https://build-sprint-demo.myshopify.com#extra'},{iss:'https://build-sprint-demo.myshopify.com/other'},{iss:'https://build-sprint-demo.myshopify.com/admin?extra=1'}])await assert.rejects(()=>signed(claims).then(verifyMerchant),/invalid or expired/);
  await assert.rejects(()=>signed({},'other-secret').then(verifyMerchant),/invalid or expired/);
});
test('required session timestamps retain the locked SDK clock tolerance',async(t)=>{
  const now=1791475000000;
  t.mock.timers.enable({apis:['Date'],now});
  const seconds=Math.floor(now/1000);
  for(const claims of [{exp:seconds+1},{exp:seconds},{exp:seconds-1},{exp:seconds-9},{nbf:seconds+1},{nbf:seconds+10}]){
    assert.equal(await verifyMerchant(await signed(claims)),'build-sprint-demo.myshopify.com');
  }
  for(const claims of [{exp:seconds-10},{exp:seconds-11},{nbf:seconds+11},{exp:undefined},{nbf:undefined},{exp:'1791475060'},{nbf:'1791474995'},{exp:null},{nbf:null}]){
    await assert.rejects(()=>signed(claims).then(verifyMerchant),/^Error: Shopify session is invalid or expired\.$/);
  }
});
test('idle sessions and concurrent invalid sessions fail safely without SDK token details',async(t)=>{
  const now=1791475000000;
  t.mock.timers.enable({apis:['Date'],now});
  const token=await signed();
  t.mock.timers.setTime(now+70000);
  const results=await Promise.allSettled([verifyMerchant(token),verifyMerchant(token),verifyMerchant(await signed({},'wrong-secret'))]);
  for(const result of results){
    assert.equal(result.status,'rejected');
    if(result.status==='rejected'){
      assert.equal(result.reason.message,'Shopify session is invalid or expired.');
      assert.ok(!result.reason.message.includes(token));
    }
  }
  assert.equal(await verifyMerchant(await signed()),'build-sprint-demo.myshopify.com');
});
test('rejects malformed money and never treats unpriced baskets as zero',()=>{
  assert.equal(usdCents({amount:'705.35',currencyCode:'USD'}),70535);
  assert.equal(usdCents({amount:'0.00',currencyCode:'USD'}),0);
  for(const money of [null,{amount:'600',currencyCode:'EUR'},{amount:'NaN',currencyCode:'USD'},{amount:'-1',currencyCode:'USD'},{amount:'1.001',currencyCode:'USD'},{amount:'9999999999999999',currencyCode:'USD'}])assert.equal(usdCents(money),null);
});

test('checkout deliveries require an unchanged signed body and the intended store',async()=>{
 const body=JSON.stringify({token:'unit-token',total_price:'779.95'});
 const signature=createHmac('sha256','fixture-secret').update(body).digest('base64');
 const headers={'X-Shopify-Hmac-Sha256':signature,'X-Shopify-Shop-Domain':'build-sprint-demo.myshopify.com','X-Shopify-Topic':'checkouts/update','X-Shopify-API-Version':'2026-10','X-Shopify-Webhook-Id':'unit-delivery'};
 const request=(overrides:Record<string,string>={})=>new Request('https://unit.invalid/shopify/webhooks',{method:'POST',headers:{...headers,...overrides}});
 assert.ok(await verifyLifecycle(request(),body));
 assert.equal(await verifyLifecycle(request(),body+' '),null);
 assert.equal(await verifyLifecycle(request({'X-Shopify-Hmac-Sha256':'invalid'}),body),null);
 assert.equal(await verifyLifecycle(request({'X-Shopify-Shop-Domain':'other.myshopify.com'}),body),null);
});
