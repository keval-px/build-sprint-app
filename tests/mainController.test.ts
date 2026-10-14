import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {buildSync} from 'esbuild';
const source=readFileSync('src/main.ts','utf8')+'\nwindow.__controller={loadEvidence,health:currentMonitoring,latest:()=>latestEvidence};';
const bundle=buildSync({stdin:{contents:source,resolveDir:process.cwd()+'/src',loader:'ts'},bundle:true,platform:'browser',format:'esm',loader:{'.css':'empty'},write:false}).outputFiles[0].text;
async function controller(initialBad=false,embedded=false,initialRead:Promise<any>|null=null,page='/api/shopify/app',search=''){
 const clock={now:1760000000000},elements=new Map<string,any>(),intervals=new Map<number,()=>unknown>(),listeners=new Map<string,Function>();
 let active:any=null;
 class Element {
  textContent='';innerHTML='';hidden=false;value='';checked=false;disabled=false;attributes=new Map<string,string>();handlers=new Map<string,Function[]>();
  setAttribute(k:string,v:string){this.attributes.set(k,v);}removeAttribute(k:string){this.attributes.delete(k);}getAttribute(k:string){return this.attributes.get(k)??null;}
  toggleAttribute(k:string,on:boolean){if(on)this.setAttribute(k,'');else this.removeAttribute(k);}
  addEventListener(k:string,fn:Function){this.handlers.set(k,[...(this.handlers.get(k)??[]),fn]);}
  dispatch(k:string,properties:Record<string,unknown>={}){for(const fn of this.handlers.get(k)??[])fn({target:this,...properties});}
  querySelectorAll(){return [];}focus(){active=this;}scrollIntoView(){}append(){}prepend(){}showOverlay(){this.dispatch('show');}hideOverlay(){this.dispatch('hide');}
 }
 const get=(id:string)=>{if(!elements.has(id)){const node=new Element();if(id==='journey-status-filter')node.value='all';if(id==='journey-sort')node.value='newest';elements.set(id,node);}return elements.get(id);};
 const assessment=new Element(),unavailable=new Element();unavailable.hidden=true;
 const document={title:'',visibilityState:'visible',createElement:()=>new Element(),getElementById:get,querySelector:()=>embedded?new Element():null,querySelectorAll:(selector:string)=>selector==='[data-current-assessment]'?[assessment]:selector==='[data-assessment-unavailable]'?[unavailable]:[],addEventListener:(name:string,fn:()=>unknown)=>listeners.set(name,fn),get activeElement(){return active;}};
 const timeouts:Function[]=[];const requestLog:{url:string;method:string}[]=[];let syncResponse:(()=>Promise<any>)|null=null;
 const navigation:string[]=[];
 const window:any={open:(url:string)=>navigation.push(url),history:{replaceState:(_state:unknown,_title:string,url:string)=>navigation.push(url)},setInterval:(fn:()=>unknown,ms:number)=>{intervals.set(ms,fn);return ms;},setTimeout:(fn:()=>unknown)=>{timeouts.push(fn);return 0;},shopify:{idToken:async()=>'synthetic-token'}};
 const dates=new Proxy(Date,{construct:(target,args)=>Reflect.construct(target,args.length?args:[clock.now]),get:(target,key)=>key==='now'?()=>clock.now:Reflect.get(target,key)});
 const good=()=>({store:'build-sprint-demo.myshopify.com',events:['a','b'].map((c,i)=>({sessionId:c.repeat(64),eventId:`e${i}`,name:'checkout_started',timestamp:clock.now-10000,category:null})),totalStored:2,truncated:false,enabled:true,sampledAt:clock.now,monitoring:{collection:{configured:true,firstReceivedAt:clock.now-40*86400000,lastReceivedAt:clock.now,limited:false}},shopifySnapshot:null});
 let candidate:any=initialBad?{...good(),shopifySnapshot:{orders:null,abandoned:[],syncedAt:clock.now,periodStart:new Date(clock.now-86400000).toISOString()}}:good();let requests=0;let rejected=false;let fixCandidate:any={fixes:[],history:[]};
 let readGate=initialRead;
 const deferEvidence=()=>{let resolve!:(response:any)=>void,reject!:(error:Error)=>void;readGate=new Promise((yes,no)=>{resolve=yes;reject=no;});return {resolve,reject};};
 const fetch=async(url:string,options:any={})=>{requests++;requestLog.push({url,method:options.method??'GET'});if(url.includes('evidence')&&readGate){const pending=readGate;readGate=null;return pending;}if(url.endsWith('/sync')&&syncResponse)return syncResponse();return {ok:!rejected||url.includes('/fixes'),json:async()=>url.includes('/fixes')?fixCandidate:rejected?{error:'Reporting exceeds the safe payload budget. Previous results are retained.'}:candidate};};
 await runInNewContext('(async()=>{'+bundle+'})()', {window,document,location:{hostname:'fixture.invalid',origin:'https://fixture.invalid',pathname:embedded?page:'/',search},customElements:{whenDefined:async()=>{}},localStorage:{getItem:(key:string)=>key==='checkout-demo-viewer'?'a'.repeat(32):null,setItem:()=>{}},fetch,Date:dates,Intl,URL,URLSearchParams,AbortSignal,console,crypto:{getRandomValues:(a:Uint8Array)=>a},setTimeout,clearTimeout});
 await new Promise(resolve=>setImmediate(resolve));
 return {clock,get,window,navigation,intervals,timeouts,requestLog,deferEvidence,setSyncResponse:(fn:()=>Promise<any>)=>{syncResponse=fn;},listeners,assessment,unavailable,document,good,rejectReport:(v:boolean)=>{rejected=v;},setCandidate:(v:any)=>{candidate=v;},requests:()=>requests,setFixCandidate:(v:any)=>{fixCandidate=v;}};
}
test('data loads only on open or date change: no timers, and an open modal is never replaced',async()=>{
 const c=await controller();assert.equal(c.window.__controller.health().state,'Healthy');
 assert.equal(c.intervals.size,0,'no background refresh or freshness timer is registered');
 const modal=c.get('journey-modal'),content=c.get('journey-modal-content');content.innerHTML='unchanged recorded timeline';modal.showOverlay();modal.focus();
 const before=c.requests();c.clock.now+=120001;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.requests(),before,'time passing never reads again');
 assert.equal(c.assessment.hidden,false,'what is on screen stays as loaded until the merchant reloads');
 assert.equal(content.innerHTML,'unchanged recorded timeline');assert.equal(c.document.activeElement,modal);
 const html=readFileSync('index.html','utf8');assert.doesNotMatch(html,/id="check-alerts"|id="alerts-error"|once a minute/);
});
test('real controller rejects malformed nested replacements, retains prior evidence, clears loading and retries',async()=>{
 const c=await controller(),previous=c.window.__controller.latest();
 const broken=[{shopifySnapshot:{orders:null,abandoned:[],syncedAt:c.clock.now,periodStart:new Date(c.clock.now).toISOString()}},{checkoutPrices:[null]},{actionBasketValue:{actions:null,combined:{},rangeStart:1,rangeEnd:2}},{orderPatterns:{hours:null}},{abandonedCheckouts:{records:null}},{inventoryItemValue:{totalMinor:'bad'}}];
 for(const nested of broken){c.setCandidate({...c.good(),...nested});await c.window.__controller.loadEvidence();assert.equal(c.window.__controller.latest(),previous);assert.equal(c.window.__controller.health().state,'Needs attention');assert.equal(c.get('request-status').hidden,true);assert.equal(c.get('session-count').textContent,'2');}
 c.setCandidate(c.good());await c.window.__controller.loadEvidence();assert.equal(c.window.__controller.health().state,'Healthy');
});
test('real controller rejects initially malformed nested evidence without poisoned retained data or loading',async()=>{
 const c=await controller(true);assert.equal(c.window.__controller.latest(),null);assert.equal(c.get('request-status').hidden,true);assert.equal(c.get('summary-title').textContent,'Checkout data unavailable');
 c.setCandidate(c.good());await c.window.__controller.loadEvidence();assert.equal(c.window.__controller.health().state,'Healthy');
});

