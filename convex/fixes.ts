import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {fixCounts} from './schema';
import {isFixMission} from '../shared/fixTracking';
export const read=internalQuery({args:{scope:v.string()},handler:async(ctx,{scope})=>{
 const rows=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',scope)).collect();
 return rows.filter(r=>r.active).map(({missionId,appliedAt,baseline,affectedIds,partial,retestedAt})=>({missionId,appliedAt,baseline,affectedIds,partial,...(retestedAt===undefined?{}:{retestedAt})}));
}});
export const mark=internalMutation({args:{scope:v.string(),missionId:v.string(),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean()},handler:async(ctx,args)=>{
 if(!isFixMission(args.missionId)||args.affectedIds.length>1000)throw Error('Invalid fix marker.');
 const row=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',args.scope)).filter(q=>q.eq(q.field('missionId'),args.missionId)).unique();
 // Repeated clicks retain the original baseline and time.
 if(args.active&&row?.active)return;
 if(!args.active){if(row)await ctx.db.patch(row._id,{active:false});return;}
 if(row)await ctx.db.patch(row._id,{...args,retestedAt:undefined});
 else {if((await ctx.db.query('actionFixes').take(6000)).length>=6000)throw Error('Fix storage is full.');await ctx.db.insert('actionFixes',args);}
}});
export const retest=internalMutation({args:{scope:v.string(),missionId:v.string(),passed:v.boolean()},handler:async(ctx,args)=>{
 if(!isFixMission(args.missionId)||args.missionId==='unfinished')throw Error('Invalid retest action.');
 const row=await ctx.db.query('actionFixes').withIndex('by_scope',q=>q.eq('scope',args.scope)).filter(q=>q.eq(q.field('missionId'),args.missionId)).unique();
 if(!row?.active)throw Error('Apply a fix marker first.');
 await ctx.db.patch(row._id,{retestedAt:args.passed?Date.now():undefined});
}});
