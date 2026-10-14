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

- The summary uses all unrecovered Shopify abandoned-checkout records in the selected dates. Action exposure uses distinct unfinished tracked sessions with recorded basket values. These are separate cohorts and must not be presented as the same total.
- Show only observed, explicitly sourced basket values. Unknown stays Unknown when no basket is linked; never replace it with AOV, zero or a price-based guess. AOV remains purchase context.
- Show linked-session coverage next to each subtotal. Keep the original exported total out of the session summary unless those records form its verified cohort.
- Do not use blanket recovery percentages. Estimated recovery requires a confirmed case, comparable merchant outcomes, an explicit future horizon/volume and post-fix basket values. Demo data displays Not estimated yet. Measured recovery and future sales protected are different quantities.
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


## 2026-10-06: Minimal Shopify abandoned-basket summary

The summary now shows three metrics from all unrecovered Shopify abandoned-checkout records in the selected creation-date range: total product subtotal, checkout count, and total divided by count. It no longer requires a link to pixel sessions and does not use completed-order AOV or an assumed recovery percentage. Missing prices make the complete total and average Unknown rather than counting missing values as zero. Zero checkouts gives $0 total and no average.

The shared demo page receives only aggregate metrics from the existing synced build-sprint-demo snapshot; private orders and individual abandoned-checkout records remain behind Shopify authentication. The public page reads the last sync rather than initiating a privileged sync. Tracked-session action exposure remains separate and overlapping action groups must not be added. PRODUCT.md's baseline/intervention approach remains the intended leakage measurement; the old 1–5% action scenarios are still assumptions, not evidence of email or fix recovery.

Verified the published shared page at desktop and 390px phone width: $19,349.95 / 32 = $604.69 (rounded). Selecting 1 October gives $0, 0, and no average; restoring Last 30 days restores the totals. All 33 tests, TypeScript, and native v2.0 RC component checks passed.


## 2026-10-06: Merchant-facing copy pass

Applied concise labels throughout overview and drill-down: Completed checkouts, Unfinished checkouts, View checkouts, Review checkout form errors, Review unfinished checkouts, Recorded basket value, and plain coverage counts. Shortened investigation explanations, replaced repeated test wording with one demo-data footer, and retained price-source limitations in details. Completed timeline details now display Status: Completed rather than a misleading last-progress label from a restarted checkout. No metric, identity, event-order, or recovery calculation was changed. The 1–5% action estimate remains explicitly an assumption. All 33 tests and native v2/build checks pass; published desktop and 390px phone layouts, action details, and completed timeline checked in browser.


## 2026-10-06: Scenario-based recovery and actionable checkout investigations

User explicitly expanded the improvement scope: move from a blanket recovery percentage to case-specific intelligence, research the shopper psychology and competitors, and continue without routine approval pauses. See CHECKOUT_RECOVERY_RESEARCH.md for primary sources. Added an eight-case library distinguishing blocked buying, promotion expectations, validation friction, inventory, extension failures, unexpected delivery cost/date, and ordinary unfinished checkouts. Inventory and extension events are explicitly marked not yet collected. Shipping and discount investigations now use their actual stored alert categories, with distinct next actions and saved checklists. Empty error groups are hidden; potential functional issues come first, followed by promotion issues, form errors, and unconfirmed unfinished journeys.

Replaced visible 1–5% guesses with Estimated recovery. The model requires a verified merchant-fixable cause, valid known basket values, explicit comparable future volume/horizon and post-fix basket values, and a comparable store baseline. Functional cases use normal completion at the relevant stage; expectation/friction cases require measured same-case improvement, with conservative proportion bounds. Discounts must use post-change values. Historical unfinished baskets do not prove old buyers return. The demo deliberately displays Not estimated yet because generated test sessions cannot measure real shopper response; live baseline measurement is not wired and this is not a production-readiness claim.

Actual browser testing uncovered that a rejected code was emitted as input validation. Added local-only normalization of safe discount field paths and an exact reproduced error template, discarding raw text, targets and entered values. Released keval-test-app-3 and then -4 with unchanged scopes. Stopped the stale dev preview on build-sprint-demo to restore the released version. Final real retest produced two discount alerts in one existing checkout, and the public UI displayed Investigate repeated discount errors. Public category correction applies only to event identities already public; additional private sessions/prices/Shopify records remain private. No historical categories were manually invented or overwritten.

39 tests and native v2.0/build checks passed. Backend and frontend published to existing Convex development preview. Browser verification of final desktop/phone action and scenario library follows. Real-merchant baseline, verified functional shipping reproduction, actual intervention response and measured recovery remain outstanding.

