# Demo checkout scenario checks — 6 October 2026

Used only build-sprint-demo through its actual storefront and Shopify test gateway. Two new browser checkouts: one Hydrogen snowboard ($600) and one Liquid snowboard ($749.95). Fictional contact/address inputs only. Both left unfinished; no order or real payment created. No fabricated events were inserted.

## Reproduced and captured

| Browser case | Actual recorded result |
| --- | --- |
| Invalid email, corrected afterward | Form-validation alerts |
| Invalid Texas ZIP code, corrected afterward | Form-validation alerts |
| Rejected discount, including repeat attempts | Three discount alerts across the two new checkouts |
| Test gateway decline (card 2) | Payment alert |
| Test gateway failure (card 3) | Payment alert; same generic buyer-facing payment message |
| Delivery country/rate changes | Two delivery alerts across the two new checkouts |
| Leaving without purchasing | Two new unfinished checkouts |

Final private event readback for these two checkout sessions: 41 events, including 12 validation, 3 discount, 2 payment and 2 delivery alerts. No completion event. Alert categories overlap within the same checkout; counts must not be added as distinct buyers.

Invalid promotion strings were deliberately nonexistent. Their names do not prove expiry or minimum-spend rules were tested. Payment decline and gateway failure are currently grouped into the same payment investigation; the app cannot distinguish their causes from stored categories alone.

## Suggestion updates verified

Opened/reloaded the installed app and checked the shared demo endpoint. Checkout count moved from 60 to 62, completed stayed 17, unfinished moved from 43 to 45. Payment investigations moved 12 → 13, discount investigations 1 → 3, form errors 45 → 47, and a shipping investigation appeared with 2 affected checkouts. The shipping action's affected-checkout link opened exactly the two new sessions, displaying $600 and $749.95 in the authenticated app.

This confirms updates on load/reload. Continuous updates while an already-open page remains idle were not implemented or claimed. The public page keeps private per-session prices hidden; its categories/counts updated, while the authenticated app shows their recorded basket prices.

## Shipping test limitation and cleanup

Temporarily restricted the international $30 rate to baskets of $1000 or more and the free rate to packages of 10000kg or more, then retested address/rate changes. Checkout continued to show a shipping option. Thus a true no-shipping-options blocker was **not** successfully reproduced. The visible message was “The shipping options have changed for your order. Review your selection.” Delivery alerts alone must not be treated as a confirmed outage or recoverable revenue.

Restored and visually verified the original rules: International Shipping, flat $30, no order-amount condition; Free International Shipping, minimum 20kg, no maximum, free. Domestic rates and other apps were not changed. Final admin view had no unsaved changes.

## Proof

- Installed app: /private/tmp/demo-scenario-suggestions-verified.png
- Shared demo page: /private/tmp/demo-scenario-public-verified.png

Next validation should distinguish informational delivery changes from purchase-blocking shipping failures, and reproduce a confirmed no-rate case before assigning it a financial estimate. Inventory and extension failures remain untested and are not counted as newly detected problems.

## Follow-up completed — 7 October 2026

Released keval-test-app-5: the exact reproduced “shipping options have changed” template is now retained as an uncategorized alert rather than a shipping error. Unknown delivery messages still require investigation. Raw messages/targets remain local to the pixel and are not saved. Older alerts are preserved, with merchant copy explaining that they may include normal selection changes; no historical event was guessed or rewritten.

Created an isolated no-rate profile for the Liquid snowboard and resumed the existing demo basket. Shopify visibly showed **Shipping not available** and the collector saved a delivery-category alert. The setup also produced an out-of-stock warning and a zero eligible subtotal, so this is not an isolated shipping-only causal/revenue test. Its current zero basket value is not treated as recovered money.

Removed the snowboard from the test profile, saved, and verified the product was available again. A fresh restored checkout offered Standard/Express domestically and $30 International Shipping after changing to Canada. That fresh session had 12 events and **zero delivery-error categories**; the ordinary change message was recorded with category null. This verifies the false-alarm fix end to end, not just with a unit test.

An empty profile named “Demo checkout QA — no shipping” remains for repeatable demo QA, with zero products assigned. It affects no product. The general profile's original rates were not modified in this follow-up. No order/payment was completed. Forty tests, TypeScript, native Polaris v2 checks and build passed before release; frontend copy published to the existing Convex preview.

Proof of the blocked checkout: /private/tmp/demo-shipping-blocker.png.

## Inventory detection completed — 7 October 2026

Verified the documented INVENTORY_ERROR and MERCHANDISE_ERROR types against Shopify's alert_displayed reference. Added the inventory category across the pixel normalization, backend schema/validation, summaries, timeline labels and action checklist. The merchant card is “Review unavailable items”; it asks the merchant to check stock, selling restrictions and fulfilment availability rather than assuming a stock shortage.

Released keval-test-app-6 with unchanged permissions. Reused the empty demo profile temporarily for the Liquid snowboard and resumed the existing checkout. Shopify displayed an actual Out of stock dialog; Convex stored an inventory alert at timestamp 1791349433174. The installed app and public endpoint both produced one inventory investigation. Its affected-checkout link opened exactly one session with an Item availability label; the checklist opened with three relevant steps. Historical unclassified events were not guessed or rewritten.

