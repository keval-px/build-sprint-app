// Order numbers require an exact checkout-token hash match from Shopify.
// Dates, totals, and list positions must never establish an order identity.
export function journeyLabel(sessionId: string, orders: {sessionId?: string; orderName?: string}[]) {
  const matches = orders.filter(order => order.sessionId === sessionId);
  return matches.length === 1 && matches[0].orderName
    ? `Order ${matches[0].orderName}`
    : `#${sessionId.slice(0, 12)}…`;
}

export function journeyOrderHref(sessionId: string, orders: {sessionId?: string; orderName?: string; orderId?: string}[]) {
  const matches = orders.filter(order => order.sessionId === sessionId);
  const order = matches.length === 1 ? matches[0] : undefined;
  return order?.orderName && order.orderId && /^[1-9]\d*$/.test(order.orderId)
    ? `shopify://admin/orders/${order.orderId}`
    : null;
}
