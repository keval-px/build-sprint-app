import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,chmodSync,openSync,closeSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,state,staged,privateDir,identity,assertLocalEnvironment} from './settings.mjs';
const image='ghcr.io/get-convex/convex-backend@sha256:d715e9ec088784407ca4ba2d3db592702cd328d02c76cdca3852c0018f2a76b4';
const backups=resolve(state,'backups'),compose=resolve(root,'local/compose.yaml');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function run(bin,args,{cwd=root,env=process.env,quiet=false}={}){
 const result=spawnSync(bin,args,{cwd,env,encoding:'utf8',maxBuffer:20*1024*1024,stdio:quiet?'pipe':'inherit'});
 if(result.status!==0)throw Error(quiet?'A private recovery operation failed.':`Recovery command failed: ${bin}`);
 return result.stdout?.trim()??'';
}
function env(url=identity.api,key=resolve(privateDir,'admin.key')){return {...Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),CONVEX_SELF_HOSTED_URL:url,CONVEX_SELF_HOSTED_ADMIN_KEY:readFileSync(key,'utf8').trim(),CONVEX_DISABLE_TELEMETRY:'1'};}
function convex(args,url=identity.api,key){return run(process.execPath,[resolve(root,'node_modules/convex/bin/main.js'),...args],{cwd:staged,env:env(url,key),quiet:true});}
function dc(args){return run('docker',['compose','-f',compose,...args]);}
function privateWrite(path,text){writeFileSync(path,text,{mode:0o600});chmodSync(path,0o600);}
function checksum(path){return createHash('sha256').update(readFileSync(path)).digest('hex');}
function recoveryRequest(container,path,{key,method='GET',body,binary=false}={}){
 const config=[`url = ${JSON.stringify('http://127.0.0.1:3210'+path)}`,`request = ${JSON.stringify(method)}`];
 if(key)config.push(`header = ${JSON.stringify('Authorization: Convex '+key)}`);
 if(body)config.push('header = "Content-Type: application/json"',`data = ${JSON.stringify(JSON.stringify(body))}`);
 const result=spawnSync('docker',['exec','-i',container,'curl','--fail','--silent','--show-error','--max-time','30','--config','-'],{cwd:root,input:config.join('\n'),maxBuffer:128*1024*1024,...(binary?{}:{encoding:'utf8'})});
 if(result.status!==0)throw Error('Isolated recovery request failed.');
 return result.stdout;
}
const lock=resolve(state,'operation.lock');let locked=false;
try{
 assertLocalEnvironment();
 if(existsSync(lock)){
  const owner=Number(readFileSync(lock,'utf8'));
  if(!Number.isInteger(owner)||owner<1)throw Error('Invalid local operation lock. Inspect .local/convex/operation.lock.');
  try{process.kill(owner,0);}catch(error){if(error.code==='ESRCH')rmSync(lock,{force:true});else throw error;}
 }
 const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);locked=true;
 mkdirSync(backups,{recursive:true,mode:0o700});
 if(process.argv[2]==='backup'){
  const id=new Date().toISOString().replace(/[:.]/g,'-'),destination=resolve(backups,id);mkdirSync(destination,{mode:0o700});
  let wasEnabled=false;try{wasEnabled=convex(['env','get','LOCAL_SYNC_ENABLED'])==='true';}catch{}
  convex(['env','set','LOCAL_SYNC_ENABLED','false']);
  const gatewayFile=resolve(state,'gateway.json');let hadGateway=false;
  if(existsSync(gatewayFile)){
   const gateway=JSON.parse(readFileSync(gatewayFile,'utf8'));
   const command=spawnSync('ps',['-p',String(gateway.pid),'-o','command='],{cwd:root,encoding:'utf8'}).stdout??'';
   if(command.includes(resolve(root,'local/gateway/start.mjs'))){process.kill(gateway.pid,'SIGTERM');hadGateway=true;}
   rmSync(gatewayFile,{force:true});
  }
  try{
   // Stop all database execution before copying SQLite and storage together.
   dc(['stop','backend']);
   run('docker',['run','--rm','--network','none','--entrypoint','/usr/bin/tar','--mount','type=volume,source=checkout-gain-sandbox-data,target=/data,readonly','--mount',`type=bind,source=${destination},target=/backup`,image,'-czf','/backup/volume.tar.gz','-C','/data','.']);
   chmodSync(resolve(destination,'volume.tar.gz'),0o600);
   run('tar',['-czf',resolve(destination,'source.tar.gz'),'--exclude=node_modules','--exclude=.env.local','-C',staged,'.']);
   chmodSync(resolve(destination,'source.tar.gz'),0o600);
   const maintained=['convex','shared','src','extensions','public','scripts','tests','index.html','tsconfig.json','package.json','package-lock.json','shopify.app.toml','shopify.app.example.toml'].filter(path=>existsSync(resolve(root,path)));
   run('tar',['-czf',resolve(destination,'maintained-source.tar.gz'),'--exclude=dist','-C',root,...maintained]);
   chmodSync(resolve(destination,'maintained-source.tar.gz'),0o600);
   run('tar',['-czf',resolve(destination,'runtime.tar.gz'),'-C',root,'local','LOCAL.md']);
   chmodSync(resolve(destination,'runtime.tar.gz'),0o600);
   for(const name of ['admin.key','shopify-dev.json']){copyFileSync(resolve(privateDir,name),resolve(destination,name));chmodSync(resolve(destination,name),0o600);}
   copyFileSync(compose,resolve(destination,'compose.yaml'));
   dc(['up','-d','--wait']);
   convex(['export','--include-file-storage','--path',resolve(destination,'snapshot.zip')]);chmodSync(resolve(destination,'snapshot.zip'),0o600);
   run('python3',[resolve(root,'local/snapshot-digest.py'),resolve(destination,'snapshot.zip'),resolve(destination,'snapshot.json')]);
   const files=Object.fromEntries(['volume.tar.gz','source.tar.gz','maintained-source.tar.gz','runtime.tar.gz','admin.key','shopify-dev.json','compose.yaml','snapshot.zip','snapshot.json'].map(name=>[name,checksum(resolve(destination,name))]));
   privateWrite(resolve(destination,'manifest.json'),JSON.stringify({id,image,createdAt:new Date().toISOString(),syncPaused:true,files},null,2));
   privateWrite(resolve(backups,'latest.json'),JSON.stringify({id}));console.log(`Private backup saved: ${id}`);
  }finally{
   dc(['up','-d','--wait']);
   if(wasEnabled)convex(['env','set','LOCAL_SYNC_ENABLED','true']);
   // Deployment resumes the gateway using maintained source, without any public link.
   if(hadGateway){rmSync(lock,{force:true});locked=false;run(process.execPath,[resolve(root,'local/runtime.mjs'),'deploy']);}
  }
 }else if(process.argv[2]==='restore'){
  const id=process.argv[3]??JSON.parse(readFileSync(resolve(backups,'latest.json'),'utf8')).id;
  if(!/^[0-9TZ-]+$/.test(id))throw Error('Invalid backup name.');
  const source=resolve(backups,id),manifest=JSON.parse(readFileSync(resolve(source,'manifest.json'),'utf8'));
  const inventory=Object.keys(manifest.files).sort().join(',');
  if(manifest.id!==id||manifest.image!==image||!manifest.syncPaused||!['admin.key,compose.yaml,shopify-dev.json,snapshot.json,snapshot.zip,source.tar.gz,volume.tar.gz','admin.key,compose.yaml,runtime.tar.gz,shopify-dev.json,snapshot.json,snapshot.zip,source.tar.gz,volume.tar.gz','admin.key,compose.yaml,maintained-source.tar.gz,runtime.tar.gz,shopify-dev.json,snapshot.json,snapshot.zip,source.tar.gz,volume.tar.gz'].includes(inventory))throw Error('Unsupported backup manifest.');
  for(const [name,hash]of Object.entries(manifest.files)){
   if(!['volume.tar.gz','source.tar.gz','maintained-source.tar.gz','runtime.tar.gz','admin.key','shopify-dev.json','compose.yaml','snapshot.zip','snapshot.json'].includes(name)||checksum(resolve(source,name))!==hash)throw Error('Backup integrity check failed.');
  }
  const suffix=Date.now().toString(),volume=`checkout-gain-restore-${suffix}`,name=`checkout-gain-recovery-${suffix}`;
  run('docker',['volume','create',volume],{quiet:true});
  run('docker',['run','--rm','--network','none','--entrypoint','/usr/bin/tar','--mount',`type=volume,source=${volume},target=/data`,'--mount',`type=bind,source=${source},target=/backup,readonly`,image,'-xzf','/backup/volume.tar.gz','-C','/data']);
  const started=Date.now();
  // No network or published ports. Inspect through Docker's private execution
  // channel so restored schedules cannot contact Shopify during rehearsal.
  try{
   run('docker',['run','-d','--name',name,'--network','none','--stop-signal','SIGINT','--mount',`type=volume,source=${volume},target=/convex/data`,'-e','CONVEX_CLOUD_ORIGIN=http://127.0.0.1:3210','-e','CONVEX_SITE_ORIGIN=http://127.0.0.1:3211','-e','DISABLE_BEACON=true','-e','DISABLE_METRICS_ENDPOINT=true','-e','RUST_LOG=warn',image],{quiet:true});
   let ready=false;for(let i=0;i<50;i++){try{recoveryRequest(name,'/version');ready=true;break;}catch{}await sleep(300);}
   if(!ready)throw Error('Restored backend did not start.');
   const restored=resolve(source,`restored-${suffix}.zip`),report=resolve(source,`restored-${suffix}.json`);
   const key=readFileSync(resolve(source,'admin.key'),'utf8').trim();
   recoveryRequest(name,'/api/export/request/zip?includeStorage=true',{key,method:'POST'});
   let exportState;
   for(let i=0;i<100;i++){
    const response=JSON.parse(recoveryRequest(name,'/api/query',{key,method:'POST',body:{path:'_system/cli/exports:getLatest',args:{},format:'convex_encoded_json'}}));
    if(response.status!=='success')throw Error('Restored snapshot status could not be read.');
    exportState=response.value;
    if(exportState?.state==='completed')break;
    if(exportState?.state==='failed')throw Error('Restored snapshot export failed.');
    await sleep(300);
   }
   if(exportState?.state!=='completed')throw Error('Restored snapshot export did not finish.');
   const timestamp=Buffer.from(exportState.start_ts.$integer,'base64').readBigInt64LE().toString();
   writeFileSync(restored,recoveryRequest(name,`/api/export/zip/${timestamp}`,{key,binary:true}),{mode:0o600});
   run('python3',[resolve(root,'local/snapshot-digest.py'),restored,report,resolve(source,'snapshot.json')]);
   privateWrite(resolve(state,'restore-receipt.json'),JSON.stringify({backup:id,volume,container:name,comparison:'passed',seconds:(Date.now()-started)/1000,originalPreserved:true,restoredSyncEnabled:false},null,2));
   console.log(`Restore verified in a separate retained volume: ${volume}`);
  }finally{run('docker',['stop',name],{quiet:true});}
 }else throw Error('Use local:backup or local:restore.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(locked)rmSync(lock,{force:true});}