Shopify removed the item and reported a zero subtotal. The action therefore displays **Unavailable item value: Not recorded** rather than presenting zero as the lost item's value. Item-level prices were not collected. Recovery remains unestimated; no test shopper response or saving was invented.

Returned Liquid to its original general profile, saved, and visually verified enabled Add to cart and Buy it now buttons at $749.95. The QA profile remains empty. No inventory quantities, real payments or customer messages were changed. All 42 tests, TypeScript, native v2 checks and build passed. Backend, released pixel and frontend published.

Proof: /private/tmp/inventory-action-final.png and /private/tmp/inventory-checkout-warning.png. Next gap: collect safe item-level price evidence before attempting to value removed products.

## Item prices and currency accounting — 7 October 2026

Released pixel versions 7 and 8 to capture at most 20 anonymous checkout lines: hashed line identity, quantity, final line price in its original currency, and currency code. Titles, custom properties, contact details and raw item identifiers are not retained. Final line price already includes quantity; it is never multiplied again. Invalid, incomplete or oversized snapshots are omitted. Native records and the shared demo's aggregate continue to expose no individual private item identifiers.

The real browser test captured one available Liquid snowboard at 74995 USD minor units ($749.95), then a subsequent zero-subtotal state and actual inventory alert after moving the product to the isolated demo profile. The item-value calculation recovered that observed price. Restored the original general profile, saved, and verified enabled purchase buttons at $749.95. No payment, order or email was submitted. The QA profile is empty.

Valuation requires recent, same-checkout evidence within 15 minutes. Explicit removed line identities can be compared across snapshots. Where Shopify omits priced lines during removal, only one previously observed line plus a zero eligible subtotal is attributable; a mixed basket is not guessed. Completed pixel sessions are excluded. Older inventory tests without item snapshots remain unpriced. The card says **Item value before alert**, not lost or recovered revenue.

Shopify sync now reads the store currency and uses each record's **shopMoney** subtotal. Purchases therefore use Shopify's already-converted store-currency amounts even when a customer pays in another currency. For observed item values, a cross-currency conversion needs Shopify's paired shop/presentment subtotal amounts for exactly that checkout; another buyer's ratio or today's exchange rate is never substituted. The paired ratio is an effective checkout conversion basis, not an independently retrieved FX rate. Conversion rounds once per checkout/currency subtotal to the reporting currency's smallest unit. Zero-, two- and three-decimal currencies are covered. Legacy USD prices are never relabeled as another currency. Existing names ending in Cents on normalized Shopify totals now denote currency minor units; imported USD fixtures remain USD cents.

Current sync verified 17 orders with USD store currency and 17 paired amounts, all buyer currency USD. Foreign-currency arithmetic and missing/wrong-checkout guards were verified with synthetic unit fixtures only; no foreign-currency browser purchase was claimed. A foreign abandoned checkout without a matching conversion remains unpriced rather than inventing a rate.

The public page receives only an aggregate value for its existing public test-session cohort; private item identities, individual amounts and conversion pairs remain authenticated. Both the installed app and shared page displayed $749.95, with one checkout priced and one lacking evidence. Phone layout checked at 390px with no horizontal overflow. Reporting-currency details remain collapsed. Final tests/build and native v2 component checks passed (53 tests, including concurrent repository tests). GraphQL queries validated against 2026-10. Backend, frontend and released pixel published.

Proof: /private/tmp/item-price-accounting-final.png and /private/tmp/item-price-phone-final.png. Remaining live verification: a real Shopify foreign-currency transaction when that payment setup is available; this demo currently contains USD purchases only.

## Shipping severity and Checkout Health

The page title is now Checkout Health. New pixel delivery alerts can carry only the fixed `no_shipping_available` label when their message exactly matches an explicit English no-shipping template. Raw messages and addresses remain inside the pixel. General or older delivery alerts retain Warning; no historical messages are inferred. A recognised blocker without a later purchase gets Critical. All alerts followed by a later purchase get Info. The shipping action details show distinct checkout counts for recognised blockers and general alerts; timelines identify Shipping unavailable when captured.

57 tests pass, including template rejection, payload validation and downgrade after purchase. The new collector is released as keval-test-app-9. A fresh real no-rate checkout with this release has not yet been reproduced; historical demo shipping alerts therefore remain general alerts. Other languages and unrecognised wording are intentionally not declared confirmed blockers.

## Fresh shipping blocker verified end to end — 7 October 2026

The initial no-zone test also caused stock removal and did not provide an isolated shipping signal. Restored the product, then used the existing QA profile with a temporary United States zone and an order-amount rate requiring at least $1,000. A fresh $749.95 Liquid basket remained available and displayed: “Items in the cart do not meet price or weight requirements to qualify for shipping. Update your cart and try again.” Added this exact safe template and the full selected-address template; raw messages and addresses are not saved. Released keval-test-app-11.

Retested the checkout after release. The installed app showed Resolve unavailable shipping — Critical, with **1 checkout showing shipping unavailable and 4 general shipping alerts**, across 67 recorded checkouts. This verifies real browser event → pixel → Convex → merchant suggestion, rather than a synthetic stored event. Shipping became Critical only for the recognised blocker without a later purchase; old general alerts were not relabelled.

