import {deployment} from '../../shared/deployment.ts';

export function shopifyOrigin() {
  const origin = process.env.SHOPIFY_APP_ORIGIN ?? deployment.appOrigin;
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password) throw Error('Invalid Shopify app origin.');
  if (deployment.kind === 'local' && origin !== 'http://127.0.0.1:6311' &&
      !(url.protocol === 'https:' && /^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) && !url.port)) {
    throw Error('Local Shopify requires its development tunnel.');
  }
  return origin;
}

// HTTP actions execute inside the container, where the storage listener is
// 3210. Public upload URLs still use 6210 on the Mac; never change those.
export function frontendStorageUrl(value: string) {
  if (deployment.kind !== 'local') return value;
  const url = new URL(value);
  if (url.origin !== 'http://127.0.0.1:6210' || !url.pathname.startsWith('/api/storage/')) throw Error('Unexpected local frontend storage URL.');
  return `http://127.0.0.1:3210${url.pathname}${url.search}`;
}
