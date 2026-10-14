import {outcomeResolver,type OutcomeFacts} from './checkoutOutcome.ts';
import {appDisplayName} from './extensionApp.ts';
import {deployment} from './deployment.ts';
export const STORE = deployment.store;
export const EVENT_NAMES = [
  "checkout_started", "checkout_contact_info_submitted",
  "checkout_address_info_submitted", "checkout_shipping_info_submitted",
  "payment_info_submitted", "checkout_completed", "alert_displayed", "ui_extension_errored",
] as const;
export type EventName = typeof EVENT_NAMES[number];
export type ErrorCategory = "discount" | "payment" | "delivery" | "validation" | "inventory" | "extension";
import type {CapturedLine} from './inventoryValue.ts';
export interface CheckoutEvent {
  simulated?:true;
  deviceClass?:'mobile'|'desktop'|'tablet';
  expressPay?:true;
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

// Alert types recorded in a checkout, in the order they first appeared.
export function alertCategories(events: CheckoutEvent[]) {
  return [...new Set([...events].sort((a, b) => a.timestamp - b.timestamp).flatMap(event => event.category === null ? [] : [event.category]))];
}

// Only accept the minimal, anonymous test contract. Never retain a raw payload.
export function parseTestEvent(input: unknown, now: number): CheckoutEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some(key => !["deviceClass", "expressPay", "eventId", "sessionId", "name", "timestamp", "category", "shippingBlocker", "extensionAppHash", "extensionAppName", "discountCodeHash"].includes(key))) return null;
  if(record.deviceClass!==undefined&&(typeof record.deviceClass!=='string'||!['mobile','desktop','tablet'].includes(record.deviceClass)))return null;
  if(record.expressPay!==undefined&&record.expressPay!==true)return null;
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

export function summarize(events: CheckoutEvent[],facts:OutcomeFacts={}) {
  const asOf=facts.asOf??Date.now();
  const unique = [...new Map(events.filter(event=>Number.isFinite(event.timestamp)&&event.timestamp<=asOf).map(event => [event.eventId, event])).values()]
    .sort((a, b) => a.timestamp - b.timestamp);
  const sessions = new Map<string, { id: string; started: boolean; completed: boolean; events: CheckoutEvent[] }>();
  for (const event of unique) {
    const session = sessions.get(event.sessionId) ?? { id: event.sessionId, started: false, completed: false, events: [] };
    session.started ||= event.name === "checkout_started";
    session.completed ||= event.name === "checkout_completed";
    session.events.push(event);
    sessions.set(event.sessionId, session);
  }
  const outcome=outcomeResolver({...facts,asOf});
  const journeys = [...sessions.values()].map(session=>{const result=outcome(session.id,session.events);return {...session,completed:result.completed,outcome:result};});
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
    observations: groups,
    journeys,
  };
}
