import {createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LineChart,PolarisVizProvider} from '@shopify/polaris-viz';
import '@shopify/polaris-viz/build/esm/styles.css';
import {storeClock,type SelectedOrderPattern} from '../shared/orderPattern';

const roots=new WeakMap<HTMLElement,Root>();
const dayLabel=(day:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));
export function renderOrderChart(host:HTMLElement,pattern:SelectedOrderPattern){
 let root=roots.get(host);if(!root){root=createRoot(host);roots.set(host,root);}
 const hourly=pattern.mode==='hourly',current=storeClock(pattern.syncedAt,pattern.timeZone);
 const hourKey=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
 const points=hourly?pattern.hours.map(h=>({key:hourKey(h.hour),count:h.count,average:h.average})):pattern.days.map(d=>({key:dayLabel(d.day),count:d.count,average:d.average}));
 const name=hourly?(pattern.day===storeClock(Date.now(),pattern.timeZone).day?'Today’s orders':`${dayLabel(pattern.day)} orders`):'Orders';
 const comparison=hourly?`${new Intl.DateTimeFormat(undefined,{weekday:'short',timeZone:'UTC'}).format(new Date(`${pattern.day}T12:00:00Z`))} average · ${pattern.baselineDays} days`:'Matching weekday average';
 // Null preserves future/uncovered dates and missing comparison history.
 const data=[{name,data:points.map(p=>({key:p.key,value:p.count}))},
  ...(points.some(p=>p.average!==null)?[{name:comparison,isComparison:true,data:points.map(p=>({key:p.key,value:p.average}))}]:[])];
 root.render(createElement(PolarisVizProvider,{defaultTheme:'Light',children:createElement(LineChart,{
  data,isAnimated:false,showLegend:true,legendPosition:'left',hideLegendOverflow:false,
  yAxisOptions:{integersOnly:true,labelFormatter:value=>value===null?'':`${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})} ${Number(value)===1?'order':'orders'}`},
  tooltipOptions:{titleFormatter:value=>{
   const point=hourly?null:pattern.days.find(d=>dayLabel(d.day)===value);
   const progress=hourly?pattern.day===current.day&&value===hourKey(current.hour):point?.day===current.day;
   return `${value} · ${pattern.timeZone}${progress?' · In progress':''}${point?.baselineDays?` · Average of ${point.baselineDays} earlier matching weekdays`:''}`;
  },valueFormatter:value=>value===null?'Not available':Number(value).toLocaleString(undefined,{maximumFractionDigits:2})},
  xAxisOptions:{allowLineWrap:false},skipLinkText:'Skip order chart',emptyStateText:'No orders recorded for these dates.',
 })}));
}
