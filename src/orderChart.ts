import {createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LineChart,PolarisVizProvider} from '@shopify/polaris-viz';
import '@shopify/polaris-viz/build/esm/styles.css';
import {storeClock,type OrderPattern} from '../shared/orderPattern';

const roots=new WeakMap<HTMLElement,Root>();
export function renderOrderChart(host:HTMLElement,pattern:OrderPattern){
  let root=roots.get(host);
  if(!root){root=createRoot(host);roots.set(host,root);}
  const day=pattern.day===storeClock(Date.now(),pattern.timeZone).day?'Today’s orders':`${pattern.day} orders`;
  const key=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
  // Null means an hour has not happened, or history is unavailable. Polaris
  // Viz preserves these gaps rather than fabricating zero-order observations.
  const data=[
    {name:day,data:pattern.hours.map(h=>({key:key(h.hour),value:h.count}))},
    {name:`${new Intl.DateTimeFormat(undefined,{weekday:'short',timeZone:'UTC'}).format(new Date(`${pattern.day}T00:00:00Z`))} average · ${pattern.baselineDays} days`,isComparison:true,data:pattern.hours.map(h=>({key:key(h.hour),value:h.average}))},
  ];
  root.render(createElement(PolarisVizProvider,{defaultTheme:'Light',children:createElement(LineChart,{
    data,isAnimated:false,showLegend:true,legendPosition:'left',hideLegendOverflow:false,
    yAxisOptions:{integersOnly:true,labelFormatter:value=>value===null?'':`${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})} ${Number(value)===1?'order':'orders'}`},
    tooltipOptions:{titleFormatter:value=>`${value} · ${pattern.timeZone}${value===key(storeClock(pattern.syncedAt,pattern.timeZone).hour)?' · In progress':''}`,valueFormatter:value=>value===null?'Not reached':Number(value).toLocaleString(undefined,{maximumFractionDigits:2})},
    xAxisOptions:{allowLineWrap:false},skipLinkText:'Skip order chart',
    emptyStateText:'No orders in the available history.',
  })}));
}
