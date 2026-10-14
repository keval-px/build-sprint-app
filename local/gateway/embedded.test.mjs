import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {embeddedPage,embeddedClient} from './embedded.mjs';
import {createGateway} from './gateway.mjs';
import {identity} from './dev-identity.mjs';

test('embedded page uses the pinned public identity and narrowly scoped scripts/framing',()=>{
  assert.throws(()=>embeddedPage('http://127.0.0.1:6311'));
  assert.throws(()=>embeddedPage('https://unapproved.example.com'));
  assert.throws(()=>embeddedPage('https://fixture.trycloudflare.com/path'));
  assert.throws(()=>createGateway({embeddedOrigin:'https://fixture.trycloudflare.com'}));
  const page=embeddedPage('https://fixture.trycloudflare.com');
  assert.ok(page.html.includes(identity.clientId));
  assert.ok(page.csp.includes(`frame-ancestors https://admin.shopify.com https://${identity.storeDomain}`));
  assert.ok(page.csp.includes("connect-src 'self'"));
  assert.doesNotMatch(page.html,/clientSecret|accessToken|refreshToken|convex|neighborly/);
});

test('embedded client sends bearer only to the same-origin session path, retains no token and hides raw errors',async()=>{
  let click, calls=[];
  const status={textContent:''},button={disabled:false,addEventListener:(_event,fn)=>{click=fn;}};
  const context={document:{getElementById:id=>id==='session-status'?status:button},shopify:{idToken:async()=>'PUBLIC-TEST-TOKEN'},fetch:async(path,options)=>{calls.push({path,options});return {ok:true};}};
  runInNewContext(embeddedClient,context); await click();
  assert.equal(calls.length,1); assert.equal(calls[0].path,'/api/shopify/session');
  assert.equal(calls[0].options.headers.Authorization,'Bearer PUBLIC-TEST-TOKEN');
  assert.equal(calls[0].options.credentials,'omit'); assert.equal(calls[0].options.redirect,'error');
  assert.equal(button.disabled,false); assert.match(status.textContent,/verified/);
  context.shopify.idToken=async()=>{throw Error('DO-NOT-DISPLAY-RAW-ERROR');}; await click();
  assert.equal(calls.length,1); assert.doesNotMatch(status.textContent,/DO-NOT|PUBLIC-TEST/);
});
