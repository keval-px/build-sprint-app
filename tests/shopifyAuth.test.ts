import test from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import {verifyMerchant} from '../convex/lib/shopifyAuth.ts';
import {usdCents} from '../shared/shopifyRecords.ts';
// Synthetic credentials and signed fixtures for isolated tests only; never deployed or stored.
process.env.SHOPIFY_CLIENT_ID='fixture-id';
process.env.SHOPIFY_CLIENT_SECRET='fixture-secret';
const signed=async(overrides:Record<string,unknown>={},secret='fixture-secret')=>new SignJWT({dest:'https://build-sprint-demo.myshopify.com',iss:'https://build-sprint-demo.myshopify.com/admin',sub:'fixture-staff',aud:'fixture-id',exp:Math.floor(Date.now()/1000)+60,nbf:Math.floor(Date.now()/1000)-5,...overrides}).setProtectedHeader({alg:'HS256'}).sign(new TextEncoder().encode(secret));
test('only correctly signed sessions for the intended app and store authorize',async()=>{
  assert.equal(await verifyMerchant(await signed()),'build-sprint-demo.myshopify.com');
  for(const claims of [{aud:'another-app'},{dest:'https://other.myshopify.com'},{iss:'https://other.myshopify.com/admin'},{exp:1},{nbf:9999999999},{dest:'https://build-sprint-demo.myshopify.com@attacker.test'}])await assert.rejects(()=>signed(claims).then(verifyMerchant),/invalid or expired/);
  await assert.rejects(()=>signed({},'other-secret').then(verifyMerchant),/invalid or expired/);
});
test('rejects malformed money and never treats unpriced baskets as zero',()=>{
  assert.equal(usdCents({amount:'705.35',currencyCode:'USD'}),70535);
  assert.equal(usdCents({amount:'0.00',currencyCode:'USD'}),0);
  for(const money of [null,{amount:'600',currencyCode:'EUR'},{amount:'NaN',currencyCode:'USD'},{amount:'-1',currencyCode:'USD'},{amount:'1.001',currencyCode:'USD'},{amount:'9999999999999999',currencyCode:'USD'}])assert.equal(usdCents(money),null);
});
