// Incremental scans overlap so late indexing/retries do not create a gap.
// Reconciliation re-reads the reporting window; absence never deletes a record.
export const NATIVE_POLL_MS=60000, NATIVE_OVERLAP_MS=60*60000, NATIVE_RECONCILE_MS=6*60*60000;
export type NativeMode='backfill'|'incremental'|'reconcile';
export function nativePlan(now:number,periodStart:string,base:{startedAt:number;periodStart:string;lastFullAt?:number}|null){
 if(!base)return {mode:'backfill' as NativeMode,filterStart:periodStart};
 if(Date.parse(periodStart)<Date.parse(base.periodStart)||!base.lastFullAt||now-base.lastFullAt>=NATIVE_RECONCILE_MS)return {mode:'reconcile' as NativeMode,filterStart:periodStart};
 return {mode:'incremental' as NativeMode,filterStart:new Date(Math.max(0,base.startedAt-NATIVE_OVERLAP_MS)).toISOString()};
}
export function nativeFilter(mode:NativeMode,start:string,end:number){
 if(!Number.isFinite(Date.parse(start))||!Number.isFinite(end)||Date.parse(start)>end)throw Error('Invalid sync bounds.');
 const field=mode==='incremental'?'updated_at':'created_at';
 return `${field}:>="${start}" ${field}:<="${new Date(end).toISOString()}"`;
}
export function nativeVersionDecision(old:{sourceUpdatedAt:number;row:unknown}|null,next:{sourceUpdatedAt:number;row:unknown}){
 if(!Number.isFinite(next.sourceUpdatedAt)||next.sourceUpdatedAt<0)throw Error('Invalid Shopify update timestamp.');
 if(!old)return 'insert';
 if(next.sourceUpdatedAt<old.sourceUpdatedAt)return 'ignore';
 if(next.sourceUpdatedAt>old.sourceUpdatedAt)return 'update';
 const canonical=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
 if(canonical(old.row)!==canonical(next.row)){
  // A persisted, verified identity can arrive independently of Shopify's
  // updatedAt. Allow only additive identity enrichment at the same source
  // version; all source facts and existing identities must remain identical.
  const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
  if(object(old.row)&&object(next.row)){
   const previous={...old.row},incoming={...next.row};let enriched=false;
   for(const key of ['sessionId','orderId','orderName']){
    if(previous[key]===undefined&&typeof incoming[key]==='string'&&incoming[key].length){
     delete incoming[key];enriched=true;
    }
   }
   if(enriched&&canonical(previous)===canonical(incoming))return 'update';
  }
  throw Error('Conflicting Shopify record versions.');
 }
 return 'ignore';
}
