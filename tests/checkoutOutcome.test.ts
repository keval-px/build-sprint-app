import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutOutcome,outcomeLabel,completionAfter,type OutcomeFacts} from '../shared/checkoutOutcome.ts';
import {summarize,type CheckoutEvent} from '../shared/evidence.ts';
import {buildRecommendations} from '../shared/recommendations.ts';
import {actionValues} from '../shared/actionValues.ts';
import {focusedAlerts} from '../shared/dashboardInsights.ts';
import {checkoutCSV,checkoutEventsCSV} from '../shared/checkoutExport.ts';
import {basketPricer} from '../shared/basketValue.ts';
import {filterJourneyRows} from '../shared/journeyTable.ts';
import {recordedFindings} from '../shared/dashboardInsights.ts';
import {fixBaseline,fixResults} from '../shared/fixTracking.ts';
const ids=['a','b','c'].map(c=>c.repeat(64)),start=1000;
const events:CheckoutEvent[]=ids.flatMap((sessionId,i)=>[
 {sessionId,eventId:`start${i}`,name:'checkout_started',timestamp:start,category:null,subtotalCents:60000,currency:'USD'},
 {sessionId,eventId:`alert${i}`,name:'alert_displayed',timestamp:2000,category:'delivery',shippingBlocker:'no_shipping_available'},
]);
const order={sessionId:ids[0],paid:true,createdAt:new Date(3000).toISOString(),subtotalCents:60000,totalCents:62000};
const price={sessionId:ids[0],currency:'USD',createdAt:new Date(1000).toISOString(),updatedAt:4000,completedAt:3000,recovered:true,subtotalCents:60000,totalCents:62000};

test('a paid exact order reconciles a missing Thank-you event across counts, recommendations, exposure, table filters and CSV',()=>{
 const before=JSON.stringify(events),facts={orders:[order],asOf:5000};
 const summary=summarize(events,facts);
 assert.equal(summary.completed,1);assert.equal(summary.noCompletionObserved,2);
 assert.deepEqual(summary.journeys[0].outcome.sources,['paid_order']);
 const recommendation=buildRecommendations(events,facts)[0];
 assert.equal(recommendation.count,2);assert.deepEqual(recommendation.sessionIds,ids.slice(1));
 const value=actionValues(events,null,[],[],'USD',0,5000,[order]);
 assert.equal(value.combined.eligibleSessions,2);assert.equal(value.combined.totalCents,120000);
 assert.equal(basketPricer({currency:'USD',orders:[order]})({id:ids[0],completed:true,events}),62000);
 const rows=summary.journeys.map(j=>({id:j.id,label:j.id,startedAt:start,completed:j.completed,outcome:j.outcome,events:j.events,categories:['delivery'],shippingBlocker:true}));
 assert.deepEqual(filterJourneyRows(rows,{query:'',status:'completed',alert:'all',shippingOnly:false,sort:'newest'}).map(r=>r.id),[ids[0]]);
 assert.ok(checkoutCSV(rows,'USD').includes('Completed · paid order'));
 assert.equal(checkoutEventsCSV(rows).includes('checkout_completed'),false);
 assert.equal(JSON.stringify(events),before,'reconciliation does not mutate or manufacture browser events');
 assert.equal(focusedAlerts(events,5000,false,{},facts).find(a=>a.category==='shipping_blocker')?.count,2);
});

test('late signed completion reconciles the exact journey using its validated original completion time',()=>{
 assert.equal(summarize(events).completed,0);
 const facts={prices:[price],asOf:5000},outcome=checkoutOutcome(ids[0],events,facts);
 assert.equal(outcome.completed,true);assert.equal(outcome.serverCompleted,true);
 assert.deepEqual(outcome.sources,['signed_checkout']);assert.equal(outcome.completedAt,3000);
 assert.equal(completionAfter(outcome,[],2000),true);
 assert.equal(completionAfter(outcome,[],3500),false,'update time is not completion time');
 assert.equal(outcomeLabel(outcome),'Completed · checkout confirmation');
 assert.equal(summarize(events,facts).noCompletionObserved,2);
 assert.deepEqual(buildRecommendations(events,facts)[0].sessionIds,ids.slice(1));
 assert.equal(actionValues(events,null,[],[price],'USD',0,5000).combined.totalCents,120000);
});

