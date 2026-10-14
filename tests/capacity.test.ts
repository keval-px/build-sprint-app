import test from 'node:test';
import assert from 'node:assert/strict';
import {readPages,REPORT_WINDOW_MS,ReportLimit,collectionGap,coversPeriod,reportJSON} from '../shared/capacity.ts';
test('bounded pages read beyond 1000 events and 5000 prices without truncating journeys',async()=>{
 const rows=Array.from({length:18000},(_,i)=>({eventId:String(i),sessionId:String(Math.floor(i/6)),timestamp:i}));
 let calls=0;
 const read=async(cursor:string|null)=>{calls++;const at=Number(cursor??0);return {page:rows.slice(at,at+200),isDone:at+200>=rows.length,continueCursor:String(at+200)};};
 const result=await readPages(read);assert.deepEqual(result,rows);assert.equal(calls,90);assert.equal(REPORT_WINDOW_MS,45*86400000);
});
test('missing/repeated cursor and payload overflow never return a plausible partial total',async()=>{
 await assert.rejects(()=>readPages(async()=>({page:[1],isDone:false,continueCursor:'same'})),ReportLimit);
 await assert.rejects(()=>readPages(async()=>({page:['x'.repeat(100)],isDone:true,continueCursor:''}),50),ReportLimit);
});
test('old cap gap remains disclosed until it leaves the report window',()=>{
 assert.equal(collectionGap({lastCapAt:100,resumedAt:200},150),true);
 assert.equal(collectionGap({lastCapAt:100,resumedAt:200},201),false);
 assert.equal(collectionGap({lastCapAt:100},201),true);
});

test('server history outside the selected period stays unavailable rather than reporting zero',()=>{
 assert.equal(coversPeriod('2026-09-09T00:00:00Z',Date.parse('2026-09-08T00:00:00Z')),false);
 assert.equal(coversPeriod('2026-09-09T00:00:00Z',Date.parse('2026-09-09T00:00:00Z')),true);
 assert.equal(coversPeriod('invalid',Date.now()),false);
});

test('Convex SplitRequired never certifies its potentially incomplete range, including isDone=true',async()=>{
 // The range (start,end] contains two rows, but the budget-limited response
 // contains only the first and supplies the midpoint needed for splitting.
 const incomplete={page:['first-row'],isDone:true,continueCursor:'end',splitCursor:'middle',pageStatus:'SplitRequired' as const};
 await assert.rejects(()=>readPages(async()=>incomplete),ReportLimit);
 await assert.rejects(()=>readPages(async cursor=>cursor===null?{page:['prior-complete-row'],isDone:false,continueCursor:'start'}:incomplete),ReportLimit);
 // Recommended splitting does not mean the page is incomplete.
 assert.deepEqual(await readPages(async()=>({page:['first-row','second-row'],isDone:true,continueCursor:'end',splitCursor:'middle',pageStatus:'SplitRecommended' as const})),['first-row','second-row']);
});

test('the complete report envelope uses an exact UTF-8 byte budget',()=>{
 assert.equal(reportJSON('xxxxxxxxxx',12),'"xxxxxxxxxx"');
 assert.throws(()=>reportJSON('xxxxxxxxxxx',12),ReportLimit);
 assert.equal(reportJSON('😀',6),'"😀"');assert.throws(()=>reportJSON('😀',5),ReportLimit);
});
