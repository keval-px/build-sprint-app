import test from 'node:test';import assert from 'node:assert/strict';
import {estimateRecovery} from '../shared/recovery.ts';
const basket={basketCents:100000,pricedBaskets:2,confirmedCause:true,projection:{basis:'comparable-future-checkouts' as const,period:'next comparable period',adjustedBasketCents:100000}};
test('a confirmed functional blocker uses comparable stage completion, not a fixed recovery percentage',()=>{
  const result=estimateRecovery({...basket,mechanism:'functional',baseline:{comparable:true,checkouts:100,completed:80}});
  assert.equal(result.cents,80000);
});
test('discount expectation recovery uses measured lift among previously unfinished baskets',()=>{
  const result=estimateRecovery({...basket,mechanism:'expectation',baseline:{comparable:true,checkouts:1000,completed:700,beforeCheckouts:1000,beforeCompleted:500}});
  assert.equal(result.cents,40000);
});
test('demo data, unconfirmed causes, unmatched baskets, weak samples and uncertain effects do not invent money',()=>{
  assert.equal(estimateRecovery({...basket,mechanism:'functional',testData:true}).cents,null);
  assert.equal(estimateRecovery({...basket,mechanism:'functional',confirmedCause:false}).cents,null);
  assert.equal(estimateRecovery({...basket,mechanism:'functional',pricedBaskets:0}).cents,null);
  assert.equal(estimateRecovery({...basket,mechanism:'functional',baseline:{comparable:true,checkouts:20,completed:20}}).cents,null);
  assert.equal(estimateRecovery({...basket,mechanism:'friction',baseline:{comparable:true,checkouts:100,completed:51,beforeCheckouts:100,beforeCompleted:50}}).cents,null);
});

test('historical baskets alone cannot imply recaptured revenue or hide changed pricing',()=>{
 assert.equal(estimateRecovery({...basket,projection:undefined,mechanism:'functional',baseline:{comparable:true,checkouts:100,completed:80}}).cents,null);
 const adjusted=estimateRecovery({...basket,projection:{...basket.projection,adjustedBasketCents:90000},mechanism:'functional',baseline:{comparable:true,checkouts:100,completed:80}});
 assert.equal(adjusted.cents,72000);assert.ok(adjusted.lowerCents!<adjusted.cents!);assert.ok(adjusted.upperCents!>adjusted.cents!);
 assert.equal(estimateRecovery({...basket,pricedBaskets:-1,mechanism:'functional'}).cents,null);
});
