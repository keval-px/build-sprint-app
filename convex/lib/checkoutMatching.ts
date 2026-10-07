import {STORE} from '../../shared/evidence.ts';
import type {AbandonedSnapshot} from '../../shared/abandoned.ts';

// Demo-only compatibility reader. REST is legacy and cannot underpin a new public app.
export const CHECKOUT_PATH = '/admin/api/2026-10/checkouts.json';
const fields = 'id,token,subtotal_price,currency,completed_at';
export type CheckoutLink = AbandonedSnapshot['records'][number];

async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Strip everything except hashes and pricing before crossing a Convex function boundary.
export async function anonymousCheckout(input: unknown): Promise<CheckoutLink> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid Shopify checkout');
  const row = input as Record<string, unknown>;
  const id = typeof row.id === 'number' && Number.isSafeInteger(row.id) ? String(row.id) : row.id;
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) throw Error('Invalid Shopify checkout ID');
  if (row.currency !== 'USD' || typeof row.subtotal_price !== 'string' || !/^\d+\.\d{2}$/.test(row.subtotal_price)) throw Error('Unsupported Shopify checkout price');
  const [whole, fraction] = row.subtotal_price.split('.');
  const subtotalCents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(subtotalCents)) throw Error('Unsupported Shopify checkout price');
  if (row.completed_at !== null && (typeof row.completed_at !== 'string' || !Number.isFinite(Date.parse(row.completed_at)))) throw Error('Invalid Shopify completion state');
  if (row.token != null && (typeof row.token !== 'string' || !row.token.length || row.token.length > 512)) throw Error('Invalid Shopify checkout identity');
  return {
    recordHash: await hash(STORE + ':abandoned:' + id),
    sessionId: typeof row.token === 'string' ? await hash(STORE + ':' + row.token) : null,
    subtotalCents, currency: 'USD', recovered: row.completed_at !== null,
  };
}

function safePage(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw Error('Invalid Shopify pagination'); }
  if (url.protocol !== 'https:' || url.hostname !== STORE || url.port || url.username || url.password || url.pathname !== CHECKOUT_PATH || url.hash) throw Error('Invalid Shopify pagination');
  // Never forward the credential to a host supplied by a response or redirect.
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '250');
  return url;
}

export async function readCheckoutLinks(accessToken: string, request: typeof fetch = fetch): Promise<CheckoutLink[]> {
  let next: URL | null = safePage(`https://${STORE}${CHECKOUT_PATH}`);
  const visited = new Set<string>();
  const records: CheckoutLink[] = [];
  for (let page = 0; next; page++) {
    if (page >= 20 || visited.has(next.href)) throw Error('Shopify pagination incomplete; nothing saved');
    visited.add(next.href);
    let response: Response;
    try {
      response = await request(next.href, {method: 'GET', redirect: 'error', headers: {'X-Shopify-Access-Token': accessToken, Accept: 'application/json'}, signal: AbortSignal.timeout(15000)});
    } catch { throw Error('Shopify read failed; nothing saved'); }
    if (!response.ok) throw Error(`Shopify read failed (HTTP ${response.status}); nothing saved`);
    let body: unknown;
    try { body = await response.json(); } catch { throw Error('Invalid Shopify response; nothing saved'); }
    if (!body || typeof body !== 'object' || !('checkouts' in body) || !Array.isArray(body.checkouts) || body.checkouts.length > 250) throw Error('Invalid Shopify response; nothing saved');
    for (const row of body.checkouts) records.push(await anonymousCheckout(row));
    const nextLinks = (response.headers.get('link') ?? '').split(',').filter(link => /;\s*rel="next"/.test(link));
    if (nextLinks.length > 1) throw Error('Invalid Shopify pagination');
    const nextValue = nextLinks[0]?.match(/^\s*<([^>]+)>/)?.[1];
    if (nextLinks.length && !nextValue) throw Error('Invalid Shopify pagination');
    next = nextValue ? safePage(nextValue) : null;
  }
  // Repeated IDs/tokens mean the response cannot establish a one-to-one link.
  const ids = new Set<string>(), sessions = new Set<string>();
  for (const record of records) {
    if (ids.has(record.recordHash) || record.sessionId && sessions.has(record.sessionId)) throw Error('Ambiguous Shopify identities; nothing saved');
    ids.add(record.recordHash);
    if (record.sessionId) sessions.add(record.sessionId);
  }
  return records;
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
