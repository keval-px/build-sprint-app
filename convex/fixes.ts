import type {MutationCtx} from './_generated/server';
import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {fixCounts} from './schema';
import {isFixMission} from '../shared/fixTracking';
async function archiveMarker(ctx:MutationCtx,row:{scope:string;missionId:string;appliedAt:number;baseline:{checkouts:number;affected:number;completed:number};affectedIds:string[];partial:boolean;active:boolean;retestedAt?:number;withdrawnAt?:number}){
 const old=await ctx.db.query('actionFixHistory').withIndex('by_scope',q=>q.eq('scope',row.scope)).filter(q=>q.and(q.eq(q.field('missionId'),row.missionId),q.eq(q.field('appliedAt'),row.appliedAt))).unique();
 if(old)await ctx.db.patch(old._id,row);
 else{
  if((await ctx.db.query('actionFixHistory').take(10001)).length>=10000)throw Error('Fix history storage is full.');
  await ctx.db.insert('actionFixHistory',row);
 }
}
export const history=internalMutation({args:{scope:v.string()},handler:async(ctx,{scope})=>{
 const current=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',scope)).collect();
 for(const {_id,_creationTime,...row} of current){
  const saved=await ctx.db.query('actionFixHistory').withIndex('by_scope',q=>q.eq('scope',scope)).filter(q=>q.and(q.eq(q.field('missionId'),row.missionId),q.eq(q.field('appliedAt'),row.appliedAt))).unique();
  if(!saved)await archiveMarker(ctx,row);
 }
 const rows=await ctx.db.query('actionFixHistory').withIndex('by_scope',q=>q.eq('scope',scope)).order('desc').take(100);
 return rows.map(({_id,_creationTime,scope,...row})=>row);
}});
export const read=internalQuery({args:{scope:v.string()},handler:async(ctx,{scope})=>{
 const rows=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',scope)).collect();
 return rows.filter(r=>r.active).map(({missionId,appliedAt,baseline,affectedIds,partial,retestedAt})=>({missionId,appliedAt,baseline,affectedIds,partial,...(retestedAt===undefined?{}:{retestedAt})}));
}});
export const mark=internalMutation({args:{scope:v.string(),missionId:v.string(),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean()},handler:async(ctx,args)=>{
 if(!isFixMission(args.missionId)||args.affectedIds.length>1000)throw Error('Invalid fix marker.');
 const row=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',args.scope)).filter(q=>q.eq(q.field('missionId'),args.missionId)).unique();
 // Repeated clicks retain the original baseline and time.
 if(args.active&&row?.active)return;
 if(!args.active){if(row){const {_id,_creationTime,...old}=row;await archiveMarker(ctx,{...old,active:false,withdrawnAt:Date.now()});await ctx.db.patch(row._id,{active:false});}return;}
 if(row){const {_id,_creationTime,...old}=row;await archiveMarker(ctx,old);await ctx.db.patch(row._id,{...args,retestedAt:undefined});}
 else {if((await ctx.db.query('actionFixes').take(6000)).length>=6000)throw Error('Fix storage is full.');await ctx.db.insert('actionFixes',args);}
 await archiveMarker(ctx,args);
}});
export const retest=internalMutation({args:{scope:v.string(),missionId:v.string(),passed:v.boolean()},handler:async(ctx,args)=>{
 if(!isFixMission(args.missionId)||args.missionId==='unfinished')throw Error('Invalid retest action.');
 const row=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',args.scope)).filter(q=>q.eq(q.field('missionId'),args.missionId)).unique();
 if(!row?.active)throw Error('Apply a fix marker first.');
 const retestedAt=args.passed?Date.now():undefined;
 await ctx.db.patch(row._id,{retestedAt});
 const {_id,_creationTime,...old}=row;await archiveMarker(ctx,{...old,retestedAt});
}});
