export interface CompletedOrder {
 recordHash:string;createdAt:string;paid:boolean;cancelled:boolean;
 subtotalCents:number|null;totalCents?:number|null;
}
export function completedSummary(records:CompletedOrder[],start:number,end:number){
 const seen=new Set<string>();
 const orders=records.filter(row=>{
  const at=Date.parse(row.createdAt);
  if(!row.paid||row.cancelled||!Number.isFinite(at)||at<start||at>=end||seen.has(row.recordHash))return false;
  seen.add(row.recordHash);return true;
 });
 const values=orders.map(row=>row.totalCents===undefined?row.subtotalCents:row.totalCents);
 const priced=values.filter((value):value is number=>value!==null&&Number.isSafeInteger(value)&&value>=0);
 const sum=priced.reduce((total,value)=>total+value,0);
 const totalCents=priced.length===orders.length&&Number.isSafeInteger(sum)?sum:null;
 return {count:orders.length,totalCents,averageCents:orders.length&&totalCents!==null?Math.round(totalCents/orders.length):null};
}
