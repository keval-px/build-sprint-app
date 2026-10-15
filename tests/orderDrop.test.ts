import test from 'node:test';import assert from 'node:assert/strict';
import {orderDrop,orderFlowStatus} from '../shared/orderDrop.ts';
import type {OrderPattern} from '../shared/orderPattern.ts';
// A pattern read at 15:30 UTC: hours up to 14 are complete, 15 is still running.
const syncedAt=Date.parse('2026-10-14T15:30:00Z');
const pattern=(hours:Record<number,[number|null,number|null]>,baselineDays=30):OrderPattern=>({day:'2026-10-14',timeZone:'UTC',baselineDays,syncedAt,testOrders:0,
 hours:Array.from({length:24},(_,hour)=>{const [count,average]=hours[hour]??[hour<=15?20:null,20];return {hour,count,average};})});

test('two complete hours in a row at least 50% below a 10+ average raise the alert',()=>{
 const result=orderDrop(pattern({12:[8,20],13:[10,20]}));
 assert.equal(result.state,'drop');
 assert.deepEqual(result.hours.map(h=>[h.hour,h.count,h.average,h.change]),[[12,8,20,-60],[13,10,20,-50]]);
});

test('one low hour, or low hours that are not next to each other, do not alert',()=>{
 assert.equal(orderDrop(pattern({12:[5,20]})).state,'normal');
 assert.equal(orderDrop(pattern({10:[5,20],12:[5,20]})).state,'normal');
 assert.equal(orderDrop(pattern({12:[11,20],13:[5,20]})).state,'normal','11 of 20 is only 45% below');
});

test('hours that normally have fewer than 10 orders are ignored completely',()=>{
 assert.equal(orderDrop(pattern({12:[0,9.9],13:[0,9.9]})).state,'normal');
 // A quiet hour between two low hours breaks the run.
 assert.equal(orderDrop(pattern({11:[2,20],12:[0,9],13:[2,20]})).state,'normal');
 const quiet=pattern(Object.fromEntries(Array.from({length:24},(_,h)=>[h,[h<=15?0:null,6]])));
 assert.equal(orderDrop(quiet).state,'low-volume');
});

test('the running hour is not judged until it ends',()=>{
 assert.equal(orderDrop(pattern({14:[5,20],15:[1,20]})).state,'normal');
});

test('the latest run is reported, including every hour in it',()=>{
 const result=orderDrop(pattern({2:[1,20],3:[1,20],11:[4,20],12:[6,30],13:[3,20]}));
 assert.deepEqual(result.hours.map(h=>h.hour),[11,12,13]);
});

test('fewer than seven full days of history is still learning',()=>{
 assert.equal(orderDrop(pattern({12:[0,20],13:[0,20]},6)).state,'learning');
 assert.equal(orderDrop(pattern({12:[0,20],13:[0,20]},7)).state,'drop');
});

test('store-local hours decide which hour is still running',()=>{
 // 15:30 UTC is 21:00 in Kolkata, so 20:00 is complete there and 21:00 is running.
 const p={...pattern({20:[1,20],21:[1,20],19:[1,20]}),timeZone:'Asia/Kolkata'};
 p.hours=p.hours.map(h=>({...h,count:h.hour<=21?h.count??20:null}));
 assert.deepEqual(orderDrop(p).hours.map(h=>h.hour),[19,20]);
});

test('the chart status follows the drop check and stays hidden when it cannot judge',()=>{
 assert.deepEqual(orderFlowStatus(orderDrop(pattern({}))),{tone:'normal',text:'Normal order flow'});
 assert.deepEqual(orderFlowStatus(orderDrop(pattern({12:[8,20],13:[10,20]}))),{tone:'drop',text:'Fewer orders than usual'});
 assert.equal(orderFlowStatus(orderDrop(pattern({},1))),null,'one day of history is not enough');
 assert.equal(orderFlowStatus(orderDrop(pattern(Object.fromEntries(Array.from({length:24},(_,h)=>[h,[h<=15?0:null,6]]))))),null);
});
