// Only anonymous USD product subtotals cross the server-data boundary.
export function usdCents(money: unknown): number | null {
  if (!money || typeof money !== 'object') return null;
  const value = money as Record<string, unknown>;
  if (value.currencyCode !== 'USD' || typeof value.amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value.amount)) return null;
  const [whole, decimals = ''] = value.amount.split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}
export async function recordDigest(kind: string, id: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`build-sprint-demo.myshopify.com:${kind}:${id}`));
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
}
