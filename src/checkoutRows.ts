import {journeyDate} from '../shared/journeyDate';
import {journeyDuration} from '../shared/journeyDuration';
import type {CheckoutEvent} from '../shared/evidence';
import {stepTimings,durationText} from '../shared/dashboardInsights';
import type {CheckoutTableRow} from '../shared/checkoutTable';

// One Checkouts table row and its details. Rows come from the server without events;
// the details timeline is built from the checkout's events once they are fetched.
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export const time = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
export const eventLabels: Record<CheckoutEvent["name"], string> = {
  checkout_started: "Checkout started", checkout_contact_info_submitted: "Contact information submitted",
  checkout_address_info_submitted: "Address information submitted", checkout_shipping_info_submitted: "Shipping information submitted",
  payment_info_submitted: "Payment information submitted", checkout_completed: "Checkout completed", alert_displayed: "Checkout alert displayed", ui_extension_errored: "Checkout app failed to load",
};
export const categoryLabels = { discount: "Discount or gift card", payment: "Payment", delivery: "Shipping", validation: "Form errors", inventory: "Item availability", extension: "Checkout app failed" };

const statusBadges=(row:CheckoutTableRow)=>`<s-badge tone="${row.completed ? "success" : "neutral"}">${row.completed ? 'Completed' : 'Abandoned'}</s-badge>${row.simulated ? '<s-badge tone="info">Simulated</s-badge>' : ''}`;
export function rowMarkup(row:CheckoutTableRow,money:(minor:number)=>string){
    return `<s-table-row data-session="${escape(row.id)}">
      <s-table-cell>${row.orderHref ? `<s-link href="${escape(row.orderHref)}" target="_top" accessibilityLabel="Open ${escape(row.label)} in Shopify">${escape(row.label)}</s-link>` : `<s-text type="strong">${escape(row.label)}</s-text>`}</s-table-cell>
      <s-table-cell>${escape(journeyDate(row.startedAt))}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center">${statusBadges(row)}</s-stack></s-table-cell>
      <s-table-cell>${escape(row.lastStep)}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center">${row.categories.length ? row.categories.map(category => `<s-badge tone="${category === "validation" ? "caution" : "neutral"}">${escape(categoryLabels[category as keyof typeof categoryLabels])}</s-badge>`).join("") : '<s-text color="subdued">No alerts recorded</s-text>'}</s-stack></s-table-cell>
      <s-table-cell>${row.basketCents===undefined ? "Unavailable" : escape(money(row.basketCents))}</s-table-cell>
      <s-table-cell><s-button variant="secondary" data-journey="${escape(row.id)}" accessibilityLabel="Show details: ${escape(row.label)}">Show details</s-button></s-table-cell>
    </s-table-row>`;
}
// The details header and completion note need only the row, so they show while events load.
export function timelineHeader(row:CheckoutTableRow){
    // An order keeps its name; an anonymous checkout shows its full reference.
    const fullLabel = row.label.startsWith('Order ') ? row.label : `#${row.id}`;
    const detailReference = row.orderHref ? `<s-link href="${escape(row.orderHref)}" target="_top" accessibilityLabel="Open ${escape(fullLabel)} in Shopify">${escape(fullLabel)}</s-link>` : fullLabel.match(/.{1,16}/gu)!.map(escape).join('<wbr>');
    const detailHeader = `<s-stack direction="inline" gap="small" alignItems="center"><s-heading fontSize="large">${detailReference}</s-heading>${statusBadges(row)}</s-stack>`;
    const note=`${row.outcome.serverCompleted&&!row.outcome.sources.includes('browser')?' Completion was confirmed separately. The timeline shows activity recorded in checkout.':''}${row.outcome.legacySignedCompletion?' An earlier completion record has no original time, so it cannot confirm completion.':''}${row.outcome.conflicting?' Some completion details couldn’t be verified. Only confirmed completion is counted.':''}`.trim();
    return detailHeader+(note?`<s-paragraph color="subdued">${note}</s-paragraph>`:'');
}
export function timelineMarkup(row:CheckoutTableRow,events:CheckoutEvent[]){
    const alerts = events.filter(event => event.category !== null);
    // Each bar is the step's share of the recorded step time; unavailable steps get an empty track.
    const timings=stepTimings(events),total=timings.reduce((sum,t)=>sum+(t.seconds??0),0);
    const timing=`<s-box background="subdued" padding="base" borderRadius="base"><s-stack gap="base"><s-heading>Time between checkout steps</s-heading>${timings.map(t=>{const percent=t.seconds!==null&&total>0?Math.round(t.seconds/total*100):0;return `<s-stack gap="small-200"><s-stack direction="inline" justifyContent="space-between" gap="small"><s-text type="strong">${t.step}</s-text><s-text>${durationText(t.seconds)}</s-text></s-stack><s-box data-step-bar role="img" aria-label="${t.step}: ${t.seconds===null?'unavailable':`${percent}% of recorded step time`}" data-step-width="${percent}"></s-box></s-stack>`;}).join('')}<s-text color="subdued">Times show gaps between recorded steps, not time spent typing.</s-text></s-stack></s-box>`;
    const activity=`<s-stack gap="small-200"><s-stack gap="small-200"><s-heading>Recorded activity</s-heading><s-text color="subdued">${journeyDuration(events)} · ${events.length} ${events.length === 1 ? "update" : "updates"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}</s-text></s-stack>
          <s-stack gap="none" accessibilityRole="ordered-list" accessibilityLabel="Recorded checkout activity, oldest first">
            ${events.map((event, eventIndex) => `<s-grid gridTemplateColumns="24px 1fr auto" gap="base" accessibilityRole="list-item">
              <s-box data-timeline-marker="${event.name === "checkout_completed" ? "completed" : "neutral"}" data-first="${eventIndex === 0}" data-last="${eventIndex === events.length - 1}" accessibilityVisibility="hidden"></s-box>
              <s-stack direction="inline" gap="small" paddingBlock="small-100" alignItems="center">
                <s-text>${escape(eventLabels[event.name])}${event.extensionAppName?` · ${escape(event.extensionAppName)}`:""}${event.discountOfferCode?` · ${escape(event.discountOfferCode)}`:""}</s-text>
                ${event.category ? `<s-badge tone="${event.shippingBlocker ? "critical" : event.category === "validation" ? "caution" : "neutral"}">${event.shippingBlocker ? "Shipping unavailable" : escape(categoryLabels[event.category])}</s-badge>` : ""}
              </s-stack>
              <s-box paddingBlock="small-100">
                <s-text color="subdued">${escape(time(event.timestamp).replaceAll(" ", "\u00a0"))}</s-text>
              </s-box>
            </s-grid>`).join("")}
          </s-stack></s-stack>`;
    return timelineHeader(row)+`<s-query-container><s-grid gridTemplateColumns="@container (inline-size > 720px) 1.6fr 1fr, 1fr" gap="large-200">${activity}${timing}</s-grid></s-query-container>`;
}
