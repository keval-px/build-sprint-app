import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function verifySavedSimulation(output=new URL('../../.local/convex/simulation/',import.meta.url)){
 const read=(name:string)=>JSON.parse(readFileSync(new URL(name,output),'utf8'));
 const run=read('events.json'),results=read('results.json'),metadata=read('last-run.json');
 assert.equal(run.hours.length,24);
 assert.equal(results.length,24);
 assert.ok(run.hours.every((h:{sessions:number})=>h.sessions>=90&&h.sessions<=120));
 const sessions=new Set(run.events.filter((e:{name:string})=>e.name==='checkout_started').map((e:{sessionId:string})=>e.sessionId));
 assert.equal(sessions.size,metadata.sessions);
 assert.equal(results[23].summary.sessions,metadata.sessions);
 for(const [hour,expected] of [[6,['stable','stable','stable']],[9,['review','stable','review']],[15,['stable','review','stable']],[24,['stable','stable','stable']]] as const){
  assert.deepEqual(results[hour-1].trends.map((t:{state:string})=>t.state),expected,`Unexpected insights at hour ${hour}`);
 }
 assert.equal(metadata.model,null);
 const report={status:'passed',checkedAt:new Date().toISOString(),runFinishedAt:metadata.finishedAt,sessions:sessions.size,checks:['24 hourly volumes within 90–120','Saved session counts match','Normal activity has no warnings','Shipping and completion warnings appear','Mobile warning appears','Recovery clears warnings']};
 writeFileSync(new URL('verification.json',output),JSON.stringify(report,null,2));
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verifySavedSimulation(),null,2));
