import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {simulate,HOUR} from './model.ts';
import {checkoutTrends} from '../../shared/checkoutTrends.ts';
import {summarize} from '../../shared/evidence.ts';
// IST hours start at :30 UTC. Do not depend on the machine's timezone setting.
export function hourStart(now:number){return Math.floor((now+19800000)/HOUR)*HOUR-19800000;}
export function executeBatch(directory:URL,now=Date.now()){
 mkdirSync(directory,{recursive:true});
 const start=hourStart(now),path=new URL(`${start}.json`,directory);
 const existing=readdirSync(directory).filter(f=>/^\d+\.json$/.test(f)).sort();
 const first=existing.length?Math.min(start,...existing.map(f=>Number(f.replace('.json','')))):start;
 const phaseHour=Math.floor((start-first)/HOUR)%24;
 const run=simulate(Math.floor(start/HOUR),{start,firstHour:phaseHour,hours:1});
 const batch={...run,createdAt:new Date(now).toISOString(),hourLabel:new Date(start).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),mode:'isolated-hourly-batch',model:null};
 let created=true;
 try{writeFileSync(path,JSON.stringify(batch,null,2),{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;created=false;}
 const saved=JSON.parse(readFileSync(path,'utf8')) as typeof batch;
 assert.equal(saved.hours.length,1);
 assert.ok(saved.hours[0].sessions>=90&&saved.hours[0].sessions<=120);
 assert.equal(new Set(saved.events.filter(e=>e.name==='checkout_started').map(e=>e.sessionId)).size,saved.hours[0].sessions);
 const files=readdirSync(directory).filter(f=>/^\d+\.json$/.test(f));
 const batches=files.map(f=>JSON.parse(readFileSync(new URL(f,directory),'utf8')) as typeof batch).sort((a,b)=>a.start-b.start);
 const events=batches.flatMap(b=>b.events);
 const summary=summarize(events,{asOf:now});
 const report={checkedAt:new Date(now).toISOString(),created,verification:'passed',batchHour:saved.hourLabel,batch:saved.hours[0],totalBatches:batches.length,totalPlannedSessions:batches.reduce((sum,b)=>sum+b.hours[0].sessions,0),observedSoFar:{started:summary.started,completed:summary.completed},trends:checkoutTrends(events,{asOf:now},{start:Math.max(first,now-6*HOUR),end:now},true,now),note:'Generated batch summary. The publisher separately imports these sessions into the local sandbox with elapsed-hour timings; dashboard insights use the saved records. No Shopify orders or payments.'};
 writeFileSync(new URL('latest.json',directory),JSON.stringify(report,null,2));
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=new URL('../../.local/convex/simulation/batches/',import.meta.url);
 const now=Date.now();
 console.log(JSON.stringify(executeBatch(directory,now),null,2));
 const {publishBatch}=await import('./publish.mjs');
 await publishBatch(directory,hourStart(now));
}
