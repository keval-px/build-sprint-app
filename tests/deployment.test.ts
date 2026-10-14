import test from 'node:test';
import assert from 'node:assert/strict';
import {deployment,browserBackendOrigin,collectorEndpoint} from '../shared/deployment.ts';
test('the maintained source preserves the original cloud deployment adapter',()=>{
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
