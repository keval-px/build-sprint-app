export function journeyDate(timestamp: number, now = new Date()) {
  const date = new Date(timestamp);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = sameDay(date, now) ? 'Today' : sameDay(date, yesterday) ? 'Yesterday' : date.toLocaleDateString(undefined, {day:'numeric',month:'short',...(date.getFullYear() !== now.getFullYear() ? {year:'numeric' as const} : {})});
  const clock = date.toLocaleTimeString(undefined, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  return `${day}, ${clock}`;
}
