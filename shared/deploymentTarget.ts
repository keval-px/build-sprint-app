// The local build generates its own adapter in an ignored staging directory.
// This source adapter is the hosted (non-local) path the tests run against. Its Convex
// cloud deployment was retired on 14 October 2026; nothing deploys with these values.
export const deploymentTarget = Object.freeze({
  kind: 'cloud' as 'cloud' | 'local',
  store: 'build-sprint-demo.myshopify.com',
  clientId: '9abd2c74381c3ec9dc1db38d568c5e4e',
  siteOrigin: 'https://neighborly-nightingale-843.convex.site',
  appOrigin: 'https://neighborly-nightingale-843.convex.site',
});
