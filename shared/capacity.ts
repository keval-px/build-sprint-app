import type {PaginationResult} from 'convex/server';
// Logical retention only. No record is deleted by the reporting pipeline.
export const REPORT_WINDOW_MS=45*86400000;
export const REPORT_BYTES=8*1024*1024;
export const PAGE_SIZE=200;
export class ReportLimit extends Error {constructor(){super('Reporting exceeds the safe payload budget. Previous results are retained.');}}
type ReportPage<T>=Pick<PaginationResult<T>,'page'|'isDone'|'continueCursor'|'pageStatus'|'splitCursor'>;
export function reportJSON(value:unknown,budget=REPORT_BYTES){
 const json=JSON.stringify(value);if(new TextEncoder().encode(json).length>budget)throw new ReportLimit();return json;
}
export async function readPages<T>(read:(cursor:string|null)=>Promise<ReportPage<T>>,budget=REPORT_BYTES):Promise<T[]> {
 const result:T[]=[],seen=new Set<string>();let cursor:string|null=null,bytes=0;
 for(let pages=0;pages<500;pages++){
  const next=await read(cursor);
  // SplitRequired may contain an incomplete (cursor,continueCursor] range,
  // even with isDone=true. Do not append or publish it. Recommended splits
  // still contain a complete page and can continue normally.
  if(next.pageStatus==='SplitRequired')throw new ReportLimit();
  bytes+=new TextEncoder().encode(JSON.stringify(next.page)).length;
  if(bytes>budget)throw new ReportLimit();
  result.push(...next.page);
  if(next.isDone)return result;
  if(!next.continueCursor||seen.has(next.continueCursor))throw new ReportLimit();
  seen.add(next.continueCursor);cursor=next.continueCursor;
 }
 throw new ReportLimit();
}
export function collectionGap(state:{lastCapAt?:number;resumedAt?:number}|null,windowStart:number){
 return !!state?.lastCapAt&&(state.resumedAt===undefined||state.resumedAt>=windowStart);
}
// An empty filtered snapshot is not evidence of zero orders/baskets when its
// verified history starts after the requested period.
export function coversPeriod(periodStart:string,start:number){return Number.isFinite(Date.parse(periodStart))&&Date.parse(periodStart)<=start;}
