# Three-day browser activity plan

IST schedule migration complete (version2). Parent updated the existing authorized hourly automation; next dispatch is October10 at15:00IST. Run only currently due version2 slots after reading the ledger. No Shopify writes, checkouts or orders were started during preparation. Live authenticated reads succeeded on October 10 at approximately 02:45 UTC: build-sprint-demo is a development store; Test payment gateway is Active. Its actual provider page states no transaction fees and gives 1=approved, 2=declined, 3=gateway failure. Recheck these facts in every executing batch.

## Files and scheduler contract

Durable local directory: `/Users/keval/Documents/build-sprint-app/.local/recurring-shopify-2026-10-10/`.

- `manifest.json`: immutable original New York plan, retained for audit only.
- `manifest-ist-v2.json`: migrated IST slot plan; active runs use `ledger.json`, never the superseded New York slots.
- `ledger-before-ist-v2.json`: exact pre-migration ledger backup; historical evidence must remain intact.
- `ist-migration-receipt.json`: migration version, timezone, old-slot archive, counts and stop boundary.
- `ledger.json`: authoritative run state; never regenerate/overwrite it.
- `ledger.py`: local state guard, uses exclusive OS file lock and atomic durable replacement. It does not operate Shopify or browsers.
- `prepare.py`: one-time generator; refuses to overwrite either manifest or ledger.

Window: October 10–12, 2026, Asia/Kolkata (IST, UTC+05:30). Start October10 00:00IST, stop strictly before October13 00:00IST (October12 18:30UTC). The final scheduler dispatch is October12 23:00IST. Up to20 completed and40 unfinished sessions per IST schedule day. Shopify store and app chart timezone remain America/New_York; this migration changes only the test schedule. Error/retry cases count within these60; successful retries stay within20 orders. Reservations and uncertain outcomes consume their planned slots; never replace them to reach a quota.

A local scheduler can continue this existing thread hourly at the start of each IST schedule hour. Each run uses supported CUA browser controls and this ledger. This is feasible when the Mac is awake, online, Codex/browser extension available and the Shopify login remains valid. Scheduling does not keep or wake a sleeping Mac. No long-running sleep, new automation install or credentials required. No headless/API order creation, fabricated pixels, HTTP checkout submission, direct browser-storage manipulation, or deployment.

| IST hour | Total slots | Completed slots |
|---|---:|---:|
|00|1|0|
|01–03|0|0|
|04|1|0|
|05|1|0|
|06|2|1|
|07|3|1|
|08|5|2|
|09–10|6 each|2 each|
|11|5|2|
|12–13|4 each|2 each|
|14–15|4 each|1 each|
|16–17|3 each|1 each|
|18–19|2 each|1 each|
|20–23|1 each|0|

Migration rules: the three previously skipped New York entries remain in the ledger with scheduleVersion1 and original timestamps. All177 formerly planned New York slots are archived in the version2 audit trail and cannot execute. New IDs use `IST-v2-`;42elapsed October10 IST slots are skipped, with no catch-up. Today15:00–23:00IST has18remaining slots (5completed,13unfinished); October11 and12 retain the full60-slot pattern. Zero journeys or payment submissions had started before migration. Do not restore old plans, regenerate the ledger or reinterpret native/store-chart dates as schedule dates.

At the beginning of a scheduled run, run `python3 .local/recurring-shopify-2026-10-10/ledger.py status`, reconcile pending observations of previously created exact test cases read-only, then claim with `python3 .local/recurring-shopify-2026-10-10/ledger.py claim --scheduled`. This flag is only for the authorized scheduler after creation. The claim returns a reservation owner and at most6 slots. Zero due slots means observation-only/end. If run begins at minute20 or later, skip current-hour slots. All past-hour unclaimed slots are skipped, never bunched. Stop initiating payment submissions after minute45; stop the batch before the next hour or date boundary. Do not sleep across slots: sequential real browser journeys create natural intra-hour time differences. No claims or payment submissions outside the window; read-only reconciliation may finish later.

## Browser execution of each reserved slot