test('real controller treats malformed fix history as partial without replacing valid evidence or accepting poisoned markers',async()=>{
 const c=await controller();c.setFixCandidate({fixes:[null],history:[]});await c.window.__controller.loadEvidence();
 assert.equal(c.window.__controller.health().state,'Partial');assert.equal(c.get('action-save-error').hidden,false);assert.equal(c.get('session-count').textContent,'2');
 c.setFixCandidate({fixes:[],history:[]});await c.window.__controller.loadEvidence();assert.equal(c.window.__controller.health().state,'Healthy');
});

test('capacity failure retains complete evidence and marks monitoring stale without an all-clear',async()=>{
 const c=await controller(),previous=c.window.__controller.latest();c.rejectReport(true);await c.window.__controller.loadEvidence();
 assert.equal(c.window.__controller.latest(),previous);assert.equal(c.window.__controller.health().state,'Needs attention');assert.equal(c.get('session-count').textContent,'2');assert.equal(c.get('request-status').hidden,true);
 c.rejectReport(false);await c.window.__controller.loadEvidence();assert.equal(c.window.__controller.health().state,'Healthy');
});

test('embedded controller opens and changes dates from saved evidence without starting Shopify sync',async()=>{
 const c=await controller(false,true);assert.equal(c.get('session-count').textContent,'2');assert.ok(c.requestLog.some(r=>r.url.includes('/shopify/evidence')));assert.equal(c.requestLog.some(r=>r.url.endsWith('/sync')),false);
 const before=c.requestLog.length;c.get('last-7-days').dispatch('click');c.get('apply-date-range').dispatch('click');for(const fn of c.timeouts.splice(0))fn();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(c.requestLog.length>before);assert.equal(c.requestLog.some(r=>r.url.endsWith('/sync')),false);assert.equal(c.get('date-range-error').hidden,true);
});
test('embedded page URLs open the matching page and preserve checkout filters on reload',async()=>{
 for(const [path,view] of [['checkouts','journeys'],['fix-history','history'],['alerts','alerts']] as const){
  const c=await controller(false,true,null,`/api/shopify/app/${path}`);
  for(const id of ['overview','journeys','history','alerts'])assert.equal(c.get(id).hidden,id!==view);
  assert.ok(c.requestLog.some(r=>r.url.includes('/shopify/evidence')));
 }
 const c=await controller(false,true,null,'/api/shopify/app/checkouts','?mission=delivery&q=example&status=unfinished&sort=oldest');
 assert.equal(c.get('journey-search').value,'example');assert.equal(c.get('journey-status-filter').value,'unfinished');
 assert.equal(c.get('journey-sort').value,'oldest');assert.match(c.navigation.at(-1)!,/mission=delivery/);
 c.get('clear-journey-filters').dispatch('click');assert.doesNotMatch(c.navigation.at(-1)!,/mission=|q=example|status=unfinished/);
 c.get('history-tab').dispatch('click');assert.match(c.navigation.at(-1)!,/^\/api\/shopify\/app\/fix-history\?/);
});
test('merchant retry, open-window reads and date navigation never request Shopify sync',async()=>{
 const c=await controller(false,true);c.rejectReport(true);await c.window.__controller.loadEvidence();
 c.rejectReport(false);await c.window.__controller.loadEvidence();
 assert.equal(c.get('session-count').textContent,'2');assert.equal(c.requestLog.some(r=>r.url.endsWith('/sync')),false);
 assert.ok(c.requestLog.filter(r=>r.url.includes('/shopify/evidence')).every(r=>r.method==='GET'));
 const html=readFileSync('index.html','utf8');assert.doesNotMatch(html,/data-refresh-metrics|retry-monitoring|abandoned-chart-state/);
 assert.ok(html.indexOf('id="abandoned-baskets"')<html.indexOf('id="recommendations-heading"'));
 assert.ok(html.indexOf('id="abandoned-value-note"')>html.indexOf('id="coverage-details"'));
});
test('chart help opens on hover/focus, Escape then focus-out closes it, and it never triggers reads',async()=>{
 const c=await controller(false,true),trigger=c.get('order-chart-help'),tooltip=c.get('order-chart-tooltip');
 for(let i=0;i<3;i++){
  const before=c.requests();
  trigger.dispatch('pointerenter');trigger.dispatch('focusin');assert.equal(tooltip.hidden,false);
  c.listeners.get('keydown')!({key:'Escape'});trigger.dispatch('focusout');assert.equal(tooltip.hidden,true);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(c.requests(),before);
 }
 assert.equal(c.requestLog.some(r=>r.url.endsWith('/sync')),false);
 assert.ok(c.requestLog.filter(r=>r.url.includes('/shopify/evidence')).every(r=>r.method==='GET'));
});

