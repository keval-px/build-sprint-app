import {createServer} from 'node:http';
import {embeddedPage, embeddedClient} from './embedded.mjs';
import {identity} from './dev-identity.mjs';

export const routes = Object.freeze({
  '/api/shopify/app': 'GET',
  '/api/shopify/app.js': 'GET',
  '/api/shopify/session': 'GET',
  '/api/shopify/auth': 'GET',
  '/api/shopify/auth/callback': 'GET',
  '/api/shopify/webhooks': 'POST',
  '/api/shopify/pixel': 'POST',
});
const shell = '<!doctype html><meta charset="utf-8"><title>Checkout Gain development gateway</title><h1>Checkout Gain development gateway</h1><p>Synthetic fixture only. Shopify identity and authentication are not configured. No database is connected.</p>';

// The launcher optionally supplies the official local-verification adapter.
// This handler deliberately has no proxy, database, filesystem, environment-credential,
// OAuth exchange, scheduled job, collector, or outbound HTTP implementation.
export function createGateway({verifySession, verifyWebhook, embeddedOrigin} = {}) {
  if (embeddedOrigin && !verifySession) throw Error('Embedded mode requires configured local authentication');
  const embedded = embeddedOrigin ? embeddedPage(embeddedOrigin) : null;
  return createServer(async (req, res) => {
    const send = (status, message, html = false, javascript = false) => {
      res.writeHead(status, {
        'Content-Type': javascript ? 'text/javascript; charset=utf-8' : html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': embedded?.csp ?? "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      });
      res.end(html || javascript ? message : JSON.stringify({message}));
    };
    // Match raw paths before URL normalization. Never use Host or forwarded
    // headers to choose a destination. Reject encoded paths and all aliases.
    const path = (req.url ?? '').split('?')[0];
    if (!Object.hasOwn(routes, path)) return send(404, 'Not found');
    if (req.method !== routes[path]) return send(405, 'Method not allowed');
    // Browsers may only call from the exact approved gateway origin. No CORS
    // permission is granted; Shopify framing is controlled separately by CSP.
    if (req.headers.origin && req.headers.origin !== (embedded?.origin ?? identity.gateway)) return send(403, 'Origin not permitted');
    const securityHeaders = new Set(['authorization','x-shopify-hmac-sha256','x-shopify-shop-domain','x-shopify-topic','x-shopify-webhook-id','x-shopify-api-version']);
    const seen = new Set();
    for (let i=0; i<req.rawHeaders.length; i+=2) {
      const name = req.rawHeaders[i].toLowerCase();
      if (securityHeaders.has(name) && seen.has(name)) return send(400, 'Ambiguous authentication headers');
      seen.add(name);
    }
    // These routes need no body. Refuse request smuggling/body forwarding.
    if (req.method === 'GET' && (req.headers['transfer-encoding'] || Number(req.headers['content-length'] ?? 0) !== 0)) return send(400, 'Unexpected body');
    if (path === '/api/shopify/app') return send(200, embedded?.html ?? (verifySession ? shell.replace('Shopify identity and authentication are not configured.', 'Local authentication is ready. Embedded installation is pending.') : shell), true);
    if (path === '/api/shopify/app.js') return embedded ? send(200, embeddedClient, false, true) : send(404, 'Not found');
    if (path === '/api/shopify/session') {
      const token = /^Bearer ([A-Za-z0-9_.-]{1,8192})$/.exec(req.headers.authorization ?? '')?.[1];
      if (!token) return send(401, 'Authentication required');
      if (!verifySession) return send(503, 'Development identity not configured');
      try {
        if (!await verifySession(token)) return send(401, 'Authentication failed');
        return send(200, 'Authenticated synthetic fixture; no database access');
      } catch { return send(401, 'Authentication failed'); }
    }
    if (path === '/api/shopify/webhooks') {
      if (!verifyWebhook) return send(503, 'Development identity not configured');
      if (Number(req.headers['content-length'] ?? 0) > 65536) return send(413, 'Body too large');
      let size = 0;
      const chunks = [];
      try {
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536) { send(413, 'Body too large'); req.resume(); return; }
          chunks.push(chunk);
        }
        if (!await verifyWebhook(req.headers, Buffer.concat(chunks))) return send(401, 'Authentication failed');
        // A valid test delivery is acknowledged but never stored or acted on.
        return send(200, 'Authenticated synthetic delivery ignored');
      } catch { if (!res.writableEnded) return send(401, 'Authentication failed'); }
      return;
    }
    return send(503, 'OAuth and pixel collection disabled');
  });
}