1. Verify exact admin store, development status, Active test gateway, and public storefront linked from that store. If any changes, login/CAPTCHA blocker, currency/cost uncertainty or non-test provider appears, mark remaining slots skipped_blocked; do not change settings or bypass warnings. Never enter a real card. Approved contact is Checkout QA, keval@planetx.in, fictional123 Test Avenue, New York NY10001. No other contact/address; marketing and save-information unchecked.
2. Open a new actual storefront journey through the supported browser API and visible product/Buy it now controls. Product suggestions are existing test catalog examples, quantity1; choose only available products. Do not reuse existing user checkout or cart, manually clear cart/cookies, or change stock/theme. A new tab shares cookies and is NOT proof of isolation. Verify fresh checkout URL hash and later actual app session hash against all ledger observations; URL hash is not a substitute for Shopify session identity. If distinct checkout cannot be obtained through visible normal UI, skip rather than manufacture an identity. Record started before advancing contact/payment.
3. Read current displayed currency/subtotal/shipping/tax/discount/total and record integer minor units; catalog suggestions are not price assertions. Prefer the visible free/express choices from the plan, never create rates/discounts. Keep expected and actual values. On clean completed slots, submit only provider test approval input1 after confirming no-charge gateway. On decline_retry/gateway_retry slots, use2/3 once, record actual visible error/time, then input1 once in the SAME checkout. On zip_validation_retry leave ZIP blank to trigger ordinary form validation, record visible error, correct to10001 and complete. Never create theme errors or fabricate events.
4. On unfinished slots, capture contact so Shopify can later produce a native abandoned record. Stop at the planned stage without payment for ordinary cases. For decline/gateway_failure use2/3 once and leave unfinished. For zip_validation trigger blank-ZIP validation and leave; do not force a native abandonment if required details are insufficient. Count this within40 attempts and honestly report native absence. Do not send recovery emails manually, fulfill, cancel, refund, restock or alter automations. Test confirmations and scheduled recovery emails can still reach the approved inbox; orders can affect inventory and existing downstream workflows. Abort on unexpected real fulfillment/inventory behavior; do not repair it by changing settings.
5. Before EVERY Pay click write started observation including paymentSubmitAtUTC and expected outcome. If response is interrupted/ambiguous, write uncertain and NEVER click again or recreate that session. An uncertain/reserved/started slot blocks later claims until exact native/browser evidence reconciles it. No lease expiry auto-replay. Completed requires exact native order ID plus test=true and noChargeGatewayVerified=true. An unexpected success on an unfinished slot is uncertain and stops execution. Resolve through exact known test order/session read-only; no broad customer exports. If not safely resolvable, leave blocked for parent.
6. Record each observation through an allowlisted JSON file and `python3 .local/recurring-shopify-2026-10-10/ledger.py record --slot SLOT --owner OWNER --observation-file FILE`. The record must include state and evidence; never raw checkout/recovery URLs/tokens, cookies, auth secrets, customer exports or raw event payloads. Use exact own test identifiers, hashes, amounts and timestamps only. Native/app lookup can remain pending after completed/unfinished; later read-only observations may be appended to terminal cases (never replay browser activity). Keep unobserved fields null. Finish all reserved slots as completed, unfinished, uncertain or skipped_blocked; do not silently drop reservations.

## Observational delay measurements and figure checks

Product QA accepts native sync latency below one hour. Log it silently for measurement, without routine notifications or defect reports. Flag delay over one hour, a still-missing expected record, incorrect figures, or execution uncertainty. Keep real-time alert semantics and completeness disclosures unchanged; this acceptance threshold is for campaign reporting only. An expected native abandonment is not classified missing before its observation window; after one hour mark it delayed/unverified and investigate with existing access.

For each own exact test case retain browser activity time; firstCollectorObservedAtUTC (collector/session visible in app); firstNativeAdminVisibleAtUTC (exact native order/abandonment first visible in Admin); firstNativeAPIAvailableAtUTC ONLY when an already-authorized exact API read actually confirms that record; firstSyncedRecordConfirmedAtUTC when exact synced native inclusion is accessible; dashboardCheckedAtUTC and dashboardSyncedAtUTC. UI visibility does not establish API availability. A successful scan count does not establish exact record inclusion. Missing access means null/unverified, not zero delay. No new scopes or diagnostic deployment to fill gaps.

Store `delayObservations` as a small list of {channel, checkedAtUTC, visible, evidence}; channels browser, collector, native_admin, native_api, synced_record, dashboard. Preserve the latest preceding negative observation to bound appearance intervals. Compute observed delay as first observed positive minus browser activity time, explicitly a polling upper bound, not precise arrival time. Dashboard age = checkedAt minus its displayed saved timestamp; do not call it webhook latency. Observe pending own cases in later hourly runs instead of blocking a batch or sleeping10minutes. Do not infer causes from lag.

Expected completed: same journey after retry, one test paid order, matching visible/native total, app completion when observed. Expected unfinished: no completed order, completion not observed in app, eventually native Not Recovered where Shopify creates one. Record visible error vs captured category separately; unexpected/missing category is a test result, not permission to inject it. Preserve current partial-data warnings. Compare exact own test records where authorized, and aggregate deltas only as supporting evidence. Earlier native45 versus synced40 caught up before deployment at an unknown exact time; neither cache expiry nor the new architecture establishes its cause. The existing #1028 subtotal discrepancy remains outside this campaign unless separately authorized.

Daily summary: reserved/started/confirmed orders, unfinished attempts, verified native abandonments, missed/skipped/uncertain, error cases expected versus seen, amount mismatches, delay bounds and freshness. Up to20/40 are caps, not guaranteed totals when the Mac is offline or data appears slowly. End execution at the stop boundary even if quotas were missed.
