import type {QueryCtx,MutationCtx} from './_generated/server';
import type {Doc,Id} from './_generated/dataModel';
import {STORE} from '../shared/evidence';
import {ReportLimit} from '../shared/capacity';
import {nativeVersionDecision} from '../shared/nativeSync';

// Immutable published versions + a job publication pointer provide consistent
// paginated reads. Failed/unpublished jobs can never leak into a later report.
export function versionBudget(){return {rows:0,bytes:0};}
export async function publishedVersion(ctx:QueryCtx,head:Id<'shopifyNativeHeads'>,pinned:Doc<'shopifySyncJobs'>,budget=versionBudget()){
 const versions=await ctx.db.query('shopifyNativeVersions').withIndex('by_head_updated',q=>q.eq('head',head)).order('desc').take(128);
 budget.rows+=versions.length;budget.bytes+=new TextEncoder().encode(JSON.stringify(versions)).length;
 if(budget.rows>4096||budget.bytes>2*1024*1024)throw new ReportLimit();
 for(const version of versions){
  if(version.revision>pinned.startedAt||version.currency!==pinned.currency)continue;
  const job=await ctx.db.get(version.job);
 if(job?.status==='published'&&job.canonical&&job.store===STORE&&job.connectedAt===pinned.connectedAt&&job.currency===pinned.currency&&job.timeZone===pinned.timeZone)return version;
 }
 // A bounded read must fail rather than silently lose an older visible version.
 if(versions.length===128)throw new ReportLimit();
 return null;
}
export async function stageNative(ctx:MutationCtx,job:Doc<'shopifySyncJobs'>,kind:'orders'|'abandoned',row:Doc<'shopifySyncRows'>['row'],sourceUpdatedAt:number,budget=versionBudget()){
 let head=await ctx.db.query('shopifyNativeHeads').withIndex('by_install_kind_hash',q=>q.eq('store',STORE).eq('connectedAt',job.connectedAt).eq('kind',kind).eq('recordHash',row.recordHash)).unique();
 if(head&&head.createdAt!==row.createdAt)throw Error('Shopify record creation changed.');
 const base=job.baseGeneration?await ctx.db.get(job.baseGeneration):null;
 const old=head&&base?await publishedVersion(ctx,head._id,base,budget):null;
 const pending=head?await ctx.db.query('shopifyNativeVersions').withIndex('by_job_head',q=>q.eq('job',job._id).eq('head',head!._id)).unique():null;
 const comparison=pending??old;
 // The pending version may already contain verified links during initial
 // import, before a published base exists. Preserve each optional identity.
 const known=comparison?.row;
 const merged={...row};
 for(const key of ['sessionId','orderName','orderId'] as const){
  const previous=known&&key in known?(known as Record<string,unknown>)[key]:undefined;
  const incoming=key in row?(row as Record<string,unknown>)[key]:undefined;
  if(previous&&incoming&&previous!==incoming&&sourceUpdatedAt>=comparison!.sourceUpdatedAt)throw Error('Conflicting Shopify record identity.');
  if(previous&&!incoming)Object.assign(merged,{[key]:previous});
 }
 const decision=nativeVersionDecision(comparison,{sourceUpdatedAt,row:merged});
 if(decision==='ignore')return false;
 if(!head){const id=await ctx.db.insert('shopifyNativeHeads',{store:STORE,connectedAt:job.connectedAt,kind,recordHash:row.recordHash,createdAt:row.createdAt});head=(await ctx.db.get(id))!;}
 const version={head:head._id,job:job._id,revision:job.startedAt,currency:job.currency,sourceUpdatedAt,row:merged};
 if(pending)await ctx.db.replace(pending._id,version);else await ctx.db.insert('shopifyNativeVersions',version);
 return !old&&!pending;
}
