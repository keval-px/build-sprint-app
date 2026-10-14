import {deploymentTarget} from './deploymentTarget.ts';
import {appPageAt} from './appPages.ts';

// Public settings only: admin keys and Shopify secrets never cross this seam.
export const deployment = deploymentTarget;
export function browserBackendOrigin(location: {origin: string; hostname: string; pathname: string}) {
  if (appPageAt(location.pathname)) return location.origin;
  return ['localhost', '127.0.0.1'].includes(location.hostname) ? deployment.siteOrigin : location.origin;
}
export const collectorEndpoint = `${deployment.appOrigin}/api/shopify/pixel-events`;
