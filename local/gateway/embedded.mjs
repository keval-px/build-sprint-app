import {readFileSync} from 'node:fs';
import {identity} from './dev-identity.mjs';

// Read only this fixed tracked asset; request paths never reach the filesystem.
export const embeddedClient = readFileSync(new URL('./embedded-client.js',import.meta.url),'utf8');
export function embeddedPage(origin) {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) || url.port) throw Error('An approved exact HTTPS Quick Tunnel origin is required');
  return {
    origin,
    csp: `default-src 'none'; script-src 'self' https://cdn.shopify.com/shopifycloud/app-bridge.js; connect-src 'self'; frame-ancestors https://admin.shopify.com https://${identity.storeDomain}; base-uri 'none'; form-action 'none'`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="shopify-api-key" content="${identity.clientId}"><title>Checkout Gain Local Dev</title><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script><script defer src="/api/shopify/app.js"></script></head><body><h1>Checkout Gain Local Dev</h1><p>Development sandbox. Synthetic data only.</p><button id="verify-session" type="button">Verify Shopify session</button><p id="session-status" role="status">Ready to verify your sandbox session.</p></body></html>`,
  };
}
