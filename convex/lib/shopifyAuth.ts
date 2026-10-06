import '@shopify/shopify-api/adapters/web-api';
import {shopifyApi, ApiVersion, RequestedTokenType} from '@shopify/shopify-api';
import {STORE} from '../../shared/evidence.ts';

export const REQUIRED_SCOPES = ['read_orders', 'read_customer_events', 'write_pixels'];
export function shopifyClient() {
  const apiKey = process.env.SHOPIFY_CLIENT_ID;
  const apiSecretKey = process.env.SHOPIFY_CLIENT_SECRET;
  if (!apiKey || !apiSecretKey) throw new Error('Shopify credentials are not configured in Convex.');
  return shopifyApi({apiKey, apiSecretKey, apiVersion: ApiVersion.October26,
    scopes: REQUIRED_SCOPES, hostName: 'neighborly-nightingale-843.convex.site',
    isEmbeddedApp: true, logger: {log: () => {}}}); // SDK errors can contain tokens: never log them.
}
export async function verifyMerchant(token: string) {
  try {
    if (!token || token.length > 8192) throw Error();
    const claims = await shopifyClient().session.decodeSessionToken(token);
    const dest = new URL(claims.dest), issuer = new URL(claims.iss);
    if (dest.origin !== `https://${STORE}` || dest.pathname !== '/' || dest.search || dest.hash ||
        issuer.origin !== dest.origin || issuer.pathname !== '/admin' || issuer.search || issuer.hash ||
        !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() ||
        !Number.isFinite(claims.nbf) || claims.nbf * 1000 > Date.now() || !claims.sub) throw Error();
    return STORE;
  } catch { throw new Error('Shopify session is invalid or expired.'); }
}
export async function exchangeMerchant(token: string) {
  await verifyMerchant(token);
  try {
    return (await shopifyClient().auth.tokenExchange({shop: STORE, sessionToken: token,
      requestedTokenType: RequestedTokenType.OfflineAccessToken, expiring: true})).session;
  } catch { throw new Error('Shopify authorization failed. Check installation and permissions.'); }
}
export async function refreshMerchant(refreshToken: string) {
  try { return (await shopifyClient().auth.refreshToken({shop: STORE, refreshToken})).session; }
  catch { throw new Error('Shopify authorization expired. Open the app again.'); }
}
export async function verifyLifecycle(request: Request, rawBody: string) {
  try {
    const result = await shopifyClient().webhooks.validate({rawRequest: request, rawBody});
    return result.valid && result.domain === STORE ? result : null;
  } catch { return null; }
}
