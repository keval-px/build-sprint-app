import { summarize } from "./evidence.ts";
import type { CheckoutEvent, ErrorCategory } from "./evidence.ts";

export type MissionId = "payment" | "validation" | "unfinished" | "delivery" | "discount" | "inventory";
// Destinations are verified in the demo store admin. These links open settings;
// they do not apply a fix or grant additional permissions.
export const ACTION_DESTINATIONS: Partial<Record<MissionId, {label:string; path:string}>> = {
  payment: {label:"Open payment settings", path:"settings/payments"},
  delivery: {label:"Open shipping settings", path:"settings/shipping"},
  discount: {label:"Open discounts", path:"discounts"},
  inventory: {label:"Open products", path:"products"},
  validation: {label:"Open checkout settings", path:"settings/checkout"},
};

export const ACTION_CHECKS: Record<MissionId, string> = {
  payment: "Complete a test-mode order using the affected payment method.",
  delivery: "Retry the same basket and address. Shipping should appear and let you continue to payment.",
  discount: "Use an eligible basket. The discount or gift card should update the total and let you continue to payment.",
  validation: "Enter valid details in the affected field. You should be able to continue without the same error.",
  inventory: "Use the same item and quantity. It should stay available through payment.",
  unfinished: "Retry the last recorded step and complete a test order. Confirm it appears as completed in Checkout drill-down.",
};

export interface Mission {
  signal?:"shipping_unavailable";id: MissionId; title: string; description: string; why: string; next: string; count: number;
  sessionIds: string[];
}
export function isViewerId(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{32}$/.test(value); }
export function buildMissions(events: CheckoutEvent[]): Mission[] {
  const summary = summarize(events);
  const matching = (category: ErrorCategory) => summary.journeys.filter(session => session.events.some(event => event.category === category)).map(session => session.id);
  const paymentIds = matching("payment");
  const validationIds = matching("validation");
  const unfinishedIds = summary.journeys.filter(session => session.started && !session.completed).map(session => session.id);
  const deliveryIds=matching('delivery'),discountIds=matching('discount'),inventoryIds=matching('inventory');
  const blockedShippingIds = summary.journeys.filter(session => session.events.some(event => event.shippingBlocker === "no_shipping_available")).map(session => session.id);
  const repeatedDiscounts=summary.journeys.filter(session=>session.events.filter(event=>event.category==='discount').length>=2&&!session.completed).length;
  const paymentRecovered = summary.journeys.filter(session => {
    const completion = session.events.find(event => event.name === "checkout_completed");
    return completion && session.events.some(event => event.category === "payment" && event.timestamp < completion.timestamp);
  }).length;
  return [
    { id: "payment", title: "Investigate payment errors", count: paymentIds.length, sessionIds: paymentIds,
      description: `${paymentIds.length} checkout${paymentIds.length === 1 ? "" : "s"} had a payment alert. ${paymentRecovered} later completed. The alert alone does not identify a card decline or provider fault.`,
      why: "Payment errors can interrupt a purchase. Check whether the customer completed after the error.",
      next: paymentIds.length > 0 && paymentIds.every(id => {
        const alerts = events.filter(event => event.sessionId === id && event.category === "payment");
        const lastAlert = Math.max(...alerts.map(event => event.timestamp));
        return events.some(event => event.sessionId === id && event.name === "checkout_completed" && event.timestamp > lastAlert);
      })
        ? "These checkouts completed after their last payment alert. Review the retries before changing payment settings."
        : "Check the payment-provider record for an affected attempt. Confirm whether the card was declined or a provider/setup fault blocked payment. Do not treat every card decline as a store fault.", },
    { id: "validation", title: "Review checkout form errors", count: validationIds.length, sessionIds: validationIds,
      description: `${validationIds.length} checkout${validationIds.length === 1 ? "" : "s"} had form-validation alerts. The field and error message are not available.`,
      why: "Form errors may prevent customers from continuing. The recorded alert does not identify the field or cause.",
      next: "Open an affected checkout and identify the field and visible message. Correct the rule only if valid customer details are rejected.", },
    { id: "unfinished", title: "Review unfinished checkouts", count: unfinishedIds.length, sessionIds: unfinishedIds,
      description: `${unfinishedIds.length} checkout${unfinishedIds.length === 1 ? "" : "s"} ${unfinishedIds.length===1?"has":"have"} no recorded completion.`,
      why: "These checkouts have no recorded purchase. Customers may have left, or some activity may be missing.",
      next: "Open an unfinished checkout and retry its last recorded step. Fix any blocker you find; otherwise check for missing purchase activity before choosing a fix.", },
    {id:'delivery',title:blockedShippingIds.length?'Resolve unavailable shipping':'Review shipping alerts',count:deliveryIds.length,sessionIds:deliveryIds,
      description:`${blockedShippingIds.length} checkout${blockedShippingIds.length===1?"":"s"} showed shipping unavailable. ${deliveryIds.length-blockedShippingIds.length} had general shipping alerts with no confirmed blocker.`,
      why:'An unavailable shipping option can block a willing customer from buying. A delivery alert alone does not prove a shipping outage.',
      next:blockedShippingIds.length
        ? 'Confirm the destination should have shipping. Check its shipping zone, product profile, and price or weight limits. Correct any missing rate or restriction.'
        : 'Retry the affected basket and destination. Check whether a delivery option can be selected and checkout continues. Investigate shipping settings only if the alert still prevents progress.',},
    {id:'discount',title:repeatedDiscounts?'Investigate repeated discount errors':'Review rejected discounts',count:discountIds.length,sessionIds:discountIds,
      description:`${discountIds.length} checkout${discountIds.length===1?"":"s"} had discount or gift-card alerts. ${repeatedDiscounts} unfinished checkout${repeatedDiscounts===1?"":"s"} had repeated alerts. This does not prove the same code was entered repeatedly.`,
      why:'Customers expecting a promised discount may hesitate when it fails. Correcting the offer can help, but some codes are legitimately ineligible.',
      next:repeatedDiscounts
        ? 'Find the offer the customer expected. Check expiry, minimum spend, eligible items and combinations. Correct the offer if the advertised terms should apply.'
        : 'Check whether the alert concerns a discount code or gift card. Verify its terms and balance where relevant. Correct a valid offer that is being rejected.',},
    {id:'inventory',title:'Review unavailable items',count:inventoryIds.length,sessionIds:inventoryIds,
      description:`${inventoryIds.length} checkout${inventoryIds.length===1?"":"s"} had stock or item-availability alerts. Check whether the item was sold out, restricted, or unavailable from a fulfilment location.`,
      why:'Customers may reach checkout with an item they cannot buy. An availability alert does not prove that restocking alone will resolve it.',
      next:'Check the affected item’s stock, selling permissions and fulfilment location. If it should be available, correct its availability. If sold out, update the offer or provide an alternative.',},
  ];
}

