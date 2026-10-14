import {createServer} from 'node:http';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {simulate,snapshot} from './model.ts';
import {verifySavedSimulation} from './verify.ts';
const run=simulate();
const snapshots=run.hours.map(h=>snapshot(run,h.hour));
const unhealthy=run.hours.map(h=>snapshot(run,h.hour,false));
const output=new URL('../../.local/convex/simulation/',import.meta.url);
mkdirSync(output,{recursive:true});
writeFileSync(new URL('events.json',output),JSON.stringify(run,null,2));
writeFileSync(new URL('results.json',output),JSON.stringify(snapshots,null,2));
writeFileSync(new URL('last-run.json',output),JSON.stringify({finishedAt:new Date().toISOString(),seed:run.seed,sessions:run.hours.reduce((sum,h)=>sum+h.sessions,0),simulatedHours:24,mode:'isolated-replay',model:null},null,2));
console.log('Saved report verification:',verifySavedSimulation(output).status);
for(const hour of [6,9,15,24])console.log(`Hour ${hour}: ${snapshots[hour-1].phase}: ${snapshots[hour-1].trends.map(t=>`${t.id}=${t.state}`).join(', ')}`);
if(!process.argv.includes('--report-only')){
 const html=readFileSync(new URL('viewer.html',import.meta.url),'utf8').replace('/*DATA*/',`const data=${JSON.stringify({hours:run.hours,snapshots,unhealthy})};`);
 createServer((req,res)=>{
  if(req.method!=='GET'||req.url!=='/'){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
 }).listen(6411,'127.0.0.1',()=>console.log('Simulation viewer: http://127.0.0.1:6411 — Ctrl+C stops it. No Shopify or database writes.'));
}