Final verification: released pixel -4 recognized two discount alerts for one real, deliberately unfinished demo checkout. Published discount investigation and eight-case library checked in browser. Historical generic validation alerts remain unchanged; the app does not claim an exact code, a verified broken promotion, or recovered money. Browser timeouts recovered by using a fresh preview tab. Final build and39tests pass.

Final visual checks completed: public scenario library at390px, affected discount checkout link, promotion checklist opening, and installed Shopify app. Installed app confirms $600 recorded product subtotal for the one discount-test checkout. Recovery remains unavailable because no real-customer baseline/intervention data exists. No arbitrary percentage remains in the visible UI.

## 2026-10-07: Shipping false-alarm correction and inventory investigations

Released pixel versions 5 and 6. Routine shipping-selection changes no longer generate new delivery-error suggestions; older alerts retain an explicit investigation label. A genuine no-rate checkout produced a delivery alert, with an accompanying availability warning that prevents a shipping-only causal claim. Original product assignment restored and normal delivery options retested.

Inventory and merchandise alerts now produce their own “Review unavailable items” card, affected-checkout filter, timeline category and saved checklist. Reproduced an actual Out of stock dialog in the demo; the alert reached Convex and generated one suggestion on both authenticated and public evidence feeds. Restored Liquid to the general profile and verified it was purchasable again. Removed-item value is “Not recorded” because zero current subtotal is not the value of an unavailable item. Forty-two tests and native UI/build checks pass; published all changes. CHECKOUT_SCENARIO_TESTS.md contains detailed proof and limits. Real-customer recovery measurement and item-level availability pricing remain outstanding.

Item-level availability pricing is now implemented and browser-verified: a fresh real test recorded $749.95 before the availability alert, retained that value after removal, and restored the product afterward. Currency comes from Shopify's store settings; native purchases/abandoned totals use shopMoney, while item conversion requires same-checkout paired buyer/store amounts. Missing conversions, mixed ambiguous removals and stale evidence remain excluded. Checked desktop and 390px layouts, published backend/frontend/pixel 8, and passed final tests/build. A foreign-currency purchase remains a live-test gap because all current demo purchases are USD. Detailed accounting rules and evidence are in CHECKOUT_SCENARIO_TESTS.md.

Shipping severity follow-up completed: reproduced a fresh shipping-only price-threshold blocker with an available $749.95 demo item, verified Critical end to end and kept four general alerts distinct in the explanation. Restored all temporary shipping settings and verified Standard/Express rates again. Released collector keval-test-app-11; 59 tests pass. Historical test evidence remains visible; no measured recovery is claimed.

Fix follow-up completed: server-saved Fix applied markers, an undo option, and before/after checkout results. Verified with an actual demo gateway order: one previously affected checkout completed after the marker, and the resumed checkout was not counted as new. Store markers are authenticated; public demo markers are isolated by browser. Reload/undo/390px layout verified. No inferred savings or causal attribution; results refresh on request.

Five-checkout follow-up verified: three gateway test orders and two unfinished browser checkouts. Results now show 3/6 new checkouts completed and 0/6 shipping alerts, including one earlier unfinished post-marker checkout. The existing affected cohort remains 1/5 completed after marker. These controlled demo outcomes validate tracking only; no causal improvement claim is made.

### Basket value correction — 7 October 2026