// Use the current alert period for advice after a fix, while keeping the full
// selected-period counts intact. Without new alerts, retain the retest guidance.
export function missionRecommendation(mission: Mission, events: CheckoutEvent[], boundary?: number): string {
  if (boundary === undefined || mission.id === "unfinished") return mission.next;
  const current = buildMissions(events.filter(event => event.timestamp >= boundary)).find(item => item.id === mission.id)!;
  return current.count ? current.next : mission.next;
}

export function missionSeverity(mission: Mission, events: CheckoutEvent[]): {
  label: "Critical" | "Warning" | "Info"; tone: "critical" | "caution" | "info"; reason: string;
} {
  if (mission.id === "unfinished" || !mission.count) return {
    label: "Info", tone: "info", reason: "No purchase was recorded.",
  };
  const unresolved = mission.sessionIds.some(id => {
    const alerts = events.filter(event => event.sessionId === id && event.category === mission.id && (!mission.signal||event.shippingBlocker==='no_shipping_available'));
    const lastAlert = Math.max(...alerts.map(event => event.timestamp));
    return !events.some(event => event.sessionId === id && event.name === "checkout_completed" && event.timestamp > lastAlert);
  });
  if (!unresolved) return {
    label: "Info", tone: "info", reason: "Affected checkouts completed after their last alert.",
  };
  if (mission.id === "delivery" && mission.sessionIds.some(id => {
    const blockers = events.filter(event => event.sessionId === id && event.category === "delivery" && event.shippingBlocker === "no_shipping_available");
    return blockers.some(blocker => !events.some(event => event.sessionId === id && event.name === "checkout_completed" && event.timestamp > blocker.timestamp));
  })) return {
    label: "Critical", tone: "critical", reason: "Shipping was unavailable for an affected basket.",
  };
  if (mission.id === "payment" || mission.id === "inventory") return {
    label: "Critical", tone: "critical", reason: mission.id === "payment" ? "A payment error may have blocked a purchase." : "An unavailable item may have blocked a purchase.",
  };
  return {
    label: "Warning", tone: "caution", reason: mission.id === "validation" ? "A form alert may have interrupted checkout." : mission.id === "discount" ? "A discount or gift-card alert may have interrupted checkout." : "A shipping alert was recorded; availability is not confirmed.",
  };
}

// A fix marker separates recorded periods; it is not evidence that a problem
// is fixed or still occurring. Include alerts from resumed older checkouts.
export function missionSignal(mission: Mission, events: CheckoutEvent[], appliedAt?: number) {
  const matching = events.filter(event => mission.sessionIds.includes(event.sessionId) && event.category === mission.id && (!mission.signal||event.shippingBlocker==='no_shipping_available'));
  const after = appliedAt === undefined ? matching : matching.filter(event => event.timestamp >= appliedAt);
  const latestAlert = matching.length ? Math.max(...matching.map(event => event.timestamp)) : null;
  const period = appliedAt === undefined ? 'recorded' : after.length ? 'after' : 'before';
  const ids = [...new Set(after.map(event => event.sessionId))];
  const severity = appliedAt === undefined || mission.id === 'unfinished'
    ? missionSeverity(mission, events)
    : after.length
      ? missionSeverity({...mission, count:ids.length, sessionIds:ids}, events.filter(event => event.timestamp >= appliedAt))
      : {label:'Info' as const, tone:'info' as const, reason:'No new alerts since your last check. This does not verify the fix.'};
  return {period, latestAlert, severity};
}
