# Plan

Source: PRODUCT.md, section 7. Build milestone 1 only.

## 1 — Now

I can use one store’s real checkout data to find one real checkout problem the merchant didn’t already know about.

### Approved test-store preparation

The merchant is not ready to grant development access. The user chose a Plus development store and browser-generated test checkout sessions instead.

- Store: build-sprint-demo, in the PlanetX Technologies organization.
- Admin: https://admin.shopify.com/store/build-sprint-demo
- Test data must always be labeled as test data. Browser-generated sessions are not evidence of a previously unknown live merchant problem.
- Keep this milestone open until a live merchant grants access, the data supports a real finding, and the merchant confirms it was previously unknown.

### Work for this step

1. Verify the store's Plus/development status and test payment setup.
2. Collect observable checkout events from browser test sessions; record their source and coverage. Do not invent orders or infer abandonment causes from missing events.
3. For this test flow, read Shopify's Customer events feed with a custom pixel (a small script that listens to browser events). Send only event names, timestamps, error categories, and hashed checkout/event IDs to Convex. Do not send buyer details, raw checkout identifiers, amounts, or raw error messages. This needs no Shopify API token. A future live-store record reader would use read-only Admin GraphQL queries in Convex, with its token set by the user in Convex settings.
4. Show the collected test evidence and one reproducible checkout issue, if the data supports it. Explicitly distinguish deliberate test errors, unsupported guesses, and verified findings.
5. Check the result in a browser at phone size and provide the phone URL and exact checking steps.

### Secrets and access

The user sets secrets themselves in Convex dashboard → deployment → Settings → Environment Variables. Shopify tokens and other secrets must never appear in source code, VITE_ variables, committed files, browser scripts, or logs.

Test collector setting: SHOPIFY_TEST_COLLECTION_ENABLED=true (not a secret). Collection remains disabled until Shopify pixel setup is approved. Future record-reader settings, if needed: SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN. The confirmed domain is build-sprint-demo.myshopify.com. Do not request older-order access without a demonstrated need.

The test collector is public and cannot authenticate browser event origins. Its evidence must be labeled as unverified browser test events, never verified Shopify server data. It accepts only a minimal anonymous payload, rejects extra fields and stale/future timestamps, removes duplicate event IDs, and caps storage at 10,000 events. Evidence reads show at most the latest 500 events and flag truncation; no completion observed is not proof of abandonment or a checkout error.

No AI explanations, Slack alerts, continuous anomaly detection, paid services, or extra features in this step. Shopify setup and test checkout activity are authorized only for the named development store.

### Current status

- [x] Read IDEA_SCOPE.md and PRODUCT.md.
- [x] User selected the development-store approach and build-sprint-demo.
- [x] Store admin opens and shows Shopify Plus features.
- [x] Verify development status and canonical domain; Shopify shows a test payment gateway.
- [x] Implement anonymous test-event collection, bounded evidence reads, and tests.
- [x] Pass TypeScript and JavaScript syntax checks; four isolated tests pass, with no fixture data seeded into Convex.
- [x] Save the test pixel in Shopify (custom pixel ID 183042274); Shopify accepts explicit event subscriptions. The script is not yet connected.
- [x] User approved Connect; Shopify shows Disconnect, and SHOPIFY_TEST_COLLECTION_ENABLED is true in Convex.
- [x] Generate an actual browser checkout, deliberately test invalid discount and declined test payment, then complete using the approved test gateway value. Convex received 17 events belonging to one checkout, including a payment alert and completion.
- [x] Publish the development preview; check settled desktop and 390px phone layouts, refresh, keyboard tabs, and empty drill-down. Also check the populated overview and expanded timeline at 390px; no horizontal overflow. Actual phone-device testing remains for the user.
- [ ] Validate milestone 1 with an actual merchant (pending live-store access).

The updated DESIGN.md pins Shopify Polaris and the health dashboard reference. The screen follows that direction with an overview and checkout drill-down; impact remains explicitly not measured, and Slack stays outside this milestone. A separate visual reviewer approved the paused, empty screen.

Development preview: https://neighborly-nightingale-843.convex.site/

Shopify is connected and collection is enabled. One browser-generated checkout completed on 5 October 2026, using fictional test buyer details and the store's Test Payment Gateway. Its 17 received events include eight input-validation alerts, one payment alert, and one completion; these are event counts, not distinct incidents. The invalid discount was visibly rejected, but its received category was input validation, so it is not relabeled as a discount event. A deliberate gateway decline was followed by a successful test payment. No real customer purchase or revenue is claimed.

Phone check: open the development preview, tap Refresh test data, expect two checkouts, one completion, and one with no completion observed. Tap Checkout drill-down: the newest checkout has Contact submitted and no recorded errors; the earlier checkout completed after observed errors. Expand either row to inspect its actual events. The overview shows the most frequent observed category; the timeline includes all categories.

Test-store preparation is working end to end. The real-merchant milestone stays open; a deliberate error is not an unknown merchant problem.

## 2 — Later

I can detect when checkout behavior meaningfully deviates from that normal baseline.

## 3 — Later

I can explain the evidence and use AI to suggest likely causes without presenting guesses as facts.

## 4 — Later

I can alert the merchant at the right time without overwhelming them with noise.

### Session outcome follow-up — verified 5 October 2026

Each session row now shows the last recorded submission, all observed error categories, and whether completion followed an earlier error. Progress recorded after the first completion is excluded from the progress label; all events remain visible in the timeline. Completion after an error means temporal recovery, not proof a specific problem was fixed.

A second browser checkout was opened, fictional contact details entered, and the tab closed without payment. Two actual events arrived: checkout started and contact submitted. Total evidence is now 19 events across two checkouts, with one completion. No session-ended event or abandonment cause is invented. Six tests pass, including incomplete progress, out-of-order events, recovery timing, and post-completion events. Desktop and 390px phone layouts were visually checked; real phone-device testing remains for the user.

### 50-checkout run — verified 5 October 2026

Generated and audited 50 additional distinct browser checkout sessions: 10 completed, 10 stopped after contact submission, 10 after shipping submission, 10 after a simulated payment failure, and 10 after checkout start. Payment failures included seven declines and three gateway failures. Earlier sessions remain, giving 52 total checkouts, 11 completions, and 41 with no completion observed. All 482 events fit within the 500-event read limit. See TEST_RUN_50.md for the anonymous audit and testing limits. Several checkouts were revisited; durations and alert frequency are not representative of actual shopper behavior. No fake events were seeded.
