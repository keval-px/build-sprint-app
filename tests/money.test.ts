import test from 'node:test';import assert from 'node:assert/strict';import {moneyMinor,convertMoney,formatMoney} from '../shared/money.ts';
test('currency accounting respects zero, two and three decimal places',()=>{
 assert.equal(moneyMinor('749.95','USD'),74995);assert.equal(moneyMinor('1200','JPY'),1200);assert.equal(moneyMinor('1.234','KWD'),1234);
 assert.equal(moneyMinor('1.2','JPY'),null);assert.equal(moneyMinor('1.234','USD'),null);assert.equal(moneyMinor('1','BAD'),null);
 assert.match(formatMoney(1234,'KWD'),/1\.234/);
});
test('foreign values require a Shopify pair for exactly the same checkout',()=>{
 const quote={sessionId:'a',shop:{minor:7500,currency:'USD'},buyer:{minor:10000,currency:'CAD'}};
 assert.equal(convertMoney({minor:6000,currency:'CAD'},'USD','a',quote),4500);
 assert.equal(convertMoney({minor:6000,currency:'CAD'},'USD','b',quote),null);
 assert.equal(convertMoney({minor:6000,currency:'CAD'},'USD','a'),null);
 assert.equal(convertMoney({minor:74995,currency:'USD'},'USD','a'),74995);
 assert.equal(convertMoney({minor:1,currency:'CAD'},'USD','a',quote),1);
});
