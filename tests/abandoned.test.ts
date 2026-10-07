import test from 'node:test';import assert from 'node:assert/strict';
import {recordedImpact} from '../shared/abandoned.ts';import {buildMissions} from '../shared/actions.ts';import type {CheckoutEvent} from '../shared/evidence.ts';
const events:CheckoutEvent[]=[{eventId:'1',sessionId:'a',name:'checkout_started',timestamp:1,category:null},{eventId:'2',sessionId:'a',name:'alert_displayed',timestamp:2,category:'validation'},{eventId:'3',sessionId:'b',name:'checkout_started',timestamp:3,category:null}];
const snapshot={importedOn:'2026-10-06',emailSent:1,emailNotSent:1,records:[{recordHash:'x',sessionId:'a',subtotalCents:60000,currency:'USD' as const,recovered:false},{recordHash:'y',sessionId:null,subtotalCents:60000,currency:'USD' as const,recovered:false}]};
test('legacy USD evidence is never relabeled as another store currency',()=>{
 const result=recordedImpact(events,buildMissions(events),snapshot,5,'CAD');
 assert.equal(result.combined.matchedSessions,0);assert.equal(result.combined.atRiskCents,0);
});
test('uses actual subtotals only, excludes unknown values and deduplicates actions',()=>{const result=recordedImpact(events,buildMissions(events),snapshot);assert.equal(result.combined.atRiskCents,60000);assert.equal(result.combined.recoveryCents,3000);assert.equal(result.combined.unknownSessions,1);assert.equal(result.combined.matchedSessions,1);});
test('recovered, completed and ambiguous links never contribute recovery',()=>{assert.equal(recordedImpact([...events,{eventId:'4',sessionId:'a',name:'checkout_completed',timestamp:4,category:null}],buildMissions(events),snapshot).combined.atRiskCents,0);assert.equal(recordedImpact(events,buildMissions(events),{...snapshot,records:snapshot.records.map(r=>({...r,recovered:true}))}).combined.atRiskCents,0);assert.equal(recordedImpact(events,buildMissions(events),{...snapshot,records:[snapshot.records[0],{...snapshot.records[0],recordHash:'z'}]}).combined.atRiskCents,0);});
test('prices new browser observations with source counts, without substituting an average',()=>{
  const observed=[...events,{eventId:'5',sessionId:'b',name:'checkout_started' as const,timestamp:5,category:null,currency:'USD' as const,subtotalCents:120000}];
  const result=recordedImpact(observed,buildMissions(observed),snapshot);
  assert.equal(result.combined.atRiskCents,180000);
  assert.equal(result.combined.serverLinkedSessions,1);
  assert.equal(result.combined.browserPricedSessions,1);
  assert.equal(result.combined.unknownSessions,0);
  const completed=[...observed,{eventId:'6',sessionId:'b',name:'checkout_completed' as const,timestamp:6,category:null}];
  assert.equal(recordedImpact(completed,buildMissions(completed),snapshot).combined.atRiskCents,60000);
});

test('fresh matched Shopify subtotals replace stale legacy prices without double counting',async()=>{
 const {linkedAbandoned}=await import('../shared/abandoned.ts');
 const saved=linkedAbandoned({importedOn:'',emailSent:0,emailNotSent:0,records:[{recordHash:'old',sessionId:'match',subtotalCents:60000,currency:'USD',recovered:false}]},[{recordHash:'new',sessionId:'match',subtotalCents:74995,recovered:false},{recordHash:'unlinked',subtotalCents:60000,recovered:false}],'USD');
 assert.equal(saved?.records.length,1);
 assert.equal(saved?.records[0].subtotalCents,74995);
});
