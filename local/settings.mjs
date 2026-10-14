import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const state = resolve(root, '.local/convex');
export const staged = resolve(state, 'app');
export const privateDir = resolve(state, 'private');
export const identity = Object.freeze({
  organizationId: '129333258', organizationName: 'PlanetX Technologies',
  appName: 'Checkout Gain Local Dev', storeId: '78990966859',
  storeName: 'Checkout Gain Local Dev Sandbox',
  appId: '434796920833', clientId: 'f98767012d6e223abbbf0fc931acbbf4',
  store: 'checkout-gain-local-dev-sandbox.myshopify.com',
  api: 'http://127.0.0.1:6210', site: 'http://127.0.0.1:6211',
  gateway: 'http://127.0.0.1:6311', dashboard: 'http://127.0.0.1:6792',
});
export function checkedPublicOrigin(value) {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password ||
      value !== identity.gateway && !(url.protocol === 'https:' && !url.port && /^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname))) {
    throw Error('Expected the local gateway or its temporary Shopify tunnel.');
  }
  return value;
}
export function publicTarget(origin) {
  return {kind:'local', store:identity.store, clientId:identity.clientId,
    siteOrigin:identity.site, appOrigin:checkedPublicOrigin(origin)};
}
export function assertLocalEnvironment(env=process.env) {
  for(const key of ['CONVEX_DEPLOY_KEY','CONVEX_DEPLOYMENT','CONVEX_SELF_HOSTED_ADMIN_KEY'])
    if(env[key])throw Error(`Unset inherited ${key} before using local commands.`);
  if(env.CONVEX_SELF_HOSTED_URL && env.CONVEX_SELF_HOSTED_URL!==identity.api)
    throw Error('Inherited Convex target is not the sandbox.');
}

export function shopifyAppConfiguration(origin) {
  checkedPublicOrigin(origin);
  return `client_id = "${identity.clientId}"\nname = "Checkout Gain Local Dev"\napplication_url = "${origin}/api/shopify/app"\nembedded = true\n\n[build]\nautomatically_update_urls_on_dev = false\n\n[webhooks]\napi_version = "2026-10"\n\n[access_scopes]\nscopes = "read_orders,read_customer_events,write_pixels"\nuse_legacy_install_flow = false\n\n[auth]\nredirect_urls = []\n\n[[webhooks.subscriptions]]\ntopics = ["app/uninstalled", "app/scopes_update"]\nuri = "${origin}/api/shopify/webhooks"\n`;
}