test('missing, unpaid, unrelated and ambiguous records never manufacture a completion match',()=>{
 const cases:OutcomeFacts[]=[{}, {orders:[{...order,paid:false}]},{orders:[{...order,sessionId:'d'.repeat(64)}]},
 {orders:[order,{...order,totalCents:62000}] as typeof order[]},{prices:[price,{...price,recovered:false}]},
 {orders:[{...order,sessionId:undefined}]},{prices:[{...price,recovered:false}]}];
 for(const facts of cases)assert.equal(checkoutOutcome(ids[0],events,{...facts,asOf:5000}).completed,false);
 assert.equal(checkoutOutcome(ids[0],events,{orders:[order,order],asOf:5000}).conflicting,true);
 assert.equal(checkoutOutcome(ids[0],events,{prices:[price,price],asOf:5000}).conflicting,true);
});

test('contradictory server timing remains unconfirmed; an independent paid or browser completion is never undone by a negative snapshot',()=>{
 for(const facts of [{orders:[{...order,createdAt:new Date(500).toISOString()}]}, {orders:[{...order,createdAt:new Date(6000).toISOString()}]}, {prices:[{...price,updatedAt:500}]}, {prices:[{...price,updatedAt:6000}]}]){
  const outcome=checkoutOutcome(ids[0],events,{...facts,asOf:5000});assert.equal(outcome.completed,false);assert.equal(outcome.conflicting,true);
 }
 const conflicting=checkoutOutcome(ids[0],events,{orders:[order],prices:[{...price,recovered:false}],asOf:5000});
 assert.equal(conflicting.completed,true);assert.equal(conflicting.conflicting,true);
 const browser={...events[0],eventId:'completion',name:'checkout_completed' as const,timestamp:3500};
 const observed=checkoutOutcome(ids[0],[...events,browser],{orders:[order,order],prices:[{...price,recovered:false}],asOf:5000});
 assert.equal(observed.completed,true);assert.deepEqual(observed.sources,['browser']);assert.equal(observed.conflicting,true);
});

test('ordinary browser completion and no evidence retain honest outcomes',()=>{
 const complete={...events[0],eventId:'done',name:'checkout_completed' as const,timestamp:3000};
 const observed=checkoutOutcome(ids[0],[...events,complete],{asOf:5000});
 assert.equal(observed.completed,true);assert.deepEqual(observed.sources,['browser']);assert.equal(observed.completedAt,3000);
 assert.equal(completionAfter(observed,[],2000),true);
 assert.equal(outcomeLabel(checkoutOutcome(ids[0],events)),'No completion recorded');
 assert.equal(summarize([], {orders:[order],prices:[price]}).sessionCount,0,'server facts do not invent an observed journey');
});

test('a later browser alert does not reopen a server-confirmed paid checkout; ambiguous orders do not hide an independent signed completion',()=>{
 const later=events.map(e=>e.category?{...e,timestamp:4500}:e);
 assert.deepEqual(buildRecommendations(later,{orders:[order],asOf:5000})[0].sessionIds,ids.slice(1));
 const outcome=checkoutOutcome(ids[0],events,{orders:[order,order],prices:[price],asOf:5000});
 assert.equal(outcome.completed,true);assert.deepEqual(outcome.sources,['signed_checkout']);assert.equal(outcome.conflicting,true);
});

