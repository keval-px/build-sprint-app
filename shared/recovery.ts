// Recovery is a conditional estimate of additional purchases after a specific fix.
// Basket exposure, email sends, and checklist completion are not recovered revenue.
export type RecoveryMechanism = 'functional' | 'expectation' | 'friction' | 'unconfirmed';
export interface RecoveryBaseline {
  comparable: boolean;
  checkouts: number;
  completed: number;
  // For expectation/friction cases, use a measured same-scenario intervention.
  beforeCompleted?: number;
  beforeCheckouts?: number;
}
function proportionBounds(completed:number,total:number){
  const z=1.96,p=completed/total,den=1+z*z/total;
  const center=(p+z*z/(2*total))/den;
  const margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
  return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}
export function estimateRecovery(input:{mechanism:RecoveryMechanism;confirmedCause:boolean;basketCents:number;pricedBaskets:number;baseline?:RecoveryBaseline;testData?:boolean;projection?:{basis:'comparable-future-checkouts';period:string;adjustedBasketCents:number}}){
  const unavailable=(reason:string)=>({cents:null as number|null,reason,rate:null as number|null,lowerCents:null as number|null,upperCents:null as number|null});
  if(input.testData)return unavailable('Real customer completion data needed');
  if(!Number.isSafeInteger(input.pricedBaskets)||input.pricedBaskets<=0||!Number.isSafeInteger(input.basketCents)||input.basketCents<0)return unavailable('Basket values are needed');
  if(!input.confirmedCause||input.mechanism==='unconfirmed')return unavailable('Confirm the cause first');
  const projection=input.projection;
  // Historical unfinished baskets do not imply departed buyers will return.
  if(!projection||projection.basis!=='comparable-future-checkouts'||!projection.period.trim()||!Number.isSafeInteger(projection.adjustedBasketCents)||projection.adjustedBasketCents<0)return unavailable('Define comparable future volume and post-fix basket values');
  const b=input.baseline;
  const valid=(completed:number,total:number)=>Number.isSafeInteger(total)&&total>=30&&Number.isSafeInteger(completed)&&completed>=0&&completed<=total;
  if(!b?.comparable||!valid(b.completed,b.checkouts))return unavailable('Completion rates from similar checkouts needed');
  let rate=b.completed/b.checkouts;
  let bounds=proportionBounds(b.completed,b.checkouts);
  if(input.mechanism!=='functional'){
    if(b.beforeCheckouts===undefined||b.beforeCompleted===undefined||!valid(b.beforeCompleted,b.beforeCheckouts))return unavailable('A measured response to this fix is needed');
    const before=b.beforeCompleted/b.beforeCheckouts,old=proportionBounds(b.beforeCompleted,b.beforeCheckouts);
    if(bounds.low<=old.high)return unavailable('The measured change is still uncertain');
    rate=before===1?0:Math.max(0,(rate-before)/(1-before));
    bounds={low:Math.max(0,(bounds.low-old.high)/(1-old.low)),high:old.high===1?1:Math.min(1,(bounds.high-old.low)/(1-old.high))};
  }
  const value=projection.adjustedBasketCents;
  return {cents:Math.round(value*Math.min(1,rate)),rate,lowerCents:Math.round(value*bounds.low),upperCents:Math.round(value*bounds.high),reason:`Conditional estimate for ${projection.period} of comparable future checkouts; not past buyers recaptured`};
}

export const RECOVERY_CASES = [
  {id:'shipping-unavailable',title:'Shipping options unavailable',mechanism:'functional' as const,psychology:'The customer cannot buy, even if they want to.',signal:'Delivery alerts and missing shipping progress. Reproduce a checkout with no eligible shipping option before calling this a blocker.',action:'Check delivery zones, product profiles, inventory locations, and the rate provider. Retest the same address and basket.',estimate:'Use comparable shipping-stage completion after confirming the blocker. Restoring an option can unlock purchases; it does not recover every basket.'},
  {id:'shipping-cost',title:'Unexpected shipping cost or delivery date',mechanism:'expectation' as const,psychology:'The final cost or promised arrival no longer matches the customer’s expectations.',signal:'Delivery choices and outcomes need additional evidence. A delivery alert alone does not prove price sensitivity.',action:'Make costs and delivery promises clear before checkout. Test a change against similar baskets.',estimate:'Use measured improvement from the same pricing or delivery change, accounting for shipping subsidies.'},
  {id:'discount-rejected',title:'Discount repeatedly rejected',mechanism:'expectation' as const,psychology:'A promised saving fails, so the customer may feel misled or unwilling to pay the full price.',signal:'Repeated discount alerts followed by no purchase. Alerts can also concern gift cards; they do not prove the same code was retried.',action:'Check advertised code dates, eligibility, combinations, and minimum spend. Correct the promise or configuration and retest.',estimate:'Use the completion lift from fixing that promotion. A discount reduces collected revenue and may reduce margin.'},
  {id:'payment-blocked',title:'Payment failure',mechanism:'functional' as const,psychology:'A customer ready to pay cannot finish. Repeated failures can undermine trust.',signal:'Payment alerts before completion. A bank decline is different from a broken gateway or unavailable payment option.',action:'Reproduce safely, check provider health and payment settings, and test an alternative method.',estimate:'Use comparable payment-stage completion only after confirming a merchant-fixable blocker. Do not count every decline as recoverable.'},
  {id:'form-validation',title:'Form validation blocks progress',mechanism:'friction' as const,psychology:'Customers may correct a mistake and continue; repeated unexplained errors can make them give up.',signal:'Validation alerts followed by missing progress. Exact field, rule, and visible message must be verified.',action:'Reproduce the field error, check required inputs and autofill, and explain how to correct it.',estimate:'Use measured improvement for the specific rule or field change, rather than assuming every alert loses a purchase.'},
  {id:'inventory',title:'Item unavailable at checkout',mechanism:'functional' as const,psychology:'The customer reaches checkout and discovers the item cannot be bought.',signal:'Shopify inventory or merchandise alerts are collected separately from shipping. Check stock, selling restrictions and fulfilment availability before choosing a fix.',action:'Check inventory and sales-channel availability. Offer an available alternative only when appropriate.',estimate:'Restock or substitution needs its own comparable purchase evidence; unavailable stock cannot be treated as guaranteed revenue.'},
  {id:'extension',title:'Checkout extension failure',mechanism:'functional' as const,psychology:'A broken element may block progress or make checkout feel unreliable.',signal:'Checkout extension error reports plus a reproduced customer-visible effect. This event is not yet collected; render errors alone do not prove blocked checkout.',action:'Check extension logs and reproduce the affected checkout. Disable or fix the faulty element only after confirming its effect.',estimate:'After verifying a blocker, use normal completion for the affected stage and comparable future traffic.'},
  {id:'ordinary-unfinished',title:'Checkout left unfinished',mechanism:'unconfirmed' as const,psychology:'Customers can compare prices, postpone a decision, or leave for reasons unrelated to checkout.',signal:'No completion event is recorded. Consent or missing activity can produce the same observation.',action:'Look for a repeated, verified obstacle before recommending a fix.',estimate:'No fix-based recovery estimate without a specific issue and comparable evidence.'},
] as const;
