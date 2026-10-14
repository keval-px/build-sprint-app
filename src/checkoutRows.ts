import {journeyLabel,journeyOrderHref} from '../shared/journeyLabel';
import {journeyDate} from '../shared/journeyDate';
import {journeyDuration} from '../shared/journeyDuration';
import {describeJourney,type CheckoutEvent} from '../shared/evidence';
import {lastObservedStep,stepTimings,durationText} from '../shared/dashboardInsights';
import {outcomeLabel,type CheckoutOutcome} from '../shared/checkoutOutcome';

// One Checkouts table row and its details timeline. The timeline is built only when
// a merchant opens the details, not for every checkout on every render.
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export const time = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
export const eventLabels: Record<CheckoutEvent["name"], string> = {
  checkout_started: "Checkout started", checkout_contact_info_submitted: "Contact information submitted",
  checkout_address_info_submitted: "Address information submitted", checkout_shipping_info_submitted: "Shipping information submitted",
  payment_info_submitted: "Payment information submitted", checkout_completed: "Checkout completed", alert_displayed: "Checkout alert displayed", ui_extension_errored: "Checkout app failed to load",
};
export const categoryLabels = { discount: "Discount or gift card", payment: "Payment", delivery: "Shipping", validation: "Form errors", inventory: "Item availability", extension: "Checkout app failed" };

export interface JourneySession {id:string;completed:boolean;events:CheckoutEvent[];outcome:CheckoutOutcome}
export interface CheckoutRow {events:CheckoutEvent[];shippingBlocker:boolean;startedAt:number;basketCents?:number;id:string;label:string;completed:boolean;outcome:CheckoutOutcome;categories:string[];row:string;timeline:()=>string}
export function checkoutRow(session:JourneySession,sessionOrders:{sessionId?:string;orderName?:string;orderId?:string}[],basketCents:number|undefined,money:(minor:number)=>string):CheckoutRow {
    const alerts = session.events.filter(event => event.category !== null);
    const detail = describeJourney(session.events);
    const status = session.completed ? 'Completed' : 'Abandoned';
    const simulatedBadge = session.events.some(event => event.simulated) ? '<s-badge tone="info">Simulated</s-badge>' : '';
    const label = journeyLabel(session.id, sessionOrders);
    const fullLabel = journeyLabel(session.id, sessionOrders, true);
    const orderHref = journeyOrderHref(session.id, sessionOrders);
    const detailReference = orderHref ? `<s-link href="${escape(orderHref)}" target="_top" accessibilityLabel="Open ${escape(fullLabel)} in Shopify">${escape(fullLabel)}</s-link>` : fullLabel.match(/.{1,16}/gu)!.map(escape).join('<wbr>');
    const detailHeader = `<s-stack direction="inline" gap="small" alignItems="center"><s-heading fontSize="large">${detailReference}</s-heading><s-badge tone="${session.completed ? 'success' : 'neutral'}">${status}</s-badge>${simulatedBadge}</s-stack>`;
    const row = `<s-table-row data-session="${escape(session.id)}">
      <s-table-cell>${orderHref ? `<s-link href="${escape(orderHref)}" target="_top" accessibilityLabel="Open ${escape(label)} in Shopify">${escape(label)}</s-link>` : `<s-text type="strong">${escape(label)}</s-text>`}</s-table-cell>
      <s-table-cell>${escape(journeyDate(session.events[0].timestamp))}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center"><s-badge tone="${session.completed ? "success" : "neutral"}">${status}</s-badge>${simulatedBadge}</s-stack></s-table-cell>
      <s-table-cell>${escape(lastObservedStep(session.events))}</s-table-cell>
      <s-table-cell><s-stack direction="inline" gap="small" alignItems="center">${detail.categories.length ? detail.categories.map(category => `<s-badge tone="${category === "validation" ? "caution" : "neutral"}">${escape(categoryLabels[category])}</s-badge>`).join("") : '<s-text color="subdued">No alerts recorded</s-text>'}</s-stack></s-table-cell>
      <s-table-cell>${basketCents===undefined ? "Unavailable" : escape(money(basketCents))}</s-table-cell>
      <s-table-cell><s-button variant="secondary" data-journey="${escape(session.id)}" accessibilityLabel="Show details: ${escape(label)}">Show details</s-button></s-table-cell>
    </s-table-row>`;
    const timeline=()=>{
    const timing=`<s-stack gap="small"><s-heading>Time between checkout steps</s-heading><s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="small">${stepTimings(session.events).map(t=>`<s-stack gap="small"><s-text type="strong">${t.step}</s-text><s-text>${durationText(t.seconds)}</s-text><s-text color="subdued">${t.note}</s-text></s-stack>`).join('')}</s-grid></s-query-container><s-text color="subdued">Times show gaps between recorded steps, not time spent typing.</s-text></s-stack><s-divider></s-divider>`;
    const outcomeNote=`<s-paragraph color="subdued">${session.completed?`${escape(outcomeLabel(session.outcome))}.`:'Abandoned means no completed checkout has been recorded yet.'}${session.outcome.serverCompleted&&!session.outcome.sources.includes('browser')?' Completion was confirmed separately. The timeline shows activity recorded in checkout.':''}${session.outcome.legacySignedCompletion?' An earlier completion record has no original time, so it cannot confirm completion.':''}${session.outcome.conflicting?' Some completion details couldn’t be verified. Only confirmed completion is counted.':''}</s-paragraph>`;
    return detailHeader+outcomeNote+timing+`          <s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Recorded activity</s-heading><s-text color="subdued">${journeyDuration(session.events)} · ${session.events.length} ${session.events.length === 1 ? "update" : "updates"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}</s-text></s-stack>
          <s-stack gap="none" accessibilityRole="ordered-list" accessibilityLabel="Recorded checkout activity, oldest first">
            ${session.events.map((event, eventIndex) => `<s-grid gridTemplateColumns="24px 1fr auto" gap="base" accessibilityRole="list-item">
              <s-box data-timeline-marker="${event.name === "checkout_completed" ? "completed" : "neutral"}" data-first="${eventIndex === 0}" data-last="${eventIndex === session.events.length - 1}" accessibilityVisibility="hidden"></s-box>
              <s-stack direction="inline" gap="small" paddingBlock="small-100" alignItems="center">
                <s-text>${escape(eventLabels[event.name])}${event.extensionAppName?` · ${escape(event.extensionAppName)}`:""}${event.discountOfferCode?` · ${escape(event.discountOfferCode)}`:""}</s-text>
                ${event.category ? `<s-badge tone="${event.shippingBlocker ? "critical" : event.category === "validation" ? "caution" : "neutral"}">${event.shippingBlocker ? "Shipping unavailable" : escape(categoryLabels[event.category])}</s-badge>` : ""}
              </s-stack>
              <s-box paddingBlock="small-100">
                <s-text color="subdued">${escape(time(event.timestamp).replaceAll(" ", "\u00a0"))}</s-text>
              </s-box>
            </s-grid>`).join("")}
          </s-stack>`;
    };
    return {events:session.events,shippingBlocker:session.events.some(e=>e.shippingBlocker==='no_shipping_available'),startedAt:session.events[0].timestamp,basketCents,id:session.id,label,completed:session.completed,outcome:session.outcome,categories:detail.categories,row,timeline};
}
