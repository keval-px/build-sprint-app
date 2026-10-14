import {mkdirSync,readFileSync,writeFileSync,existsSync,cpSync,rmSync,symlinkSync,readdirSync,statSync,openSync,closeSync,chmodSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {root,state,staged,privateDir,identity,publicTarget,checkedPublicOrigin,assertLocalEnvironment,shopifyAppConfiguration} from './settings.mjs';
import {loadPrivateConfiguration} from './gateway/private-config.mjs';

const compose=resolve(root,'local/compose.yaml');
const cli=resolve(root,'node_modules/convex/bin/main.js');
const node=process.execPath;
const sources=['convex','shared','src','extensions','public','scripts','index.html','tsconfig.json','package.json','package-lock.json'];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const readJSON=p=>JSON.parse(readFileSync(p,'utf8'));
function writePrivate(path,content){writeFileSync(path,content,{mode:0o600});chmodSync(path,0o600);}
function run(command,args,{cwd=root,env=process.env,quiet=false,input}={}){
  const result=spawnSync(command,args,{cwd,env,input,encoding:'utf8',maxBuffer:20*1024*1024,stdio:quiet?'pipe':'inherit'});
  if(result.status!==0){
    if(quiet){
      writePrivate(resolve(state,'last-error.log'),(result.stderr??'')+'\n'+(result.stdout??''));
      if(result.stderr?.includes('not approved to subscribe to webhook topics containing protected customer data'))throw Error('Shopify blocks checkout notifications until protected customer data access is enabled for the development app. Collector address was updated; notifications are not ready.');
      throw Error('A local operation failed. Private diagnostics: .local/convex/last-error.log');
    }
    throw Error(`${command.split('/').at(-1)} failed (${result.status??'could not start'}).`);
  }
  return result.stdout?.trim()??'';
}
function docker(args,quiet=false){return run('docker',['compose','-f',compose,...args],{quiet});}
function localEnvironment(){
  assertLocalEnvironment();
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TERM'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  return {...env,CONVEX_SELF_HOSTED_URL:identity.api,CONVEX_SELF_HOSTED_ADMIN_KEY:readFileSync(resolve(privateDir,'admin.key'),'utf8').trim(),CONVEX_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'};
}
function convex(args,{quiet=false}={}){
  if(args.some(x=>/^(--prod|--deployment|--deploy-key|--url|--env-file|--preview-name)(=|$)/.test(x)))throw Error('Target overrides are not allowed.');
  return run(node,[cli,...args],{cwd:staged,env:localEnvironment(),quiet});
}
function envSet(name,value){run(node,[cli,'env','set',name],{cwd:staged,env:localEnvironment(),quiet:true,input:value+'\n'});}
function activeProcess(name){
  if(!existsSync(processFile(name)))return null;
  const info=readJSON(processFile(name));
  if(!Number.isInteger(info.pid)||!info.marker)return null;
  const command=spawnSync('ps',['-p',String(info.pid),'-o','command='],{cwd:root,encoding:'utf8'}).stdout??'';
  return command.includes(info.marker)?info:null;
}
function savedOrigin(){const tunnel=activeProcess('tunnel');return tunnel?checkedPublicOrigin(tunnel.origin):identity.gateway;}
function writeShopifyConfig(origin){
  const config=shopifyAppConfiguration(origin);
  writeFileSync(resolve(staged,'shopify.app.local.toml'),config);
}
function stage(origin){
  checkedPublicOrigin(origin);
  const priorExtension=resolve(staged,'extensions/checkout-evidence/shopify.extension.toml');
  if(existsSync(priorExtension)){
    const uid=readFileSync(priorExtension,'utf8').match(/^uid\s*=\s*"([a-zA-Z0-9-]+)"/m)?.[1];
    if(uid)writePrivate(resolve(state,'extension-identity.json'),JSON.stringify({uid}));
  }
  rmSync(staged,{recursive:true,force:true});mkdirSync(staged,{recursive:true,mode:0o700});
  for(const file of sources)cpSync(resolve(root,file),resolve(staged,file),{recursive:true});
  // A previous cloud extension bundle must not accompany the renamed dev one.
  rmSync(resolve(staged,'extensions/checkout-evidence/dist'),{recursive:true,force:true});
  symlinkSync(resolve(root,'node_modules'),resolve(staged,'node_modules'),'dir');
  const shopifyCache=resolve(state,'shopify-cli');mkdirSync(shopifyCache,{recursive:true,mode:0o700});symlinkSync(shopifyCache,resolve(staged,'.shopify'),'dir');
  writePrivate(resolve(staged,'.env.local'),`CONVEX_SELF_HOSTED_URL=${identity.api}\n`);
  writeFileSync(resolve(staged,'shared/deploymentTarget.ts'),`// Generated local adapter. Edit shared/deployment.ts in the main project.\nexport const deploymentTarget = ${JSON.stringify(publicTarget(origin),null,2)} as {kind:'cloud'|'local';store:string;clientId:string;siteOrigin:string;appOrigin:string};\n`);
  const extension=resolve(staged,'extensions/checkout-evidence/shopify.extension.toml');
  let config=readFileSync(extension,'utf8').replace(/^uid\s*=.*\n/m,'').replace('name = "checkout-evidence"','name = "checkout-gain-local-evidence"');
  const extensionIdentity=resolve(state,'extension-identity.json');
  if(existsSync(extensionIdentity))config=`uid = ${JSON.stringify(readJSON(extensionIdentity).uid)}\n`+config;
  writeFileSync(extension,config);
  writeShopifyConfig(origin);
  return publicTarget(origin);
}
async function probe(url){try{return (await fetch(url,{signal:AbortSignal.timeout(2500)})).status;}catch{return 0;}}
async function freePort(port){await new Promise((resolve,reject)=>{const server=createServer();server.once('error',()=>reject(Error(`Port ${port} is already in use. Stop its owner before starting local Convex.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});}
async function startContainers(){
  run('docker',['info','--format','{{.ServerVersion}}'],{quiet:true});
  const running=docker(['ps','--services','--status','running'],true).split('\n');
  if(!running.includes('backend')){await freePort(6210);await freePort(6211);}
  if(!running.includes('dashboard'))await freePort(6792);
  docker(['up','-d','--wait']);
  // Adopt the existing frozen volume without changing its code or data.
  run('docker',['compose','-f',resolve(root,'local/replica.compose.yaml'),'up','-d','--wait']);
  if(!existsSync(resolve(privateDir,'admin.key'))){
    const key=docker(['exec','-T','backend','./generate_admin_key.sh'],true);
    if(!key||/\s/.test(key))throw Error('Unexpected local admin-key response.');
    writePrivate(resolve(privateDir,'admin.key'),key+'\n');
  }
}
function processFile(name){return resolve(state,`${name}.json`);}
function stopProcess(name){
  const file=processFile(name);if(!existsSync(file))return;
  const info=readJSON(file);
  if(info.pid){
    const command=spawnSync('ps',['-p',String(info.pid),'-o','command='],{cwd:root,encoding:'utf8'}).stdout??'';
    if(command.includes(info.marker))try{process.kill(info.pid,'SIGTERM');}catch{}
  }
  rmSync(file,{force:true});
}
async function startGateway(){
  stopProcess('gateway');
  for(let i=0;i<20;i++){try{await freePort(6311);break;}catch(e){if(i===19)throw e;await delay(100);}}
  const log=openSync(resolve(state,'gateway.log'),'a',0o600),entry=resolve(root,'local/gateway/start.mjs');
  const child=spawn(node,[entry],{cwd:root,env:process.env,detached:true,stdio:['ignore',log,log]});child.unref();closeSync(log);
  writePrivate(processFile('gateway'),JSON.stringify({pid:child.pid,marker:entry}));
  for(let i=0;i<40;i++){if(await probe(`${identity.gateway}/api/shopify/session`)===401)return;await delay(200);}
  throw Error('Gateway did not become ready. See the private gateway log.');
}
function listFiles(dir){return readdirSync(dir).flatMap(name=>{const file=join(dir,name);return statSync(file).isDirectory()?listFiles(file):[file];});}
async function deploy(){
  localEnvironment();
  stage(savedOrigin());
  const secret=loadPrivateConfiguration();
  envSet('SHOPIFY_CLIENT_ID',secret.clientId);envSet('SHOPIFY_CLIENT_SECRET',secret.clientSecret);
  envSet('SHOPIFY_APP_ORIGIN',savedOrigin());
  // This project checks Convex and browser code together in npm run build.
  convex(['dev','--once','--typecheck','disable']);
  run('npm',['run','build'],{cwd:staged,env:localEnvironment()});
  const assets=listFiles(resolve(staged,'dist')).map(f=>'/'+relative(resolve(staged,'dist'),f));
  for(const file of listFiles(resolve(staged,'dist')).filter(f=>/\.(html|js|css)$/.test(f))){
    if(/[\w-]+\.convex\.(cloud|site)|build-sprint-demo\.myshopify\.com|CONVEX_SELF_HOSTED_ADMIN_KEY/.test(readFileSync(file,'utf8')))throw Error('Local build contains a live target or an admin setting. Upload refused.');
  }
  run(node,[resolve(root,'node_modules/@convex-dev/static-hosting/dist/cli/index.js'),'upload','--dist','dist'],{cwd:staged,env:localEnvironment()});
  writePrivate(resolve(state,'build.json'),JSON.stringify({builtAt:new Date().toISOString(),target:publicTarget(savedOrigin()),assets:assets.filter(x=>x!=='/index.html'),sourceHash:createHash('sha256').update(readFileSync(resolve(staged,'shared/deploymentTarget.ts'))).digest('hex')},null,2));
  await startGateway();
}
async function status(){
  const entries=[['Replica','http://127.0.0.1:3211'],['Sandbox',identity.site],['Dashboard',identity.dashboard],['Shopify gateway',`${identity.gateway}/api/shopify/app`]];
  for(const [name,url]of entries)console.log(`${name}: ${await probe(url)||'stopped'} ${url}`);
  const tunnel=activeProcess('tunnel');
  console.log(tunnel?`Shopify public link: ${await probe(tunnel.origin+'/api/shopify/app')||'unavailable; run local:shopify'} ${tunnel.origin}/api/shopify/app`:'Public Shopify link: stopped');
}
async function publishShopify(){
  const origin=savedOrigin();
  if(origin===identity.gateway)throw Error('Start the temporary public link with npm run local:shopify first.');
  writeShopifyConfig(origin);
  const cli=resolve(root,'node_modules/@shopify/cli/bin/run.js');
  const env={...localEnvironment(),CI:'1',OPT_OUT_INSTRUMENTATION:'true',SHOPIFY_CLI_FORCE_AUTO_UPGRADE:'0'};
  // Never supply Convex credentials to the Shopify process.
  delete env.CONVEX_SELF_HOSTED_ADMIN_KEY;
  run(node,[cli,'app','config','validate','--config','local','--json'],{cwd:staged,env});
  run(node,[cli,'app','deploy','--config','local','--allow-updates'],{cwd:staged,env});
  const uid=readFileSync(resolve(staged,'extensions/checkout-evidence/shopify.extension.toml'),'utf8').match(/^uid\s*=\s*"([a-zA-Z0-9-]+)"/m)?.[1];
  if(uid)writePrivate(resolve(state,'extension-identity.json'),JSON.stringify({uid}));
  const result=JSON.parse(convex(['run','shopify:refreshLocalDestinations','{}'],{quiet:true}));
  writePrivate(resolve(state,'published.json'),JSON.stringify({origin,at:new Date().toISOString(),collector:result.status}));
  console.log(result.status==='updated'?'Shopify app, collector and checkout notifications use the same public address.':'Open the development app in Shopify and connect the test store, then run local:shopify:publish.');
}
async function tunnel(){
  const existing=activeProcess('tunnel');
  if(existing && await probe(existing.origin+'/api/shopify/app')===200){await deploy();await publishShopify();return;}
  if(existing)stopProcess('tunnel');
  rmSync(processFile('tunnel'),{force:true});
  if(await probe(`${identity.gateway}/api/shopify/app`)!==200)throw Error('Run npm run local:up first.');
  const bin=resolve(root,'node_modules/@shopify/cli/bin/cloudflared');
  const log=openSync(resolve(state,'tunnel.log'),'w',0o600);
  const child=spawn(bin,['tunnel','--url',identity.gateway,'--no-autoupdate'],{cwd:root,detached:true,stdio:['ignore',log,log]});child.unref();closeSync(log);
  writePrivate(processFile('tunnel'),JSON.stringify({pid:child.pid,marker:bin,origin:identity.gateway}));
  let origin;
  for(let i=0;i<100;i++){
    origin=readFileSync(resolve(state,'tunnel.log'),'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if(origin)break;await delay(300);
  }
  if(!origin){stopProcess('tunnel');throw Error('The temporary Shopify link did not start.');}
  writePrivate(processFile('tunnel'),JSON.stringify({pid:child.pid,marker:bin,origin:checkedPublicOrigin(origin)}));
  await deploy();
  await publishShopify();
  console.log(`Development app URL: ${origin}/api/shopify/app`);
}

mkdirSync(privateDir,{recursive:true,mode:0o700});chmodSync(state,0o700);chmodSync(privateDir,0o700);
const command=process.argv[2];
if(process.argv.length>3)throw Error('This command takes no target overrides.');
const lock=resolve(state,'operation.lock');let locked=false;
try{
  assertLocalEnvironment();
  if(existsSync(lock)){
    const owner=Number(readFileSync(lock,'utf8'));
    if(!Number.isInteger(owner)||owner<1)throw Error('Invalid local operation lock. Inspect .local/convex/operation.lock.');
    try{process.kill(owner,0);}catch(error){if(error.code==='ESRCH')rmSync(lock,{force:true});else throw error;}
  }
  if(command!=='status'){const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);locked=true;}
  switch(command){
    case 'up':await startContainers();await deploy();await status();break;
    case 'deploy':await deploy();await status();break;
    case 'status':await status();break;
    case 'down':stopProcess('tunnel');stopProcess('gateway');docker(['stop']);run('docker',['compose','-f',resolve(root,'local/replica.compose.yaml'),'stop']);await status();break;
    case 'shopify':await tunnel();break;
    case 'shopify-publish':await publishShopify();break;
    case 'shopify-stop':stopProcess('tunnel');console.log('Public Shopify link stopped.');break;
    case 'enable-connection':envSet('LOCAL_CONNECTION_ENABLED','true');console.log('Development token exchange enabled for the configured test store.');break;
    case 'refresh-destinations':console.log(convex(['run','shopify:refreshLocalDestinations','{}'],{quiet:true}));break;
    case 'enable-sync':{
      const connection=JSON.parse(convex(['run','shopify:automaticSyncStatus','{}'],{quiet:true}));
      if(!connection.connected)throw Error('Connect the test store before enabling synchronization.');
      envSet('LOCAL_SYNC_ENABLED','true');envSet('SHOPIFY_CHECKOUT_PRICES_ENABLED','true');console.log('Sandbox synchronization enabled.');break;
    }
    default:throw Error('Use an npm local:* command.');
  }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(locked)rmSync(lock,{force:true});}
