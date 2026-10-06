export interface ObservedPurchases {
  store: 'build-sprint-demo.myshopify.com'; currency: 'USD'; source: 'shopify-admin-csv-test-orders';
  importedOn: string; periodStart: string; periodEnd: string; orderCount: number; totalProductCents: number;
  baskets: {label: string; orderCount: number; itemCount: number; totalProductCents: number}[];
}
export function observedAverageOrderValue(snapshot: ObservedPurchases) {
  if (snapshot.store !== 'build-sprint-demo.myshopify.com' || snapshot.currency !== 'USD' || snapshot.source !== 'shopify-admin-csv-test-orders') throw new Error('Unexpected purchase source.');
  const integer = (n:number) => Number.isSafeInteger(n) && n >= 0;
  if (!integer(snapshot.orderCount) || !snapshot.orderCount || !integer(snapshot.totalProductCents) || !snapshot.baskets.length
    || snapshot.baskets.some(b=>!integer(b.orderCount)||!b.orderCount||!integer(b.itemCount)||!b.itemCount||!integer(b.totalProductCents))
    || snapshot.baskets.reduce((sum,b)=>sum+b.orderCount,0)!==snapshot.orderCount
    || snapshot.baskets.reduce((sum,b)=>sum+b.totalProductCents,0)!==snapshot.totalProductCents) throw new Error('Purchase totals do not reconcile.');
  return Math.round(snapshot.totalProductCents/snapshot.orderCount);
}

export interface SyncedPurchase {
  subtotalCents: number | null; test: boolean; paid: boolean; cancelled: boolean;
}
export function syncedAverageOrderValue(orders: SyncedPurchase[]) {
  const eligible=orders.filter(order=>order.test&&order.paid&&!order.cancelled);
  const priced=eligible.filter(order=>Number.isSafeInteger(order.subtotalCents)&&order.subtotalCents!==null&&order.subtotalCents>=0);
  const totalProductCents=priced.reduce((sum,order)=>sum+order.subtotalCents!,0);
  if(!Number.isSafeInteger(totalProductCents))throw Error('Purchase total is too large.');
  return {orderCount:priced.length,unpricedCount:eligible.length-priced.length,totalProductCents,
    aovCents:priced.length?Math.round(totalProductCents/priced.length):null};
}
