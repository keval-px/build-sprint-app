import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {matchCheckoutLinks} from '../convex/lib/checkoutMatching.ts';
import {STORE} from '../shared/evidence.ts';
import type {AbandonedSnapshot} from '../shared/abandoned.ts';

// Synthetic unit fixtures only; never imported as shopper evidence.
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const row = {id: 123, token: 'unit-checkout-token', subtotal_price: '600.00', currency: 'USD', completed_at: null};
const link = {recordHash: digest(STORE + ':abandoned:123'), sessionId: digest(STORE + ':unit-checkout-token'), subtotalCents: 60000, currency: 'USD' as const, recovered: false};
const snapshot: AbandonedSnapshot = {importedOn: '2026-10-06', emailSent: 0, emailNotSent: 1, records: [{...link, sessionId: null}]};

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
