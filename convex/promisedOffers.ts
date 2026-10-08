import {internalMutation} from './_generated/server';
import {v} from 'convex/values';
import {checkoutIdentity} from '../shared/checkoutIdentity';
import {STORE} from '../shared/evidence';
// Test-only registry of offers independently verified in the demo browser.
// Not a claim that any arbitrary rejected code should have applied.
export const registerDemoOffer=internalMutation({args:{code:v.string(),minimumCents:v.number(),startsAt:v.number(),endsAt:v.number(),verifiedAt:v.number()},handler:async(ctx,args)=>{
 if(!/^[A-Z0-9_-]{4,32}$/.test(args.code)||!Number.isSafeInteger(args.minimumCents)||args.minimumCents<0||!Number.isSafeInteger(args.startsAt)||!Number.isSafeInteger(args.endsAt)||args.endsAt<=args.startsAt||args.verifiedAt<args.startsAt||args.verifiedAt>args.endsAt)throw Error('Invalid verified offer.');
 const row={...args,store:STORE as typeof STORE,currency:'USD',codeHash:checkoutIdentity(`discount:${args.code}`),source:'demo-browser-verified-offer' as const};
 const old=await ctx.db.query('promisedDiscountOffers').withIndex('by_code',q=>q.eq('codeHash',row.codeHash)).unique();
 if(old)await ctx.db.replace(old._id,row);else await ctx.db.insert('promisedDiscountOffers',row);
}});
