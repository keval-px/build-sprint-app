import type {CheckoutEvent} from './evidence';

export function journeyDuration(events: CheckoutEvent[]) {
  const ordered = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const start = ordered.find(event => event.name === 'checkout_started');
  if (!start) return 'Time unknown';
  const end = ordered.find(event => event.name === 'checkout_completed' && event.timestamp >= start.timestamp) ?? ordered.at(-1)!;
  const seconds = Math.max(0, Math.floor((end.timestamp - start.timestamp) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} spent time`;
}
