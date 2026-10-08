import {createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LineChart,PolarisVizProvider} from '@shopify/polaris-viz';
import '@shopify/polaris-viz/build/esm/styles.css';
import {storeClock,type OrderPattern} from '../shared/orderPattern';

const roots=new WeakMap<HTMLElement,Root>();
export function renderOrderChart(host:HTMLElement,pattern:OrderPattern){
 let root=roots.get(host);if(!root){root=createRoot(host);roots.set(host,root);}
 const key=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
 const current=storeClock(pattern.syncedAt,pattern.timeZone);
 const today=pattern.day===storeClock(Date.now(),pattern.timeZone).day?'Today’s hourly orders':`${pattern.day} hourly orders`;
 // Today's single observation for each hour is its count. The comparison is
 // that same clock hour averaged across prior complete days, including zeros.
 const comparison=pattern.baselineDays===30?'30-day hourly average':`${pattern.baselineDays}-day hourly average`;
 const data=[{name:today,data:pattern.hours.map(h=>({key:key(h.hour),value:h.count}))},
  ...(pattern.baselineDays?[{name:comparison,isComparison:true,data:pattern.hours.map(h=>({key:key(h.hour),value:h.average}))}]:[])];
 root.render(createElement(PolarisVizProvider,{defaultTheme:'Light',children:createElement(LineChart,{
  data,isAnimated:false,showLegend:true,legendPosition:'left',hideLegendOverflow:false,
  yAxisOptions:{integersOnly:true,labelFormatter:value=>value===null?'':`${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})} ${Number(value)===1?'order':'orders'}`},
  tooltipOptions:{titleFormatter:value=>`${value} · ${pattern.timeZone}${value===key(current.hour)?' · In progress':''}`,valueFormatter:value=>value===null?'Not reached':Number(value).toLocaleString(undefined,{maximumFractionDigits:2})},
  xAxisOptions:{allowLineWrap:false},skipLinkText:'Skip order chart',emptyStateText:'No orders recorded yet.',
 })}));
}
