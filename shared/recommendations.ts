import {buildMissions,type Mission} from './actions.ts';
import {summarize,type CheckoutEvent} from './evidence.ts';

// A category count is not an incident. Without eligibility, provider cause or
// a comparable merchant baseline, ordinary alerts stay in session details.
// Currently only repeated, directly observed shipping unavailability qualifies
// for investigation. This is not a claim of an outage or an abnormal spike.
export function buildRecommendations(events:CheckoutEvent[]):Mission[] {
  const blocked=summarize(events).journeys.filter(j=>{
    const blockers=j.events.filter(e=>e.category==='delivery'&&e.shippingBlocker==='no_shipping_available');
    if(!blockers.length)return false;
    const last=Math.max(...blockers.map(e=>e.timestamp));
    return !j.events.some(e=>e.name==='checkout_completed'&&e.timestamp>last);
  }).map(j=>j.id);
  // Two different checkout identities, not repeated retries by one shopper.
  if(blocked.length<2)return [];
  const mission=buildMissions(events).find(m=>m.id==='delivery')!;
  return [{...mission,title:'Check unavailable shipping',count:blocked.length,sessionIds:blocked,
    description:`${blocked.length} checkouts showed shipping unavailable with no later purchase recorded. Confirm these baskets should be eligible before changing shipping settings.`,
  }];
}
