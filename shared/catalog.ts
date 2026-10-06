import { observedAverageOrderValue } from "./purchases.ts";
import type { ObservedPurchases } from "./purchases.ts";
import { summarize } from './evidence.ts';
import type { CheckoutEvent } from './evidence.ts';
import type { Mission } from './actions.ts';

export interface CatalogModel {
  store: 'build-sprint-demo.myshopify.com'; currency: 'USD'; checkedOn: string; recoveryPercent: number;
  products: {id: string; name: string; handle: string; priceCents: number}[];
  baskets: {weight: number; items: {productId: string; quantity: number}[]}[];
}
// Public storefront prices inspected in Chrome on 6 October 2026.
// Basket weights are assumptions authorized by the user, never imported orders.
export const CATALOG_PLAN: CatalogModel = {
  store: 'build-sprint-demo.myshopify.com', currency: 'USD', checkedOn: '2026-10-06', recoveryPercent: 5,
  products: [
    {id:'hydrogen',name:'Hydrogen snowboard',handle:'the-collection-snowboard-hydrogen',priceCents:60000},
    {id:'complete',name:'Complete snowboard',handle:'the-complete-snowboard',priceCents:69995},
    {id:'managed',name:'Multi-managed snowboard',handle:'the-multi-managed-snowboard',priceCents:62995},
    {id:'location',name:'Multi-location snowboard',handle:'the-multi-location-snowboard',priceCents:72995},
    {id:'liquid',name:'Liquid snowboard',handle:'the-collection-snowboard-liquid',priceCents:74995},
    {id:'compare',name:'Compare at Price snowboard (sale)',handle:'the-compare-at-price-snowboard',priceCents:78595},
    {id:'video',name:'Videographer snowboard',handle:'the-videographer-snowboard',priceCents:88595},
    {id:'inventory',name:'Inventory Not Tracked snowboard',handle:'the-inventory-not-tracked-snowboard',priceCents:94995},
    {id:'oxygen',name:'Oxygen snowboard',handle:'the-collection-snowboard-oxygen',priceCents:102500},
    {id:'wax',name:'Standard ski wax (one-time)',handle:'selling-plans-ski-wax',priceCents:2495},
  ],
  baskets: [
    {weight:28,items:[{productId:'hydrogen',quantity:1}]},
    {weight:20,items:[{productId:'complete',quantity:1}]},
    {weight:10,items:[{productId:'managed',quantity:1}]},
    {weight:8,items:[{productId:'location',quantity:1}]},
    {weight:5,items:[{productId:'liquid',quantity:1}]},
    {weight:3,items:[{productId:'compare',quantity:1}]},
    {weight:3,items:[{productId:'video',quantity:1}]},
    {weight:2,items:[{productId:'inventory',quantity:1}]},
    {weight:1,items:[{productId:'oxygen',quantity:1}]},
    {weight:6,items:[{productId:'hydrogen',quantity:1},{productId:'wax',quantity:1}]},
    {weight:4,items:[{productId:'complete',quantity:1},{productId:'wax',quantity:1}]},
    {weight:2,items:[{productId:'liquid',quantity:1},{productId:'wax',quantity:1}]},
    {weight:3,items:[{productId:'hydrogen',quantity:1},{productId:'complete',quantity:1}]},
    {weight:2,items:[{productId:'hydrogen',quantity:1},{productId:'liquid',quantity:1}]},
    {weight:1,items:[{productId:'complete',quantity:1},{productId:'oxygen',quantity:1}]},
    {weight:1,items:[{productId:'hydrogen',quantity:1},{productId:'complete',quantity:1},{productId:'liquid',quantity:1}]},
    {weight:1,items:[{productId:'complete',quantity:1},{productId:'location',quantity:1},{productId:'video',quantity:1}]},
  ],
};
export function modelCatalog(model: CatalogModel) {
  if (model.baskets.reduce((sum,basket)=>sum+basket.weight,0) !== 100 || model.recoveryPercent < 0 || model.recoveryPercent > 100) throw new Error('Invalid basket weights or recovery assumption.');
  const products = new Map(model.products.map(product=>[product.id,product]));
  const baskets = model.baskets.map(basket=>{
    if (!Number.isInteger(basket.weight) || basket.weight <= 0 || !basket.items.length) throw new Error('Invalid basket mix.');
    let subtotalCents = 0;
    const label = basket.items.map(item=>{
      const product = products.get(item.productId);
      if (!product || !Number.isInteger(product.priceCents) || product.priceCents <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid product or quantity.');
      subtotalCents += product.priceCents * item.quantity;
      return `${item.quantity > 1 ? item.quantity + ' × ' : ''}${product.name}`;
    }).join(' + ');
    return {...basket,label,subtotalCents};
  });
  const modeledSalesCents = baskets.reduce((sum,basket)=>sum+basket.subtotalCents*basket.weight,0);
  return {baskets,modeledSalesCents,aovCents:Math.round(modeledSalesCents/100)};
}
export function estimateCatalogImpact(events: CheckoutEvent[], missions: Mission[], model: CatalogModel, observed?: ObservedPurchases | null) {
  const aovCents = observed ? observedAverageOrderValue(observed) : modelCatalog(model).aovCents;
  const unfinished = new Set(summarize(events).journeys.filter(session=>session.started&&!session.completed).map(session=>session.id));
  const combined = new Set<string>();
  const amounts = (count:number)=>({eligibleSessions:count,atRiskCents:count*aovCents,recoveryCents:Math.round(count*aovCents*model.recoveryPercent/100)});
  const actions = missions.map(mission=>{
    const ids=[...new Set(mission.sessionIds)].filter(id=>unfinished.has(id));
    ids.forEach(id=>combined.add(id));
    return {id:mission.id,...amounts(ids.length)};
  });
  return {aovCents,actions,combined:amounts(combined.size)};
}
