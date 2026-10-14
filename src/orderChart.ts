import {createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LineChart,PolarisVizProvider,TooltipContent} from '@shopify/polaris-viz';
import '@shopify/polaris-viz/build/esm/styles.css';
import {storeClock,type OrderPattern} from '../shared/orderPattern';

import {ABANDONED_LINE_COLOR,abandonedSeriesName,abandonedTooltipValue,type AbandonedPattern} from '../shared/abandonedPattern';

const roots=new WeakMap<HTMLElement,Root>();
export function renderOrderChart(host:HTMLElement,pattern:OrderPattern,abandoned:AbandonedPattern){
 let root=roots.get(host);if(!root){root=createRoot(host);roots.set(host,root);}
 const key=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
 const current=storeClock(pattern.syncedAt,pattern.timeZone);
 const renderNow=Date.now();
 const today=pattern.day===storeClock(renderNow,pattern.timeZone).day?'Today’s orders':`${pattern.day} orders`;
 const abandonedName=abandonedSeriesName(pattern,renderNow);
 // Today's single observation for each hour is its count. The comparison is
 // that same clock hour averaged across prior complete days, including zeros.
 const comparison=pattern.baselineDays===30?'30-day average':`${pattern.baselineDays}-day average`;
 const data=[{name:today,data:pattern.hours.map(h=>({key:key(h.hour),value:h.count}))},
  ...(pattern.baselineDays?[{name:comparison,isComparison:true,data:pattern.hours.map(h=>({key:key(h.hour),value:h.average}))}]:[]),
  {name:abandonedName,color:ABANDONED_LINE_COLOR,data:abandoned.hours.map((value,hour)=>({key:key(hour),value}))}];
 root.render(createElement(PolarisVizProvider,{defaultTheme:'Light',themes:{Light:{line:{hasSpline:true,width:1.5}}},children:createElement(LineChart,{
  data,isAnimated:false,showLegend:true,legendPosition:'left',hideLegendOverflow:false,
  // A line cannot show an isolated observation between unknown hours.
  // Keep those gaps unknown; only isolated values need a visible point.
  slots:{chart:({xScale,yScale})=>createElement('g',{'aria-hidden':true,pointerEvents:'none'},
   abandoned.hours.map((value,hour)=>value===null||abandoned.hours[hour-1]!=null||abandoned.hours[hour+1]!=null?null:createElement('circle',{
    key:hour,cx:xScale(hour),cy:yScale(value),r:3.5,fill:ABANDONED_LINE_COLOR,
    'data-abandoned-hour':hour,
   })))},
  yAxisOptions:{integersOnly:true,labelFormatter:value=>value===null?'':Number(value).toLocaleString(undefined,{maximumFractionDigits:2})},
  tooltipOptions:{renderTooltipContent:tooltip=>createElement(TooltipContent,{
   ignoreColorVisionEvents:true,
   theme:tooltip.theme,
   data:tooltip.data.map(group=>({...group,data:group.data.map(row=>({...row,key:String(row.key),
    value:row.key===abandonedName?abandonedTooltipValue(abandoned.hours[tooltip.activeIndex]??null,tooltip.activeIndex>current.hour):row.value===null?'Not reached':Number(row.value).toLocaleString(undefined,{maximumFractionDigits:2})}))})),
  })},
  xAxisOptions:{allowLineWrap:false},skipLinkText:'Skip order chart',emptyStateText:'No orders recorded yet.',
 })}));
}
