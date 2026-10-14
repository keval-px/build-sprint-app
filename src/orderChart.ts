import {storeClock,type OrderPattern} from '../shared/orderPattern';
import {ABANDONED_LINE_COLOR,abandonedSeriesName,abandonedTooltipValue,type AbandonedPattern} from '../shared/abandonedPattern';
import {niceScale,runs,smoothPath,type Series} from '../shared/lineChart';

// Chart marks only (see DESIGN.md chart styling exceptions); Shopify components own the card.
const ORDERS_COLOR='#13ACF0',AVERAGE_COLOR='#8A8A8A',GRID_COLOR='#E3E3E3',LABEL_COLOR='#616161';
const HEIGHT=200,MARGIN={top:8,right:8,bottom:24,left:32};
const hourLabel=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
let chartIds=0;
const latest=new WeakMap<HTMLElement,{pattern:OrderPattern;abandoned:AbandonedPattern}>();
const watched=new WeakSet<HTMLElement>();

export function renderOrderChart(host:HTMLElement,pattern:OrderPattern,abandoned:AbandonedPattern){
 latest.set(host,{pattern,abandoned});
 draw(host);
 // Redraw at the new width when the card resizes (phone rotation, admin sidebar).
 if(!watched.has(host)&&typeof ResizeObserver!=='undefined'){
  watched.add(host);let width=host.clientWidth;
  new ResizeObserver(()=>{if(host.clientWidth!==width){width=host.clientWidth;draw(host);}}).observe(host);
 }
}

