import {deployment} from '../../shared/deployment.ts';

// Every rule that differs on the local development runtime lives in this module.
// The hosted (public app) path is the default; local adds explicit opt-ins and checks.
export const isLocal = deployment.kind === 'local';
const LOCAL_STORE = 'checkout-gain-local-dev-sandbox.myshopify.com';

// A development install must be switched on before it can connect (npm run local:connection:enable).
export function assertConnectionEnabled() {
  if (isLocal && process.env.LOCAL_CONNECTION_ENABLED !== 'true') throw Error('Development installation is not enabled yet.');
}
// Background sync stays paused locally until npm run local:sync:enable.
export function syncPaused() {
  return isLocal && process.env.LOCAL_SYNC_ENABLED !== 'true';
}
export function assertDevelopmentOnly() {
  if (!isLocal) throw Error('Development-only operation.');
}
// Locally the configured credentials must belong to the development app.
export function assertAppIdentity(apiKey: string) {
  if (isLocal && apiKey !== deployment.clientId) throw new Error('Wrong development app identity.');
}
// Simulated traffic may only ever be written to the local sandbox store.
export function assertSimulationAllowed(store: string) {
  if (!isLocal || store !== LOCAL_STORE) throw Error('Simulation is restricted to the local sandbox.');
}
// Tunnel URLs change between sessions, so local webhook subscriptions are moved, not duplicated,
// and Shopify's rejection reasons are shown to the developer.
export const reuseTunnelSubscriptions = isLocal;
export const explainRejectedSubscriptions = isLocal;

export function shopifyOrigin() {
  const origin = process.env.SHOPIFY_APP_ORIGIN ?? deployment.appOrigin;
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password) throw Error('Invalid Shopify app origin.');
  if (isLocal && origin !== 'http://127.0.0.1:6311' &&
      !(url.protocol === 'https:' && /^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) && !url.port)) {
    throw Error('Local Shopify requires its development tunnel.');
  }
  return origin;
}

// HTTP actions execute inside the container, where the storage listener is
// 3210. Public upload URLs still use 6210 on the Mac; never change those.
export function frontendStorageUrl(value: string) {
  if (!isLocal) return value;
  const url = new URL(value);
  if (url.origin !== 'http://127.0.0.1:6210' || !url.pathname.startsWith('/api/storage/')) throw Error('Unexpected local frontend storage URL.');
  return `http://127.0.0.1:3210${url.pathname}${url.search}`;
}
