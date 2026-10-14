// The local build generates its own adapter in an ignored staging directory.
// This source adapter preserves the existing cloud deployment.
export const deploymentTarget = Object.freeze({
  kind: 'cloud' as 'cloud' | 'local',
  store: 'build-sprint-demo.myshopify.com',
  clientId: '9abd2c74381c3ec9dc1db38d568c5e4e',
  siteOrigin: 'https://neighborly-nightingale-843.convex.site',
  appOrigin: 'https://neighborly-nightingale-843.convex.site',
});
