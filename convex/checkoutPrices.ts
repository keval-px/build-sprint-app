import {internalMutation} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {checkoutPriceFields} from './schema';
import {shouldSaveCheckoutPrice} from '../shared/checkoutPrice';
export const save=internalMutation({args:{price:v.object(checkoutPriceFields),triggeredAt:v.number()},handler:async(ctx,{price,triggeredAt})=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!connection||triggeredAt<connection.connectedAt||!connection.scopes.includes('read_orders')||state&&triggeredAt<=state.revokedAt)return;
 const old=await ctx.db.query('shopifyCheckoutPrices').withIndex('by_store_session',q=>q.eq('store',STORE).eq('sessionId',price.sessionId)).unique();
 if(!shouldSaveCheckoutPrice(old,price))return;
 if(old)await ctx.db.replace(old._id,{...price,store:STORE,receivedAt:Date.now()});else await ctx.db.insert('shopifyCheckoutPrices',{...price,store:STORE,receivedAt:Date.now()});
}});