test('loading labels appear only before the first read, never over visible saved results',async()=>{
 let resolve!:(response:any)=>void;const first=new Promise(yes=>{resolve=yes;});
 const c=await controller(false,true,first);
 assert.equal(c.window.__controller.latest(),null);assert.equal(c.get('request-status').hidden,false);
 assert.equal(c.get('request-status').textContent,'Loading checkouts…');
 resolve({ok:true,json:async()=>c.good()});await new Promise(yes=>setImmediate(yes));
 assert.equal(c.get('request-status').hidden,true);assert.equal(c.get('session-count').textContent,'2');
 for(let i=0;i<2;i++){
  const gate=c.deferEvidence(),pending=c.window.__controller.loadEvidence();
  assert.equal(c.get('request-status').hidden,true);assert.doesNotMatch(c.get('shopify-status').textContent,/Loading/);
  assert.equal(c.get('session-count').textContent,'2');
  gate.resolve({ok:true,json:async()=>c.good()});await pending;
  assert.equal(c.get('request-status').hidden,true);
 }
});
test('failed and aborted reads keep saved results and clear loading so retry works',async()=>{
 const c=await controller(false,true),previous=c.window.__controller.latest();
 for(const error of [new Error('request rejected'),Object.assign(new Error('request aborted'),{name:'AbortError'})]){
  const gate=c.deferEvidence(),pending=c.window.__controller.loadEvidence();
  assert.equal(c.get('request-status').hidden,true);gate.reject(error);await pending;
  assert.equal(c.window.__controller.latest(),previous);assert.equal(c.get('request-status').hidden,true);
  
  assert.equal(c.get('apply-date-range').disabled,false);
 }
 await c.window.__controller.loadEvidence();
});
test('date change during a load discards the old response and queues the latest range without a loading label',async()=>{
 const c=await controller(false,true),previous=c.window.__controller.latest(),gate=c.deferEvidence();
 const pending=c.window.__controller.loadEvidence(),requestCount=c.requestLog.length;
 c.get('last-7-days').dispatch('click');c.get('apply-date-range').dispatch('click',{preventDefault(){},stopImmediatePropagation(){}});
 for(const fn of c.timeouts.splice(0))fn();
 assert.equal(c.get('date-range-button').textContent,'Last 7 days');assert.equal(c.get('request-status').hidden,true);
 assert.equal(c.window.__controller.health().canAssess,false,'old range cannot assess the new selection');
 assert.equal(c.get('data-availability').textContent,'Results for these dates are not current yet.');
 assert.equal(c.requestLog.length,requestCount,'new range waits for active read');
 c.setCandidate({...c.good(),storeName:'Newest range'});
 gate.resolve({ok:true,json:async()=>({...c.good(),storeName:'Obsolete range'})});await pending;
 await new Promise(yes=>setImmediate(yes));
 assert.notEqual(c.window.__controller.latest(),previous);assert.equal(c.document.title,'Newest range · Checkout Health');
 assert.equal(c.get('request-status').hidden,true);assert.ok(c.requestLog.length>requestCount);
 assert.equal(c.window.__controller.health().canAssess,true,'matching accepted range restores assessment');
 const reads=c.requestLog.filter(r=>r.url.includes('/evidence?'));assert.notEqual(reads.at(-1)!.url,reads.at(-2)!.url);
 assert.equal(c.requestLog.some(r=>r.url.endsWith('/sync')),false);
});
test('an aborted first read clears the initial loading state without inventing earlier results',async()=>{
 let reject!:(error:Error)=>void;const first=new Promise((yes,no)=>{reject=no;});
 const c=await controller(false,true,first);assert.equal(c.get('request-status').hidden,false);
 reject(Object.assign(new Error('aborted'),{name:'AbortError'}));await new Promise(yes=>setImmediate(yes));
 assert.equal(c.window.__controller.latest(),null);assert.equal(c.get('request-status').hidden,true);
 
 assert.equal(c.get('apply-date-range').disabled,false);
 await c.window.__controller.loadEvidence();
});


