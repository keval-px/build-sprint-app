import {readFileSync,writeFileSync} from 'node:fs';
import {ConvexHttpClient} from 'convex/browser';
import {identity,privateDir,assertLocalEnvironment} from '../settings.mjs';
import {resolve} from 'node:path';
export async function publishBatch(directory,start){
 assertLocalEnvironment();
 if(identity.api!=='http://127.0.0.1:6210')throw Error('Not the local sandbox');
 const batch=JSON.parse(readFileSync(new URL(`${start}.json`,directory),'utf8'));
 const client=new ConvexHttpClient(identity.api);
 client.setAdminAuth(readFileSync(resolve(privateDir,'admin.key'),'utf8').trim());
 // Execute this hour's batch now, compressing planned timings into elapsed time.
 // IDs stay fixed, so retrying never creates another checkout.
 const now=Date.now(),min=Math.min(...batch.events.map(e=>e.timestamp)),max=Math.max(...batch.events.map(e=>e.timestamp));
 const floor=Math.max(min,now-3600000),span=Math.max(0,now-floor);
 const events=batch.events.map(e=>({...e,timestamp:Math.floor(floor+(e.timestamp-min)/Math.max(1,max-min)*span)}));
 for(let i=0;i<events.length;i+=100)await client.mutation('simulation:ingest',{events:events.slice(i,i+100)});
 const ids=[...new Set(events.map(e=>e.sessionId))];
 const verified=await client.query('simulation:verify',{ids});
 if(verified.sessions!==batch.hours[0].sessions)throw Error('Saved simulation session count does not match');
 const result={publishedAt:new Date().toISOString(),target:identity.api,sessions:verified.sessions,batchHour:batch.hourLabel};
 writeFileSync(new URL(`${start}.published.json`,directory),JSON.stringify(result,null,2));
 console.log('Local dashboard batch verified:',JSON.stringify(result));
}
