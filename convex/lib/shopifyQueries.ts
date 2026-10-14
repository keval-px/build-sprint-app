export const identityQuery = `query ConnectionIdentity {
  shop { name myshopifyDomain currencyCode ianaTimezone }
  currentAppInstallation { app { id title } accessScopes { handle } }
}`;
export const abandonedQuery = `query AbandonedEvidence($after: String, $filter: String!) {
  abandonedCheckouts(first: 100, after: $after, query: $filter, sortKey: CREATED_AT) {
    nodes { id createdAt updatedAt completedAt subtotalPriceSet { shopMoney { amount currencyCode } } totalPriceSet { shopMoney { amount currencyCode } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
export const ordersQuery = `query OrderEvidence($after: String, $filter: String!) {
  orders(first: 100, after: $after, query: $filter, sortKey: CREATED_AT) {
    nodes { id name checkoutToken createdAt updatedAt test cancelledAt displayFinancialStatus currentTotalPriceSet { shopMoney { amount currencyCode } } currentSubtotalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
// AbandonedCheckoutSortKeys has no UPDATED_AT. Filtering is still incremental;
// keep the supported stable creation-time ordering for resumable pagination.
export const abandonedUpdatesQuery=abandonedQuery;
export const ordersUpdatesQuery=ordersQuery.replace('sortKey: CREATED_AT','sortKey: UPDATED_AT');
export const pixelQuery = `query PixelSettings { webPixel { id settings } }`;
export const pixelCreate = `mutation EnableCheckoutEvidence($settings: JSON!) {
  webPixelCreate(webPixel: {settings: $settings}) { webPixel { id settings } userErrors { field message } }
}`;
export const pixelUpdate = `mutation UpdateCheckoutEvidence($id: ID!, $settings: JSON!) {
  webPixelUpdate(id: $id, webPixel: {settings: $settings}) { webPixel { id settings } userErrors { field message } }
}`;
export const checkoutSubscriptionUpdate = `mutation UpdateCheckoutDestination($id: ID!, $subscription: WebhookSubscriptionInput!) {
  webhookSubscriptionUpdate(id: $id, webhookSubscription: $subscription) { webhookSubscription { id uri } userErrors { field message } }
}`;
export const checkoutSubscriptionsQuery = `query CheckoutPriceSubscriptions {
  webhookSubscriptions(first: 100, topics: [CHECKOUTS_CREATE, CHECKOUTS_UPDATE]) {
    nodes { id topic uri includeFields }
    pageInfo { hasNextPage }
  }
}`;
export const checkoutSubscriptionCreate = `mutation CaptureCheckoutPrices($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
    webhookSubscription { id }
    userErrors { field message }
  }
}`;
export const checkoutSubscriptionDelete = `mutation StopCheckoutPrices($id: ID!) {
 webhookSubscriptionDelete(id: $id) { deletedWebhookSubscriptionId userErrors { field message } }
}`;