Removed Liquid from the QA profile, removed the temporary test zone/rate, saved, verified zero assigned products and no zones, and retested the same basket/address. Standard free and Express $15 shipping were available again. No order or payment was submitted. The retained blocker is a historical demo observation, not a claim that the restored store currently has an outage or recovered revenue. 59 tests plus TypeScript, Polaris checks and build pass. Proof: /private/tmp/shipping-critical-verified.png and /private/tmp/shipping-rate-blocker-checkout.png.

The shipping card now also shows the blocker/general-alert counts while collapsed, so its Critical badge cannot imply that every affected checkout had a confirmed blocker.

## Fix results tracking verified — 7 October 2026

Added a persisted Fix applied time marker, Undo fix marker, and Results after your fix panel for each action. The baseline covers the available 30 days before the marker; post-marker starts are followed for up to 30 days. Comparisons show all recorded checkout starts, not an inferred step-entry count. Repeated starts of the same previously started checkout are excluded from the new cohort. Previously affected unfinished checkout identities are retained so later checkout_completed events can be counted separately. No emails, assumed revenue, percentages of basket value, or causally attributed savings are counted. Missing/new zero-sample data shows waiting, and truncated event history is labelled partial.

Merchant markers require a valid Shopify session and active read permissions, and are shared for the store. Public demo markers are scoped to the anonymous browser viewer and cannot alter store markers. Marker timestamps and baseline counts are computed server-side. Repeat mark requests retain the original baseline. Undo deactivates the marker without changing Shopify.

Browser verification: saved a shipping marker with baseline 5 affected of 67 starts, 17 completed. Resumed the actual earlier affected $749.95 Liquid checkout and completed it using the Test Payment Gateway (no real payment). Shopify displayed order confirmation. Refreshing the panel showed **1 of 5 completed after fix**. A separate fresh checkout showed after 0 shipping alerts out of 1 new start and 0 completed out of 1; this is early observed activity, not proof of improvement. Reload retained the marker. A public demo marker was saved and undone successfully without changing the merchant marker. Phone viewport 390px fit without horizontal overflow. 65 tests pass (including concurrent repository tests), TypeScript and Polaris build pass. Screenshots: /private/tmp/fix-results-after-purchase.png and /private/tmp/fix-results-phone.png.

Results update on page load, date refresh, or Update results; no continuous background monitoring or causal inference is claimed. Purchase tracking here uses recorded checkout_completed events; orders lacking those events are not guessed or counted automatically. No revenue figure is added by this feature.

## Five-checkout results batch — 7 October 2026

Ran five distinct browser checkouts after the persisted shipping fix marker. Completed three orders through the Test Payment Gateway: Liquid $749.95, Hydrogen $600.00, and Complete/Ice $699.95. Shopify displayed confirmation for all three. Left a Liquid $749.95 and Hydrogen $600.00 checkout unfinished after address/rate selection, with no payment submitted. Standard free and Express $15 options were available in all five; no shipping settings were changed. Inputs were fictional QA names and reserved example.com emails.

The installed app's Update results showed **3 of 6 new checkouts completed (50%)** and **0 shipping-alert checkouts out of 6**. Six includes the earlier new unfinished checkout from the first fix-tracking verification. The earlier affected-checkout result remained **1 of 5 completed after fix**. The five newly generated outcomes were counted as new checkouts and were not attributed to the pre-fix affected cohort. This is controlled demo evidence for counting, not proof of real customer conversion improvement or measured revenue recovery. Proof: /private/tmp/fix-results-five-checkouts.png.

## Shipping blocker recurrence verified — 7 October 2026

Recreated the isolated Liquid shipping test after the existing fix marker: temporary US zone, free rate requiring a $1,000 minimum, one $749.95 product assigned. A fresh real browser checkout displayed Shipping not available with the recognised price/weight requirement message; the item remained in the basket. No payment was submitted.

The installed app caught the new blocker on page load. Resolve unavailable shipping returned to Critical and showed 2 historical confirmed blockers plus 4 general alerts. Results after your fix retained its original marker and baseline and showed **1 shipping-alert checkout out of 8 new starts (13%)**. The overall cohort also contained other recorded activity since the previous batch; its 4 completed checkouts out of 8 are not attributed to this test. Previously affected completion remained 1 of 5. Proof: /private/tmp/shipping-recurrence-results.png.

Restored Liquid to its normal profile, removed the temporary zone/rate, saved, and verified zero products and no zones in the QA profile. Retested the same checkout/address: Standard free and Express $15 were available. The retained Critical signal describes the recorded unfinished blocker, not a current outage after restoration. No app code or deployment changed during this test.

## Recorded alert periods

Action headers now show the last recorded alert time and, when a fix marker exists, Before fix or After fix. Severity after a marker uses only matching alerts recorded at or after that marker, including resumed old checkouts. Past-only alerts become Info without claiming the issue is resolved. New general shipping alerts remain Warning even when older confirmed blockers exist; a new confirmed blocker remains Critical until a later purchase is recorded. Alert history and basket totals remain visible for the selected dates. Details explicitly distinguish recorded alerts from a live outage check. Added three tests for these boundaries; full tests, TypeScript, Polaris v2 manifest and build pass.

Published frontend deployment 108c2e0c-45de-4156-af25-b678c3f1c10e. Installed Shopify app verified After fix and the actual shipping alert timestamp. Created a temporary payment marker in the separate public demo viewer: existing alerts showed Before fix and Info, with no invented post-marker rate. Undid that marker and verified removal. Phone viewport 390px had scroll width 390px; reset the viewport afterward. Screenshots: /private/tmp/alert-periods-desktop.png and /private/tmp/alert-periods-phone.png. Full suite currently 70 passing tests, including concurrent changes. The skill helper does not support v2.0 RC; validated against the installed official v2 manifest instead.

