import {appDisplayName} from './extensionApp.ts';
export const EVIDENCE_EVENT_LIMIT = 1000;
export const STORE = "build-sprint-demo.myshopify.com";
export const EVENT_NAMES = [
  "checkout_started", "checkout_contact_info_submitted",
  "checkout_address_info_submitted", "checkout_shipping_info_submitted",
  "payment_info_submitted", "checkout_completed", "alert_displayed", "ui_extension_errored",
] as const;
export type EventName = typeof EVENT_NAMES[number];
export type ErrorCategory = "discount" | "payment" | "delivery" | "validation" | "inventory" | "extension";
import type {CapturedLine} from './inventoryValue.ts';
export interface CheckoutEvent {
  discountCodeHash?:string;
  discountOfferCode?:string;
  extensionAppHash?: string;
  extensionAppName?: string;
  shippingBlocker?: "no_shipping_available";
  items?:CapturedLine[];
  eventId: string;
  sessionId: string;
  name: EventName;
  timestamp: number;
  category: ErrorCategory | null;
  subtotalCents?: number;
  currency?: "USD";
}

export function describeJourney(events: CheckoutEvent[]) {
  const ordered = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const completion = ordered.find(event => event.name === "checkout_completed");
  const progressLabels: Partial<Record<EventName, string>> = {
    checkout_started: "Checkout started",
    checkout_contact_info_submitted: "Contact submitted",
    checkout_address_info_submitted: "Address submitted",
    checkout_shipping_info_submitted: "Shipping submitted",
    payment_info_submitted: "Payment submitted",
  };
  const progress = ordered.filter(event => progressLabels[event.name] && (!completion || event.timestamp <= completion.timestamp)).at(-1);
  const errors = ordered.filter(event => event.category !== null);
  const categories = [...new Set(errors.map(event => event.category!))];
  const recovered = completion && errors.some(event => event.timestamp < completion.timestamp);
  return {
    lastProgress: progress ? progressLabels[progress.name]! : "Progress not observed",
    categories,
    errorCount: errors.length,
    outcome: completion ? recovered ? "Completed after an observed error" : "Completion observed" : "No completion observed",
    lastEventAt: ordered.at(-1)?.timestamp,
  };
}

// Only accept the minimal, anonymous test contract. Never retain a raw payload.
export function parseTestEvent(input: unknown, now: number): CheckoutEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some(key => !["eventId", "sessionId", "name", "timestamp", "category", "shippingBlocker", "extensionAppHash", "extensionAppName", "discountCodeHash"].includes(key))) return null;
  if (typeof record.eventId !== "string" || !/^[a-f0-9]{64}$/.test(record.eventId)) return null;
  if (typeof record.sessionId !== "string" || !/^[a-f0-9]{64}$/.test(record.sessionId)) return null;
  if (typeof record.name !== "string" || !EVENT_NAMES.some(name => name === record.name)) return null;
  if (typeof record.timestamp !== "number" || !Number.isFinite(record.timestamp)) return null;
  if (record.timestamp < now - 86400000 || record.timestamp > now + 60000) return null;
  if (record.category !== null && !["discount", "payment", "delivery", "validation", "inventory", "extension"].includes(String(record.category))) return null;
  if (record.name !== "alert_displayed" && record.name !== "ui_extension_errored" && record.category !== null) return null;
  if (record.discountCodeHash!==undefined && (record.name!=='alert_displayed'||record.category!=='discount'||typeof record.discountCodeHash!=='string'||!/^[a-f0-9]{64}$/.test(record.discountCodeHash)))return null;
  if (record.extensionAppName !== undefined && appDisplayName(record.extensionAppName)!==record.extensionAppName) return null;
  if (record.name === "ui_extension_errored") {
    if (record.category !== "extension" || typeof record.extensionAppHash !== "string" || !/^[a-f0-9]{64}$/.test(record.extensionAppHash)) return null;
  } else if (record.category === "extension" || record.extensionAppHash !== undefined || record.extensionAppName !== undefined) return null;
  if (record.shippingBlocker !== undefined && (record.shippingBlocker !== "no_shipping_available" || record.name !== "alert_displayed" || record.category !== "delivery")) return null;
  return record as unknown as CheckoutEvent;
}

export function summarize(events: CheckoutEvent[]) {
  const unique = [...new Map(events.map(event => [event.eventId, event])).values()]
    .sort((a, b) => a.timestamp - b.timestamp);
  const sessions = new Map<string, { id: string; started: boolean; completed: boolean; events: CheckoutEvent[] }>();
  for (const event of unique) {
    const session = sessions.get(event.sessionId) ?? { id: event.sessionId, started: false, completed: false, events: [] };
    session.started ||= event.name === "checkout_started";
    session.completed ||= event.name === "checkout_completed";
    session.events.push(event);
    sessions.set(event.sessionId, session);
  }
  const journeys = [...sessions.values()];
  const groups = (["discount", "payment", "delivery", "validation", "inventory", "extension"] as const).map(category => {
    const alerts = unique.filter(event => event.category === category);
    return { category, alerts: alerts.length, sessions: new Set(alerts.map(event => event.sessionId)).size };
  }).filter(group => group.alerts > 0).sort((a, b) => b.sessions - a.sessions || b.alerts - a.alerts);
  return {
    eventCount: unique.length,
    sessionCount: journeys.length,
    started: journeys.filter(session => session.started).length,
    completed: journeys.filter(session => session.completed).length,
    noCompletionObserved: journeys.filter(session => session.started && !session.completed).length,
    sessionsWithoutStart: journeys.filter(session => !session.started).length,
    observations: groups,
    journeys,
  };
}
