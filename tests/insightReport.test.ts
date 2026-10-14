import test from 'node:test';import assert from 'node:assert/strict';
import {STORE,type CheckoutEvent} from '../shared/evidence.ts';
import {checkoutCohort} from '../shared/dateRange.ts';
import {buildRecommendations} from '../shared/recommendations.ts';
import {missionSignal,missionRecommendation} from '../shared/actions.ts';
import {actionState,fixResults,retestResults,fixBaseline} from '../shared/fixTracking.ts';
import {insightReport,type InsightInput} from '../shared/insightReport.ts';
import {prepareEvidence} from '../shared/evidenceResponse.ts';
const H=3600000,start=10*24*H,end=start+5*24*H,now=end-H;
let serial=0;
const id=(n:number|string)=>String(n).padStart(64,'0');
const e=(session:number|string,name:CheckoutEvent['name'],timestamp:number,details:Partial<CheckoutEvent>={}):CheckoutEvent=>({eventId:String(++serial).padStart(64,'f'),sessionId:id(session),name,timestamp,category:null,...details});
const app='a'.repeat(64);
const events:CheckoutEvent[]=[];
for(let i=0;i<30;i++){
 const at=start+i*3*H;
 events.push(e(i,'checkout_started',at,{deviceClass:i%2?'mobile':'desktop'}));
 if(i%5===0)events.push(e(i,'alert_displayed',at+60000,{category:'delivery',shippingBlocker:'no_shipping_available'}));
 if(i%7===0)events.push(e(i,'ui_extension_errored',at+60000,{category:'extension',extensionAppHash:app,extensionAppName:'Gift wrap'}));
 if(i%4===0&&i%5!==0)events.push(e(i,'checkout_completed',at+120000));
}
// A session started before the dates still counts for results after marking done.
events.push(e('bef0','checkout_started',start-H),e('bef0','alert_displayed',start-H+1,{category:'delivery',shippingBlocker:'no_shipping_available'}));
const facts={orders:[],prices:[],asOf:now};
const cohort=checkoutCohort(events,{start,end});
const fix={...fixBaseline(events,'delivery',start+40*H,false,'shipping_unavailable',facts),retestedAt:start+60*H};
const input=(fixes=[fix]):InsightInput=>({events,facts,now,range:{start,end},fixes,currency:'USD',
 values:{abandonedCheckouts:null,abandoned:[],prices:[],orders:[]},trends:{healthy:true,simulationMode:false}});

test('cards carry the same numbers the page worked out from events',()=>{
 const report=insightReport(input());
 const recommendations=buildRecommendations(cohort,facts);
 assert.deepEqual(report.cards.map(c=>c.mission.id).sort(),recommendations.map(m=>m.id).sort());
 assert.ok(report.cards.length>=2,'fixture produces shipping and app cards');
 for(const card of report.cards){
  const mission=recommendations.find(m=>m.id===card.mission.id)!,f=card.mission.id==='delivery'?fix:undefined,boundary=f?.retestedAt??f?.appliedAt;
  assert.deepEqual(card.mission,mission);
  assert.deepEqual(card.status,actionState(f,events,now));
  assert.deepEqual(card.signal,missionSignal(mission,cohort,boundary,facts));
  assert.equal(card.recommendation,missionRecommendation(mission,cohort,boundary,facts));
  assert.equal(card.percent,Math.round(mission.count/report.sessionCount*100));
 }
 const delivery=report.cards.find(c=>c.mission.id==='delivery')!;
 assert.deepEqual(delivery.results,fixResults(fix,events,now,facts));
 assert.deepEqual(delivery.retest,retestResults(fix,events,now));
 assert.ok(delivery.status.returned>0,'alerts after the retest are counted from all events');
 assert.equal(delivery.shippingBlockers,delivery.mission.count);
 assert.equal(report.cards.find(c=>c.mission.id!=='delivery')!.results,undefined);
 assert.equal(report.sessionCount,30);
});

test('cards that are done sort last and missions without a card can still filter',()=>{
 const quiet={...fix,retestedAt:now};// nothing after the retest
 const report=insightReport(input([quiet]));
 assert.equal(report.cards.at(-1)!.mission.id,'delivery');assert.equal(report.cards.at(-1)!.status.done,true);
 assert.ok(report.otherMissions.some(m=>m.id==='unfinished'&&m.sessionIds.length>0));
 assert.ok(!report.otherMissions.some(m=>report.cards.some(c=>c.mission.id===m.id)));
});

test('evidence responses accept a valid report and reject malformed cards',()=>{
 const base={store:STORE,events:[],enabled:true,sampledAt:now,totalStored:0,truncated:false};
 const insights=JSON.parse(JSON.stringify(insightReport(input())));
 assert.equal(prepareEvidence({...base,insights},STORE).insights?.cards.length,insights.cards.length);
 const broken=(change:(card:any)=>void)=>{const copy=structuredClone(insights);change(copy.cards[0]);return {...base,insights:copy};};
 assert.throws(()=>prepareEvidence(broken(c=>{c.mission.id='other';}),STORE));
 assert.throws(()=>prepareEvidence(broken(c=>{c.signal.severity.label='Urgent';}),STORE));
 assert.throws(()=>prepareEvidence(broken(c=>{c.mission.sessionIds=['not-a-session'];}),STORE));
 assert.throws(()=>prepareEvidence({...base,insights:{...insights,trendWindow:null}},STORE));
});