## Retest confirmation and returning alerts — 7 October 2026

Added an optional server-timed retest record to active fix markers. I retested successfully records a team confirmation, not an automatically verified repair, purchase or revenue recovery. Undo retest clears only that confirmation; remarking an inactive fix clears an older retest. Retests require the same authenticated store scope or separate demo viewer scope as fix markers, and require an active fix. Unfinished-checkout investigations do not offer a passed retest because they identify no confirmed functional issue.

Alert severity uses the most recent retest boundary when present. Recorded matching alerts at or after that boundary replace Retest passed with Alerts after retest and a distinct affected-checkout count. This includes resumed older checkouts. Fix baseline and purchase results retain the original fix date.

End-to-end: retested Liquid $749.95 with the same fictional US address, observed Standard free and Express $15, and saved a pass in the installed app. Recreated the isolated $1,000 minimum-rate blocker, reloaded that checkout, and observed shipping unavailable. The app showed Critical, After retest, Alerts after retest, and 1 checkout with matching alerts. Restored the product and removed the temporary zone/rate, saved and verified the QA profile was empty. Retested normal rates and recorded a new pass. The app showed Info, Before retest and Retest passed with the new time; original fix date and cohort counts were unchanged. No payments submitted.

Phone flow verified on the separate public demo viewer at 390px with no horizontal overflow, including Undo retest and removal of its temporary marker. The native Shopify browser viewport remained desktop size, so this was responsive public-view verification rather than a physical-phone/native Shopify mobile test. Screenshots: /private/tmp/retest-returned-alert.png, /private/tmp/retest-passed-desktop.png, /private/tmp/retest-passed-phone.png. 71 tests, TypeScript, official Polaris v2 manifest and build pass. Backend and frontend deployed; frontend deployment 0b6395ef-45e6-4816-afda-2b2027612d47.

## Mark as done checkbox — 7 October 2026

Replaced Fix applied / Undo fix marker with a Polaris v2 Mark as done checkbox. Checking saves the original fix marker and unchecking deactivates it through the existing store/demo scopes; retest confirmations remain separate. Controls disable while saving without resetting the user's checked state; failures restore the saved state and show an error. Verified checking, persistence after reload, unchecking and checking again in the public demo, then removed that temporary marker. Installed app retained its checked shipping marker and retest record. Build, TypeScript and Polaris checks pass. Frontend deployment b23204c4-3d53-4cc6-8445-a6a34f221c15. Proof: /private/tmp/mark-as-done-checkbox.png.

## Merchant-flow polish — 7 October 2026

Moved Mark as done into every action header with an action-specific accessible name. Saved actions with no matching alerts since the latest fix/retest move below open work under Marked as done and collapse their metrics/results. Show details reveals those numbers and the existing retest/results controls. Matching alerts after the latest boundary keep the action above completed work and show a review-again message, including resumed older checkouts. Checking completion closes its details; unchecking reopens the action. Saved user choices are not automatically undone. Added a distinct-checkout recurrence test; 72 tests pass.

Removed the repeated recovery-explanation line from collapsed metrics and kept the explanation in details. Unpriced action values now say Not recorded. Added an accessible saving/result announcement, a visible save-error notice, preserved checked state during requests and keyboard focus after rendering, and disabled overlapping completion/retest/date requests while loading. A failed data load offers Try again and states that previous results have not updated. Network-failure recovery code was reviewed, not manually forced in the live browser.

Phone testing exposed unsupported imperative popover dismissal and then event ordering that disabled Apply before its close command. The final version uses the supported Shopify button command, cancels it for incomplete ranges and begins loading after the click completes. Verified a one-date selection stays open with Choose a start and end date; a complete range closes and refreshes; an empty September range shows zero checkouts, $0 recorded baskets and no invented average. Restored Last 30 days. The 390px public view fits with scroll width 390px. Installed-app completion group is compact; expanded completed details remain available. Temporary payment completion mark created by this test was removed; preexisting public unfinished and installed-store shipping marks were preserved.

Published frontend deployment 943990d8-2c39-4a25-a1f5-428a79a59da7, asset index-DIsCp4YX.js. TypeScript, Polaris v2 manifest and build pass. Impeccable detector reported only an advisory for existing missing-data dash placeholders, which remain intentional. The Shopify skill helper does not support v2; official v2 documentation and installed component manifest were used. Proof: /private/tmp/merchant-polish-final.png and /private/tmp/merchant-polish-phone.png. No Shopify settings, payments, evidence records, assumed recovery amounts or permissions were changed by this polish pass.

## Concise merchant action details — 7 October 2026

Replaced the repeated generic Why it matters text with What we know, using the existing recorded facts. Shortened each What to do instruction while retaining the investigation and retest requirements. A single primary View affected checkouts button now opens the matching drill-down; the existing investigation checklist remains an optional tertiary action. Value provenance, recovery limits and calculation notes are behind About these figures rather than repeated in the default detail view. Notes are still available and preserve their open state across rerenders; no monetary assumptions or source data changed.

