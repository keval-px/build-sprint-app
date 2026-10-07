import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {anonymousCheckout, CHECKOUT_PATH, readCheckoutLinks, matchCheckoutLinks} from '../convex/lib/checkoutMatching.ts';
import {STORE} from '../shared/evidence.ts';
import type {AbandonedSnapshot} from '../shared/abandoned.ts';

// Synthetic unit fixtures only; never imported as shopper evidence.
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const row = {id: 123, token: 'unit-checkout-token', subtotal_price: '600.00', currency: 'USD', completed_at: null};
const link = {recordHash: digest(STORE + ':abandoned:123'), sessionId: digest(STORE + ':unit-checkout-token'), subtotalCents: 60000, currency: 'USD' as const, recovered: false};
const snapshot: AbandonedSnapshot = {importedOn: '2026-10-06', emailSent: 0, emailNotSent: 1, records: [{...link, sessionId: null}]};

test('Shopify token uses the existing pixel hash; PII and raw identities are discarded', async () => {
  assert.deepEqual(await anonymousCheckout({...row, email: 'unit@example.invalid', abandoned_checkout_url: 'private-url', billing_address: {name: 'Unit fixture'}}), link);
  assert.equal(await anonymousCheckout({...row, token: null}).then(value => value.sessionId), null);
  await assert.rejects(anonymousCheckout({...row, subtotal_price: '600.009'}));
  await assert.rejects(anonymousCheckout({...row, currency: 'EUR'}));
  await assert.rejects(anonymousCheckout({...row, completed_at: undefined}));
  await assert.rejects(anonymousCheckout({...row, id: Number.MAX_SAFE_INTEGER + 1}));
});

test('exact native ID and observed start both required; equal prices do not match', () => {
  assert.equal(matchCheckoutLinks(snapshot, [link], []).added, 0);
  assert.equal(matchCheckoutLinks(snapshot, [{...link, recordHash: digest('different-native-id')}], [link.sessionId]).added, 0);
  const result = matchCheckoutLinks(snapshot, [link], [link.sessionId]);
  assert.equal(result.added, 1);
  assert.equal(result.matched, 1);
  assert.equal(result.unmatched, 0);
  assert.equal(matchCheckoutLinks({...snapshot, records: result.records}, [link], [link.sessionId]).added, 0);
  assert.equal(snapshot.records[0].sessionId, null);
});

test('rejects conflicting identities and changed baskets before any snapshot changes', () => {
  const accepted = {...snapshot, records: [link]};
  assert.throws(() => matchCheckoutLinks(accepted, [{...link, sessionId: digest('different')}], [link.sessionId]));
  assert.throws(() => matchCheckoutLinks(snapshot, [{...link, subtotalCents: 70000}], [link.sessionId]));
  assert.throws(() => matchCheckoutLinks(snapshot, [link, link], [link.sessionId]));
  assert.throws(() => matchCheckoutLinks(snapshot, [link, {...link, recordHash: digest('other-record')}], [link.sessionId]));
  assert.deepEqual(accepted.records, [link]);
});

test('recovered state updates without manufacturing new links; unreturned records remain intact', () => {
  assert.equal(matchCheckoutLinks(snapshot, [{...link, recovered: true}], [link.sessionId]).records[0].recovered, true);
  assert.deepEqual(matchCheckoutLinks({...snapshot, records: [link]}, [], []).records, [link]);
});

test('reads paginated minimal GETs from the fixed store and returns only anonymous rows', async () => {
  const calls: string[] = [];
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input)); calls.push(url.href);
    assert.equal(url.hostname, STORE);
    assert.equal(url.pathname, CHECKOUT_PATH);
    assert.equal(url.searchParams.get('fields'), 'id,token,subtotal_price,currency,completed_at');
    assert.equal(options?.method, 'GET');
    assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('X-Shopify-Access-Token'), 'unit-credential');
    return new Response(JSON.stringify({checkouts: [calls.length === 1 ? row : {...row, id: 124, token: null}]}), {headers: calls.length === 1 ? {link: `<https://${STORE}${CHECKOUT_PATH}?page_info=unit>; rel="next"`} : {}});
  };
  const results = await readCheckoutLinks('unit-credential', request);
  assert.equal(calls.length, 2);
  assert.deepEqual(results[0], link);
  assert.equal(results[1].sessionId, null);
});

test('foreign pagination never receives the credential; raw API failures never escape', async () => {
  let count = 0;
  await assert.rejects(readCheckoutLinks('unit-credential', async () => {
    count++;
    return new Response(JSON.stringify({checkouts: [row]}), {headers: {link: '<https://foreign.invalid/steal>; rel="next"'}});
  }), /Invalid Shopify pagination/);
  assert.equal(count, 1);
  await assert.rejects(readCheckoutLinks('unit-credential', async () => new Response('private response and credential', {status: 403})), /^Error: Shopify read failed \(HTTP 403\); nothing saved$/);
  await assert.rejects(readCheckoutLinks('unit-credential', async () => {throw Error('private network URL and credential');}), /^Error: Shopify read failed; nothing saved$/);
});

test('repeated pagination and duplicate tokens fail rather than saving partial results', async () => {
  const repeated = `<https://${STORE}${CHECKOUT_PATH}?page_info=unit>; rel="next"`;
  await assert.rejects(readCheckoutLinks('unit-credential', async () => new Response(JSON.stringify({checkouts: []}), {headers: {link: repeated}})), /pagination incomplete/);
  await assert.rejects(readCheckoutLinks('unit-credential', async () => new Response(JSON.stringify({checkouts: [row, {...row, id: 124}]}))), /Ambiguous Shopify identities/);
});

test('GraphQL basket values link only through the same native Shopify checkout ID and original token hash',async()=>{
 const {nativeCheckoutSession}=await import('../convex/lib/checkoutMatching.ts');
 const {recordDigest}=await import('../shared/shopifyRecords.ts');
 const recordHash=await recordDigest('abandoned','123456');
 const sessionId='a'.repeat(64);
 const row={recordHash,sessionId,subtotalCents:60000,currency:'USD' as const,recovered:false};
 assert.equal(await nativeCheckoutSession('gid://shopify/AbandonedCheckout/123456',[row]),sessionId);
 assert.equal(await nativeCheckoutSession('gid://shopify/AbandonedCheckout/999999',[row]),undefined);
 assert.equal(await nativeCheckoutSession('gid://shopify/Order/123456',[row]),undefined);
 assert.equal(await nativeCheckoutSession('gid://shopify/AbandonedCheckout/123456',[row,row]),undefined);
});
