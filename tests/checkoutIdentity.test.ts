import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {mergeCheckoutEvents,canReadShopifyEvidence} from '../shared/checkoutIdentity.ts';
import {summarize} from '../shared/evidence.ts';
test('browser bundle hashes inside the strict sandbox without crypto or TextEncoder',()=>{
  const output=buildSync({stdin:{contents:"import {checkoutIdentity} from './shared/checkoutIdentity.ts'; self.result=checkoutIdentity('fixture-event');",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0].text;
  const self:{result?:string}={};runInNewContext(output,{self,console});
  assert.equal(self.result,createHash('sha256').update('build-sprint-demo.myshopify.com:fixture-event').digest('hex'));
});
test('overlapping collectors count once and prefer the app pixel price',()=>{
  const legacy={eventId:'fixture-event',sessionId:'fixture-session',name:'checkout_started' as const,timestamp:1,category:null};
  const events=mergeCheckoutEvents([legacy],[{...legacy,subtotalCents:60000,currency:'USD'}]);
  assert.equal(summarize(events).eventCount,1);assert.equal(events[0].subtotalCents,60000);
});
test('a valid session alone cannot read evidence after connection revocation',()=>{
  assert.equal(canReadShopifyEvidence({scopes:['read_orders','read_customer_events']}),true);
  assert.equal(canReadShopifyEvidence(null),false);
  assert.equal(canReadShopifyEvidence({scopes:['read_orders']}),false);
});
