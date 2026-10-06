# Plan

Source: PRODUCT.md, section 7. Build milestone 1 only.

## 1 — Now

I can use one store’s real checkout data to find one real checkout problem the merchant didn’t already know about.

### Active improvement plan — 6 October 2026

This section is the current execution plan; dated notes below are history. Build only the foundations needed for milestone1. The demo can prove the collection and investigation flow, but cannot prove an unknown live-merchant problem.

#### Implementation checkpoint — 6 October 2026

- [x] Created separate keval-test-app in PlanetX Technologies, without modifying Checkout Gain Delivery&Payment.
- [x] Linked it through Shopify CLI 4.8.4; generated gitignored shopify.app.toml and a sanitized committed template. CLI configuration validation passed.
- [x] Generated and built the checkout-evidence app pixel extension with analytics consent and no buyer data.
- [x] Implemented App Bridge HTML, signed-session verification, offline token exchange/renewal, private snapshots, and signed uninstall/scope-change handling in Convex.
- [x] Published the Convex development backend/frontend. Missing credentials show a readable Shopify-embedded setup screen; unauthenticated store requests return401. These checks do not prove successful Shopify authorization.
- [x] Added source-aware browser subtotal pricing and removed action-card AOV fallback. Legacy public demo and new private pixel/server data are stored separately.
- [x] Typechecking, Polaris manifest checks, Shopify query validation, pixel build and28isolated tests passed.
- [ ] User sets SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET from keval-test-app in Convex.
- [x] Shopify CLI app dev preview created for keval-test-app on build-sprint-demo; app appears and opens inside Shopify admin.
- [x] User approved the persistent release. Shopify CLI released keval-test-app-2 with checkout-evidence and lifecycle notifications on6October2026.
- [ ] Verify authenticated reads/token lifecycle after user-set credentials.
- [ ] Verify one new completed and one new unfinished actual browser checkout, then disconnect the old custom pixel after new collection is proven.
- [x] Code review completed on Standards and Spec axes. Fixed sandbox hashing, overlapping-pixel deduplication, and revoked evidence access; both reviewers confirmed the fixes. Public preview checked at desktop and390px phone width with no overflow. Installed app verified inside Shopify with the pending-settings screen; authenticated flow remains untested. Implementation and fixes committed on main.

Current app URL: https://neighborly-nightingale-843.convex.site/api/shopify/app. Public demo stays at the root URL. Shopify CLI deployment releases configuration/extensions; Convex uploads publish frontend assets. Neither git push nor Shopify app deploy publishes the Convex web app.

#### 1. Establish the correct Shopify connection

- Use the separate Shopify app keval-test-app; reuse it only if that exact app exists, otherwise create it in PlanetX Technologies. Never modify Checkout Gain Delivery&Payment. Link the project with Shopify CLI and install only on build-sprint-demo. The Shopify MCP currently connects to a different store; use it for documentation/schema discovery, not demo checkout evidence. Do not change stores or permissions silently.
- Replace the manual access-token prerequisite with the appropriate supported authorization flow. Use Shopify-managed embedded installation and App Bridge ID-token exchange in Convex. The frontend remains hosted by Convex static hosting; server credentials and acquired tokens remain in Convex. Do not assume that owning/accessing the store proves same-organization eligibility.
- User sets SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET only in Convex environment settings. Request read_orders and required protected-data approval only; no write scopes for this reader. Use official Shopify authentication helpers where compatible with Convex. Keep acquired credentials server-side, support expiry/renewal, validate app requests, and never return or log secrets.
- Check the authorized store before any import, fail clearly on missing scopes/installation, and retain the last successful snapshot on failure.
- Done when: an actual authenticated read confirms build-sprint-demo, requested read access and token lifecycle. No setup is declared complete merely because an environment variable exists.

#### 2. Make basket values belong to their checkout sessions

