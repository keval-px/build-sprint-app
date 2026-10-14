import {createRequire} from 'node:module';
import {identity} from './dev-identity.mjs';

// Reuse only the already-installed official library. No source app modules,
// environment files, credentials or database clients are imported.
const require = createRequire(new URL('../../package.json', import.meta.url));
if (require('./node_modules/@shopify/shopify-api/package.json').version !== '15.0.0') throw Error('Unexpected Shopify authentication library version');
require('@shopify/shopify-api/adapters/web-api');
const {shopifyApi, ApiVersion} = require('@shopify/shopify-api');

export function createAuthentication(clientSecret) {
  if (typeof clientSecret !== 'string' || clientSecret.length < 16 || clientSecret.length > 256 || /\s/.test(clientSecret)) throw Error('Invalid private configuration');
  const sdk = shopifyApi({apiKey:identity.clientId, apiSecretKey:clientSecret,
    apiVersion:ApiVersion.October26, hostName:'127.0.0.1:6311', scopes:[],
    isEmbeddedApp:true, logger:{log:()=>{}}});
  return Object.freeze({
    async verifySession(token) {
      try {
        if (typeof token !== 'string' || token.length > 8192) return false;
        const claims = await sdk.session.decodeSessionToken(token);
        // The SDK authenticates HS256 and audience. Require time claims and
        // exact tenant URLs as well; do not accept another installed store.
        const now = Date.now() / 1000;
        return claims.aud === identity.clientId &&
          claims.dest === `https://${identity.storeDomain}` &&
          claims.iss === `https://${identity.storeDomain}/admin` &&
          Number.isFinite(claims.exp) && claims.exp > now &&
          Number.isFinite(claims.nbf) && claims.nbf <= now &&
          typeof claims.sub === 'string' && claims.sub.length > 0;
      } catch {
        // SDK errors can contain the original bearer token. Never surface them.
        return false;
      }
    },
    async verifyWebhook(headers, bytes) {
      try {
        const required = ['x-shopify-shop-domain','x-shopify-topic','x-shopify-hmac-sha256','x-shopify-api-version','x-shopify-webhook-id'];
        if (!required.every(k=>typeof headers[k] === 'string' && headers[k].length > 0)) return false;
        if (headers['x-shopify-shop-domain'] !== identity.storeDomain ||
            !['app/uninstalled','app/scopes_update','checkouts/create','checkouts/update'].includes(headers['x-shopify-topic']) ||
            headers['x-shopify-api-version'] !== '2026-10' ||
            !/^[0-9a-f-]{36}$/i.test(headers['x-shopify-webhook-id'])) return false;
        // Reject non-UTF8 instead of replacing bytes before HMAC verification.
        const rawBody = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
        const selectedHeaders = Object.fromEntries(required.map(k=>[k,headers[k]]));
        const rawRequest = new Request('http://127.0.0.1:6311/api/shopify/webhooks', {
          method:'POST', headers:selectedHeaders, body:rawBody,
        });
        const result = await sdk.webhooks.validate({rawRequest,rawBody});
        return result.valid && result.domain === identity.storeDomain;
      } catch { return false; }
    },
  });
}