Verified the payment action's notes reveal/hide, primary button opening exactly 13 affected checkouts, and return to Overview. Phone viewport 390px has scroll width 390px and resets afterward. TypeScript, Polaris v2 manifest and build pass. Frontend deployment fcb95cf5-9749-4693-a6dd-3fbfd1c5f899. Proof: /private/tmp/merchant-details-concise.png and /private/tmp/merchant-details-phone.png.

## Evidence-specific recommendations — 7 October 2026
- Confirmed unavailable shipping recommends checking coverage and price/weight rate conditions; general delivery alerts first require reproducing blocked progress.
- Repeated unfinished discount alerts check the promised offer; single alerts first distinguish a code from a gift card.
- Payment advice checks provider faults and test-order completion. When all affected checkouts complete after their last alert, advice switches to reviewing retries before changing settings.
- Form and item advice includes the exact success check without claiming a collected field/message or a proven cause. Unfinished checkout advice requires finding a blocker before choosing a fix.
- No amounts, recovery probabilities, Shopify settings, or checkout records changed.
- Automated verification: 81 tests pass, Polaris v2 manifest check and production build pass. Convex preview deployment ea31670e-0ece-4e35-afa0-595f115cd4c6, asset index-DRw9vu0x.js.
- Shopify alert categories checked against https://shopify.dev/docs/api/web-pixels-api/standard-events/alert_displayed . Stored evidence intentionally does not retain raw field values/messages.
- Published browser check: shipping card shows rate-coverage instructions and successful-progress check; discount card shows expected-offer instructions for 2 repeatedly alerted unfinished checkouts. Phone viewport 390px has matching 390px document width, no horizontal overflow. Screenshots: /private/tmp/specific-shipping-advice.png and /private/tmp/specific-advice-phone.png. Temporary viewport reset. No fix markers or store settings changed during verification.

## Shopify action shortcuts and current-period advice — 7 October 2026
- Added Polaris v2 secondary links inside What to do: payment settings, shipping settings, discounts, products and checkout settings. Each opens the named demo store in a new tab and announces that behavior to screen readers. Unfinished checkout has no speculative settings link.
- Verified destinations against Shopify's visible admin navigation. Clicked Open shipping settings in the published app and confirmed the Shipping profiles page opened. No Shopify settings were changed.
- Shipping header now describes checkouts with general alerts, rather than implying the session count is an event count.
- Advice after a fix/retest now uses new alerts: a new general shipping alert does not inherit historical confirmed-blocker advice. Added a regression test; preserved full-period counts and retest guidance when no later alerts exist.
- Shared-project edits arrived during verification. Restored the Polaris type reference to the first line, regenerated local Convex bindings, and supplied an explicit return type for the new checkout-price setup action to break a type inference cycle. Preserved the separate checkout-price changes; did not run that setup action.
- Current checks: 81 tests pass, TypeScript and Polaris v2 manifest pass. Final preview deployment f3f76c50-7a7f-4fd2-b3b1-f160cd33d98c, asset index-ioEAa2tt.js.
- Phone check before final shared-project rebuild: 390px viewport/document width, no horizontal overflow; screenshot /private/tmp/shopify-action-shortcuts-phone.png. Desktop shortcut screenshot /private/tmp/shopify-action-shortcuts.png.
- Final deployed build browser check also passes: shipping advice and shortcut present; 390px document fits 390px viewport. Final screenshot /private/tmp/shopify-action-shortcuts-final.png. Temporary viewport reset.

## Clear success checks — 7 October 2026
- Each action now has a concise Check the fix instruction inside What to do, separated by a Polaris divider. Removed duplicate success instructions from the main advice.
- Payment: complete a test-mode order with the affected method. Shipping: same basket/quantities/destination show shipping and continue. Discounts/gift cards: eligible offer updates total. Form errors: valid details allow progress. Inventory: same item/quantity stays available. Unfinished: complete a test and confirm it in drill-down.
- These are merchant test instructions, not automated success claims. No fix marker, Shopify setting, payment or event record changed during this UI verification.
- Build passes TypeScript and Polaris v2 manifest. Convex preview deployment 80d6b2da-c006-4619-b6c9-8b9631de7f17, asset index--60pT2sZ.js.
- Browser: expanded all six cards and confirmed distinct instructions. Desktop screenshot /private/tmp/check-the-fix-desktop.png; phone screenshot /private/tmp/check-the-fix-phone.png. Phone document and viewport both 390px; temporary viewport reset.

## Merchant goals and recorded action totals — 7 October 2026
- Replaced unavailable Estimated recovery slots with action-specific Fix goal: Successful payment, Shipping available, Valid offer applied, Valid details accepted, Item available to buy, Checkout completed. Real recovery amounts remain gated by the existing evidence model.
- Labeled scoped money Affected basket value. No basket amount is presented as recovered revenue.
- Connected public demo action totals to new checkout notification prices. The backend computes aggregate values for the already-public session cohort; it does not return private checkout identities, per-checkout prices or item records. Exact matches only; recovered, foreign/unconverted and unmatched prices remain excluded.
- Added aggregate privacy/cohort/money tests. Current suite: 85 passing tests; TypeScript, Polaris v2 manifest and build pass.
- Results after a fix now summarize returned alerts, waiting for activity or new recorded outcomes. Empty denominators say No checkouts yet; empty affected sets say No unfinished checkouts to follow. Counts and comparisons remain unchanged, and purchases are not claimed as caused by a fix.
- Deployed Convex backend and preview frontend (deployment 4c9fda8b-7859-433d-90e3-e2c053515001, asset index-BkLnLcw2.js).
- Browser verification: all visible action goals present; existing unfinished marker shows 0 of 54 previously affected completed and 0 of 1 new completion. Public inventory value remains $2,249.85, validation $600; historical payment, shipping and discount sessions still lack exact price matches. No fake backfill applied. No marker or store setting changed.
- Screenshots /private/tmp/merchant-fix-goals.png and /private/tmp/merchant-fix-goals-phone.png. Phone document and viewport both 390px; temporary override reset.

