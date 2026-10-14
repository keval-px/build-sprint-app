import test from 'node:test';import assert from 'node:assert/strict';
import {checkoutCSV as tableCSV,checkoutEventsCSV,csvCell,exportRow,type ExportJourney} from '../shared/checkoutExport.ts';
const checkoutCSV=(rows:ExportJourney[],currency:string)=>tableCSV(rows.map(exportRow),currency);
test('CSV quotes fields, blocks spreadsheet formulas and keeps unknown prices empty',()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell('  @formula'),'"\'  @formula"');assert.equal(csvCell('a,b'),'"a,b"');
 const row={id:'anonymous-id',label:'#123',startedAt:1000,completed:false,events:[]};
 assert.ok(checkoutCSV([row],'USD').includes('"","USD"'));assert.ok(checkoutCSV([{...row,basketCents:0}],'USD').includes('"0.00","USD"'));
 assert.equal(checkoutCSV([],'USD').split('\r\n').length,2);
 assert.ok(checkoutEventsCSV([{...row,events:[{sessionId:'anonymous-id',eventId:'event',name:'alert_displayed',timestamp:2000,category:'delivery',shippingBlocker:'no_shipping_available'}]}]).includes('"delivery","Yes"'));
});
test('simulated checkouts are labelled in the exported status',()=>{
 const event={sessionId:'sim',eventId:'e',name:'checkout_started' as const,timestamp:1000,category:null,simulated:true as const};
 assert.ok(checkoutCSV([{id:'sim',label:'#sim',startedAt:1000,completed:false,events:[event]}],'USD').includes('"No completion recorded · Simulated"'));
 assert.ok(checkoutCSV([{id:'real',label:'#real',startedAt:1000,completed:false,events:[{...event,sessionId:'real',simulated:undefined}]}],'USD').includes('"No completion recorded",'));
});
