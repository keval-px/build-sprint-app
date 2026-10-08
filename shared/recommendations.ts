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
  const results:Mission[]=[];
  // Require the same app in two distinct unfinished checkout sessions.
  const apps=new Map<string,Set<string>>();
  for(const journey of summarize(events).journeys){
    for(const error of journey.events.filter(e=>e.name==='ui_extension_errored'&&e.extensionAppHash)){
      if(journey.events.some(e=>e.name==='checkout_completed'&&e.timestamp>error.timestamp))continue;
      const ids=apps.get(error.extensionAppHash!)??new Set<string>();
      ids.add(journey.id);apps.set(error.extensionAppHash!,ids);
    }
  }
  const appIds=[...new Set([...apps.values()].filter(ids=>ids.size>=2).flatMap(ids=>[...ids]))];
  if(appIds.length)results.push({...buildMissions(events).find(m=>m.id==='extension')!,count:appIds.length,sessionIds:appIds});
  // Two different checkout identities, not repeated retries by one shopper.
  if(blocked.length<2)return results;
  const mission=buildMissions(events).find(m=>m.id==='delivery')!;
  return [...results,{...mission,signal:'shipping_unavailable',title:'Check unavailable shipping',count:blocked.length,sessionIds:blocked,
    description:`${blocked.length} checkouts showed shipping unavailable with no later purchase recorded. Confirm these baskets should be eligible before changing shipping settings.`,
  }];
}
