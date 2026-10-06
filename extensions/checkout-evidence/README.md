# Checkout evidence pixel

App-managed anonymous analytics for build-sprint-demo only. The extension subscribes to checkout progress and alert categories. It sends hashed identities, event timestamps, and documented USD subtotals to Convex. No buyer details, raw tokens, or raw error messages are transmitted. Browser observations are not authenticated Shopify server evidence.

Requires analytics consent and activation through the protected app button after deploying this extension. Settings contain only the public Convex collector endpoint. Collection is separate from the historical custom-pixel table; disable the old custom pixel only after verifying this one to avoid duplication. No secrets belong in the extension.
