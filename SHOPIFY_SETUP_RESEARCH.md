# Shopify and Convex setup research — 6 October 2026

Decision: use a separate app named keval-test-app in PlanetX Technologies, installed only on build-sprint-demo.myshopify.com. The browser verified this is a Dev store on Plus. Do not change Checkout Gain Delivery&Payment, which is installed on another store.

- Shopify CLI can link/create app configuration without replacing the existing web project: https://shopify.dev/docs/api/shopify-cli/app/app-config-link
- app dev --no-update retains the configured hosted URL: https://shopify.dev/docs/api/shopify-cli/app/app-dev
- App configuration and extensions are released independently from web hosting: https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files
- Embedded apps send fresh App Bridge ID tokens to their backend. Validate tokens before exchanging them for Admin API access; support expiring offline-token refresh: https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange
- Shopify's official API library has a Web API adapter using standard Request, Response and fetch. Compatibility with Convex still requires deployment verification: https://github.com/Shopify/shopify-app-js/tree/main/packages/apps/shopify-api/adapters/web-api
- Convex HTTP actions receive requests; actions can call external APIs; secrets live in deployment environment settings: https://docs.convex.dev/functions/http-actions and https://docs.convex.dev/production/environment-variables
- Every embedded HTML response needs store-specific frame-ancestors protection: https://shopify.dev/docs/apps/build/security/set-up-iframe-protection
- App-managed pixels need extension TOML, read_customer_events/write_pixels permissions, analytics consent, deployment and explicit webPixelCreate activation: https://shopify.dev/docs/apps/build/marketing/build-web-pixels
- Checkout pixel events expose nullable token and subtotalPrice. Browser subtotals are observed client evidence, not authenticated server evidence: https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_contact_info_submitted
- GraphQL AbandonedCheckout has no checkout-token field. Never match native records to browser sessions by price/time/customer guesses: https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout

## Secret handling

User enters SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in Convex themselves. The client ID is a public identifier required by Shopify configuration/App Bridge; keep actual TOML outside Git and inject the frontend ID at runtime. No secret or access token in source, VITE variables, logs or public responses. The current public demo snapshot must not become a public authenticated-store data endpoint.

## Implementation checkpoints

Connection, SDK/Convex runtime compatibility, correct-store read, token renewal, signed lifecycle notifications, new pixel collection and phone layout must each be verified before declaring the integration complete. Existing demo evidence remains historical and milestone 1 still needs live-merchant validation.