## Payment decline versus provider failure — 7 October 2026
- Used the already-active Shopify Test Payment Gateway in a fresh actual browser checkout, one Hydrogen snowboard at $600, Standard shipping. Used only documented test credentials: 2 for declined transaction, then 3 for gateway failure; fictional reserved-example contact. No successful order, real payment or settings change occurred.
- Both completed failure attempts showed exactly: There was an issue processing your payment. Try again or use a different payment method. First gateway-failure submit lacked reset expiry/security/name fields; corrected those fields and submitted the complete test. Do not treat the intervening form alerts as gateway failures.
- This demonstrates that the visible checkout message alone cannot reliably distinguish the two causes. No automatic classifier or historical reclassification was added. Raw messages/card values are not stored by the app.
- Added two clear provider-confirmed paths in the payment action: card decline versus provider/setup fault, plus a Card declined entry in the optional scenario library. Recovery remains unavailable without a confirmed fixable fault and suitable measurement evidence.
- Fresh actual checkout appeared in the action: payment affected count 13→14, recorded unfinished basket value $6,600→$7,200, price coverage 12/12. Same-session retries count once. Other historical price updates reflect the separate basket-data work; not attributed to this test.
- 85 tests pass; build and Polaris v2 checks pass. Preview deployment 0568a8e7-e347-41d2-a9b7-40dbde5d776d, asset index-DvmEc825.js.
- Primary source test credentials: https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode . Checkout alert contract: https://shopify.dev/docs/api/web-pixels-api/standard-events/alert_displayed .
- Final published browser check confirms both conditional provider-record paths and the explicit cause limitation. Phone document/viewport both 390px. Screenshot /private/tmp/payment-cause-guidance.png; viewport restored.

## Recommendations require meaningful evidence — 7 October 2026
- Added a separate recommendation gate. Raw category counts remain session evidence and no longer become action cards automatically. Suppressed basic validation, generic payment errors, unqualified discount errors, item-category alerts and missing completion.
- Current supported rule: two distinct unresolved checkout identities with exact confirmed shipping-unavailable messages. One shopper retrying repeatedly does not qualify. Later purchase excludes a checkout; a later blocker can qualify it again. Intended shipping eligibility must still be checked; no merchant baseline spike or outage is claimed.
- Recommendations, drill-down links and scoped monetary totals use the same qualifying identities. Public totals still exclude private records, unmatched/recovered/unconverted prices. Existing fix records preserved in storage.
- 88 tests pass, TypeScript and Polaris v2 build pass. Backend published to neighborly-nightingale-843. Initial preview 9d6b93be-b82f-40c4-a843-be97ad7289b5; final header cleanup follows.
- Browser: overview now has only Check unavailable shipping, 2 of 78 checkouts, $1,499.90 with 2/2 baskets priced. Its link shows exactly 2 matching checkouts. Form-error filter still shows 60 sessions, proving underlying events were retained. Phone viewport/document both 390px; viewport reset. No Shopify changes or fix markers changed.
- Final preview header cleanup deployment 7a82af69-5cda-4d63-810c-795b7d867776, asset index-BPXIgGuS.js. Removed the redundant zero-general-alert line when all recommendation members are confirmed blockers.

### Hourly order pattern comparison — 7 October 2026
Added today’s paid, uncancelled Shopify orders against the previous 30 complete UTC days, with daily zero-order observations included in the average and today excluded. Public output contains only hourly aggregates, no order identities. Sync begins at midnight 30 days before today; partial source history is labelled with its actual covered day count. Future hours are null, not zero, and are shaded as upcoming; current hour is labelled incomplete. No outage detection or recovered money is inferred from the demo pattern.
Verified installed Shopify app synced a complete 30-day window; public chart showed five paid test orders today (one at 06:00 UTC, four at 09:00 UTC). Desktop hourly table had 24 rows, including not-reached future hours; phone table toggled open/closed and page width/scroll width both 390px. Inspected desktop and phone chart screenshots. 90 tests and v2.0 RC manifest/TypeScript/build pass. Shopify skill helper still lacks v2.0 support; used official v2 documentation and project manifest checks instead.
Final frontend deployment: 9e2bd873-e85e-4e5c-b1af-7ebb26ef4a3c, asset index-B31vOOP6.js. Screenshots: /private/tmp/order-pattern-final.png and /private/tmp/order-pattern-phone-final.png. This is the demo store, not production sales history. Uses explicit UTC pending store-local timezone support; order chart remains a fixed 30-day reference independent of the checkout date filter.
Prioritised shipping availability, verified payment-provider failures and failing eligible advertised offers in PLAN.md. Only the existing evidence-qualified shipping rule is enabled; no unsupported payment/discount incidents were added.

