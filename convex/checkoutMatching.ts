import {internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import type {AbandonedSnapshot} from '../shared/abandoned';

// Owner-run only: no public HTTP route, browser credentials, or scheduled sync.
export const run = internalAction({
  args: {dryRun: v.optional(v.boolean())},
  returns: v.object({status: v.union(v.literal('not_configured'), v.literal('preview'), v.literal('updated')), added: v.number(), matched: v.number(), unmatched: v.number()}),
  handler: async (ctx, {dryRun = true}): Promise<{status: 'not_configured' | 'preview' | 'updated'; added: number; matched: number; unmatched: number}> => {
    const snapshot: AbandonedSnapshot | null = await ctx.runQuery(internal.abandoned.read, {});
    if (!snapshot) throw Error('Import the demo abandoned snapshot first');
    const matched = snapshot.records.filter(record => record.sessionId).length;
    // Retired compatibility command: no REST calls or new historical guesses.
    return {status: 'not_configured', added: 0, matched, unmatched: snapshot.records.length - matched};
  },
});
