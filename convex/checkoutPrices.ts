import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {checkoutPriceFields} from './schema';
import {shouldSaveCheckoutPrice} from '../shared/checkoutPrice';
export const save=internalMutation({args:{price:v.object(checkoutPriceFields),triggeredAt:v.number()},handler:async(ctx,{price,triggeredAt})=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!connection||!connection.scopes.includes('read_orders')||state&&triggeredAt<=state.revokedAt)return;
 const old=await ctx.db.query('shopifyCheckoutPrices').withIndex('by_store_session',q=>q.eq('store',STORE).eq('sessionId',price.sessionId)).unique();
 if(!shouldSaveCheckoutPrice(old,price))return;
 if(old)await ctx.db.replace(old._id,{...price,store:STORE});else await ctx.db.insert('shopifyCheckoutPrices',{...price,store:STORE});
}});
export const read=internalQuery({args:{},handler:async ctx=>{
 const rows=await ctx.db.query('shopifyCheckoutPrices').withIndex('by_store_created',q=>q.eq('store',STORE).gte('createdAt',new Date(Date.now()-30*86400000).toISOString())).take(5001);
 if(rows.length>5000)throw Error('Too many checkout prices. Narrow the reporting period.');
 return rows.map(({_id,_creationTime,store,...price})=>price);
}});