Confirmed Shopify Admin lists 39 unrecovered checkouts totaling USD23,579.75. The prior overview summed USD23,549.75 in product subtotals, excluding USD30 shipping. Added Shopify total-price fields while retaining subtotals for product-value action calculations. Completed drill-down rows now use exact matched order prices (e.g. Order#1014 USD1,200, #1013 USD1,299.95, #1012 USD774.90).

GraphQL recovery URLs use an encoded recovery identity, which is not the original pixel checkout token. Removed the attempted URL-based join. The fixed development store's existing legacy compatibility reader supplies original checkout-token hashes, joined to GraphQL prices only by exact native checkout ID; all39 records match actual observed sessions. Payment-error price coverage improved from1/11 to11/11, USD6,600 in product subtotals. Neither tokens nor recovery URLs are stored or exposed. This legacy reader is demo-specific and must be replaced with a supported identity path before a new public Shopify app rollout. Unknown values remain for old start-only sessions without server records or observed price.

Verified browser overview and drill-down after Convex deployment; unit tests cover exact-ID joins, ambiguous links, source priority, real zero values, currency filtering, shipping-inclusive totals, and missing values.

## Supported checkout-price receiver — 7 October 2026

Removed the legacy REST checkout reader from normal sync and retired the owner-run compatibility command. GraphQL sync preserves previously verified session hashes by the exact saved GraphQL record hash; it never guesses historical identities from dates, prices or recovery URLs.

Implemented signed `checkouts/create` and `checkouts/update` notifications using Shopify API 2026-10. Requested payload fields are only token, created_at, updated_at, currency, subtotal_price, total_price and completed_at. Raw checkout tokens become the existing pixel session hash before saving. No customer fields or recovery URLs are persisted. Prices are stored per exact session, reject stale updates, retain terminal completion, support currency precision and replace historical per-session prices without double counting. GraphQL remains the source of aggregate abandoned totals and matched order prices.

Activation is pending explicit approval. Automatic approval review rejected enabling the subscriptions because checkout data would be sent from Shopify to Convex. An app refresh had already enabled them before that rejected command; both subscriptions were removed, and the receiver now also requires SHOPIFY_CHECKOUT_PRICES_ENABLED=true. Read-only status confirmed zero active checkout-price topics. Normal sync does not activate subscriptions. Owner-only enableCheckoutPrices and checkoutPriceStatus actions provide activation and verification after approval. User approval must name the checkout-token/date/currency/price/completion data and the app's Convex endpoint.

83 tests pass, including correct/incorrect Shopify signatures, foreign-store rejection, privacy stripping, currency precision, stale/duplicate updates, exact historical joins and completed-checkout totals before order sync. Live browser verification confirms the existing 39 abandoned baskets still total $23,579.75. A real Shopify notification delivery must be tested after approval; synthetic test fixtures were not inserted as shopper evidence.

### Checkout-price activation verified — 7 October 2026

The user explicitly approved sending checkout tokens, dates, currency, prices and completion status to this app's Convex endpoint. Set SHOPIFY_CHECKOUT_PRICES_ENABLED=true and enabled both CHECKOUTS_CREATE and CHECKOUTS_UPDATE with only the seven requested fields. Read-only status confirmed both topics at the intended endpoint.

Created a real development-store checkout for one Liquid snowboard using synthetic contact/address details, without placing an order. Shopify displayed USD $749.95 subtotal plus $30 International Shipping, total $779.95. The signed notification receiver saved one anonymous session-price record with subtotalCents=74995 and totalCents=77995; updates retained a single record. The live drill-down's newest row #a99987d7f9dd… displayed $779.95 and no recorded errors, matching the checkout total. Existing historical matches remained intact. Screenshot: /private/tmp/checkout-price-notifications-live.png.

No further deployment was required for activation; the receiver and frontend were already deployed and tested in the preceding turn. Replacement code has not yet been saved to the public GitHub snapshot.

### Recommendation quality gate — 7 October 2026
Routine card-entry mistakes, basic Shopify form validation, unqualified discount rejections and missing completion no longer create recommendation cards. Their events remain in Checkout drill-down. Category counts alone do not establish merchant-fixable incidents.
Current directly observed rule: at least two distinct checkouts with confirmed no-shipping messages and no purchase after their last blocker. The recommendation asks the merchant to confirm intended eligibility; it does not claim a store outage or an abnormal baseline spike. Only qualifying checkout identities contribute its basket value. Other recommendations require verified eligibility/provider cause or a comparable merchant baseline before activation. Existing fix records are preserved; suppressed categories are not displayed as recommendations.

### Alert priorities and order patterns — 7 October 2026
Prioritise shipping availability, verified payment-provider failures, and eligible advertised discounts that fail. Ordinary declines, invalid codes and basic validation remain session details. Shipping already has a direct repeated-blocker rule; payment and discount recommendations remain disabled until cause/eligibility evidence exists. Do not equate a generic payment message or discount rejection with a merchant fault.
Added an hourly order comparison: the latest synced day versus the previous 30 complete UTC days. Sync starts at midnight 30 days earlier so a complete baseline can be obtained. Paid, uncancelled Shopify orders only; duplicate identities excluded. Partial history is explicitly labelled and future hours are not zeros. Public preview receives aggregate counts only. The chart is a descriptive view, not an outage detector or a recovery estimate; test purchases do not establish a production baseline.

Chart renderer now uses Shopify's official Polaris Viz LineChart, Light theme, solid current-day line and dotted comparison line on a shared axis. Custom SVG renderer removed at user request. Surrounding UI remains App Home v2.0 RC; official chart React dependencies load separately. Data/window rules are unchanged.


### Store-local chart refinement — 7 October 2026
Order sync now reads Shopify Shop.ianaTimezone and starts at the store's local midnight 30 calendar days earlier. Hourly counts, day labels and previous complete-day averages use that zone. Partial source coverage is excluded; spring-forward missing hours do not count as zero observations, and repeated fall-back hours collect both occurrences. Old snapshots retain UTC until refreshed.
Reviewed Shopify's official Polaris data-visualization guidance and Polaris Viz analytics-experience guidance: retain compact native chart spacing, clearly labelled numeric/time axes, a simple comparison legend and relevant operational metrics. Axis uses whole order counts; accessible table and tooltip retain fractional averages. Time zone and current-hour “In progress” appear in the tooltip rather than adding page copy. Existing 2:1 desktop layout and stacked phone layout retained.
Read-only installed-app refresh confirmed America/New_York from Shopify. Browser accessible table shows today's one order at02:00 and four at05:00, matching the previous06:00/09:00 UTC observations. Average values remain0.1,0.03,0.07,0.37 rather than rounding to zero. Public and embedded pages agree. Desktop and390px phone screenshots inspected; phone client/scroll widths both390, no public browser errors. Tooltip formatting is configured but direct tooltip interaction was not re-tested in this turn.93 tests and build/TypeScript/v2.0 manifest checks pass. Backend and frontend published; final static release cbe475f7-6241-48b5-85b9-3354aacdf4b6. Screenshots /private/tmp/checkout-store-time-desktop.png and /private/tmp/checkout-store-time-phone.png.
Sources: https://polaris-site-prod-kit.shopify.prod.shopifyapps.com/design/data-visualizations (search-index excerpt; full page returned502); https://github.com/Shopify/polaris-viz/blob/main/ANALYTICS_EXPERIENCES.md ; https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Shop . Demo orders remain a test dataset, not a production sales baseline.

## Compact recommendation rows — 7 October 2026

Converted the existing recommendations to compact expandable rows inspired by the reviewed Health Dashboard design. Collapsed rows show the original title, severity, first factual summary sentence and affected-checkout percentage. Detailed basket values, fix goals, alert dates, Mark as done, fix results and checklists stay inside the expanded panels. Preserved the current recommendation eligibility rules and data calculations.

Verified desktop and 390px mobile layouts, keyboard expansion, live show/hide behavior and no horizontal mobile overflow. Tested Mark as done and reopening using the local demo viewer, then restored its original unmarked state. All 93 existing tests pass; TypeScript, the installed Polaris v2 manifest check and production build pass. Shopify's separate layout helper validated the common components against its available v1.1 schema; the installed manifest validates the actual v2 components. Fixed the container-grid alignment revealed by the first visual pass and confirmed the final responsive layout in the second pass.

Deployed with npm run deploy: 74aba25f-cde0-430a-a791-f2a25b2978a1. Live screenshot: /private/tmp/compact-recommendation-rows-live.png. This UI update has not yet been saved to the public GitHub snapshot.


### Matching-weekday comparison — 7 October 2026
Replaced the all-day hourly baseline with complete matching weekdays within the preceding30 store-local calendar days. A Wednesday compares with previous Wednesdays, including covered zero-order days; other weekdays do not contribute. Today, uncovered partial days, cancelled/unpaid orders and duplicates remain excluded. No matching history yields no average rather than a fabricated zero. DST and half-hour time-zone tests cover matching weekdays. The legend shows weekday and observed-day count (currently Wed average ·4 days). Added native App Home v2.0 RC Box paddingBlockStart=base above the official chart.93 tests and TypeScript/build/v2 manifest pass. Shopify skill helpers cannot validate v2 (search supports only v1; validator lacks its TypeScript dependency); current official v2 Box docs and the project's v2 manifest check were used instead.

Published release cfa60811-230e-4597-8de5-7e801a3a7955. Desktop and390px phone screenshots inspected:16px extra top space,2:1 cards on desktop, stacked on phone, no horizontal overflow or browser errors. Current four covered Wednesdays have no paid orders, so their average is factually zero; no synthetic comparison orders inserted. Screenshots /private/tmp/checkout-weekday-desktop.png and /private/tmp/checkout-weekday-phone.png.

### Expanded metrics simplified — 7 October 2026

Removed the Fix goal/Estimated recovery metric column and the basket-coverage subtitle from expanded recommendations. The affected-checkout value now reads `2 / 78 checkouts` using live counts, replacing the expanded percentage and its duplicate count line. The collapsed summary percentage stays unchanged. Expanded metrics use a native responsive two-column grid and stack on narrow screens. No replacement third metric was invented, and no 99% coverage claim was added.

Build, TypeScript and installed Polaris v2 manifest checks pass. Verified the exact two values in local preview and the deployed page; the live 390px viewport has no horizontal overflow. Deployed with npm run deploy: f342dd82-1b9d-4214-b4a8-5e64f26c9497. Screenshot: /private/tmp/expanded-metrics-simplified-live.png.


### Fresh order chart check — 7 October 2026
Placed one actual browser checkout in build-sprint-demo using synthetic contact/address data and Shopify Test Payment Gateway (approved transaction value1). One Hydrogen snowboard, quantity1, subtotal/total$600, Standard shipping free. Shopify confirmation MVMQ8AJTT. No real payment charged and no synthetic order was inserted directly into Convex.
Before: today's paid orders5,09:00 America/New_York count0; completed checkouts22 of78. Opened installed keval-test-app to perform its existing read-only purchase sync after checkout. Both embedded and shared page show today's orders6,09:00 count1 and23 completed of79. Existing02:00 count1 and05:00 count4 unchanged; matching-Wednesday baseline remains0 across4 prior Wednesdays. Abandoned aggregates remain40/$24,179.75/$604.49.
Fresh session #0b8a02f6e8e7… has6 recorded events including checkout start/contact/address/shipping/payment/completion,0 alerts, and Completed status. Event arrival shows payment submission timestamp after completion; no change was made to source timestamps or fabricated ordering. Public session basket prices are Unknown in this view; this check verifies hourly orders and completion, not price-link coverage. Saved confirmation /private/tmp/chart-test-order-confirmed.png and inspected chart screenshot /private/tmp/chart-fresh-order-verified.png. No code changes or deployment required.


### Automatic purchase sync — 7 October 2026
Added Convex cron every minute using the saved offline installation and existing read-only queries. Expiring tokens refresh server-side through the official SDK; missing/disconnected/expired-refresh installations do not reconnect themselves. No new scopes/subscriptions/customer fields. Sync failure preserves prior snapshot and emits a generic safe error. Snapshot writes reject work after disconnect or a newer installation, including an uninstall between access lookup and save. Added safe owner-only diagnostic returning timestamps and counts, no credentials. Open overview quietly reads evidence every minute when visible; it does not call Shopify sync again. Existing manual initial sync remains.
End-to-end: started with6 paid orders today/09:00 New York count1 and23 completions. Placed actual demo browser test order C501RFKFN, one$600 Hydrogen snowboard, free Standard shipping, synthetic customer/address, Test Payment Gateway approved value1. Never opened the installed Shopify app or manually ran sync. Backend scheduled sync reached24 orders; untouched visible public page automatically showed today's7 orders,09:00 count2 and24 completed of80. Weekday average stayed0; abandoned aggregate stayed40/$24,179.75/$604.49. Poll phases can produce about2minutes delay, not instant push.
100 tests pass, including disconnect/reinstall race guard; build/TypeScript/v2 manifest pass. A shared-file UI edit introduced an unsupported group role and placed alert setup inside retry-progress; corrected to region and moved setup outside that handler before final build. Initial automatic-update screenshot /private/tmp/automatic-purchase-sync-verified.png. Final static release572cdac1-cde7-4c65-97f2-8a7063fbd576.

## Remaining dashboard inspiration implemented — 7 October 2026

The user asked to implement the remaining inspiration list and confirmed Jimmy’s Bakery is a dashboard-name change. The connected Shopify store is still build-sprint-demo and is identified alongside the successful data-update time.

Implemented priority issues (up to three qualifying, unfinished investigations), counted quick filters, last observed steps, recorded step intervals, grouped error diagnostics with distinct checkout counts/first and last observations/later completion, comparable-period completion and alert rates, filtered checkout and event CSV exports, retained fix history including retests and undo, and focused in-app alerts. Existing recommendation eligibility remains evidence-based; priority summaries do not invent extra issues to fill three slots. Missing transitions and insufficient or truncated history remain unknown. Payment timing stays unknown if payment activity was not observed.

Fix history uses a scoped archive that retains the saved baseline, application time, retest and undo time. Old inactive markers without a known undo time show that limitation rather than counting later activity. Team history stays behind the existing Shopify session checks; public demo history is viewer-specific. Tested mark, retest and undo using the local demo viewer and restored its original current status; the test archive intentionally remains.

Alerts check once a minute while the app is open and visible, with browser-local preferences and dismissals. Shipping signals need distinct unresolved checkouts; error-rate increases require a measured recent baseline and minimum activity, and are suppressed with truncated history. No external messaging destination was connected. Automatic refreshes pause while a date picker or checkout dialog is open.

Verification: 100 tests pass; TypeScript, the expanded installed-Polaris v2 manifest checker, and the production build pass. Checked desktop and 390px mobile behavior, priority-to-table navigation, counted filters, timelines, history and alert preferences in the browser. Actual CSV downloads contained 14 filtered payment-alert checkouts and 256 corresponding events. A real one-day comparison showed 7/18 completions against 6/10 in the prior day, with the current-period warning. Authenticated Shopify views, order prices, history and timing labels were verified live. The browser DOM inspection included hidden modal and error-message content; screenshots confirmed no visible error banner.

Final deployment: 34cb73bb-2831-4d8e-b7ad-5dd12ed4331a. Saved public source commit: 8783ef9. The public snapshot preserves other existing project edits, including the order chart, background sync and subsequent recommendation simplification. Public-source scan checked 94 files with zero secret-pattern matches and zero .env files. npm verification also reported existing moderate notices in the development-only Shopify CLI dependency chain; no forced CLI downgrade was applied as part of the dashboard work.

GitHub verification completed successfully for 8783ef9a3a378a9b99289a77af7c2bae181c86da: https://github.com/keval-px/build-sprint-app/actions/runs/37636187936. Final source and live assets match index-C3Hc_ArP.js. The public dashboard and mobile header were confirmed after deployment. Shopify requested a fresh account sign-in on the final authenticated-page reload; its prior authenticated history, filters, prices and timing checks had already passed.

### Previous-period section removed — 7 October 2026

Removed the requested Overview section, its render call and its unused UI helper. Build/type/component checks pass. Deployed with npm run deploy (5abcc0e1-797d-4acd-88cc-350b43b73c76) and verified the live dashboard contains no heading matching Compared with the previous period. Screenshot: /private/tmp/jimmys-bakery-comparison-removed.png. Saved to public source commit 4576809 after a 94-file scan with zero secret-pattern matches or .env files.

### Manual Refresh button removed — 7 October 2026

Removed the Overview Refresh button, its click listener and its loading-state references. Automatic background data refresh and focused-alert checks remain in place. Deployed using npm run deploy (3f7de293-0df2-44bd-85dc-1bfbe933be69). Build/type/component checks pass; live browser verification found zero buttons named Refresh. Screenshot: /private/tmp/jimmys-bakery-refresh-removed.png. Saved public source commit 239da5c after a clean 94-file secret-pattern scan with no .env files.

## Evidence-specific recorded findings — 7 Oct 2026
- Replaced category-only error summary with groups by recorded alert and strictly earlier checkout step. Shows distinct checkout count, total alerts, checkouts with repeated alerts, later completion count and last seen.
- Each evidence button filters the exact group's checkout identities; tested live address-step form finding: 46 checkouts, 87 alerts, repeats in 37, later completion in 17. Category and step are context, not field identity or cause. Existing messages were discarded; no synthetic quotes, extension crashes or field-level diagnoses added.
- 102 tests passed; typecheck, Polaris manifest and production build passed. Deployed via npm run deploy: 48d44c8a-a6b2-44c9-95da-f2f82d73cd32. Public source commits c6965ac and 4abf4a1; 94 tracked/staged files scanned with zero secret matches and zero env files.

## Overall code and numeric audit — 8 October 2026
- Requirements and verification recorded in AUDIT.md. Removed obsolete model/checklist/recovery/comparison/importer code and unused font, while retaining historical database records.
- Corrected full basket-total accounting, signed-completion exposure exclusions, signal-specific shipping fix baselines and recurrence, simultaneous step grouping, public correction projection, stored pixel counts, stale exact filters and post-save focus. Shared refresh, tested table filtering/pagination and cached currency precision replace redundant work.
- 96 retained feature/regression tests pass. Build checks now also reject unused code and missing static UI targets. Authenticated Shopify, public preview, desktop and 390px phone checks completed; all table pages, combined filters/search, popup timelines, marker/retest/undo, dates, alert preferences/checks and both CSV exports verified.
- Public and private source reconciliation: 80 journeys, 24 completed, 56 unfinished, 779 events; 40 native abandoned baskets total $24,179.75 / average $604.49; shipping recommendation 2 unresolved identities / $1,499.90. Real exports: 80 rows and 779 events; independently verified all 80 prices, 70 recorded / 10 unknown, with zero preserved. Isolated local demo markers undone; merchant markers unchanged.
- Final deployment f6d92f40-57d5-44cf-98d7-9c02ae00075a, main JS index-BEjlbgdY.js, chart orderChart-CqvZ2q6Q.js. Main JS about 21% smaller; unused font removed. Public staged/tracked scan: 86 files, zero secret matches or env files.
- Remaining pilot limits and four moderate development-tool advisories documented in AUDIT.md. No production-scale/Slack/AI claims, synthetic field diagnoses or 99% basket coverage promise added.
- Public commit c35c68d74e6fccfe47e07d90864a93a18e2435b7 pushed; GitHub checks run 37671783894 completed successfully. Final authenticated and public reloads retained reconciled totals and no visible request error. Screenshots: /private/tmp/checkout-audit-live.png and /private/tmp/checkout-audit-mobile.png. Temporary browser viewport reset, previews closed; authenticated app left open.

## Pending to-do list — saved 8 October 2026
User asked to remember these follow-ups; this records the backlog without starting work.

- [ ] **Next:** remove the latest-1,000-events reporting limit using server-side summaries; verify totals and journeys with higher-volume test data.
- [ ] Replace the 10,000-record collection cap with a retention plan that preserves reliable reporting.
- [ ] Add safe, specific error details for future findings; keep buyer-entered values out of collected data and avoid inventing details for old events.
- [ ] Investigate the 10 journeys with unknown basket prices; keep Unknown until an exact source match exists.
- [ ] Resolve the four moderate Shopify development-tool dependency advisories when a compatible fix is available; avoid a forced major downgrade.

Slack delivery and AI diagnosis remain future product milestones in PRODUCT.md, outside this immediate cleanup backlog.

## Table control refinement — 8 October 2026
- Removed the duplicate alert-type dropdown. Category filtering remains in the counted quick-filter buttons, with selected category kept in application state rather than a hidden dropdown.
- Moved checkout/event exports alongside the Checkout sessions heading above the table card. Search, status and sort remain inside the card.
- 96 tests/build passed; live quick filters verified: payment 14, shipping unavailable 3, All 80 with 24 per page. DOM check confirms export buttons sit outside s-section. Source scan: 86 files, zero secrets/env files. Deployment 3840e8fc-80ce-4d87-bbc3-184265e1fd13; screenshot /private/tmp/checkout-table-controls.png.

## Plain export buttons — 8 October 2026
Both export actions now use Shopify's tertiary button variant with the official export icon. Live background verified transparent; component check/typecheck/build passed. Source scan: 86 files, zero secret-pattern matches or env files. Deployment 62ee06b0-55bf-47d3-a0bb-3f9c50b91d10; screenshot /private/tmp/plain-export-buttons.png. Export handlers unchanged.

## Table date picker and combined export menu — 8 October 2026
- Added a tertiary calendar action labeled Last 30 days beside the table's Export action. It opens the existing shared date picker and both view labels stay synchronized.
- Combined exports in Shopify s-menu; both checkout and event choices retain their working download handlers. Export trigger and items are disabled during loading/empty results. The open menu joins the existing overlay guard for automatic refresh.
- Component validation/typecheck/build passed; verified both actual download choices, changing to Last 7 days and restoring Last 30 days, and 390px layout without horizontal overflow. Public source scanned: 86 files, no secrets/env files. Commit b43afee; deployment eff46c30-a6c4-47ca-8263-91cefe247041. Screenshot /private/tmp/table-date-export-menu.png.

## Main-only export icon — 8 October 2026
Removed icons from both export menu options. Shopify's menu activator suppresses the ordinary button icon, so the main button now uses a supported s-icon within its label, hidden from assistive technology via aria-hidden. Live check confirms one main export icon and text-only menu items; component check/typecheck/build pass. Secret scan: 86 files, no matches/env files. Deployment f4a65007-3ee3-4412-8d71-dd16629ea221.

## Basket sync freshness — 8 October 2026
Added Last Shopify sync timestamps beneath abandoned basket totals and above the checkout table. Both read only the successful Shopify snapshot sync time, with the public aggregate sync time as fallback; sampledAt/page-refresh time is never substituted. No successful sync has an explicit empty state. Verified both labels show 8 Oct, 11:14:03 in the authenticated app and order prices remain present. Preserved concurrent removal of top-level store metadata and fixed dashboard name across views. Current source schedules Shopify sync every minute; corrected the earlier five-minute statement. Component check/typecheck/build pass; scan 86 files, no secrets/env files. Deployment ede3a012-ba11-4b7d-b183-1a577881ced1.

## Remove merchant-facing sync labels — 8 October 2026
User decided sync timestamps are not merchant-friendly. Removed both labels and their rendering code; backend sync and values remain active. Verified zero sync-label elements and $600.00 recorded order price in authenticated drill-down. Component check/typecheck/build passed; staged scan 86 files, no secret matches/env files. Deployment 72c81c8f-4187-4867-8d63-bc3db9c58543; screenshot /private/tmp/basket-sync-labels-removed.png. Preserve this preference in future UI changes.

## Chart data check — 8 October 2026
User reported lost chart data. Verified live chart and stored Shopify snapshot: all 24 paid orders remain (5 Oct: 11, 6 Oct: 6, 7 Oct: 7). Chart now displays 8 October in America/New_York, with zero paid orders that day. Current graph intentionally selects store-local today plus the same-weekday hourly average; the selected dashboard date range does not change its day. The apparent disappearance is the store-local day rollover. Five order-pattern tests pass; no stored data or chart algorithm changed. Date-scope clarity / chart date selection is a possible product follow-up, pending user direction.

## Chart follows the date picker — 8 October 2026
- Selected ranges plot daily paid-order counts; selecting one calendar date plots that date's hourly orders. The chart shows its selected dates and recorded-order total rather than always switching to store-local today. Range dates use the store's timezone, as did the prior hourly chart.
- Prior same-weekday comparison remains, using only earlier fully covered dates. Future/uncovered dates and missing baselines stay null; observed partial-day orders remain in the recorded total with partial-history notice. No synthetic zero history or new retained order data.
- Public preview requests date-aware aggregates with the selected calendar range; the authenticated app derives the same chart from its full synced snapshot. Legacy API requests without a range retain the old hourly response. Async chart rendering ignores outdated results when dates change.
- Verified current stored 24 paid orders: 5 Oct 11, 6 Oct 6, 7 Oct 7; the selected 30-day chart contains all 24 despite 8 Oct having zero. Browser checks verified default range, selecting 7 Oct (hourly 7 orders), public preview parity and 390px layout without overflow. Short readable date captions and single-day picker label added.
- 105 tests pass in both workspace and public export, including date rollover, range validation, partial coverage, duplicate/cancelled/unpaid exclusions, daily averages and prior DST cases. Build/component/type checks pass. Copied compatible concurrent store-branding/pixel-session/extension updates rather than overwriting them; no new Shopify permissions or order capture were introduced by the chart change.
- Source scan: 88 files, zero secret-pattern matches or env files. Deployment bdaebf4e-796e-4bc6-b1ce-6291970e2294; main index-yf88Iae0.js, chart orderChart-7MEAGU-t.js. Screenshot /private/tmp/selected-date-order-chart.png. Existing reporting-limit backlog remains queued.

## New test order verified end to end — 8 October 2026
User requested placing a new order to check the app. Used the demo storefront's Buy it now flow for one Hydrogen snowboard and the visibly confirmed Test payment gateway (approved test card 1, future expiry, fictional QA buyer with reserved example.com email). Standard shipping free; test order #1025 confirmed at $600.00. No real card or payment was used and no payment/shipping settings were changed.

Read-only backend checks: stored paid orders and selected-range chart rose from 24 to 25; order #1025 has test=true, paid=true, totalCents=60000, exact session link, captured checkout_completed, seven events and a signed checkout price of 60000 with recovered=true. Store-local today has one order. Authenticated UI confirms Order #1025, $600.00, Completed after an error, and chronological details showing seven events/two form alerts followed by completion, elapsed 03:22. Chart caption shows 25 recorded orders; checkout completion 25/83 at verification. Retained the test order; no cancellation or fulfillment action was taken.

Proof: /private/tmp/test-order-1025-confirmed.png and /private/tmp/test-order-1025-dashboard.png. No code change or deployment was needed. Test credentials verified against Shopify's current help page: https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode .

## Verified discount-offer investigation — 8 October 2026

Implemented a bounded demo offer registry and discount-code identity capture. Only registered terms with a valid time, store currency, known spend and an empty observed competing-discount snapshot can mark a rejection as a promised-offer candidate. Two different unfinished checkouts rejecting the same offer produce a Warning; unknown codes, retries alone and later purchases do not. Card dates track the verified code, so unrelated invalid attempts cannot refresh it. The merchant sees the code, current recorded basket value, affected sessions and steps to compare current rules with the offer. No recovery percentage or claimed loss is invented.

Real browser control, deliberate deactivation, two failures, unrelated-code exclusion, reactivation and successful same-basket retest completed. See CHECKOUT_SCENARIO_TESTS.md. The demo monitor window is closed after testing. Live campaign enrollment/configuration sync remains future work; this does not silently certify arbitrary code eligibility.

## Fixed hourly order patterns — 8 October 2026
User clarified the chart must remain hourly and fixed: today at each clock hour versus the average at that hour over the previous 30 complete store-local days. This supersedes the date-aware daily chart decision.
- Removed the daily/single-selected-date chart branch and its unused types. Date selection still filters the other dashboard/table data; this chart's scope stays explicitly Today vs last 30 days.
- Baseline includes every previous complete day, including zero-order days and different weekdays; current day is excluded. Missing source history is labeled with the actual available-day count. Future today hours remain null; existing daylight-saving denominator handling is retained.
- Today's single per-hour observation is the count for that hour; legend reads Today’s hourly orders. Comparison reads 30-day hourly average when all 30 days are covered.
- Six focused chart tests and all 109 current tests pass in workspace/public export; production builds match. Independent live check verified every hourly value: 30 baseline days / 24 previous orders, one today; historical nonzero averages include hour 2: 4/30, hour 5: 4/30, hour 7: 1/30, hour 9: 4/30, hour 10: 11/30.
- Verified authenticated chart has hour labels and both series; selecting Last 7 days leaves chart scope unchanged, then restored Last 30 days. Updated stale general audit predicate to include existing extension-error events; live metrics audit passes.
- Public source scan 92 files, zero secret-pattern matches or env files. Deployment 932c0bb8-997b-4ba5-876d-ae85b4013755; index-CxpOyn_6.js and orderChart-CePVEWnO.js. Compatible concurrent source changes preserved.
