import test from 'node:test';
import assert from 'node:assert/strict';
import {deployment,browserBackendOrigin,collectorEndpoint} from '../shared/deployment.ts';
test('the maintained source keeps the hosted adapter the tests run against',()=>{
 assert.equal(deployment.kind,'cloud');
 assert.equal(deployment.store,'build-sprint-demo.myshopify.com');
 assert.equal(deployment.clientId,'9abd2c74381c3ec9dc1db38d568c5e4e');
 assert.equal(collectorEndpoint,`${deployment.appOrigin}/api/shopify/pixel-events`);
 assert.deepEqual(Object.keys(deployment).sort(),['appOrigin','clientId','kind','siteOrigin','store']);
});
test('embedded requests stay on the page origin so Shopify authentication can refresh',()=>{
 const origin='https://test-gateway.trycloudflare.com';
 assert.equal(browserBackendOrigin({origin,hostname:'test-gateway.trycloudflare.com',pathname:'/api/shopify/app'}),origin);
 assert.equal(browserBackendOrigin({origin:'http://localhost:5173',hostname:'localhost',pathname:'/'}),deployment.siteOrigin);
});
test('on the hosted path the local opt-ins never block, and development-only operations are refused',async()=>{
 const rules=await import('../convex/lib/deployment.ts');
 const saved={...process.env};delete process.env.LOCAL_CONNECTION_ENABLED;delete process.env.LOCAL_SYNC_ENABLED;
 try{
  assert.equal(rules.isLocal,false);
  assert.doesNotThrow(()=>rules.assertConnectionEnabled());
  assert.equal(rules.syncPaused(),false);
  assert.doesNotThrow(()=>rules.assertAppIdentity('any-hosted-client-id'));
  assert.throws(()=>rules.assertDevelopmentOnly(),/Development-only/);
  assert.throws(()=>rules.assertSimulationAllowed('checkout-gain-local-dev-sandbox.myshopify.com'),/restricted to the local sandbox/);
  assert.equal(rules.reuseTunnelSubscriptions,false);assert.equal(rules.explainRejectedSubscriptions,false);
 }finally{process.env=saved;}
});
