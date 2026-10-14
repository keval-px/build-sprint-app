import {checkoutFunnel,funnelFilters,funnelLabels,type FunnelFilter} from '../shared/checkoutFunnel';
import type {CheckoutEvent} from '../shared/evidence';
import type {OutcomeFacts} from '../shared/checkoutOutcome';
export function funnelMarkup(events:CheckoutEvent[],facts:OutcomeFacts,filter:FunnelFilter){
 const model=checkoutFunnel(events,facts,filter);
 return `<s-stack gap="base">
  <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
   <s-heading>Where sessions drop off</s-heading>
   <s-stack direction="inline" gap="small" accessibilityLabel="Checkout segment">${funnelFilters.map(id=>`<s-button data-funnel-filter="${id}" variant="${filter===id?'secondary':'tertiary'}" aria-pressed="${filter===id}">${funnelLabels[id]}</s-button>`).join('')}</s-stack>
  </s-stack>
  <s-query-container><s-stack gap="small">${model.rows.map((row,index)=>`<s-grid gridTemplateColumns="@container (inline-size > 600px) 170px 1fr, 1fr" gap="small" alignItems="center">
   <s-text color="subdued">${row.label}</s-text>
   <s-grid gridTemplateColumns="1fr 48px 56px" gap="base" alignItems="center">
    <s-box data-funnel-bar="${index}" role="img" aria-label="${row.label}: ${row.count} of ${model.count} recorded checkout starts" data-funnel-width="${row.percent}"></s-box>
    <s-text type="strong">${row.count.toLocaleString()}</s-text>
    <s-text data-funnel-drop="${row.drop!==null&&row.drop>50?'high':'normal'}" ${row.drop!==null&&row.drop>50?'tone="critical" type="strong"':'color="subdued"'} aria-label="${row.drop===null?'Comparison unavailable':`${Math.abs(row.drop)}% ${row.drop<0?'more':'fewer'} recorded sessions than the previous stage`}">${row.drop===null?'—':row.drop===0?'0%':`${row.drop<0?'+':'−'}${Math.abs(row.drop)}%`}</s-text>
   </s-grid>
  </s-grid>`).join('')}</s-stack></s-query-container>
 </s-stack>`;
}

export function renderFunnel(host:HTMLElement,events:CheckoutEvent[],facts:OutcomeFacts,filter:FunnelFilter){
 host.innerHTML=funnelMarkup(events,facts,filter);
 host.querySelectorAll<HTMLElement>('[data-funnel-width]').forEach(bar=>bar.style.setProperty('--funnel-width',`${bar.dataset.funnelWidth}%`));
}