### Official Polaris Viz replacement — 7 October 2026
Replaced the authored SVG image with Shopify @shopify/polaris-viz 16.16.0 LineChart and PolarisVizProvider, official Light theme, bundled official CSS and its built-in legend/accessibility table. Solid series is today’s orders; dotted comparison is the previous complete-day hourly average. Both share one numeric axis. Null future hours remain gaps. The surrounding page remains Polaris App Home v2.0 RC. React 18.3.1 is isolated to this chart and loaded in a separate chunk; no alternate host or data source.
90 tests and TypeScript/v2 manifest/build pass. Browser showed exact source values (06:00 one order, 09:00 four orders) in the chart’s accessible table; phone page/scroll widths both390px and hourly figures toggle works. No browser console errors. Direct automation clicks on SVG point circles timed out; do not claim tooltip interaction was verified. Final release 3fa1b89e-98af-48da-bba3-d01a7eb65a51. Screenshots /private/tmp/polaris-order-chart-final.png and /private/tmp/polaris-order-chart-phone-final.png.

### Chart/completion layout — 7 October 2026
Removed the marked chart date/update line, explanatory test-order sentence and Hourly figures control/table. Polaris Viz retains its built-in accessible data table; global demo label remains. Chart and completion now share a native Polaris responsive grid, 2fr/1fr above800px and one column on phones. Checkout counts are compact label/value rows. Initial minmax comma syntax did not produce a Polaris grid rule; corrected to supported conditional 2fr 1fr syntax. Browser measured desktop cards709.328px and354.664px, both starting at y126 (exact2:1). Phone width and scroll width both390px; screenshot confirms stacked cards. Build/TypeScript/v2 manifest pass; financial calculations unchanged. Release ff9876da-6ee5-4bfb-88f2-fd7bca70809b. Screenshot /private/tmp/checkout-two-column-desktop-final.png.


### Store-local chart refinement — 7 October 2026
Order sync now reads Shopify Shop.ianaTimezone and starts at the store's local midnight 30 calendar days earlier. Hourly counts, day labels and previous complete-day averages use that zone. Partial source coverage is excluded; spring-forward missing hours do not count as zero observations, and repeated fall-back hours collect both occurrences. Old snapshots retain UTC until refreshed.
Reviewed Shopify's official Polaris data-visualization guidance and Polaris Viz analytics-experience guidance: retain compact native chart spacing, clearly labelled numeric/time axes, a simple comparison legend and relevant operational metrics. Axis uses whole order counts; accessible table and tooltip retain fractional averages. Time zone and current-hour “In progress” appear in the tooltip rather than adding page copy. Existing 2:1 desktop layout and stacked phone layout retained.
Read-only installed-app refresh confirmed America/New_York from Shopify. Browser accessible table shows today's one order at02:00 and four at05:00, matching the previous06:00/09:00 UTC observations. Average values remain0.1,0.03,0.07,0.37 rather than rounding to zero. Public and embedded pages agree. Desktop and390px phone screenshots inspected; phone client/scroll widths both390, no public browser errors. Tooltip formatting is configured but direct tooltip interaction was not re-tested in this turn.93 tests and build/TypeScript/v2.0 manifest checks pass. Backend and frontend published; final static release cbe475f7-6241-48b5-85b9-3354aacdf4b6. Screenshots /private/tmp/checkout-store-time-desktop.png and /private/tmp/checkout-store-time-phone.png.
Sources: https://polaris-site-prod-kit.shopify.prod.shopifyapps.com/design/data-visualizations (search-index excerpt; full page returned502); https://github.com/Shopify/polaris-viz/blob/main/ANALYTICS_EXPERIENCES.md ; https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Shop . Demo orders remain a test dataset, not a production sales baseline.


### Matching-weekday comparison — 7 October 2026
Replaced the all-day hourly baseline with complete matching weekdays within the preceding30 store-local calendar days. A Wednesday compares with previous Wednesdays, including covered zero-order days; other weekdays do not contribute. Today, uncovered partial days, cancelled/unpaid orders and duplicates remain excluded. No matching history yields no average rather than a fabricated zero. DST and half-hour time-zone tests cover matching weekdays. The legend shows weekday and observed-day count (currently Wed average ·4 days). Added native App Home v2.0 RC Box paddingBlockStart=base above the official chart.93 tests and TypeScript/build/v2 manifest pass. Shopify skill helpers cannot validate v2 (search supports only v1; validator lacks its TypeScript dependency); current official v2 Box docs and the project's v2 manifest check were used instead.

Published release cfa60811-230e-4597-8de5-7e801a3a7955. Desktop and390px phone screenshots inspected:16px extra top space,2:1 cards on desktop, stacked on phone, no horizontal overflow or browser errors. Current four covered Wednesdays have no paid orders, so their average is factually zero; no synthetic comparison orders inserted. Screenshots /private/tmp/checkout-weekday-desktop.png and /private/tmp/checkout-weekday-phone.png.


