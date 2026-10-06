import { summarize } from "./evidence.ts";
import type { CheckoutEvent, ErrorCategory } from "./evidence.ts";

export const ACTION_STEPS = ["payment-review", "payment-reproduce", "payment-compare", "validation-review", "validation-reproduce", "validation-record", "unfinished-review", "unfinished-compare", "unfinished-record"] as const;
export type ActionStep = typeof ACTION_STEPS[number];
export type MissionId = "payment" | "validation" | "unfinished";
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
  const paymentRecovered = summary.journeys.filter(session => {
    const completion = session.events.find(event => event.name === "checkout_completed");
    return completion && session.events.some(event => event.category === "payment" && event.timestamp < completion.timestamp);
  }).length;
  return [
    { id: "payment", title: "Investigate payment errors", count: paymentIds.length, sessionIds: paymentIds, badge: "Payment investigator",
      description: `${paymentIds.length} test checkout${paymentIds.length === 1 ? "" : "s"} recorded a payment alert. ${paymentRecovered} later recorded completion.`,
      why: "A payment alert can interrupt a purchase, but some checkouts recover. Compare the failed attempt with the next recorded events.",
      next: "Review a payment-alert timeline, reproduce the test-gateway failure, and compare it with a completed test checkout. Check the payment provider before proposing a live-store change.",
      steps: [{id:"payment-review",label:"I reviewed a session with a payment alert"},{id:"payment-reproduce",label:"I reproduced a payment error in the demo checkout"},{id:"payment-compare",label:"I compared the failure with a completed checkout"}] },
    { id: "validation", title: "Understand input validation alerts", count: validationIds.length, sessionIds: validationIds, badge: "Evidence detective",
      description: `${validationIds.length} test checkout${validationIds.length === 1 ? "" : "s"} recorded input-validation alerts. The exact field and message were not collected.`,
      why: "An alert category gives you a place to investigate. It does not prove email friction, repeated typing, or a particular broken rule.",
      next: "Inspect a validation-alert session and reproduce it while watching Shopify's visible message. Record the field and rule in your investigation notes before changing checkout settings.",
      steps: [{id:"validation-review",label:"I reviewed a validation-alert timeline"},{id:"validation-reproduce",label:"I reproduced an alert and checked its visible message"},{id:"validation-record",label:"I recorded what I observed before choosing a fix"}] },
    { id: "unfinished", title: "Trace where recorded progress ends", count: unfinishedIds.length, sessionIds: unfinishedIds, badge: "Journey explorer",
      description: `${unfinishedIds.length} test checkout${unfinishedIds.length === 1 ? "" : "s"} have no completion event in this view. These stops were deliberately generated.`,
      why: "The last recorded submission shows where our evidence ends. Missing completion can reflect an unfinished test, missing events, or consent; it is not a proven cause of abandonment.",
      next: "Compare a contact or shipping stop with a completed journey. Write down the last observed step and what evidence is missing; leave the cause unconfirmed.",
      steps: [{id:"unfinished-review",label:"I reviewed an unfinished checkout's last recorded step"},{id:"unfinished-compare",label:"I compared it with a completed checkout"},{id:"unfinished-record",label:"I separated observed facts from an unconfirmed cause"}] },
  ];
}
