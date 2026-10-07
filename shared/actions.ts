import { summarize } from "./evidence.ts";
import type { CheckoutEvent, ErrorCategory } from "./evidence.ts";

export const ACTION_STEPS = ["payment-review", "payment-reproduce", "payment-compare", "validation-review", "validation-reproduce", "validation-record", "unfinished-review", "unfinished-compare", "unfinished-record", "delivery-review", "delivery-reproduce", "delivery-compare", "discount-review", "discount-reproduce", "discount-compare", "inventory-review", "inventory-reproduce", "inventory-compare"] as const;
export type ActionStep = typeof ACTION_STEPS[number];
export type MissionId = "payment" | "validation" | "unfinished" | "delivery" | "discount" | "inventory";
export interface Mission {
  id: MissionId; title: string; description: string; why: string; next: string; count: number;
  sessionIds: string[]; badge: string; steps: { id: ActionStep; label: string }[];
}
export function isViewerId(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{32}$/.test(value); }
export function isActionStep(value: unknown): value is ActionStep { return typeof value === "string" && ACTION_STEPS.some(step => step === value); }
export function progressScore(completed: readonly string[]) {
  const valid = new Set(completed.filter(isActionStep));
  const badges = (["payment", "validation", "unfinished"] as const).filter(mission => ACTION_STEPS.filter(step => step.startsWith(mission + "-")).every(step => valid.has(step)));
  return { steps: valid.size, points: valid.size * 20, badges, totalSteps: ACTION_STEPS.length, totalPoints: ACTION_STEPS.length * 20 };
}
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
    { id: "payment", title: "Investigate payment errors", count: paymentIds.length, sessionIds: paymentIds, badge: "Payment investigator",
      description: `${paymentIds.length} checkout${paymentIds.length === 1 ? "" : "s"} had a payment alert. ${paymentRecovered} later completed.`,
      why: "Payment errors can interrupt a purchase. Check whether the customer completed after the error.",
      next: "Check your payment provider, reproduce the error in test mode, and compare a completed checkout.",
      steps: [{id:"payment-review",label:"I reviewed a session with a payment alert"},{id:"payment-reproduce",label:"I reproduced a payment error in the demo checkout"},{id:"payment-compare",label:"I compared the failure with a completed checkout"}] },
    { id: "validation", title: "Review checkout form errors", count: validationIds.length, sessionIds: validationIds, badge: "Evidence detective",
      description: `${validationIds.length} checkout${validationIds.length === 1 ? "" : "s"} had form-validation alerts. The field and error message are not available.`,
      why: "Form errors may prevent customers from continuing. The recorded alert does not identify the field or cause.",
      next: "Reproduce the alert. Identify the field and message, then retest the correction.",
      steps: [{id:"validation-review",label:"I reviewed a checkout form error"},{id:"validation-reproduce",label:"I reproduced an alert and checked its visible message"},{id:"validation-record",label:"I recorded what I observed before choosing a fix"}] },
    { id: "unfinished", title: "Review unfinished checkouts", count: unfinishedIds.length, sessionIds: unfinishedIds, badge: "Journey explorer",
      description: `${unfinishedIds.length} checkout${unfinishedIds.length === 1 ? "" : "s"} ${unfinishedIds.length===1?"has":"have"} no recorded completion.`,
      why: "These checkouts have no recorded purchase. Customers may have left, or some activity may be missing.",
      next: "Compare the last recorded step with a completed checkout. Check for missing activity.",
      steps: [{id:"unfinished-review",label:"I reviewed an unfinished checkout's last recorded step"},{id:"unfinished-compare",label:"I compared it with a completed checkout"},{id:"unfinished-record",label:"I separated observed facts from an unconfirmed cause"}] },
    {id:'delivery',title:blockedShippingIds.length?'Resolve unavailable shipping':'Review shipping alerts',count:deliveryIds.length,sessionIds:deliveryIds,badge:'Shipping investigator',
      description:`${blockedShippingIds.length} checkout${blockedShippingIds.length===1?"":"s"} showed shipping unavailable. ${deliveryIds.length-blockedShippingIds.length} had general shipping alerts with no confirmed blocker.`,
      why:'An unavailable shipping option can block a willing customer from buying. A delivery alert alone does not prove a shipping outage.',
      next:'Retest the same basket and address. Check shipping zones, product profiles and the rate provider.',
      steps:[{id:'delivery-review',label:'I reviewed the affected delivery step'},{id:'delivery-reproduce',label:'I reproduced the visible shipping problem safely'},{id:'delivery-compare',label:'I retested the same basket and address after the change'}]},
    {id:'discount',title:repeatedDiscounts?'Investigate repeated discount errors':'Review rejected discounts',count:discountIds.length,sessionIds:discountIds,badge:'Promotion investigator',
      description:`${discountIds.length} checkout${discountIds.length===1?"":"s"} had discount or gift-card alerts. ${repeatedDiscounts} unfinished checkout${repeatedDiscounts===1?"":"s"} had repeated alerts. This does not prove the same code was entered repeatedly.`,
      why:'Customers expecting a promised discount may hesitate when it fails. Correcting the offer can help, but some codes are legitimately ineligible.',
      next:'Check expiry, minimum spend, eligibility and code combinations. Retest the advertised offer.',
      steps:[{id:'discount-review',label:'I checked the advertised offer and affected checkout'},{id:'discount-reproduce',label:'I reproduced the rejection and confirmed eligibility'},{id:'discount-compare',label:'I tested the corrected offer and will compare completion'}]},
    {id:'inventory',title:'Review unavailable items',count:inventoryIds.length,sessionIds:inventoryIds,badge:'Availability investigator',
      description:`${inventoryIds.length} checkout${inventoryIds.length===1?"":"s"} had stock or item-availability alerts. Check whether the item was sold out, restricted, or unavailable from a fulfilment location.`,
      why:'Customers may reach checkout with an item they cannot buy. An availability alert does not prove that restocking alone will resolve it.',
      next:'Check stock, selling permissions and fulfilment location. Restore availability or offer an alternative, then retest.',
      steps:[{id:'inventory-review',label:'I checked the affected item and available stock'},{id:'inventory-reproduce',label:'I reproduced the availability problem safely'},{id:'inventory-compare',label:'I retested the same item after restoring availability'}]},
  ];
}

