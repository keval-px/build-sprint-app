// Read-only reconciliation against the already-public demo feed. No credentials
// or per-checkout evidence are written to the report or printed.
import assert from 'node:assert/strict';
import {recentRange,dateBounds,checkoutCohort} from '../shared/dateRange.ts';
import {summarize} from '../shared/evidence.ts';
import {recordedFindings} from '../shared/dashboardInsights.ts';
import {buildRecommendations} from '../shared/recommendations.ts';
import {paginateRows} from '../shared/journeyTable.ts';
const range=recentRange(30),bounds=dateBounds(range);
const response=await fetch(`https://neighborly-nightingale-843.convex.site/api/test-evidence?start=${bounds.start}&end=${bounds.end}`);
assert.equal(response.status,200);
const data=await response.json(),events=checkoutCohort(data.events,range),unique=[...new Map(events.map(e=>[e.eventId,e])).values()];
const ids=new Set(unique.map(e=>e.sessionId));
const completed=new Set(unique.filter(e=>e.name==='checkout_completed').map(e=>e.sessionId));
const summary=summarize(events),findings=recordedFindings(events),recommendations=buildRecommendations(events);
assert.equal(summary.sessionCount,ids.size);assert.equal(summary.completed,completed.size);
assert.equal(summary.noCompletionObserved,ids.size-completed.size);assert.equal(summary.eventCount,unique.length);
assert.equal(findings.reduce((n,g)=>n+g.alerts.length,0),unique.filter(e=>e.name==='alert_displayed'&&e.category).length);
for(const group of findings){
 assert.equal(group.sessionIds.length,new Set(group.alerts.map(e=>e.sessionId)).size);
 assert.ok(group.completedAfter<=group.sessionIds.length);assert.ok(group.repeatedCheckouts<=group.sessionIds.length);
}
const baskets=data.abandonedBasketSummary;
assert.ok(baskets,'Shopify abandoned-basket summary is unavailable');
assert.equal(baskets.averageCents,baskets.count&&baskets.totalCents!==null?Math.round(baskets.totalCents/baskets.count):null);
assert.equal(baskets.rangeStart,bounds.start);assert.equal(baskets.rangeEnd,bounds.end);
const actions=data.actionBasketValue;
assert.equal(actions.rangeStart,bounds.start);assert.equal(actions.rangeEnd,bounds.end);
for(const row of actions.actions){assert.equal(row.matchedSessions+row.unknownSessions,row.eligibleSessions);if(row.unknownSessions)assert.equal(row.totalCents,null);}
for(const recommendation of recommendations){const value=actions.actions.find(a=>a.id===recommendation.id);assert.ok(value);assert.ok(value.eligibleSessions<=recommendation.sessionIds.filter(id=>!completed.has(id)).length);}
const chart=data.orderPatterns;
if(chart)for(const row of chart.hours){assert.ok(row.count===null||row.count>=0);assert.ok(row.average===null||row.average>=0);if(!chart.baselineDays)assert.equal(row.average,null);}
console.log(JSON.stringify({passed:true,range,partial:data.truncated,checkouts:ids.size,completed:completed.size,unfinished:ids.size-completed.size,completionPercent:ids.size?Math.round(completed.size/ids.size*100):0,events:unique.length,abandonedCount:baskets.count,abandonedTotalMinor:baskets.totalCents,abandonedAverageMinor:baskets.averageCents,affectedBasketTotalMinor:actions.combined.totalCents,recommendations:recommendations.length,findings:findings.length,paginationLastPage:paginateRows([...ids],99).label,chartDay:chart?.day,chartBaselineDays:chart?.baselineDays},null,2));