- Preserve historical records and exact hashes. Attempt the existing bounded legacy REST matching reader only as demo compatibility after checking eligibility; it is not the architecture for a new public Shopify app. An access token alone does not guarantee historical matching.
- The MCP-confirmed GraphQL AbandonedCheckout schema exposes IDs, subtotals and recovery state, but no checkout-token field. Never derive a token from a recovery URL, equate native IDs with pixel tokens, or match by customer/time/price similarity.
- For new sessions, verify the documented Shopify pixel checkout fields and collect an anonymous USD product subtotal with the checkout's hashed identity in the same event. Validate currency, cents, changes and event ordering; retain source labels because browser values are not authenticated server evidence. Confirm behavior using actual browser test checkouts, not seeded events.
- Use read-only GraphQL order/abandoned records to corroborate server facts where exact joins exist. Keep unmatched server aggregates separate from session-linked action totals. Do not promise that all41unfinished sessions will have31native abandoned records.
- Done when: a newly completed and a newly unfinished browser checkout each have the correct session-associated subtotal; exact native matching coverage is reported separately; unrelated/ambiguous/recovered records cannot increase action values.

#### 3. Make every displayed amount explainable

- The summary and action cards use one shared calculation over distinct eligible sessions, with overlapping groups counted once in the summary.
- Show only observed, explicitly sourced basket values. Unknown stays Unknown when no basket is linked; never replace it with AOV, zero or a price-based guess. AOV remains purchase context.
- Show linked-session coverage next to each subtotal. Keep the original exported total out of the session summary unless those records form its verified cohort.
- Keep any recovery percentage explicitly hypothetical. No measured recovery probability, lost-sales claim, monthly savings, confidence interval or critical incident label without supporting evidence.
- Done when: summary and action amounts reconcile to their listed linked sessions; a merchant can open details and see the source, denominator and calculation. Missing snapshots/links and recovered/completed sessions are checked too.

#### 4. Improve the investigation, not the amount of text

- Check what Shopify actually exposes about alert categories/fields and preserve only safe, documented non-personal details. Never infer email typing, field focus, exact error messages or shipping delays from category-only events.
- Distinguish last observed progress, completion after an alert, and missing completion. Missing completion alone is not confirmed abandonment or a known cause.
- Put the strongest supported investigation first, with one clear next action and affected-session links. Keep data setup/source notes in collapsed details and retain Polaris App Home v2.0 RC plus the1100px desktop frame.
- Done when: one intentionally reproduced test problem leads from an action card to the correct session and visible Shopify behavior, without claiming an unknown live incident.

#### 5. Verify and stop at the milestone boundary

- Run meaningful checks for identity conflicts, monetary calculations, deduplication, auth failures and stale data. Check the actual app on desktop and390px phone width, including details and drill-down, then publish to the existing Convex preview.
- Preserve original512events/55sessions and audit-only separation. New browser tests are recorded as additional test activity, never disguised as real customer orders. Record observed changes and remaining limitations in the relevant source notes.
- Real-merchant milestone1 stays open until a merchant provides live access and confirms a supported finding was previously unknown. Merchant baselines, automatic anomaly detection, AI diagnosis and Slack alerts remain in milestones2–4.

Implementation order: connection → session-associated basket evidence → reconciled revenue presentation → sharper investigation → browser verification. No further visual redesign or points system is planned.