test('server outcome timing updates findings and fix counts without backdating signed completion or inventing recovery',()=>{
 const facts={orders:[order],asOf:5000};
 assert.equal(recordedFindings(events,facts)[0].completedAfter,1);
 assert.equal(recordedFindings(events,{prices:[price],asOf:5000})[0].completedAfter,1);
 const before=fixBaseline(events,'delivery',2500,false,'shipping_unavailable',facts);
 assert.equal(before.baseline.completed,0);assert.equal(before.affectedIds.length,3);
 const after=fixResults(before,events,5000,facts);
 assert.equal(after.affectedCompleted,1);
 const withoutTime=fixResults(before,events,5000,{prices:[{...price,completedAt:undefined}]});
 assert.equal(withoutTime.affectedCompleted,0);
 const later=fixBaseline(events,'unfinished',5000,false,undefined,facts);
 assert.equal(later.baseline.completed,1);assert.equal(later.baseline.affected,2);
 assert.deepEqual(later.affectedIds,ids.slice(1));
 assert.equal(fixBaseline(events,'delivery',5000,false,'shipping_unavailable',facts).affectedIds.includes(ids[0]),false);
});


test('future browser events use one boundary across all consumers and become evidence only as time advances',()=>{
 const now=1000000,done=now+30000;
 const rows=events.filter(e=>e.sessionId!==ids[2]).map(e=>({...e,timestamp:now+(e.name==='checkout_started'?-10000:-5000),subtotalCents:60000,currency:'USD' as const}));
 const pending:CheckoutEvent[]=[...rows,...ids.slice(0,2).map((sessionId,i)=>({sessionId,eventId:`future-${i}`,timestamp:done,name:'checkout_completed' as const,category:null}))];
 for(const at of [now,done-1]){
  const facts={asOf:at},summary=summarize(pending,facts);
  assert.equal(summary.completed,0);assert.equal(summary.noCompletionObserved,2);assert.equal(summary.eventCount,4);
  assert.equal(buildRecommendations(pending,facts)[0].count,2);
  assert.equal(focusedAlerts(pending,at,false,{},facts)[0].count,2);
  assert.equal(recordedFindings(pending,facts)[0].completedAfter,0);
  assert.equal(actionValues(pending,null,[],[],'USD',now-20000,done+1,[],at).combined.totalCents,120000);
  const outcome=checkoutOutcome(ids[0],pending,facts);
  assert.equal(completionAfter(outcome,pending,now-5000),false);
 }
 const facts={asOf:done},summary=summarize(pending,facts);
 assert.equal(summary.completed,2);assert.equal(summary.noCompletionObserved,0);assert.equal(summary.eventCount,6);
 assert.equal(buildRecommendations(pending,facts).length,0);assert.equal(focusedAlerts(pending,done,false,{},facts).length,0);
 assert.equal(recordedFindings(pending,facts)[0].completedAfter,2);
 assert.equal(actionValues(pending,null,[],[],'USD',now-20000,done+1,[],done).combined.totalCents,0);
 const late=[...rows,...pending.slice(-2).map(e=>({...e,timestamp:now-2000}))];
 assert.equal(summarize(late,{asOf:now}).completed,2,'late delivery of a past event is valid');
});

test('signed original completion rejects future and pre-creation times; historical flags never invent completion or recovery',()=>{
 for(const completedAt of [6000,500,4500,NaN]){
  const outcome=checkoutOutcome(ids[0],events,{prices:[{...price,completedAt}],asOf:5000});
  assert.equal(outcome.completed,false);assert.equal(outcome.conflicting,true);
 }
 const legacy={...price,completedAt:undefined},facts={prices:[legacy],asOf:5000};
 const outcome=checkoutOutcome(ids[0],events,facts);
 assert.equal(outcome.completed,false);assert.equal(outcome.legacySignedCompletion,true);assert.equal(completionAfter(outcome,[],0),false);
 assert.equal(summarize(events,facts).noCompletionObserved,3);assert.equal(buildRecommendations(events,facts)[0].count,3);
 assert.equal(recordedFindings(events,facts)[0].completedAfter,0);
 assert.equal(checkoutOutcome(ids[0],events,{...facts,orders:[order]}).completed,true,'independent exact paid order still reconciles');
 assert.equal(checkoutOutcome(ids[0],events,{prices:[price],asOf:2999}).completed,false);
 assert.equal(checkoutOutcome(ids[0],events,{prices:[price],asOf:4000}).completed,true);
 const after=checkoutOutcome(ids[0],events,{prices:[price],asOf:5000});
 assert.equal(completionAfter(after,[],3500),false,'signed update never becomes recovery time');
});
