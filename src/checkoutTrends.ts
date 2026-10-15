import type {CheckoutTrend} from '../shared/checkoutTrends';
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]!);
const rate=(group:CheckoutTrend['current'])=>group.total?`${Math.round(group.count/group.total*100)}%`:'—';

function conclusion(trend:CheckoutTrend){
 const gap=trend.current.count/trend.current.total-trend.comparison.count/trend.comparison.total;
 if(trend.id==='device-gap')return `We recorded a lower completion rate on ${gap<0?'mobile':'desktop'}: ${rate(gap<0?trend.current:trend.comparison)}, compared with ${rate(gap<0?trend.comparison:trend.current)} on ${gap<0?'desktop':'mobile'}.`;
 // shipping-drop
 return `Among checkouts that selected shipping, we recorded no payment or completion within an hour of checkout starting in ${rate(trend.current)} of recent checkouts, compared with ${rate(trend.comparison)} earlier.`;
}

export function checkoutTrendsMarkup(trends:CheckoutTrend[],context:{start:number;end:number;simulationMode:boolean}){
 const {start,end,simulationMode}=context;
 const date=(at:number)=>new Date(at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 return trends.filter(trend=>trend.state==='review').map(trend=>{
  return `<s-section data-insight="${trend.id}"><s-stack gap="base">
    <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="small"><s-heading><s-text fontWeight="bold">${escape(trend.title)}</s-text></s-heading><s-badge tone="warning">Needs your review</s-badge></s-stack>
    <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1.5fr 1fr, 1fr" gap="large-100" alignItems="start">
     <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr" gap="base">
      <s-box background="subdued" padding="base" borderRadius="base"><s-stack gap="small"><s-stack direction="inline" gap="small-200" alignItems="center"><s-icon type="view" aria-hidden="true"></s-icon><s-text type="strong" fontWeight="medium">What we detected</s-text></s-stack><s-paragraph>${conclusion(trend)}</s-paragraph></s-stack></s-box>
      <s-box background="subdued" padding="base" borderRadius="base"><s-stack gap="small"><s-stack direction="inline" gap="small-200" alignItems="center"><s-icon type="lightbulb" aria-hidden="true"></s-icon><s-text type="strong" fontWeight="medium">What you should do next</s-text></s-stack><s-paragraph>${escape(trend.next)}</s-paragraph></s-stack></s-box>
     </s-grid></s-query-container>
     <s-stack gap="base">
      <s-text color="subdued">${trend.id==='shipping-drop'?'Shipping selected, with no payment or completion within 1 hour of starting checkout':'Completed within 1 hour of starting checkout'}</s-text>
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
       ${[trend.current,trend.comparison].map((group,index)=>`<s-stack gap="small"><s-text color="subdued">${trend.id==='device-gap'?(index?'Desktop':'Mobile'):(index?'Earlier half':'Recent half')}</s-text><s-number fontSize="large-100" fontWeight="bold" aria-label="${group.total?rate(group):'No checkouts to compare'}">${rate(group)}</s-number><s-text color="subdued">${group.count} of ${group.total} checkouts</s-text></s-stack>`).join('')}
      </s-grid>
     </s-stack>
    </s-grid></s-query-container>
    <s-text color="subdued">${simulationMode?'Test insight · Latest six hours. ':''}Checkout starts: ${escape(date(start))} – ${escape(date(end))}. Newer checkouts are still being observed.</s-text>
    <s-divider></s-divider>
    <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="small"><s-button variant="secondary" data-trend="${trend.id}" accessibilityLabel="View ${trend.sessionIds.length} affected checkouts: ${escape(trend.title)}">View ${trend.sessionIds.length} affected checkouts</s-button><s-button variant="tertiary" commandFor="insight-method">How comparisons work</s-button></s-stack>
   </s-stack></s-section>`;
 }).join('');
}