export function missionSeverity(mission: Mission, events: CheckoutEvent[]): {
  label: "Critical" | "Warning" | "Info"; tone: "critical" | "caution" | "info"; reason: string;
} {
  if (mission.id === "unfinished" || !mission.count) return {
    label: "Info", tone: "info", reason: "No purchase was recorded. Review the last checkout step.",
  };
  const unresolved = mission.sessionIds.some(id => {
    const alerts = events.filter(event => event.sessionId === id && event.category === mission.id);
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
    label: "Critical", tone: "critical", reason: "Shipping was unavailable in an affected checkout. Retest to confirm it works now.",
  };
  if (mission.id === "payment" || mission.id === "inventory") return {
    label: "Critical", tone: "critical", reason: mission.id === "payment" ? "A recorded payment error may have blocked a purchase. Retest the affected checkout." : "An unavailable item may have blocked a purchase. Check the item and retest.",
  };
  return {
    label: "Warning", tone: "caution", reason: mission.id === "validation" ? "A form alert may have interrupted checkout. Check the field and retest." : mission.id === "discount" ? "A discount or gift-card alert may have interrupted checkout. Check eligibility and retest." : "A shipping alert was recorded. Retest before changing delivery settings.",
  };
}

// A fix marker separates recorded periods; it is not evidence that a problem
// is fixed or still occurring. Include alerts from resumed older checkouts.
export function missionSignal(mission: Mission, events: CheckoutEvent[], appliedAt?: number) {
  const matching = events.filter(event => mission.sessionIds.includes(event.sessionId) && event.category === mission.id);
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
