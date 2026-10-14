import type {OutcomeFacts} from './checkoutOutcome.ts';
import {appDisplayName} from './extensionApp.ts';
import {buildMissions,type Mission} from './actions.ts';
import {summarize,type CheckoutEvent} from './evidence.ts';

// A category count is not an incident. Without eligibility, provider cause or
// a comparable merchant baseline, ordinary alerts stay in session details.
// Repeated shipping blockers and same-app rendering failures qualify
// for investigation. This is not a claim of an outage or an abnormal spike.
export function buildRecommendations(events:CheckoutEvent[],facts:OutcomeFacts={}):Mission[] {
  const journeys=summarize(events,facts).journeys;
  events=journeys.flatMap(j=>j.events);
  const blocked=journeys.filter(j=>{
    if(j.outcome.serverCompleted)return false;
    const blockers=j.events.filter(e=>e.category==='delivery'&&e.shippingBlocker==='no_shipping_available');
    if(!blockers.length)return false;
    const last=Math.max(...blockers.map(e=>e.timestamp));
    // A completion recorded at the same moment still means the checkout completed.
    return !j.events.some(e=>e.name==='checkout_completed'&&e.timestamp>=last);
  }).map(j=>j.id);
  const results:Mission[]=[];
  const rejected=new Map<string,Set<string>>();
  for(const journey of journeys.filter(j=>!j.outcome.serverCompleted))for(const error of journey.events.filter(e=>e.discountOfferCode)){
    if(journey.events.some(e=>e.name==='checkout_completed'&&e.timestamp>=error.timestamp))continue;
    const ids=rejected.get(error.discountOfferCode!)??new Set<string>();ids.add(journey.id);rejected.set(error.discountOfferCode!,ids);
  }
  const codes=[...rejected].filter(([,ids])=>ids.size>=2).map(([code])=>code).sort();
  const discountIds=[...new Set(codes.flatMap(code=>[...rejected.get(code)!]))];
  if(discountIds.length)results.push({...buildMissions(events,facts).find(m=>m.id==='discount')!,count:discountIds.length,sessionIds:discountIds,discountCodes:codes,title:`Promised discount rejected: ${codes.join(', ')}`,
    description:`We recorded rejections of ${codes.join(', ')} in ${discountIds.length} checkouts, with no later purchase recorded. This does not confirm that those baskets met the offer’s terms.`,
    next:`Try ${codes.join(', ')} on a basket that meets the promised terms. Check the code’s dates, minimum spend, eligible products and customer rules. If the valid offer is rejected, correct the mismatch and test it again.`});
  // Require the same app in two distinct unfinished checkout sessions.
  const apps=new Map<string,Set<string>>();
  for(const journey of journeys.filter(j=>!j.outcome.serverCompleted)){
    for(const error of journey.events.filter(e=>e.name==='ui_extension_errored'&&e.extensionAppHash)){
      if(journey.events.some(e=>e.name==='checkout_completed'&&e.timestamp>=error.timestamp))continue;
      const ids=apps.get(error.extensionAppHash!)??new Set<string>();
      ids.add(journey.id);apps.set(error.extensionAppHash!,ids);
    }
  }
  const appIds=[...new Set([...apps.values()].filter(ids=>ids.size>=2).flatMap(ids=>[...ids]))];
  if(appIds.length){
    const qualifying=new Set([...apps].filter(([,ids])=>ids.size>=2).map(([hash])=>hash));
    const namesByApp=new Map<string,string>();
    for(const event of [...events].sort((a,b)=>a.timestamp-b.timestamp)){
      const name=appDisplayName(event.extensionAppName);
      if(event.extensionAppHash&&qualifying.has(event.extensionAppHash)&&name)namesByApp.set(event.extensionAppHash,name);
    }
    const appNames=[...new Set(namesByApp.values())].sort();
    const named=qualifying.size===1&&appNames.length===1;
    results.push({...buildMissions(events,facts).find(m=>m.id==='extension')!,count:appIds.length,sessionIds:appIds,appNames,
      title:named?`${appNames[0]} failed to load`:'Checkout apps failed to load',
      description:`We recorded checkout app errors in ${appIds.length} checkouts, with no later purchase recorded. Each flagged app failed in at least two checkouts; this does not confirm it blocked payment.`,
      ...(appNames.length?{next:`Open checkout settings and check ${appNames.join(', ')}. Retry an affected checkout. If the app still fails, contact its provider before deciding whether to remove it.`}:{})});
  }
  // Two different checkout identities, not repeated retries by one shopper.
  if(blocked.length<2)return results;
  const mission=buildMissions(events,facts).find(m=>m.id==='delivery')!;
  return [...results,{...mission,signal:'shipping_unavailable',title:'Shipping unavailable',count:blocked.length,sessionIds:blocked,
    description:`We recorded “shipping unavailable” in ${blocked.length} checkouts, with no later purchase recorded. This does not confirm that those baskets should have been eligible for shipping.`,
  }];
}
