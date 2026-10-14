import test from 'node:test';
import assert from 'node:assert/strict';
import {niceScale,runs,smoothPath} from '../shared/lineChart.ts';

test('the y-axis uses whole-number 1/2/5 steps with at most four intervals',()=>{
 assert.deepEqual(niceScale(0),{max:1,step:1});
 assert.deepEqual(niceScale(3),{max:3,step:1});
 assert.deepEqual(niceScale(38),{max:40,step:10});
 assert.deepEqual(niceScale(79),{max:80,step:20});
 assert.deepEqual(niceScale(0.4),{max:1,step:1},'fractional averages still get a whole-number axis');
 for(const max of [7,13,99,250,1234])assert.ok(niceScale(max).max/niceScale(max).step<=4&&niceScale(max).max>=max);
});

test('unknown hours stay gaps and isolated values are kept as single points',()=>{
 assert.deepEqual(runs([null,1,2,null,0,null,5,6]),[{start:1,values:[1,2]},{start:4,values:[0]},{start:6,values:[5,6]}]);
 assert.deepEqual(runs([null,null]),[]);
 assert.deepEqual(runs([0,0]),[{start:0,values:[0,0]}],'zero is a recorded value, not a gap');
});

test('smoothed lines pass through every point and never overshoot between hours',()=>{
 const points=[{x:0,y:100},{x:10,y:100},{x:20,y:0},{x:30,y:0},{x:40,y:50}];
 const d=smoothPath(points);
 assert.match(d,/^M0,100C/);
 const ends=[...d.matchAll(/ (-?[\d.]+),(-?[\d.]+)(?=C|$)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(ends,points.slice(1).map(p=>[p.x,p.y]));
 const controlYs=[...d.matchAll(/C(-?[\d.]+),(-?[\d.]+) (-?[\d.]+),(-?[\d.]+)/g)].flatMap(m=>[Number(m[2]),Number(m[4])]);
 assert.ok(controlYs.every(v=>v>=0&&v<=100),'control points stay within the data range');
 assert.equal(smoothPath([{x:0,y:1}]),'');
});