function draw(host:HTMLElement){
 const {pattern,abandoned}=latest.get(host)!;
 const now=Date.now(),current=storeClock(pattern.syncedAt,pattern.timeZone);
 const today=pattern.day===storeClock(now,pattern.timeZone).day?'Today’s orders':`${pattern.day} orders`;
 // Today's single observation for each hour is its count. The comparison is
 // that same clock hour averaged across prior complete days, including zeros.
 const comparison=pattern.baselineDays===30?'30-day average':`${pattern.baselineDays}-day average`;
 const series:{key:string;name:string;color:string;values:Series;dashed?:boolean;area?:boolean;value:(hour:number)=>string}[]=[
  {key:'orders',name:today,color:ORDERS_COLOR,area:true,values:pattern.hours.map(h=>h.count),value:h=>pattern.hours[h].count===null?'Not reached':pattern.hours[h].count!.toLocaleString()},
  ...(pattern.baselineDays?[{key:'average',name:comparison,color:AVERAGE_COLOR,dashed:true,values:pattern.hours.map(h=>h.average),value:(h:number)=>pattern.hours[h].average===null?'Not available':pattern.hours[h].average!.toLocaleString(undefined,{maximumFractionDigits:2})}]:[]),
  {key:'abandoned',name:abandonedSeriesName(pattern,now),color:ABANDONED_LINE_COLOR,area:true,values:abandoned.hours,value:h=>abandonedTooltipValue(abandoned.hours[h]??null,h>current.hour)},
 ];
 const width=Math.max(280,host.clientWidth||600),plotW=width-MARGIN.left-MARGIN.right,plotH=HEIGHT-MARGIN.top-MARGIN.bottom;
 const scale=niceScale(Math.max(0,...series.flatMap(s=>s.values.filter((v):v is number=>v!==null))));
 const x=(hour:number)=>MARGIN.left+hour*plotW/23,y=(value:number)=>MARGIN.top+plotH-value/scale.max*plotH;
 const ticks=Array.from({length:scale.max/scale.step+1},(_,i)=>i*scale.step);
 const xTicks=width<480?[0,6,12,18]:[0,3,6,9,12,15,18,21];
 // Area fills fade to the baseline so overlapping series stay readable.
 const id=`order-chart-${++chartIds}`;
 const gradients=series.filter(s=>s.area).map(s=>`<linearGradient id="${id}-${s.key}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity="0.18"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('');
 const lines=series.map((s,index)=>runs(s.values).map(run=>{
  const points=run.values.map((value,i)=>({x:x(run.start+i),y:y(value)}));
  if(points.length===1)return `<circle cx="${points[0].x}" cy="${points[0].y}" r="3.5" fill="${s.color}" data-isolated="${index}"/>`;
  const path=smoothPath(points),base=MARGIN.top+plotH;
  const area=s.area?`<path d="${path}L${points.at(-1)!.x},${base}L${points[0].x},${base}Z" fill="url(#${id}-${s.key})"/>`:'';
  return `${area}<path d="${path}" fill="none" stroke="${s.color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"${s.dashed?' stroke-dasharray="4 4"':''}/>`;
 }).join('')).join('');
 const label=host.getAttribute('aria-label')??'Hourly orders';
 const key=(s:typeof series[number])=>`<s-box data-chart-key="${s.key}" aria-hidden="true"></s-box>`;
 host.innerHTML=`<s-box data-order-chart>
  <svg viewBox="0 0 ${width} ${HEIGHT}" width="${width}" height="${HEIGHT}" role="img" tabindex="0" aria-label="${escape(label)}. Use the left and right arrow keys to read each hour." data-chart-plot>
   <defs>${gradients}</defs>
   ${ticks.map(t=>`<line x1="${MARGIN.left}" x2="${width-MARGIN.right}" y1="${y(t)}" y2="${y(t)}" stroke="${GRID_COLOR}"/><text x="${MARGIN.left-6}" y="${y(t)}" text-anchor="end" dominant-baseline="middle" fill="${LABEL_COLOR}" font-size="11">${t.toLocaleString()}</text>`).join('')}
   ${xTicks.map(h=>`<text x="${x(h)}" y="${HEIGHT-6}" text-anchor="middle" fill="${LABEL_COLOR}" font-size="11">${hourLabel(h)}</text>`).join('')}
   ${lines}
   <g data-chart-cursor hidden><line y1="${MARGIN.top}" y2="${MARGIN.top+plotH}" stroke="${LABEL_COLOR}" stroke-width="1"/>${series.map(s=>`<circle r="4" fill="#fff" stroke="${s.color}" stroke-width="2"/>`).join('')}</g>
  </svg>
  <s-box data-chart-tip padding="small" background="base" border="base" borderRadius="base" role="status" aria-live="polite" hidden></s-box>
  <s-stack direction="inline" gap="small-100 base" paddingBlockStart="small">${series.map(s=>`<s-stack direction="inline" gap="small-200" alignItems="center">${key(s)}<s-text color="subdued">${escape(s.name)}</s-text></s-stack>`).join('')}</s-stack>
  <table data-chart-data><caption>${escape(label)}</caption><thead><tr><th scope="col">Hour</th>${series.map(s=>`<th scope="col">${escape(s.name)}</th>`).join('')}</tr></thead><tbody>${pattern.hours.map(h=>`<tr><th scope="row">${hourLabel(h.hour)}</th>${series.map(s=>`<td>${escape(s.value(h.hour))}</td>`).join('')}</tr>`).join('')}</tbody></table>
 </s-box>`;
 const svg=host.querySelector<SVGSVGElement>('[data-chart-plot]')!,cursor=host.querySelector<SVGGElement>('[data-chart-cursor]')!,tip=host.querySelector<HTMLElement>('[data-chart-tip]')!;
 let active:number|null=null;
 const show=(hour:number|null)=>{
  active=hour;cursor.toggleAttribute('hidden',hour===null);tip.hidden=hour===null;if(hour===null)return;
  const cx=x(hour);
  cursor.querySelector('line')!.setAttribute('x1',String(cx));cursor.querySelector('line')!.setAttribute('x2',String(cx));
  cursor.querySelectorAll('circle').forEach((dot,i)=>{const v=series[i].values[hour];dot.toggleAttribute('hidden',v===null||v===undefined);if(v!==null&&v!==undefined){dot.setAttribute('cx',String(cx));dot.setAttribute('cy',String(y(v)));}});
  tip.innerHTML=`<s-stack gap="small-200"><s-text type="strong">${hourLabel(hour)}</s-text>${series.map(s=>`<s-grid gridTemplateColumns="auto 1fr auto" gap="small-200" alignItems="center">${key(s)}<s-text>${escape(s.name)}</s-text><s-text type="strong">${escape(s.value(hour))}</s-text></s-grid>`).join('')}</s-stack>`;
  // Beside the cursor, never over it: right of the line, or left of it near the right edge.
  const box=svg.getBoundingClientRect(),px=cx*(box.width/width||1),tipWidth=190,gap=12;
  tip.style.left=`${px+gap+tipWidth<=box.width?px+gap:Math.max(0,px-gap-tipWidth)}px`;
 };
 const hourAt=(clientX:number)=>{const box=svg.getBoundingClientRect(),px=(clientX-box.left)*width/box.width;return Math.min(23,Math.max(0,Math.round((px-MARGIN.left)/(plotW/23))));};
 svg.addEventListener('pointermove',event=>show(hourAt(event.clientX)));
 svg.addEventListener('pointerleave',()=>{if(document.activeElement!==svg)show(null);});
 svg.addEventListener('focus',()=>show(active??Math.min(23,current.hour)));
 svg.addEventListener('blur',()=>show(null));
 svg.addEventListener('keydown',event=>{
  const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  if(event.key==='Escape'){show(null);return;}
  if(!step)return;event.preventDefault();show(Math.min(23,Math.max(0,(active??current.hour)+step)));
 });
}
