import {internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {readCheckoutLinks, matchCheckoutLinks} from './lib/checkoutMatching';
import type {AbandonedSnapshot} from '../shared/abandoned';

// Owner-run only: no public HTTP route, browser credentials, or scheduled sync.
export const run = internalAction({
  args: {dryRun: v.optional(v.boolean())},
  returns: v.object({status: v.union(v.literal('not_configured'), v.literal('preview'), v.literal('updated')), added: v.number(), matched: v.number(), unmatched: v.number()}),
  handler: async (ctx, {dryRun = true}): Promise<{status: 'not_configured' | 'preview' | 'updated'; added: number; matched: number; unmatched: number}> => {
    const snapshot: AbandonedSnapshot | null = await ctx.runQuery(internal.abandoned.read, {});
    if (!snapshot) throw Error('Import the demo abandoned snapshot first');
    const matched = snapshot.records.filter(record => record.sessionId).length;
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!token) return {status: 'not_configured', added: 0, matched, unmatched: snapshot.records.length - matched};
    const links = await readCheckoutLinks(token);
    const result = matchCheckoutLinks(snapshot, links, await ctx.runQuery(internal.events.matchableSessions, {}));
    if (!dryRun) {
      const saved = await ctx.runMutation(internal.abandoned.applyVerifiedLinks, {links});
      return {status: 'updated', ...saved};
    }
    return {status: dryRun ? 'preview' : 'updated', added: result.added, matched: result.matched, unmatched: result.unmatched};
  },
});
