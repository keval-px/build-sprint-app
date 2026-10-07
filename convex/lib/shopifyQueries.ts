export const identityQuery = `query ConnectionIdentity {
  shop { myshopifyDomain currencyCode }
  currentAppInstallation { accessScopes { handle } }
}`;
export const abandonedQuery = `query AbandonedEvidence($after: String, $filter: String!) {
  abandonedCheckouts(first: 100, after: $after, query: $filter) {
    nodes { id createdAt completedAt subtotalPriceSet { shopMoney { amount currencyCode } } totalPriceSet { shopMoney { amount currencyCode } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
export const ordersQuery = `query OrderEvidence($after: String, $filter: String!) {
  orders(first: 100, after: $after, query: $filter, sortKey: CREATED_AT) {
    nodes { id name checkoutToken createdAt test cancelledAt displayFinancialStatus currentTotalPriceSet { shopMoney { amount currencyCode } } currentSubtotalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
export const pixelQuery = `query PixelSettings { webPixel { id settings } }`;
export const pixelCreate = `mutation EnableCheckoutEvidence($settings: JSON!) {
  webPixelCreate(webPixel: {settings: $settings}) { webPixel { id settings } userErrors { field message } }
}`;