Research sources: [Shopify client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant), [app authentication options](https://shopify.dev/docs/apps/build/authentication-authorization), and the Shopify MCP's inspected AbandonedCheckout schema. Client credentials require same-organization installation; tokens last24hours. The research and MCP schema check did not install the app, acquire credentials, switch the connected store or match additional records.

### Approved test-store preparation

The merchant is not ready to grant development access. The user chose a Plus development store and browser-generated test checkout sessions instead.

- Store: build-sprint-demo, in the PlanetX Technologies organization.
- Admin: https://admin.shopify.com/store/build-sprint-demo
- Test data must always be labeled as test data. Browser-generated sessions are not evidence of a previously unknown live merchant problem.
- Keep this milestone open until a live merchant grants access, the data supports a real finding, and the merchant confirms it was previously unknown.

### Work for this step

1. Verify the store's Plus/development status and test payment setup.
2. Collect observable checkout events from browser test sessions; record their source and coverage. Do not invent orders or infer abandonment causes from missing events.
3. The current test collector reads Shopify's Customer events feed with a custom pixel (a small script that listens to browser events). Its implemented contract sends only event names, timestamps, error categories, and hashed checkout/event IDs to Convex, with no buyer details, raw checkout identifiers, amounts or raw error messages. It needs no Shopify API token. The active improvement plan adds validated anonymous session subtotals after checking Shopify's documented event fields. A server record reader uses read-only Admin GraphQL queries in Convex after the app obtains authorization; the user sets app credentials privately in Convex settings.
4. Show the collected test evidence and one reproducible checkout issue, if the data supports it. Explicitly distinguish deliberate test errors, unsupported guesses, and verified findings.
5. Check the result in a browser at phone size and provide the phone URL and exact checking steps.

### Secrets and access

The user sets secrets themselves in Convex dashboard → deployment → Settings → Environment Variables. Shopify tokens and other secrets must never appear in source code, VITE_ variables, committed files, browser scripts, or logs.

Test collector setting: SHOPIFY_TEST_COLLECTION_ENABLED=true (not a secret). Collection is enabled for the approved demo pixel. The earlier manual SHOPIFY_ADMIN_ACCESS_TOKEN reader is a compatibility implementation; the active plan replaces that prerequisite with server-side app authorization using user-set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET. The confirmed domain is build-sprint-demo.myshopify.com. Do not request older-order access without a demonstrated need.

The test collector is public and cannot authenticate browser event origins. Its evidence must be labeled as unverified browser test events, never verified Shopify server data. It accepts only a minimal anonymous payload, rejects extra fields and stale/future timestamps, removes duplicate event IDs, and caps storage at 10,000 events. Evidence reads show at most the latest 1,000 events and flag truncation; no completion observed is not proof of abandonment or a checkout error.

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

### Gamified action plan — 6 October 2026

User requested action cards inspired by the reference plus gamification. Added three expandable investigation missions from received test events: payment alerts, input-validation alerts, and journeys with no recorded completion. Each shows why to investigate, what to check next, three checklist steps, and a button to its matching checkout sessions. Recovery on the payment card requires a payment alert before a recorded completion. Counts describe the current evidence window; there is no financial ranking, abnormality claim, or field-level diagnosis.

Nine steps award 20 points each (180 total); three completed steps unlock that mission's badge. Progress is self-reported investigation, not a verified Shopify fix. Unchecking reverses points and badges. Personal per-browser progress was assumed after the optional sharing preference was unanswered. A random anonymous browser identifier is kept in local browser storage; checklist data lives in Convex, with no account, buyer data, Shopify credentials, or store-setting mutations. Clearing browser storage or using another device starts separate progress. The public demo progress store is bounded to 1,000 viewers and accepts only nine known steps.

Verified: build/type checks and action/evidence tests; backend validation, viewer separation, persistence, idempotence, and undo; browser badge earning, reload, undo, native keyboard accordion, phone saving, and evidence filters for 12 payment, 38 validation, and 41 unfinished sessions. Visual review approved 1440px desktop and 390px phone layouts with no overflow. DESIGN.md stays unchanged. GitHub push is still waiting for the repository URL; these later action-plan changes are not included in the earlier local commit.

### Revenue-first action cards — 6 October 2026

User clarified that financial impact should replace points and badges. The visible rewards are removed. Each action now shows estimated recovery prominently, potential sales at risk (unfinished matching sessions × supplied average order value), affected checkout percentage with its denominator, why it matters, what to do, an evidence link, and an investigation button that opens its saved checklist. Specific alert investigations are ordered by estimated opportunity; the overlapping all-unfinished coverage audit stays last. Attention labels reflect test evidence needing investigation, not verified critical merchant incidents.

Average order value starts blank; currency and assumed recovery are editable, with 5% an explicitly unmeasured initial assumption. Values save per browser in Convex. Recovery = distinct unfinished matching checkouts × average order value × assumed recovery percentage. Completed checkouts are excluded. Combined totals remove duplicates, while card estimates overlap and must not be added. No actual cart amounts were collected, no monthly recovery or profit is claimed, and checking tasks does not verify a fix or money saved. No secrets or Shopify mutations were added.

Calculation, validation, persistence, isolation, and clearing checks passed; all 12 unit tests and the build passed. Browser action buttons, checklist save/undo, affected-session filter, and 390px layout were checked. Hypothetical USD100 / 5% test yields validation USD150, payment USD50, unfinished USD205, combined USD205; these assumptions are cleared after verification. Published to the existing development preview. Real phone-device testing remains for the user.

### Polaris v2.0 migration and calculator removal — 6 October 2026

User explicitly requested Shopify App Home v2.0 structure for every visible element and removal of the calculator. This supersedes the editable revenue assumptions described above. The app loads polaris-2.0-rc.js and uses official v2.0 components for page, sections, layouts, typography, numbers, banners, buttons, badges, checkboxes, and responsive event tables. Custom card/button/input/timeline styles and native accordion controls are removed. Only document margin reset and hidden-state CSS remain. No embedded Shopify app registration or credentials are added; the existing Convex preview remains standalone.

Calculator inputs, save/clear controls, calculations, helper module, and backend assumptions mutation/HTTP route are removed. Previously stored optional assumptions are retained only for schema compatibility and are never read or displayed by the app. Existing checkout data and checklist progress remain. Every action still shows why it matters, what to do, affected sessions and share, unfinished matching count, and evidence/checklist actions. Money figures are marked Not available because no order values were collected and no justified recovery rate is established. No guessed order value replaces the calculator.

The installed Shopify skill helper supports only v1.0/v1.1 and rejects v2.0-rc. Official Shopify v2.0 documentation, @shopify/polaris-types@2.0.0-rc.0, and its published component manifest are used instead. npm run check:ui validates component tags and static keyword attributes and rejects native styled UI; the build runs this check before TypeScript and Vite. Runtime/browser checks cover populated controls and actual dynamic markup. Backend removal check confirms the calculator route returns 404 and 482 test events remain.

Verified migration: official-manifest check passed for 127 static component tags and 250 distinct rendered component/attribute combinations; nine remaining evidence/action tests and the build passed. Browser checkbox save/reload/undo, keyboard expansion, affected-checkout filtering and clear, and the actual event table worked. Desktop 1440px and phone 390px were captured and reviewed; phone layouts have no horizontal overflow. Accessory badge assignment is deferred until native attribute callbacks settle; a fresh browser tab reports no warnings or errors. The separate finish reviewer returned ship, then confirmed the initialization fix and recaptures. The calculator endpoint returns 404. Actual-device phone testing remains for the user.

### Catalog-based modeled order value — 6 October 2026

User authorized estimating average order value from the store's snowboard catalog and a mostly single-item basket mix. Read build-sprint-demo's public catalog and standard ski-wax product page in the existing logged-in Chrome tab. The Shopify connector pointed to a different store and was not used as the pricing source. USD was verified from the product page currency metadata. Inspected nine available snowboard prices between USD600 and USD1,025, using the actual USD785.95 sale price for Compare at Price and the selected USD24.95 one-time ski-wax variant. Sold-out products, gift cards, subscriptions and extra discounts are excluded.

Saved the dated price snapshot and hypothetical basket weights in a separate Convex catalogScenarios table. Model: 80% one snowboard, 12% snowboard plus wax, 6% two snowboards, 2% three snowboards. Across 17 combinations, 100 hypothetical purchases total USD75,518, giving **USD755.18 modeled average order value**. No hypothetical baskets are inserted into checkout events or presented as actual orders. The snapshot is not automatically synchronized with Shopify. Full prices, weights, sources and limitations are in CATALOG_MODEL.md.

Native v2 cards now show modeled sales at risk and an independently illustrative 5% recovery scenario; the calculator stays removed. Payment10unfinished gives USD7,551.80 modeled at risk / USD377.59 recovery; validation30 gives USD22,655.40 / USD1,132.77; allunfinished41 gives USD30,962.38 / USD1,548.12. Combined recovery is USD1,548.12 across41unique sessions, with overlap removed. Completed and unstarted sessions are excluded. Existing test sessions have no collected product IDs or cart amounts, so this models opportunity using a store-wide assumed basket value; it does not reconstruct their actual carts or prove lost revenue. No monthly, profit, measured recovery or causality claims.

Verified: saved Convex model returned through the existing evidence endpoint; all482events retained. Eleven tests pass, build/TypeScript pass,157staticcomponent tags and266rendered component combinations pass v2manifest checks. Browser model expansion lists17rows, per-action amounts match calculations,390px has no overflow, and console has no warnings/errors. Desktop and phone captures were visually inspected; the separate finish reviewer returned ship. Preview published at the existing URL. Actual-device testing remains for the user.

### Desktop width and observed demo purchases — 6 October 2026

User requested about1100px maximum desktop width and replacement of assumed baskets with observed purchases. When asked for the live store, the user explicitly chose build-sprint-demo only. A centered native v2 grid wraps the entire page; measured column is1100px at1440px desktop and390px at390px phone, without overflow or added visual CSS.

Read all11paid demo orders and exported the current page as plain CSV through Shopify Admin. All11 were one Hydrogen snowboard, USD600 subtotal, zero discount/shipping/tax/refund, uncancelled, paid through the testing Bogus Gateway. No new purchases or Shopify changes were made. Imported only anonymous aggregate totals and basket counts into a separate Convex demoPurchaseSnapshots table; buyer fields, order IDs and raw CSV never enter the app. The observed test-order AOV is USD600 and the actual demo basket mix is100% single Hydrogen snowboard. This replaces the displayed hypothetical755.18AOV/80-12-6-2weights; prior catalog model remains a labeled fallback.

Recovery remains independently illustrative at5%: payment10unfinished =>USD300; validation30=>USD900; allunfinished41=>USD1230. Combined uses41unique sessions, not summed card counts. Existing482events remain unchanged. No live customer demand, real revenue, measured loss, guaranteed recovery or causal fix is claimed. Data is a manual imported snapshot; Refresh reads Convex only. See OBSERVED_PURCHASES.md and scripts/import-demo-orders.py for the bounded reimport path. No tokens or keys were introduced. Thirteen unit tests, build/TypeScript, anonymous import reconciliation and backend priority checks passed. Final phone/desktop visual checks follow publication. Real-merchant M1 remains open.

Final verification: observed-purchase breakdown expands to one actual basket type with11orders/100%share/USD600average. Desktop native-grid column remains1100px and phone390px, with no overflow. Final170static/271renderedcomponent combinations validate; console has no warnings/errors. Separate visual reviewer returned ship; documenter updated the approved page-frame rule and observed-data references in DESIGN.md and .impeccable/design.json. Preview remains open and published.

### Three multi-item test purchases — 6 October 2026

User approved the next step and requested active use of the Shopify skill. Applied shopify-dev to check checkout completion events and supplemented its search with official Shopify test-gateway guidance. Used the existing logged-in Chrome storefront and Test Payment Gateway, with fictional buyer details, successful test payment value, and verified free Standard shipping. Completed three actual browser purchases: Liquid+standard wax USD774.90; Hydrogen+Complete Ice USD1299.95; two Hydrogen boards USD1200. Confirmation pages and Shopify Admin paid-order rows verified all three. No live transactions, new keys, provider changes, or fulfillment actions.

Exported the updated14orders and imported only anonymous aggregate counts and subtotals. The multi-line and quantity-two CSV cases reconcile to USD9874.85 across14paid test orders, four basket types, and USD705.35 AOV. Eleven single-item orders (78.6%) and three multi-item orders (21.4%). The independent5% scenario now gives paymentUSD352.68, validationUSD1058.03, combinedUSD1445.97 across41unique unfinished sessions. Existing import/calculation code worked without changes.

Three completion events arrived, giving55sessions/14completions. Stored events increased from482to512, crossing the existing500-event view cap. The UI must show partial coverage; earlier steps in the oldest session are missing. Current view still has41eligible unfinished checkouts. No complete-history claim or fake event seeding. OBSERVED_PURCHASES.md records the refreshed snapshot and this limit. Shopify skill feedback is reported with telemetry disabled.

Coverage fix for this run: increased the anonymous evidence read from500 to a bounded1000 using one shared limit constant, preserving the10000-event storage cap and collected fields. All512stored events now appear, restoring the oldest payment alert and start. Verified55sessions,14completions,41unfinished,zero sessions without a start, and no truncation. Thirteen tests/build/typechecks pass. Initial partial-view message had a singular/plural typo; corrected without changing the component system.

### Native abandoned checkout evidence — 6 October 2026

Imported31 unrecovered demo records with USD18,600 product subtotals; recovery-email status21sent/10not sent. One accepted controlled browser session match; conflicting links rejected,30records remain unmatched. Action cards and drill-down use recorded subtotals only for accepted links; unknown values receive no AOV substitution. Existing5% recovery remains a labeled scenario. Original512events preserved;45investigation events retained as auditOnly and excluded from analysis. Fifteen tests pass; published to the existing Convex preview. Desktop and390px phone checked, native evidence button opens filtered journeys. Separate visual reviewer: ship at imported-section scope; documenter preserved system and corrected stale pricing description. Automated read-only sync and comprehensive identity matching remain next.

### Overview cleanup — 6 October 2026

Applied screenshot annotations: removed top demo banner, replaced populated checkout summary paragraph with native v2.0 RC completion progress (14/55,25%), and repurposed duplicate observation card as recovery-email coverage (21/31sent,10not sent). Preserved test labels, snapshot provenance, collection coverage and downstream action cards. Empty/paused states retain setup guidance. Built and published; desktop1440/phone390 checked, no phone overflow. Native component definition validates via pinned v2 CEM; Shopify skill helper only supports v1 and cannot validate v2. No new CSS, credentials, data writes or sent emails.

### Action card grouping — 6 October 2026

Moved each action heading, status badge, description and details toggle inside its existing native section card. Added a native divider between the header and metrics. Kept data, calculations, details, checklists and evidence navigation unchanged. Build and v2 component checks passed; published to Convex preview. Verified collapse works; desktop1440 and phone390 inspected with no phone overflow.

Finish review caught a leftover accessory-slot assignment hiding moved badges. Removed that assignment and stale comments, rebuilt/published, and recaptured desktop and phone with visible badges. DESIGN.md now documents composed in-card headers; sidecar and visual tokens are unchanged.

### Text cleanup — 6 October 2026

Shortened action summaries and revenue labels; collapsed action explanations by default. Removed redundant populated checkout count heading, insights introduction, idle checklist note and repeated footer paragraphs. Kept one demo-data footer, unknown-value counts and explicit5%assumption. Collection details now hold stored-count, source and coverage limitations; existing purchase details include abandoned snapshot provenance and matching rules. Preserved all data/calculations/navigation/checklists and nativev2RCsystem. Build/component checks passed; published and checked desktop1440/phone390, no overflow. Verified action, purchase and collection details open correctly.

### Remove repeated action counts — 6 October 2026

Removed the header count sentence from all three action cards, since each count already appears under Affected checkouts. Build and native-component checks pass; published and verified desktop/phone, no overflow. Figures, badges, dividers and details unchanged.

### Abandoned basket value metric — 6 October 2026

Replaced the inline abandoned-checkout summary with a native metric: Abandoned basket value, USD18,600,31abandoned test checkouts. Uses the same large-100 bold s-number as AOV, arranged in three desktop columns and one phone column. Snapshot notes remain in details; fallback catalog summaries still work when no abandoned snapshot exists. Built/published and checked1440desktop/390phone, no overflow.

### Insights heading placement — 6 October 2026

Moved Insights & recommendations below the abandoned checkout value summary, directly above the action cards. Built/published and checked desktop/phone; no other content or behavior changed.

### Side-by-side explanation layout — 6 October 2026

Used native Polaris QueryContainer/Grid for Why it matters and What to do in every expanded action card. Two equal columns when card width exceeds700px, one column otherwise; heading/paragraph pairs use native stacks without nested cards. Copy, calculations and actions unchanged. Official Grid documentation and pinnedv2RCmanifest checked; toolkit'sv1-onlyvalidator cannot targetv2. Build/publish passed; measured desktopheadingssamey and distinctx, phoneverticallystacked with no overflow. Captures corrected to explicit1440desktop/390phone.

### Rounded explanation panels — 6 October 2026

User preferred capsule-like cards over plain columns. Wrapped each explanation in native Polaris Box with subdued background, large corner radius and base padding; desktop grid stretches panels to equal height and phone stacks them. No extra shadows, CSS or data changes. Build/component checks passed, published and inspected desktop1440/phone390 with no overflow.

### Exact abandoned-checkout matching — 6 October 2026

Added an owner-only Convex read/matching step for the existing demo snapshot using the legacy REST abandoned-checkout token. GET-only, fixed build-sprint-demo host, minimal requested fields, checked pagination, SHA-256 conventions matching the original pixel/import, and a required retained non-audit checkout-start identity. No guessed price/time/customer links, raw response storage, public sync endpoint, pixel changes or Shopify writes. Apply transaction rejects conflicts/changed prices and preserves all saved evidence on failure. GraphQL currently lacks this abandoned-checkout token; REST is a bounded demo compatibility path, not a new public-app architecture.

Backend deployed and preview executed: not_configured,1existing match,30unmatched. Waiting for the user to set SHOPIFY_ADMIN_ACCESS_TOKEN in the development deployment's Settings → Environment Variables, with demo-store read_orders/protected-checkout access and legacy REST eligibility. No token was requested in chat or embedded in code/client/environment files.22unit tests and build passed. No new records or test orders were generated. Details and owner preview/apply commands are in ABANDONED_CHECKOUTS.md. Native UI structure is unchanged; drill-down wording now says verified record match rather than prescribing the earlier browser-audit method.

Published the wording update and checked the dashboard in the browser:512events,55sessions,14completions,31native abandoned records/USD18,600 and existing1priced/40unknown action coverage remain unchanged. Live Shopify API reads and additional matching remain blocked on user-set credentials, so no increase in coverage is claimed.

### Remove distracting overview cards — 6 October 2026

Removed Recovery email coverage and Collection coverage cards. Collection status/counts/source limitations now sit behind a collapsed Data details button at the footer. Recovery-email counts remain in the existing observed-purchase/source details. Checkout activity, basket value, actions and saved evidence remain unchanged. Native Polaris v2 component and build checks passed.

### Facts and explicitly modeled opportunity — 6 October 2026

User requested alignment with facts and probability after challenging unknown amounts. Summary now applies an explicitly hypothetical1–5%conversion scenario to all31recorded abandoned baskets/USD18,600, yielding USD186–930. Action cards distinguish recorded linked basket values from unlinked baskets modeled at the observed14test-purchase AOV/USD705.35, label estimates, round model outputs to whole dollars and expose formula/assumptions in details. Range is not a learned probability/confidence interval. Different datasets and overlapping action groups cannot be summed/reconciled. No keys, new matched records, fake event imports or backend writes. Recovered/completed exclusions and distinct-session counting covered by24passing tests; native v2 checks/build passed.

### One consistent priced cohort — 6 October 2026

User requested priced baskets only or Unknown. Removed AOV substitution and its estimate helper/tests. Summary now uses recordedImpact's deduplicated session-linked subtotal, exactly like actions: USD600,1of41unfinished sessions linked,40unlinked excluded, illustrative1–5%USD6–30. Payment group with no linked basket shows Unknown. Exported31-record/USD18,600snapshot remains stored but is no longer presented as the linked-session summary. Test-purchase AOV is context only.22tests and native component/build checks passed; no data/identity writes.

### Review and verification — Shopify connection

Standards review found two issues (revoked evidence reads and duplicate pixel IDs); Spec review found those plus unsupported strict-sandbox hashing globals. All three were fixed, targeted tests passed, and both reviewers confirmed the fixes. Full suite28passed, typechecking/Polaris checks/pixel build/config validation passed. No real credentials entered by the agent; actual app TOML is gitignored. New browser test checkouts and authenticated Shopify reads are pending the user setting credentials, so the integration is not declared complete.

### Persistent Shopify release — 6 October 2026

User approved release. Shopify CLI built and validated checkout-evidence, then confirmed keval-test-app-2 released successfully: https://dev.shopify.com/dashboard/129333258/apps/432119382017/versions/1156594204673 . Only keval-test-app was targeted. Pixel activation and real browser delivery remain pending the user-set Convex credentials; release alone does not enable collection. The embedded page still shows the credential setup screen.

### Credential verification and protected-data blocker — 6 October 2026

User set both Convex app settings. Browser verification now passes Shopify session verification and token exchange, but the abandoned-checkout query is rejected because protected customer-data access has not been selected. Added allowlisted connection errors so only fixed diagnostic labels reach the UI; raw Shopify errors and credentials remain private. All 28 tests and the native Polaris/type/build checks pass. Amounts now display the dollar symbol instead of the USD code; published amounts were checked in the browser.

The Partner Dashboard's Protected customer data form is open, with Analytics available as a reason. No optional name, email, phone or address access is needed. Automatic approval review blocked selecting Analytics because it expands permissions; awaiting explicit approval before selecting and saving. Pixel activation and new browser checkout delivery remain unverified. No new records are claimed.

### Connected app and browser collection verified — 6 October 2026

User explicitly approved selecting and saving protected customer data access for Analytics. Shopify confirmed the setting was saved; optional name, email, phone and address access remains unselected. Authenticated refresh then returned 14 orders and 31 unrecovered checkouts with $18,600 in native recorded baskets, kept separate from session-linked action values. Activated the app pixel through its protected app button.

Created two actual browser test checkouts: an unfinished Liquid snowboard basket ($749.95) with deliberate empty-field validation errors, and a successfully paid Hydrogen snowboard ($600) through Shopify's Test Payment Gateway using fictional test details. The embedded app now shows 57 sessions, 15 completions, 42 without recorded completion, and 531 deduplicated events. Native sync shows 15 orders. The unfinished basket adds one explicitly browser-priced session; observed unfinished value is $1,349.95 (one existing $600 server link plus $749.95 browser observation), while the completed $600 basket is excluded. No live revenue or causal finding is claimed. Existing imported test AOV remains snapshot context, not a pricing fallback. Legacy collector remains active with event-ID deduplication.

Desktop embedded UI and real data flow were checked. Attempted Chrome viewport override returned a desktop-size screenshot, so authenticated phone layout is not claimed as verified. Existing public-preview phone checks remain separate. Natural token expiry/renewal is not yet verified through elapsed-time testing.

### Average order value from synced purchases — 6 October 2026

The authenticated Shopify app now recalculates its displayed test-order average from the latest synced last-30-day purchases on app load and Refresh test data. Includes paid, uncancelled test orders with valid USD current product subtotals, including zero-value orders; excludes missing/invalid prices from both numerator and denominator, and shows Unknown when none are priced. Details expose the actual count, total and exclusions, replacing historical imported basket details for this authenticated view. The public demo retains its saved import; no private purchases are published anonymously. Average order value remains context only and never fills missing basket/recovery values.

Browser checked: $10,474.85 across 15 paid test orders gives $698.32, replacing the imported $705.35. Recovery values remain $1,349.95 and hypothetical $13–$67. All 29 tests, type checking, Polaris checks and frontend build passed; uploaded to the existing Convex development preview.

### Merchant wording and date selection — 6 October 2026

Renamed the summary metric to Total abandoned basket value, with an explicit count of priced unfinished baskets and exclusion of unpriced baskets. Shortened summary recovery coverage to baskets valued / without a recorded value. Added a native Polaris v2 range picker in the top actions, default Last 30 days, with Last 7 days preset and custom dates within the synced 30-day window. Dates use the browser's local calendar. Session cohorts use checkout start dates and retain later known completion events, so a boundary does not invent abandonment. Synced orders and abandoned records use their creation dates; date-filtered AOV never uses modeled baskets. Empty dates show no activity and Unknown amounts. Source details identify the distinct native-record and tracked-session totals.

Verified in Shopify admin: default 30-day values, Last 7 days preset, and custom October 1 empty cohort with zero orders/sessions and Unknown AOV. Restored Last 30 days. 31 tests passed, build/type checks and official v2 manifest checks passed. Shopify skill helper only supports v1.1; its shared date-picker composition validated there, while all actual app components were validated against the installed v2.0 RC catalog. Published to the existing Convex preview.

### Compact date picker and completed phone-flow check — 6 October 2026

Fixed the oversized date popover with native Polaris inlineSize 340px / maxInlineSize 100%, preserving native calendar styles. The official TypeScript declarations support pixel/percentage sizing; the generated manifest drops these template-literal units, so the local component checker now accepts only those numeric sizing units on sizing attributes. Shopify helper, type checking and build passed.

Desktop inspection also showed that a Shopify-forwarded header action could not anchor the overlay inside the app frame. Moved the date button into the app's top row so it stays visible on phones and the popover opens beside it. Verified the installed Shopify app on desktop and the identical public calendar at a real 390px browser viewport: screenshot reviewed, no horizontal page overflow, custom October 1 selection applied to zero sessions, calendar closed, and Last 30 days restored. Public-preview values remain distinct from authenticated app values. All 31 tests pass. No custom calendar styles, new store records or permission changes.
