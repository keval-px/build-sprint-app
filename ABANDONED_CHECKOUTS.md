# Shopify abandoned checkout snapshot

Imported 6 October 2026 from build-sprint-demo's Shopify Admin export and incomplete-checkout list: 31 unrecovered checkouts, USD18,600 in product subtotals, 21 recovery emails sent and10 not sent. These are deliberately generated test checkouts, not customer revenue. All exported baskets contained one USD600 Hydrogen snowboard.

Only one record has an accepted anonymous-session link. A controlled browser recovery-page audit reproduced its existing pixel session identifier. Conflicting subsequent audit results were rejected, including both candidate links for the duplicated record. The remaining30 native records are unmatched. No name, timestamp or price-based guesses are used.

Action amounts use only verified matched unrecovered subtotals, exclude completed sessions and count overlapping action groups once. Unknown values remain unknown; no AOV is silently substituted. Recovery assumes5%, a scenario rather than demonstrated savings. Paid-test AOV remains context, not an abandoned-basket value.

Anonymous hashes, subtotals and aggregate email states are stored in Convex. No buyer fields, native checkout identifiers, private recovery links, or credentials are persisted in project files. Import is a manual snapshot: Refresh test data refreshes the app's saved evidence, not Shopify's export. No Shopify token was needed or added.

45 audit-generated events are retained with auditOnly=true and excluded from shopper analysis. All512 original event IDs remain protected. This avoids treating investigation visits as customer behavior and retains the audit history.

## Exact-token matching step

`convex/checkoutMatching.ts` adds an owner-run internal action for the existing demo snapshot. It makes GET requests only to build-sprint-demo's `/admin/api/2026-10/checkouts.json`, requests `id,token,subtotal_price,currency,completed_at`, and follows validated same-store pagination (maximum20pages/5000records). It does not send emails, open recovery links, create orders, or modify Shopify. No public refresh endpoint or scheduled sync was added.

The server hashes the native ID using the existing snapshot convention and hashes `token` using exactly the installed pixel's `SHA-256(store + ':' + token)` convention. A link requires an exact snapshot ID match, unchanged USD subtotal, and an existing non-audit checkout-start session. Names, contact details, timestamps and equal prices cannot establish a link. Repeated IDs/tokens, conflicting existing links, invalid amounts, incomplete pagination or a failed request abort the batch before any saved snapshot changes. Returned recovered states exclude those baskets from potential recovery. Records absent from the API response retain their saved snapshot state; this is matching, not a replacement export.

Only anonymous hashes/prices/recovered states cross the mutation boundary. Raw IDs, checkout tokens, customer fields, response bodies and the access credential are never persisted or logged by this code. The credential remains solely in Convex server environment variables. The existing CSV totals, import date and email counts retain their original snapshot meaning.

### User configuration

Open the existing [Convex development deployment](https://dashboard.convex.dev/t/keval-k/build-sprint-app/neighborly-nightingale-843), then Settings → Environment Variables. Set `SHOPIFY_ADMIN_ACCESS_TOKEN` yourself using a build-sprint-demo Admin API access token with `read_orders` and permission to read protected checkout data. Never paste its value into chat, a command, a project file, or a `VITE_` variable. Do not configure a different store's token.

This is a **demo-only legacy REST compatibility path**, assuming the demo app's credentials are permitted to use that resource. Shopify requires new public apps to use GraphQL; this reader is not the production/public-app architecture. The GraphQL AbandonedCheckout object currently exposes basket values and recovery state but no `token` field. A rejected or unsupported REST read will preserve existing evidence; it is not a reason to weaken permissions or guess a match. References: [REST abandoned checkouts](https://shopify.dev/docs/api/admin-rest/2026-10/resources/abandoned-checkouts), [GraphQL abandoned checkout fields](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout), [checkout token cross-system identity](https://shopify.dev/docs/api/checkout-ui-extensions/2026-07/target-apis/checkout-apis/checkout-token-api).

Owner preview: `npx convex run checkoutMatching:run '{"dryRun":true}'`. Apply: `npx convex run checkoutMatching:run '{"dryRun":false}'`. These commands contain no credentials. Default is preview. Applying merges into the latest snapshot atomically and leaves the pixel and all historical events unchanged. Afterwards Refresh test data on the shared app reads the saved links; it does not trigger another Shopify import.

Verification on6October2026:22unit tests passed, including exact hashes, missing starts/tokens, PII stripping, conflicting links, recovered states, pagination, foreign-host rejection and sanitized failures. Synthetic fixtures exist only in unit tests and were never imported as evidence. Backend deployed; owner preview returned `not_configured`,1existing match,30unmatched. Therefore no additional real record has been matched yet, and the Shopify API credential/cross-system token comparison still needs live verification.

## Current presentation: linked baskets only

The overview and action cards now use the same verified links to unfinished tracked sessions. The summary shows **USD600 across1linked basket**, with40unlinked sessions excluded. The exported31-record/USD18,600snapshot remains stored but is not used as this session cohort's summary. The overview recovery scenario is USD6–30 if1–5%of the linked value converts. The endpoints remain illustrative assumptions, not measured recovery probabilities or a statistical confidence interval.

Action cards show only linked basket subtotals and Unknown when an eligible group has no linked value. No AOV substitution remains when the abandoned snapshot is available. Paid-test AOV remains context only. No session matches, imported values or recorded events are changed. Completed/recovered records cannot contribute priced value, and overlapping action groups are counted once in the summary. This replaces the previous explicit AOV estimates at the user's request.
