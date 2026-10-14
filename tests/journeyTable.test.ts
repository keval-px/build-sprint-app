import test from 'node:test';import assert from 'node:assert/strict';
import {filterJourneyRows,paginateRows,type JourneyFilters} from '../shared/journeyTable.ts';
const filters:JourneyFilters={query:'',status:'all',alert:'all',shippingOnly:false,sort:'newest'};
const rows=Array.from({length:78},(_,i)=>({id:`checkout-${i}`,label:i===3?'#1003':`#${i}`,startedAt:i,basketCents:i===0?undefined:i*100,completed:i<24,categories:i%2?['validation']:[],shippingBlocker:i===24||i===25}));
test('24 rows per page have complete, nonoverlapping ranges, including last and empty pages',()=>{
 assert.equal(paginateRows(rows,0).label,'1–24 of 78 · Page 1/4');
 assert.equal(paginateRows(rows,3).label,'73–78 of 78 · Page 4/4');
 assert.equal(paginateRows(rows,99).page,3);assert.equal(paginateRows(rows,-1).page,0);
 assert.equal(new Set([0,1,2,3].flatMap(p=>paginateRows(rows,p).rows.map(r=>r.id))).size,78);
 assert.equal(paginateRows([],9).label,'0 checkouts');assert.equal(paginateRows(rows.slice(0,24),1).page,0);
});
test('search, completion, category and exact finding filters intersect correctly',()=>{
 assert.deepEqual(filterJourneyRows(rows,{...filters,query:' #1003 '}).map(r=>r.id),['checkout-3']);
 assert.equal(filterJourneyRows(rows,{...filters,status:'completed',alert:'validation'}).length,12);
 assert.deepEqual(filterJourneyRows(rows,{...filters,shippingOnly:true}).map(r=>r.id),['checkout-25','checkout-24']);
 assert.deepEqual(filterJourneyRows(rows,{...filters,findingIds:['checkout-3','checkout-24'],status:'unfinished'}).map(r=>r.id),['checkout-24']);
 assert.equal(filterJourneyRows(rows,{...filters,findingIds:[]}).length,0);
 assert.equal(filterJourneyRows(rows,{...filters,alert:'none'}).length,39);
 assert.equal(filterJourneyRows(rows,{...filters,sort:'value-low'}).at(-1)?.id,'checkout-0');
});
test('issue chips follow search and status, hide empty issues, sort by size and drop a duplicate shipping chip',async()=>{
 const {issueChips}=await import('../shared/journeyTable.ts');
 const row=(id:string,completed:boolean,categories:string[],shippingBlocker=false)=>({id,label:`#${id}`,startedAt:1,completed,categories,shippingBlocker});
 const labels={payment:'Payment alerts',delivery:'Shipping alerts',validation:'Form errors'};
 const rows=[row('a',false,['payment']),row('b',false,['delivery'],true),row('c',true,['delivery'],true),row('d',false,['payment','validation'])];
 assert.deepEqual(issueChips(rows,{query:'',status:'all'},labels).map(c=>`${c.id}:${c.count}`),['all:4','payment:2','delivery:2','validation:1'],'every shipping alert is a blocker, so no separate chip');
 assert.deepEqual(issueChips(rows,{query:'',status:'unfinished'},labels).map(c=>`${c.id}:${c.count}`),['all:3','payment:2','delivery:1','validation:1']);
 assert.deepEqual(issueChips(rows,{query:' #D ',status:'all'},labels).map(c=>c.id),['all','payment','validation']);
 const mixed=[...rows,row('e',false,['delivery'])];
 assert.ok(issueChips(mixed,{query:'',status:'all'},labels).some(c=>c.id==='shipping_blocker'&&c.count===2),'blockers that narrow shipping alerts keep their chip');
});