function comparisonEvents(now:number,recentCompleted=8,earlierCompleted=18){
 const events:any[]=[];
 for(let group=0;group<2;group++)for(let i=0;i<20;i++){
  const sessionId=(group*100+i+1).toString(16).padStart(64,'0'),start=now-(group?5:20)*86400000+i;
  const add=(name:string,offset:number)=>events.push({sessionId,eventId:sessionId+name,name,timestamp:start+offset,category:null,deviceClass:group?'mobile':'desktop'});
  add('checkout_started',0);add('checkout_shipping_info_submitted',1000);
  if(i<(group?recentCompleted:earlierCompleted)){add('payment_info_submitted',2000);add('checkout_completed',3000);}
 }
 return events;
}
test('review list hides low-volume and stable comparisons, including their controls',async()=>{
 const c=await controller(false,true);
 assert.doesNotMatch(c.get('mission-list').innerHTML,/data-insight=|Collecting data|How comparisons work/);
 assert.match(c.get('mission-list').innerHTML,/No issues flagged in the checkouts we’ve recorded/);
 assert.equal(c.get('recommendation-count').textContent,'');
 const events=comparisonEvents(c.clock.now,18,18);
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 assert.doesNotMatch(c.get('mission-list').innerHTML,/data-insight=|No change flagged|How comparisons work/);
 assert.match(c.get('mission-list').innerHTML,/No issues flagged in the checkouts we’ve recorded/);
 const html=readFileSync('index.html','utf8');assert.doesNotMatch(html,/What changed|id="checkout-trends"/);
});
test('a device warning appears alone while time comparisons lack an earlier sample',async()=>{
 const c=await controller(false,true),events=comparisonEvents(c.clock.now).map(event=>({...event,timestamp:event.timestamp+(event.deviceClass==='desktop'?15*86400000:0)}));
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 assert.equal(c.get('recommendation-count').textContent,'1 item to review');
 assert.match(c.get('mission-list').innerHTML,/data-insight="device-gap"/);
 assert.doesNotMatch(c.get('mission-list').innerHTML,/data-insight="shipping-drop"|Collecting data/);
});
test('flagged comparisons join the review list and filter exact affected sessions',async()=>{
 const c=await controller(false,true),events=comparisonEvents(c.clock.now);
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 assert.equal((c.get('mission-list').innerHTML.match(/data-insight=/g)??[]).length,2);
 assert.match(c.get('mission-list').innerHTML,/View 12 affected checkouts/);
 assert.doesNotMatch(c.get('mission-list').innerHTML,/No issues flagged|Still gathering evidence/);
 assert.equal(c.get('recommendation-count').textContent,'2 items to review');
 c.get('mission-list').dispatch('click',{target:{closest:(selector:string)=>selector==='s-button[data-trend]'?{dataset:{trend:'shipping-drop'}}:null}});
 assert.equal(c.get('journeys').hidden,false);assert.equal(c.get('overview').hidden,true);
 assert.equal(c.get('clear-journey-filters').hidden,false);
 assert.match(c.get('journey-list').innerHTML,/Shipping/);
 assert.equal((c.get('journey-list').innerHTML.match(/data-session=/g)??[]).length,12);
 c.get('clear-journey-filters').dispatch('click');assert.equal(c.get('clear-journey-filters').hidden,true);
 c.clock.now+=120001;await c.window.__controller.loadEvidence();
 assert.doesNotMatch(c.get('mission-list').innerHTML,/data-insight=|Collecting data/);
 assert.equal(c.get('recommendation-count').textContent,'');
 assert.match(c.get('mission-list').innerHTML,/Some checks need more current data/);
 c.setCandidate({...c.good(),events:comparisonEvents(c.clock.now,18,18)});await c.window.__controller.loadEvidence();
 assert.doesNotMatch(c.get('mission-list').innerHTML,/data-insight=/);
});
test('review count combines alerts and comparisons, with critical alerts first and done actions last',async()=>{
 const c=await controller(false,true),events=comparisonEvents(c.clock.now);
 const affectedIds=[119,120].map(id=>id.toString(16).padStart(64,'0'));
 for(const sessionId of affectedIds)events.push({sessionId,eventId:sessionId+'alert',name:'alert_displayed',timestamp:c.clock.now-5*86400000+4000,category:'delivery',shippingBlocker:'no_shipping_available'});
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 assert.equal(c.get('recommendation-count').textContent,'3 items to review');
 const markup=c.get('mission-list').innerHTML;
 assert.ok(markup.includes('id="mission-delivery"'));
 assert.ok(markup.indexOf('id="mission-delivery"')<markup.indexOf('data-insight='));
 c.setFixCandidate({fixes:[{missionId:'delivery',appliedAt:c.clock.now-10000,baseline:{checkouts:40,affected:2,completed:26},affectedIds,partial:false}],history:[]});
 await c.window.__controller.loadEvidence();
 assert.equal(c.get('recommendation-count').textContent,'2 items to review');
 assert.ok(c.get('mission-list').innerHTML.lastIndexOf('data-insight=')<c.get('mission-list').innerHTML.indexOf('<s-heading>Marked as done</s-heading>'));
});
test('cards link to filtered Checkouts and full activity without an alert summary',async()=>{
 const c=await controller(false,true),events:any[]=[];
 const ids=['a','b','c'].map(id=>id.repeat(64));
 const add=(sessionId:string,name:string,offset:number,extra={})=>events.push({sessionId,eventId:sessionId+name+offset,name,timestamp:c.clock.now-50000+offset,category:null,...extra});
 for(const id of ids){add(id,'checkout_started',0);add(id,'checkout_address_info_submitted',1000);add(id,'alert_displayed',2000,{category:'delivery',shippingBlocker:'no_shipping_available'});}
 add(ids[0],'alert_displayed',3000,{category:'delivery',shippingBlocker:'no_shipping_available'});
 add(ids[0],'alert_displayed',4000,{category:'delivery'});
 add(ids[0],'alert_displayed',5000,{category:'validation'});
 add(ids[2],'checkout_completed',6000);
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 const cards=c.get('mission-list').innerHTML;
 assert.doesNotMatch(cards,/Alert details|Alerts in affected checkouts|<s-table|data-diagnostic/);
 assert.match(cards,/Why we flagged this/);assert.match(cards,/How you can test your change/);assert.match(cards,/Mark as done/);
 const html=readFileSync('index.html','utf8'),overview=html.slice(html.indexOf('id="overview"'),html.indexOf('id="journeys"'));
 assert.doesNotMatch(overview,/Recorded findings|id="error-summary"/);
 assert.doesNotMatch(html,/journey-alert-summary|error-summary|Alerts in these checkouts|A value is unavailable when/);
 assert.match(html,/>Checkout reference<\/s-table-header>/);
 assert.match(html,/Search reference or order/);
 c.get('mission-list').dispatch('click',{target:{closest:(selector:string)=>selector==='s-button[data-mission]'?{dataset:{mission:'delivery'}}:null}});
 assert.equal(c.get('journeys').hidden,false);
 assert.equal((c.get('journey-list').innerHTML.match(/data-session=/g)??[]).length,2);
 assert.equal(c.get('journey-status-filter').value,'unfinished','an all-unfinished card opens the Abandoned status so chip counts match the card');
 assert.match(c.get('quick-issue-filters').innerHTML,/variant="primary" data-quick-issue="(delivery|shipping_blocker)"[^>]*>[^<]* · 2</,'the matching chip is selected and shows the card count');
 c.get('journey-search').value=ids[0];c.get('journey-search').dispatch('input');
 assert.equal((c.get('journey-list').innerHTML.match(/data-session=/g)??[]).length,1);
 assert.equal(c.get('journey-search').value,ids[0]);assert.equal(c.get('clear-journey-filters').hidden,false);
 c.get('clear-journey-filters').dispatch('click');
 assert.equal((c.get('journey-list').innerHTML.match(/data-session=/g)??[]).length,3);
 c.get('journey-list').dispatch('click',{target:{closest:()=>({dataset:{journey:ids[2]}})}});
 assert.match(c.get('journey-modal-content').innerHTML,/Loading recorded activity/,'details open at once and fetch the timeline');
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(c.requestLog.some(r=>new RegExp(`/api/shopify/checkout\\?id=${ids[2]}&asOf=\\d+$`).test(r.url)));
 assert.match(c.get('journey-modal-content').innerHTML,/Checkout alert displayed/);assert.match(c.get('journey-modal-content').innerHTML,/Checkout completed/);
});

