import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {identity} from './dev-identity.mjs';

const business = new Map([
  ['/api/shopify/status','GET'], ['/api/shopify/evidence','GET'],
  ['/api/shopify/session','GET'], ['/api/shopify/sync','POST'],
  ['/api/shopify/fixes','POST'], ['/api/shopify/pixel/enable','POST'],
]);
const signed = '/api/shopify/webhooks';
// Build output names carry a content hash, so a cached copy can never be stale.
const hashedAsset = /^\/assets\/[\w.-]+-[\w-]{8}\.(?:js|css)$/;
const compressible = /^(?:application\/(?:json|javascript)|text\/)/;
const pixel = '/api/shopify/pixel-events';
// Only the HTTP app port is reachable here. No admin key, target argument,
// forwarded host, public history route or general-purpose proxy exists.
export function createSandboxGateway({assets = [], authentication, fetchUpstream = fetch} = {}) {
  const assetPaths = new Set(assets);
  return createServer(async(req,res)=>{
    const reply=(status,message,extra={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify({message}));};
    try {
      const raw = req.url ?? '';
      const path = raw.split('?')[0];
      if (!path.startsWith('/') || /[%\\\x00-\x20]/.test(path) || path.includes('..') || path.startsWith('//')) return reply(404,'Not found');
      const url = new URL(raw,'http://127.0.0.1:6311');
      const publicPage = ['/api/shopify/app','/api/shopify/app/checkouts','/api/shopify/app/fix-history','/api/shopify/app/alerts'].includes(path);
      // Shopify supplies id_token when opening an embedded app. It is never used
      // to authorize a request here; App Bridge obtains a fresh header token.
      if (publicPage) url.searchParams.delete('id_token');
      if ([...url.searchParams.keys()].some(k=>/token|secret|authorization/i.test(k))) return reply(400,'Credentials belong in headers');
      const asset = assetPaths.has(path);
      const expected = publicPage || asset ? 'GET' : business.get(path) ?? (path===signed || path===pixel ? 'POST' : null);
      if (!expected) return reply(404,'Not found');
      if (req.method !== expected && !(asset&&req.method==='HEAD') && !(path===pixel&&req.method==='OPTIONS')) return reply(405,'Method not allowed');
      const names=req.rawHeaders.filter((_,i)=>i%2===0).map(s=>s.toLowerCase());
      for(const name of ['authorization','host','content-length',...names.filter(n=>n.startsWith('x-shopify-'))]) {
        if(names.filter(n=>n===name).length>1)return reply(400,'Duplicate header');
      }
      if(req.method==='GET' && (req.headers['transfer-encoding'] || Number(req.headers['content-length']??0)))return reply(400,'Unexpected body');
      if(publicPage && url.searchParams.has('shop') && url.searchParams.get('shop')!==identity.storeDomain)return reply(403,'Wrong development store');
      const limit = path===signed ? 100000 : 12000;
      if(Number(req.headers['content-length']??0)>limit)return reply(413,'Body too large');
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>limit){reply(413,'Body too large');req.resume();return;}chunks.push(chunk);}
      const bytes=Buffer.concat(chunks);
      if(business.has(path)){
        const token=/^Bearer ([A-Za-z0-9_.-]{1,8192})$/.exec(req.headers.authorization??'')?.[1];
        if(!token||!authentication||!await authentication.verifySession(token))return reply(401,'Authentication required',path==='/api/shopify/evidence'?{'X-Shopify-Retry-Invalid-Session-Request':'1'}:{});
      }
      if(path===signed && (!authentication || !await authentication.verifyWebhook(req.headers,bytes)))return reply(401,'Invalid Shopify notification');
      const headers={};
      for(const [key,value] of Object.entries(req.headers)){
        if(typeof value==='string' && (['authorization','content-type','origin','if-none-match'].includes(key)||key.startsWith('x-shopify-')))headers[key]=value;
      }
      const response=await fetchUpstream(`${identity.site}${url.pathname}${url.search}`,{
        method:req.method,headers,...(bytes.length?{body:bytes}:{}),redirect:'manual',signal:AbortSignal.timeout(95000),
      });
      if(response.status>=300&&response.status<400&&response.status!==304)return reply(502,'Unexpected upstream redirect');
      const responseHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
      for(const key of ['content-type','cache-control','etag','content-security-policy','access-control-allow-origin','access-control-allow-methods','access-control-allow-headers','vary','x-shopify-retry-invalid-session-request']){
        const value=response.headers.get(key);if(value)responseHeaders[key]=value;
      }
      if(asset&&response.status===200&&hashedAsset.test(path))responseHeaders['cache-control']='public, max-age=31536000, immutable';
      let body=req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer());
      // The evidence report is about 1.5MB of JSON; gzip cuts it roughly 5x over the tunnel.
      if(body&&body.length>1024&&compressible.test(responseHeaders['content-type']??'')&&/\bgzip\b/.test(req.headers['accept-encoding']??'')){
        body=gzipSync(body);responseHeaders['content-encoding']='gzip';responseHeaders.vary=[responseHeaders.vary,'Accept-Encoding'].filter(Boolean).join(', ');
      }
      res.writeHead(response.status,responseHeaders);
      res.end(body);
    }catch{if(!res.headersSent)reply(502,'Local app is unavailable');else res.end();}
  });
}