### Fresh order chart check — 7 October 2026
Placed one actual browser checkout in build-sprint-demo using synthetic contact/address data and Shopify Test Payment Gateway (approved transaction value1). One Hydrogen snowboard, quantity1, subtotal/total$600, Standard shipping free. Shopify confirmation MVMQ8AJTT. No real payment charged and no synthetic order was inserted directly into Convex.
Before: today's paid orders5,09:00 America/New_York count0; completed checkouts22 of78. Opened installed keval-test-app to perform its existing read-only purchase sync after checkout. Both embedded and shared page show today's orders6,09:00 count1 and23 completed of79. Existing02:00 count1 and05:00 count4 unchanged; matching-Wednesday baseline remains0 across4 prior Wednesdays. Abandoned aggregates remain40/$24,179.75/$604.49.
Fresh session #0b8a02f6e8e7… has6 recorded events including checkout start/contact/address/shipping/payment/completion,0 alerts, and Completed status. Event arrival shows payment submission timestamp after completion; no change was made to source timestamps or fabricated ordering. Public session basket prices are Unknown in this view; this check verifies hourly orders and completion, not price-link coverage. Saved confirmation /private/tmp/chart-test-order-confirmed.png and inspected chart screenshot /private/tmp/chart-fresh-order-verified.png. No code changes or deployment required.


### Automatic purchase sync — 7 October 2026
Added Convex cron every minute using the saved offline installation and existing read-only queries. Expiring tokens refresh server-side through the official SDK; missing/disconnected/expired-refresh installations do not reconnect themselves. No new scopes/subscriptions/customer fields. Sync failure preserves prior snapshot and emits a generic safe error. Snapshot writes reject work after disconnect or a newer installation, including an uninstall between access lookup and save. Added safe owner-only diagnostic returning timestamps and counts, no credentials. Open overview quietly reads evidence every minute when visible; it does not call Shopify sync again. Existing manual initial sync remains.
End-to-end: started with6 paid orders today/09:00 New York count1 and23 completions. Placed actual demo browser test order C501RFKFN, one$600 Hydrogen snowboard, free Standard shipping, synthetic customer/address, Test Payment Gateway approved value1. Never opened the installed Shopify app or manually ran sync. Backend scheduled sync reached24 orders; untouched visible public page automatically showed today's7 orders,09:00 count2 and24 completed of80. Weekday average stayed0; abandoned aggregate stayed40/$24,179.75/$604.49. Poll phases can produce about2minutes delay, not instant push.
100 tests pass, including disconnect/reinstall race guard; build/TypeScript/v2 manifest pass. A shared-file UI edit introduced an unsupported group role and placed alert setup inside retry-progress; corrected to region and moved setup outside that handler before final build. Initial automatic-update screenshot /private/tmp/automatic-purchase-sync-verified.png. Final static release572cdac1-cde7-4c65-97f2-8a7063fbd576.

### Recommendation header hierarchy — 7 October 2026
Moved affected basket value into the always-visible header beside label-above-percentage affected-checkout metric. Summary starts with actual affected/total count (2 /80checkouts); removed duplicate expanded metric row. Fix follow-up remains in expanded details. Financial values and percentages unchanged (2/80 rounds3%, not the illustrative11%). Build/TypeScript/v2 manifest pass; desktop expanded and390px phone collapsed inspected, no horizontal overflow. Release adb184d5-f139-4c6b-b439-9e87a563a27b. Screenshots /private/tmp/action-card-header-desktop.png and /private/tmp/action-card-header-phone.png.

## Verified offer mismatch — 8 October 2026

Created actual demo code HEALTHCHECK10 in Shopify Admin: 10% off entire order, all customers, one-time purchases, no minimum spend or usage limits, no combinations. Positive browser control on Hydrogen: $600 → $540, $60 discount. Registered only these explicitly verified demo terms in Convex, then temporarily deactivated the Shopify code. This is a deliberate mismatch with our testing promise, not a claim that Shopify rejected a correctly active rule or that a public advertising campaign was discovered.

Shopify rejected the code in Liquid ($749.95) and Hydrogen ($600) checkout sessions. The first narrow field matcher did not identify the code; the exact previously reproduced English message template safely recovered the short field value, hashed it locally, and linked both rejections to the registered offer. No raw message, stack, customer field or unknown code value is saved. An unrelated NOTANOFFER10 attempt remained a diagnostic event without a verified-offer marker and did not change the recommendation count or last-observed time.

Restored HEALTHCHECK10 to Active and retested the same Hydrogen checkout: $600 → $540 again. No order or real charge was placed for this test. Closed the explicit demo monitoring window after testing; the created demo code remains active for further manual exploration. Historical rejection events remain historical evidence, not proof of an ongoing outage.

Live card: Check promised discount HEALTHCHECK10, Warning, 2/86 checkouts, $1,289.95 recorded affected basket value after one basket was repriced to $540 by the successful retest. This is current basket value, not measured recovery, lost revenue or a projection. Verified affected-checkout filtering and named timeline entry in browser. Screenshots: /private/tmp/verified-discount-offer-warning.png. Shopify released keval-test-app-18; Convex receiver, registry and dashboard published. All112 tests and build checks pass.

Limits: only explicitly verified, simple demo offers are registered. Live campaign terms are not automatically synced; arbitrary coupons, customer-specific eligibility, product restrictions and unknown combinations do not establish a merchant fault. Discount-state evidence comes from the last token-bearing checkout event, not a complete record of every intervening code edit. The card asks the merchant to compare current rules with the promise; it does not certify full eligibility or causal abandonment. Missing/unrecognised field values remain diagnostic only. No historical unknown-code events were reclassified or filled with guessed coupon identities.
