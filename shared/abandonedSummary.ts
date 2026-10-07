export interface AbandonedBasket {createdAt:string;subtotalCents:number|null;recovered:boolean}
export function abandonedSummary(records:AbandonedBasket[],start:number,end:number){
  const baskets=records.filter(row=>!row.recovered&&Date.parse(row.createdAt)>=start&&Date.parse(row.createdAt)<end);
  const priced=baskets.filter(row=>Number.isSafeInteger(row.subtotalCents)&&row.subtotalCents!==null&&row.subtotalCents>=0);
  const sum=priced.reduce((total,row)=>total+row.subtotalCents!,0);
  const totalCents=priced.length===baskets.length&&Number.isSafeInteger(sum)?sum:null;
  return {count:baskets.length,totalCents,averageCents:baskets.length&&totalCents!==null?Math.round(totalCents/baskets.length):null,unpricedCount:baskets.length-priced.length,rangeStart:start,rangeEnd:end};
}
