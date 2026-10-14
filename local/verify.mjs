// Read-only running-gateway checks. Signed fixture sessions are deliberately
// invalid; this command never creates Shopify sessions or changes test data.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHmac} from 'node:crypto';
import {state,identity,checkedPublicOrigin,assertLocalEnvironment} from './settings.mjs';
import {loadPrivateConfiguration} from './gateway/private-config.mjs';
assertLocalEnvironment();
const config=loadPrivateConfiguration();
const origin=checkedPublicOrigin(JSON.parse(readFileSync(resolve(state,'tunnel.json'),'utf8')).origin);
const now=Math.floor(Date.now()/1000),encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(patch){
 const claims={iss:`https://${identity.store}/admin`,dest:`https://${identity.store}`,aud:identity.clientId,sub:'local-verification-fixture',iat:now,nbf:now-1,exp:now+60,...patch};
 const message=encode({alg:'HS256',typ:'JWT'})+'.'+encode(claims);
 return message+'.'+createHmac('sha256',config.clientSecret).update(message).digest('base64url');
}
const checks=[
 ['expired session','/api/shopify/session',401,{headers:{Authorization:'Bearer '+token({exp:now-60})}}],
 ['wrong store','/api/shopify/session',401,{headers:{Authorization:'Bearer '+token({dest:'https://wrong.myshopify.com'})}}],
 ['wrong app','/api/shopify/session',401,{headers:{Authorization:'Bearer '+token({aud:'wrong-app'})}}],
 ['invalid notification','/api/shopify/webhooks',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}],
 ...['/','/api/query','/api/mutation','/api/test-evidence','/api/storage/example','/.env.local','/.local/convex/private/admin.key','/dashboard','/backups'].map(path=>[path,path,404,{}]),
];
const result=[];
for(const[name,path,expected,options]of checks){
 try{const response=await fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(15000)});result.push({name,status:response.status,expected,passed:response.status===expected});}
 catch{result.push({name,passed:false,reason:'Public link unavailable'});break;}
}
if(!result.some(r=>r.reason))for(const path of JSON.parse(readFileSync(resolve(state,'build.json'),'utf8')).assets){
 const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)}),body=await response.text();
 result.push({name:'public asset '+path,status:response.status,passed:response.status===200&&!response.headers.has('location')&&!/build-sprint-demo\.myshopify\.com|[a-z-]+\.convex\.(site|cloud)/.test(body)});
}
writeFileSync(resolve(state,'isolation-receipt.json'),JSON.stringify({at:new Date().toISOString(),origin,syntheticAuthTests:true,result},null,2),{mode:0o600});
console.log(JSON.stringify({passed:result.filter(r=>r.passed).length,total:result.length,failed:result.filter(r=>!r.passed)},null,2));
if(result.some(r=>!r.passed))process.exitCode=1;
