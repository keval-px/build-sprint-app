import {STORE} from '../../shared/evidence.ts';
import type {AbandonedSnapshot} from '../../shared/abandoned.ts';

export type CheckoutLink = AbandonedSnapshot['records'][number];

async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function matchCheckoutLinks(snapshot: AbandonedSnapshot, links: CheckoutLink[], observedSessions: string[]) {
  const observed = new Set(observedSessions);
  const byId = new Map<string, CheckoutLink>();
  const seenTokens = new Set<string>();
  for (const link of links) {
    if (!/^[a-f0-9]{64}$/.test(link.recordHash) || link.sessionId !== null && !/^[a-f0-9]{64}$/.test(link.sessionId) || !Number.isSafeInteger(link.subtotalCents) || link.subtotalCents < 0 || link.currency !== 'USD' || typeof link.recovered !== 'boolean') throw Error('Invalid anonymous checkout link');
    if (byId.has(link.recordHash) || link.sessionId && seenTokens.has(link.sessionId)) throw Error('Ambiguous Shopify identities; nothing saved');
    byId.set(link.recordHash, link);
    if (link.sessionId) seenTokens.add(link.sessionId);
  }
  let added = 0;
  const records = snapshot.records.map(record => {
    const link = byId.get(record.recordHash);
    if (!link) return record;
    if (record.currency !== link.currency || record.subtotalCents !== link.subtotalCents) throw Error('Basket changed; reimport its value before matching');
    if (record.sessionId && link.sessionId && record.sessionId !== link.sessionId) throw Error('Existing link conflicts with Shopify; nothing saved');
    const sessionId = link.sessionId && observed.has(link.sessionId) ? link.sessionId : record.sessionId;
    if (!record.sessionId && sessionId) added++;
    return {...record, sessionId, recovered: link.recovered};
  });
  const accepted = records.flatMap(record => record.sessionId ? [record.sessionId] : []);
  if (new Set(accepted).size !== accepted.length) throw Error('Ambiguous snapshot links; nothing saved');
  return {records, added, matched: accepted.length, unmatched: records.length - accepted.length};
}

// GraphQL and REST use different ID shapes for the same Shopify record.
// Join only by the numeric Shopify checkout ID, then reuse the original token
// hash returned by the demo compatibility reader. A recovery URL is not a token.
export async function nativeCheckoutSession(gid:string,links:CheckoutLink[]):Promise<string|undefined>{
  const numeric=gid.match(/^gid:\/\/shopify\/AbandonedCheckout\/([1-9]\d*)$/)?.[1];
  if(!numeric)return undefined;
  const recordHash=await hash(`${STORE}:abandoned:${numeric}`);
  const matches=links.filter(link=>link.recordHash===recordHash);
  const sessionId=matches.length===1?matches[0].sessionId:null;
  return sessionId&&/^[a-f0-9]{64}$/.test(sessionId)?sessionId:undefined;
}
