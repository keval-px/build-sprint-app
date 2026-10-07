# Checkout Health audit — 8 October 2026

## Requirement used for this audit

Jimmy’s Bakery is the dashboard name. The connected pilot store remains build-sprint-demo. The app must reconstruct observed checkout journeys, distinguish confirmed signals from ordinary alerts, show recorded counts and prices, and provide evidence and a useful investigation next step. It must not invent a field, cause, incident, lost revenue, recovered revenue, or missing basket value.

The current shipped scope is an overview, a Shopify-style searchable/filterable table with 24 checkouts per page, event details and timings, recorded findings, fix markers/retests/history, and focused in-app alerts. The paid-order chart uses the store timezone; dashboard date selection uses browser-local calendar dates. Slack delivery, AI diagnosis, and a production-scale incident service remain product milestones, not completed features.

## Fixes and cleanup

- Removed the old checklist/points/badges, assumed product/basket mix, test-order average renderer, illustrative recovery scenarios, removed period-comparison helpers, unused category-only diagnostics and top-three renderer, the retired matching command, stale CSV importer, and unused font. Removed their orphaned functions, endpoints and obsolete tests. Historic database tables remain to preserve existing records.
- Recommendation money now follows the table’s exact source precedence and uses full recorded basket totals, including shipping where Shopify recorded it. Partial coverage produces Unknown rather than a misleading partial total. Signed-completed baskets cannot fall back to stale legacy/browser exposure amounts.
- New shipping-unavailable fix markers save their signal. Their baselines, affected checkout counts, recurrences and retests exclude unrelated delivery alerts. Old broader markers retain their original baseline and are labeled Shipping alerts.
- Simultaneous submissions retain an explicit same-time label; findings no longer depend on arrival order. Unknown field identity and cause remain unknown.
- Public demo corrections retain category/blocker information only for already-public event identities, with matching session identity. Private prices, line items and additional sessions are not published through corrections. Fix baseline calculations use the same corrected public evidence.
- Preserved shipping-blocker fields in the legacy evidence reader. Authenticated stored-event counts include the actual pixel record count rather than only the capped returned rows.
- Added a pixel event counter, initialized from existing records on the next insertion, to avoid scanning up to 10,000 event documents on every new event.
- Unified automatic updates across all views and alerts. Removed the duplicate one-minute request loop and redundant manual results refresh. Updates pause for open overlays and fix saves. Focus after saving tolerates a recommendation disappearing.
- Extracted table filtering and pagination into a small tested module. Stale or empty exact-evidence filters cannot silently show unrelated checkouts.
- Cached currency precision lookup: 10,000 repeated USD lookups measured about 135 ms before and 14 ms after, including first-use initialization. This is a local microbenchmark, not a claim about full-page speed.
- Normal builds now reject unused local code and handlers targeting removed static UI elements. Shopify’s installed component manifest continues to validate the interface.

## Numeric verification

Live source snapshot and authenticated UI, last 30 local calendar dates, 9 September–8 October:

| Number | Verified result | Basis |
| --- | --- | --- |
| Observed checkouts | 80 | Distinct checkout identities with a recorded start in the selected range |
| Recorded completions | 24 | Distinct journeys with completion; duplicate events counted once |
| Unfinished observed journeys | 56 | 80 minus 24; does not establish abandonment cause |
| Completion percentage | 30% | 24 / 80 |
| Events in those journeys | 779 | Distinct recorded event identities |
| Shopify abandoned baskets | 40 | Unrecovered native records in the selected dates; a separate population from observed journeys |
| Total abandoned basket value | $24,179.75 | Independently summed native recorded totals |
| Average abandoned basket value | $604.49 | Rounded $24,179.75 / 40 |
| Unfinished shipping-unavailable recommendation | 2 checkouts; $1,499.90 | Exact affected identities and recorded prices |
| New shipping fix baseline | 3 / 80; 2 previously affected unfinished checkouts | Includes the one historical blocker checkout that later completed |
| Paid-order chart | 7 orders for its stored local day; 4 prior matching weekdays | Independently checked against stored eligible paid orders; chart day was 7 October in America/New_York |
| Table pagination | 4 pages; last page 73–80 | 24 rows per page with no overlap |
| Checkout export | 80 rows; 24 completed; 70 priced; 10 Unknown | Actual file downloaded through authenticated Shopify UI |
| Event export | 779 rows; same 80 checkout identities | Actual file downloaded through authenticated Shopify UI |

Fixture tests cover counts, percentages, empty periods, duplicate events, date boundaries, shipping-inclusive and zero prices, unknown and ambiguous price matches, stale signed-completed baskets, simultaneous steps, elapsed time and step intervals, filtered rows, all pagination boundaries, CSV totals and safe quoting, fixes before/after, rate thresholds, store timezones and daylight-saving clock changes. A read-only source check compares every exported checkout price with its exact stored Shopify/browser evidence.

## Functional verification

- Authenticated Shopify app and public preview load and show reconciled metrics.
- Search, combined status/category filters, quick issue filters, exact finding links, newest/oldest/value sorting, empty results and reset.
- All four pages; filtered results clamp/reset pagination correctly.
- Details popup, chronological timeline, recorded alert counts, duration and milestone timings; close works.
- Save a fix, record a retest, undo the marker, and inspect archived history in an isolated local demo scope. No active test marker remains; merchant markers were not changed.
- Last-seven-days preset and restoration to last 30 days.
- Alert check, pause both preferences, restore both preferences, and inspect the successful check time.
- Real CSV downloads and their row/count/price reconciliation.
- Private evidence rejects missing authentication; unsigned webhook and malformed pixel/fix requests are rejected without valid writes.
- Phone viewport check at 390 × 844 and desktop check, with viewport restored afterward.

## Remaining limits

- This is still a single-store pilot. Each evidence reader returns at most 1,000 latest events and collection has a 10,000-record cap. Partial-history notices prevent treating that as complete history, but production volume requires retained server-side summaries and retention planning.
- Ten observed journeys have no recorded basket value. Unknown is intentional; browser starts are not guaranteed to create a native abandoned-checkout record. The 40 native abandoned records in this snapshot all have prices. No 99% coverage claim is supported for all starts.
- Browser events are not cryptographically verified by Shopify. Signed server checkout notifications verify their price/completion payloads, not the origin of browser alerts. Existing evidence disclosure remains.
- Exact alert messages and field targets were discarded. The app cannot retrospectively identify a missing-email field, invalid address or extension crash from category-only history.
- Alerts currently run inside an open app. Scheduled backend sync continues separately; no Slack message delivery or AI diagnosis was added during this audit.
- npm audit reports four moderate advisories in the development-only Shopify CLI dependency chain, zero high/critical. The underlying sprintf-js registry release is still 1.1.3; npm proposes a major CLI downgrade. No forced downgrade was applied.

## Repeatable checks

- `npm test` — retained feature and regression tests.
- `npm run build` — unused-code checks, static UI-target checks, official Shopify component validation, TypeScript and production bundle.
- `npm run audit:metrics` — read-only reconciliation of the live public demo numbers; requires network access and available Shopify aggregate data.
- `npm run deploy` — explicit Convex static-hosting deployment, independent of GitHub push.
