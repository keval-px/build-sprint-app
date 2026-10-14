import test from 'node:test';import assert from 'node:assert/strict';
import {checkoutCSV,checkoutEventsCSV,csvCell} from '../shared/checkoutExport.ts';
test('CSV quotes fields, blocks spreadsheet formulas and keeps unknown prices empty',()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell('  @formula'),'"\'  @formula"');assert.equal(csvCell('a,b'),'"a,b"');
 const row={id:'anonymous-id',label:'#123',startedAt:1000,completed:false,events:[]};
 assert.ok(checkoutCSV([row],'USD').includes('"","USD"'));assert.ok(checkoutCSV([{...row,basketCents:0}],'USD').includes('"0.00","USD"'));
 assert.equal(checkoutCSV([],'USD').split('\r\n').length,2);
 assert.ok(checkoutEventsCSV([{...row,events:[{sessionId:'anonymous-id',eventId:'event',name:'alert_displayed',timestamp:2000,category:'delivery',shippingBlocker:'no_shipping_available'}]}]).includes('"delivery","Yes"'));
});
