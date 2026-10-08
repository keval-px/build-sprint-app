import {appDisplayName} from './extensionApp.ts';
import {buildMissions,type Mission} from './actions.ts';
import {summarize,type CheckoutEvent} from './evidence.ts';

// A category count is not an incident. Without eligibility, provider cause or
// a comparable merchant baseline, ordinary alerts stay in session details.
// Repeated shipping blockers and same-app rendering failures qualify
// for investigation. This is not a claim of an outage or an abnormal spike.
export function buildRecommendations(events:CheckoutEvent[]):Mission[] {
  const blocked=summarize(events).journeys.filter(j=>{
    const blockers=j.events.filter(e=>e.category==='delivery'&&e.shippingBlocker==='no_shipping_available');
    if(!blockers.length)return false;
    const last=Math.max(...blockers.map(e=>e.timestamp));
    return !j.events.some(e=>e.name==='checkout_completed'&&e.timestamp>last);
  }).map(j=>j.id);
  const results:Mission[]=[];
  const rejected=new Map<string,Set<string>>();
  for(const journey of summarize(events).journeys)for(const error of journey.events.filter(e=>e.discountOfferCode)){
    if(journey.events.some(e=>e.name==='checkout_completed'&&e.timestamp>error.timestamp))continue;
    const ids=rejected.get(error.discountOfferCode!)??new Set<string>();ids.add(journey.id);rejected.set(error.discountOfferCode!,ids);
  }
  const codes=[...rejected].filter(([,ids])=>ids.size>=2).map(([code])=>code).sort();
  const discountIds=[...new Set(codes.flatMap(code=>[...rejected.get(code)!]))];
  if(discountIds.length)results.push({...buildMissions(events).find(m=>m.id==='discount')!,count:discountIds.length,sessionIds:discountIds,discountCodes:codes,title:`Check promised discount ${codes.join(', ')}`,
    next:`Retry ${codes.join(', ')} on a basket that meets the promised terms. Check that the code is active and its dates, minimum spend, products and customer rules match the offer. Correct the mismatch, then retest.`});
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
  if(appIds.length){
    const qualifying=new Set([...apps].filter(([,ids])=>ids.size>=2).map(([hash])=>hash));
    const namesByApp=new Map<string,string>();
    for(const event of [...events].sort((a,b)=>a.timestamp-b.timestamp)){
      const name=appDisplayName(event.extensionAppName);
      if(event.extensionAppHash&&qualifying.has(event.extensionAppHash)&&name)namesByApp.set(event.extensionAppHash,name);
    }
    const appNames=[...new Set(namesByApp.values())].sort();
    const named=qualifying.size===1&&appNames.length===1;
    results.push({...buildMissions(events).find(m=>m.id==='extension')!,count:appIds.length,sessionIds:appIds,appNames,
      ...(named?{title:`Check ${appNames[0]} in checkout`}:{}),
      ...(appNames.length?{next:`Review ${appNames.join(', ')} in checkout settings. Retry an affected checkout and contact the app provider if it still fails. Remove it only after checking what it does.`}:{})});
  }
  // Two different checkout identities, not repeated retries by one shopper.
  if(blocked.length<2)return results;
  const mission=buildMissions(events).find(m=>m.id==='delivery')!;
  return [...results,{...mission,signal:'shipping_unavailable',title:'Check unavailable shipping',count:blocked.length,sessionIds:blocked,
    description:`${blocked.length} checkouts showed shipping unavailable with no later purchase recorded. Confirm these baskets should be eligible before changing shipping settings.`,
  }];
}
