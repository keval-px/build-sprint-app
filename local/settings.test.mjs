import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedPublicOrigin,publicTarget,identity,assertLocalEnvironment,shopifyAppConfiguration} from './settings.mjs';
test('Shopify lifecycle notifications use an absolute gateway URL after tunnel rotation',()=>{
  for(const origin of ['https://first.trycloudflare.com','https://second.trycloudflare.com']){
    const config=shopifyAppConfiguration(origin);
    const uri=config.match(/^uri = "([^"]+)"/m)?.[1];
    assert.equal(uri,origin+'/api/shopify/webhooks');
    assert.equal(new URL(uri,origin+'/api/shopify/app/').href,uri);
    assert.match(config,/app\/uninstalled.*app\/scopes_update/);
  }
});
test('local deployment settings always select the separate app and store',()=>{
  const settings=publicTarget('https://local-test.trycloudflare.com');
  assert.equal(settings.store,identity.store);
  assert.equal(settings.siteOrigin,'http://127.0.0.1:6211');
  assert.equal(settings.clientId,'f98767012d6e223abbbf0fc931acbbf4');
  assert.doesNotMatch(JSON.stringify(settings),/secret|admin|convex\.site|build-sprint-demo/);
});
test('inherited credentials and deployment selectors cannot retarget local operations',()=>{
  assertLocalEnvironment({});assertLocalEnvironment({CONVEX_SELF_HOSTED_URL:identity.api});
  for(const key of ['CONVEX_DEPLOY_KEY','CONVEX_DEPLOYMENT','CONVEX_SELF_HOSTED_ADMIN_KEY','CONVEX_SELF_HOSTED_URL'])assert.throws(()=>assertLocalEnvironment({[key]:'unexpected'}));
});
test('local commands reject cloud origins, lookalikes and credentials in URLs',()=>{
  for(const url of ['https://neighborly-nightingale-843.convex.site','http://127.0.0.1:3211','https://test.trycloudflare.com.evil.test','https://u:p@test.trycloudflare.com','https://test.trycloudflare.com/path','https://test.trycloudflare.com?x=1','https://test.trycloudflare.com:8443'])assert.throws(()=>checkedPublicOrigin(url));
  assert.equal(checkedPublicOrigin(identity.gateway),identity.gateway);
});
