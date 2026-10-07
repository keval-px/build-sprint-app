import {summarize} from './evidence.ts';
import type {CheckoutEvent} from './evidence.ts';
import type {Mission} from './actions.ts';
export interface AbandonedSnapshot {importedOn:string; emailSent:number; emailNotSent:number; records:{recordHash:string;sessionId:string|null;subtotalCents:number;currency:'USD';recovered:boolean}[]}
export function recordedImpact(events:CheckoutEvent[],missions:Mission[],snapshot:AbandonedSnapshot,percent=5,currency='USD'){
  if(!Number.isFinite(percent)||percent<0||percent>100)throw Error('Invalid recovery scenario');
  const unfinished=new Set(summarize(events).journeys.filter(j=>j.started&&!j.completed).map(j=>j.id));
  const recoveredIds=new Set(snapshot.records.filter(r=>r.recovered&&r.sessionId).map(r=>r.sessionId!));
  const records=new Map<string,number>(); const conflicts=new Set<string>(); const seen=new Set<string>();
  for(const r of snapshot.records){if(!Number.isSafeInteger(r.subtotalCents)||r.subtotalCents<0||r.currency!=='USD'||seen.has(r.recordHash))throw Error('Invalid abandoned snapshot');seen.add(r.recordHash);if(!r.sessionId||r.recovered||r.currency!==currency)continue;if(records.has(r.sessionId))conflicts.add(r.sessionId);records.set(r.sessionId,r.subtotalCents);}
  conflicts.forEach(id=>records.delete(id));
  const serverIds=new Set(records.keys()), browserIds=new Set<string>();
  // Browser prices are a separate observed source; never claim server verification.
  const latest=new Map<string,CheckoutEvent>();
  for(const event of events){
    if(event.name==='alert_displayed'||event.currency!==currency||!Number.isSafeInteger(event.subtotalCents)||event.subtotalCents!<0)continue;
    const old=latest.get(event.sessionId);
    if(!old||old.timestamp<event.timestamp)latest.set(event.sessionId,event);
  }
  for(const [id,event] of latest){if(!records.has(id)&&!conflicts.has(id)&&!recoveredIds.has(id)){records.set(id,event.subtotalCents!);browserIds.add(id);}}
  const combined=new Set<string>();
  const amount=(ids:string[])=>{const matched=ids.filter(id=>records.has(id));const atRiskCents=matched.reduce((sum,id)=>sum+records.get(id)!,0);return{eligibleSessions:ids.length,matchedSessions:matched.length,serverLinkedSessions:matched.filter(id=>serverIds.has(id)).length,browserPricedSessions:matched.filter(id=>browserIds.has(id)).length,unknownSessions:ids.length-matched.length,atRiskCents,recoveryCents:Math.round(atRiskCents*percent/100)}};
  const actions=missions.map(m=>{const ids=[...new Set(m.sessionIds)].filter(id=>unfinished.has(id));ids.forEach(id=>combined.add(id));return{id:m.id,...amount(ids)}});
  return{actions,combined:amount([...combined])};
}

// Fresh Shopify matches replace legacy prices for the same checkout. Action
// values remain product subtotals; shipping/tax totals belong in the table.
export function linkedAbandoned(legacy:AbandonedSnapshot|null,records:{recordHash:string;sessionId?:string;subtotalCents:number|null;recovered?:boolean}[],currency:string):AbandonedSnapshot|null {
  // Legacy demo snapshots support USD only.
  if(currency!=='USD')return legacy;
  const native=records.filter(row=>row.sessionId&&Number.isSafeInteger(row.subtotalCents)&&row.subtotalCents!==null&&row.subtotalCents>=0).map(row=>({recordHash:row.recordHash,sessionId:row.sessionId!,subtotalCents:row.subtotalCents!,recovered:!!row.recovered,currency:'USD' as const}));
  const currentIds=new Set(native.map(row=>row.sessionId));
  return {...(legacy??{importedOn:'',emailSent:0,emailNotSent:0}),records:[...(legacy?.records??[]).filter(row=>!row.sessionId||!currentIds.has(row.sessionId)),...native]};
}
