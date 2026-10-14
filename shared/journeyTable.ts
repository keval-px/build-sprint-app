import {sortJourneys} from './journeySort.ts';
interface TableRow {id:string;label:string;startedAt:number;basketCents?:number;completed:boolean;categories:string[];shippingBlocker:boolean}
export interface JourneyFilters {query:string;status:string;alert:string;shippingOnly:boolean;missionIds?:string[];findingIds?:string[];sort:string}
export function filterJourneyRows<T extends TableRow>(rows:T[],filters:JourneyFilters):T[]{
 const query=filters.query.trim().toLowerCase(),mission=filters.missionIds&&new Set(filters.missionIds),finding=filters.findingIds&&new Set(filters.findingIds);
 return sortJourneys(rows.filter(row=>
  (!mission||mission.has(row.id))&&(!finding||finding.has(row.id))&&
  (!query||row.id.toLowerCase().includes(query)||row.label.toLowerCase().includes(query))&&
  (filters.status==='all'||(filters.status==='completed'?row.completed:!row.completed))&&
  (!filters.shippingOnly||row.shippingBlocker)&&
  (filters.alert==='all'||(filters.alert==='any'?row.categories.length>0:filters.alert==='none'?row.categories.length===0:row.categories.includes(filters.alert)))
 ),filters.sort);
}
export function paginateRows<T>(rows:T[],requestedPage:number,size=24){
 if(!Number.isSafeInteger(size)||size<1)throw Error('Invalid page size');
 const pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.max(0,Math.min(Number.isSafeInteger(requestedPage)?requestedPage:0,pages-1)),start=page*size;
 return {page,pages,start,rows:rows.slice(start,start+size),label:rows.length?`${start+1}–${Math.min(start+size,rows.length)} of ${rows.length} · Page ${page+1}/${pages}`:'0 checkouts'};
}
// "Shipping unavailable" is a subset of shipping alerts; offer it only when it narrows the list.
export function blockerSameAsShipping(rows:TableRow[]){
 return rows.every(row=>row.shippingBlocker===row.categories.includes('delivery'));
}
// Quick issue chips for the rows matching the search and status: "All" first, then
// non-empty issues, largest first.
export function issueChips<T extends TableRow>(rows:T[],filters:{query:string;status:string},labels:Record<string,string>){
 const query=filters.query.trim().toLowerCase();
 const base=rows.filter(row=>(!query||row.id.toLowerCase().includes(query)||row.label.toLowerCase().includes(query))&&(filters.status==='all'||(filters.status==='completed'?row.completed:!row.completed)));
 const issues=[...Object.entries(labels).map(([id,label])=>({id,label,count:base.filter(row=>row.categories.includes(id)).length})),
  ...(blockerSameAsShipping(base)?[]:[{id:'shipping_blocker',label:'Shipping unavailable',count:base.filter(row=>row.shippingBlocker).length}])];
 return [{id:'all',label:'All',count:base.length},...issues.filter(c=>c.count).sort((a,b)=>b.count-a.count)];
}