test('checkout statuses use short labels while details retain the recorded evidence',async()=>{
 const c=await controller(false,true),id='a'.repeat(64),open=()=>c.get('journey-list').dispatch('click',{target:{closest:()=>({dataset:{journey:id}})}});
 open();
 assert.equal(c.get('journey-modal').heading,'Checkout reference');
 assert.match(c.get('journey-modal-content').innerHTML.replaceAll('<wbr>',''),new RegExp('#'+id));
 assert.match(c.get('journey-modal-content').innerHTML,/<s-badge tone="neutral">Abandoned<\/s-badge>/);
 assert.match(c.get('journey-modal-content').innerHTML,/Abandoned means no completed checkout has been recorded yet/);
 assert.match(c.get('journey-list').innerHTML,/<s-badge tone="neutral">Abandoned<\/s-badge>/);
 assert.match(readFileSync('index.html','utf8'),/<s-option value="unfinished">Abandoned<\/s-option>/);
 assert.doesNotMatch(c.get('journey-modal-content').innerHTML,/<s-banner|href=/);
 const snapshot={syncedAt:c.clock.now,periodStart:new Date(c.clock.now-86400000).toISOString(),orders:[],abandoned:[{sessionId:id,recordHash:'b'.repeat(64),createdAt:new Date(c.clock.now-10000).toISOString(),subtotalCents:1000,recovered:false}]};
 c.setCandidate({...c.good(),shopifySnapshot:snapshot});await c.window.__controller.loadEvidence();open();
 assert.match(c.get('journey-modal-content').innerHTML,/<s-badge tone="neutral">Abandoned<\/s-badge>/);
 c.get('journey-modal').hideOverlay();
 const completed={...c.good(),events:[...c.good().events,{sessionId:id,eventId:'complete-a',name:'checkout_completed',timestamp:c.clock.now-5000,category:null}],shopifySnapshot:{...snapshot,orders:[{sessionId:id,orderName:'#1001',orderId:'123456',recordHash:'c'.repeat(64),createdAt:new Date(c.clock.now-5000).toISOString(),subtotalCents:1000,paid:true,test:true,cancelled:false}]}};
 c.setCandidate(completed);await c.window.__controller.loadEvidence();open();
 assert.match(c.get('journey-modal-content').innerHTML,/<s-badge tone="success">Completed<\/s-badge>/);
 assert.match(c.get('journey-list').innerHTML,/<s-badge tone="success">Completed<\/s-badge>/);
 assert.doesNotMatch(c.get('journey-list').innerHTML,/Completed ·|No completion recorded/);
 assert.match(c.get('journey-modal-content').innerHTML,/href="shopify:\/\/admin\/orders\/123456"/);
 assert.match(c.get('journey-modal-content').innerHTML,/Order #1001/);
 assert.equal(c.get('journey-modal').heading,'Order details');
 assert.match(c.get('journey-list').innerHTML,/Order #1001/);
 assert.match(c.get('journey-modal-content').innerHTML,/Completed · paid order/);
});
test('a saved change uses the evidence returned with it, and reads again only when none came back',async()=>{
 const c=await controller(false,true),events=comparisonEvents(c.clock.now);
 const affectedIds=[119,120].map(id=>id.toString(16).padStart(64,'0'));
 for(const sessionId of affectedIds)events.push({sessionId,eventId:sessionId+'alert',name:'alert_displayed',timestamp:c.clock.now-5*86400000+4000,category:'delivery',shippingBlocker:'no_shipping_available'});
 c.setCandidate({...c.good(),events,totalStored:events.length});await c.window.__controller.loadEvidence();
 const fixes=[{missionId:'delivery',appliedAt:c.clock.now-10000,baseline:{checkouts:40,affected:2,completed:26},affectedIds,partial:false}];
 const evidenceReads=()=>c.requestLog.filter(r=>r.url.includes('/evidence')).length,settle=()=>new Promise(resolve=>setImmediate(resolve));
 const mark=async()=>{c.get('mission-list').dispatch('change',{target:{closest:()=>({checked:true,dataset:{fixDone:'delivery'}})}});await settle();await settle();};
 c.setFixCandidate({fixes,history:[],evidence:{...c.good(),events,totalStored:events.length}});
 let before=evidenceReads();await mark();
 assert.equal(evidenceReads(),before,'no second read when the change returns evidence');
 assert.equal(c.get('recommendation-count').textContent,'2 items to review');
 c.setFixCandidate({fixes,history:[]});
 before=evidenceReads();await mark();
 assert.equal(evidenceReads(),before+1,'reads again when the change returns no evidence');
});
test('orders far below the hourly average for two hours put an order-drop card first',async()=>{
 const c=await controller(false,true),now=c.clock.now,hour=3600000,today=now-now%86400000;// 08:53 UTC
 const orders:any[]=[];let n=0;
 const add=(at:number,count:number)=>{for(let i=0;i<count;i++)orders.push({recordHash:(++n).toString(16).padStart(64,'0'),createdAt:new Date(at+i*1000).toISOString(),subtotalCents:1000,paid:true,cancelled:false,test:false});};
 for(let day=1;day<=9;day++)for(let h=0;h<24;h++)add(today-day*86400000+h*hour,12);
 for(let h=0;h<=8;h++)add(today+h*hour,h===5||h===6?3:12);
 const snapshot={timeZone:'UTC',currency:'USD',syncedAt:now,periodStart:new Date(today-9*86400000).toISOString(),orders,abandoned:[]};
 c.setCandidate({...c.good(),shopifySnapshot:snapshot});await c.window.__controller.loadEvidence();
 const list=c.get('mission-list').innerHTML;
 assert.match(list,/^<s-section data-insight="order-drop">/,'the order-drop card leads the list');
 assert.match(list,/at least 50% below the hourly average for 2 hours in a row today, 05:00–07:00 \(UTC\)/);
 assert.match(list,/3 of 12 usual<\/s-text><s-text tone="critical" type="strong">−75%/);
 assert.match(c.get('recommendation-count').textContent,/^1 item to review$/);
 // A normal day shows no card.
 const normal=orders.filter(o=>Date.parse(o.createdAt)<today).concat(Array.from({length:9*12},(_,i)=>({recordHash:'f'+i.toString(16).padStart(63,'0'),createdAt:new Date(today+Math.floor(i/12)*hour+(i%12)*1000).toISOString(),subtotalCents:1000,paid:true,cancelled:false,test:false})));
 c.setCandidate({...c.good(),shopifySnapshot:{...snapshot,orders:normal}});await c.window.__controller.loadEvidence();
 assert.doesNotMatch(c.get('mission-list').innerHTML,/order-drop/);
});
