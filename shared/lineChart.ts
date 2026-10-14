// Pure geometry for the hourly order chart. Values are indexed by hour; null is unknown
// and must stay a gap, never a zero.
export type Series = (number|null)[];

// Smallest 1/2/5 step that keeps at most `ticks` intervals, so the axis shows whole counts.
export function niceScale(max:number,ticks=4){
 if(!(max>0))return {max:1,step:1};
 const raw=max/ticks,power=10**Math.floor(Math.log10(raw));
 const step=Math.max(1,[1,2,5,10].map(m=>m*power).find(s=>s>=raw)!);
 return {max:Math.ceil(max/step)*step,step};
}

// Consecutive known points; a single isolated point cannot form a line.
export function runs(values:Series){
 const out:{start:number;values:number[]}[]=[];let current:{start:number;values:number[]}|null=null;
 values.forEach((value,index)=>{
  if(value===null||!Number.isFinite(value)){current=null;return;}
  if(!current){current={start:index,values:[]};out.push(current);}
  current.values.push(value);
 });
 return out;
}

// Monotone cubic (Fritsch–Carlson) through evenly spaced points: smooth, but it never
// overshoots between hours, so a curve cannot suggest orders that were not recorded.
export function smoothPath(points:{x:number;y:number}[]){
 if(points.length<2)return '';
 const n=points.length,dx=points.map((p,i)=>i<n-1?points[i+1].x-p.x:0),slope=points.map((p,i)=>i<n-1?(points[i+1].y-p.y)/dx[i]:0);
 const tangent=points.map((_,i)=>i===0?slope[0]:i===n-1?slope[n-2]:slope[i-1]*slope[i]<=0?0:(slope[i-1]+slope[i])/2);
 for(let i=0;i<n-1;i++){
  if(slope[i]===0){tangent[i]=0;tangent[i+1]=0;continue;}
  const a=tangent[i]/slope[i],b=tangent[i+1]/slope[i],h=a*a+b*b;
  if(h>9){const t=3/Math.sqrt(h);tangent[i]=t*a*slope[i];tangent[i+1]=t*b*slope[i];}
 }
 const f=(v:number)=>Math.round(v*100)/100;
 let d=`M${f(points[0].x)},${f(points[0].y)}`;
 for(let i=0;i<n-1;i++){
  const p=points[i],q=points[i+1],third=dx[i]/3;
  d+=`C${f(p.x+third)},${f(p.y+tangent[i]*third)} ${f(q.x-third)},${f(q.y-tangent[i+1]*third)} ${f(q.x)},${f(q.y)}`;
 }
 return d;
}
