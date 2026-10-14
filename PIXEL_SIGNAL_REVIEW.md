# Checkout signal review — 8 October 2026

Reviewed the current checkout-evidence extension against Shopify's official Web Pixels API. The app already subscribes to checkout start, contact/address/shipping submission, payment submission, completion and alert display. No extra events were activated in this review.

## Best next addition: checkout app failures

`ui_extension_errored` reports an extension failing to render because of an uncaught exception, and is available only on checkout. It can identify the app, extension and placement to investigate. Suggested merchant action: “Review a checkout app that failed to load.” Capture only an approved app/extension identifier, target, fixed error type, event ID and timestamp; omit raw messages and stack traces. An extension error does not establish that purchases were blocked. Require repeated distinct affected checkouts, a trustworthy link to the checkout, and later-completion checks before escalating. The current pixel collector requires checkout tokens or saved checkout identity; this event doesn't provide a checkout object, so identity association needs a bounded, tested design rather than dropping it into the existing handler.

Source: https://shopify.dev/docs/api/web-pixels-api/standard-events/ui_extension_errored

## Better context from events we already collect

Shipping selection and checkout completion expose checkout data. Read only required shipping-price/basket fields to compare completion after high shipping costs; treat the association as a hypothesis, not proof of price-driven abandonment. Completion can include payment gateway and applied discounts, which can support comparable outcomes and distinguish a code eventually succeeding from an earlier rejection. Collection requires minimised fields, eligibility evidence, enough comparable sessions and browser end-to-end verification; no arbitrary recovery percentage.

Source: https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed

## Lower priority: basket changes before checkout

`cart_viewed`, `product_added_to_cart` and `product_removed_from_cart` are standard storefront events. They can supply earlier item/value context, but a removal alone is normal shopping behaviour, not a merchant-fixable alert. These events have cart/cartLine structures rather than checkout tokens; the current handler would discard them. Do not guess cart-to-checkout links, infer stock failures from removal, or add another broad recommendation without evidence.

Sources: https://shopify.dev/docs/api/web-pixels-api/standard-events ; https://shopify.dev/docs/api/web-pixels-api/standard-events/cart_viewed

## Do not promise field replay for every merchant

Advanced DOM checkout interaction events are limited to Shopify Plus and require separate access for heatmap/session-recording apps. Shopify says they cannot be used on custom apps. They cannot be assumed available to every store. Do not capture field values, payment data or raw DOM snapshots merely to count retries. Existing standard alerts remain evidence of the displayed category, not proof of repeated typing or a particular invalid rule.

Sources: https://shopify.dev/docs/api/web-pixels-api/advanced-dom-events ; https://shopify.dev/docs/api/web-pixels-api/advanced-dom-events/advanced_dom_clicked

Recommendation: implement and test checkout-app failure evidence first; enrich existing shipping/discount/payment outcomes next. Keep ordinary card mistakes, basic validation and unqualified code failures out of merchant recommendations.

## Implemented — 8 October 2026

The app pixel now subscribes to `ui_extension_errored`. It sends only an anonymous app hash alongside the existing anonymous event/session contract; raw error messages and stack traces are discarded. Because Shopify provides no checkout token on this event, association requires a token-bearing event within 15 minutes from the same Shopify client in the same tab. Missing, stale, future or mismatched identities are skipped. Completion clears the association.

Recommendations require the same app to fail in at least two distinct checkouts with no later recorded purchase. The resulting card is Warning, not a confirmed buying blocker. It opens affected checkout timelines and checkout settings. No recovery rate or revenue uplift is inferred from the crash. On the shared demo page, new failure events can join only checkout identities already public; private sessions and prices remain private.

Verification: all 101 tests pass, including compiled pixel execution with mocked Shopify callbacks, payload privacy, bounded identity association, repeat suppression, later-completion suppression and public/private separation. Browser verification used an isolated, explicitly labelled local fixture: the card showed Warning, expanded advice and filtered exactly two affected sessions. Those fixture events were never inserted into Convex or Shopify. Shopify released `keval-test-app-12`; Convex receiver and dashboard were deployed. A real Shopify-generated extension crash has not yet been reproduced, so native end-to-end delivery of this specific event remains unverified.

## Native Shopify verification — 8 October 2026

Completed two real browser checkouts using the Hydrogen ($600.00) and Liquid ($749.95) demo products. A temporary, clearly labelled checkout UI extension deliberately rejected its initialization after eight seconds. Shopify emitted `ui_extension_errored` in two distinct sessions; Convex saved both. The live shared dashboard showed Warning, **2/82 checkouts impacted**, and **$1,349.95 affected basket value**. These are deliberate demo tests, not customer incidents or verified lost/recovered revenue. The first button-driven render exception did not produce the Shopify event; direct initialization failure did.

Removed the block from the active checkout configuration and saved it. Removed the disposable extension and its temporary dependencies from the project; source retained in `/private/tmp/checkout-failure-probe-20261008` for this test session only. The ongoing app retains its original pixel extension and scopes. The checkout was reloaded after removal to confirm the test block is absent.

Dashboard date button now uses native Polaris `variant="tertiary"`, matching the plain drill-down control. Browser verification confirmed opening the date picker and applying dates closes it.

## App names — 8 October 2026

The pixel now retains Shopify's bounded `appName` alongside the app hash, never its error message or trace. Recommendations name only apps that meet the repeated-failure threshold; unrelated one-off app failures are not included in the advice. Names appear in the card and checkout event timeline, with HTML escaping and control/markup rejection. Earlier nameless events belonging to our own installed app are labelled only after exact numeric/global App ID matching against Shopify's `currentAppInstallation.app { id title }`; no name is guessed for other apps. The two native demo events now show **keval-test-app**.

108 tests passed. Shopify released `keval-test-app-16`, Convex receiver and dashboard deployed. Browser checks confirmed the named recommendation, provider advice, filtered two checkouts, and **Checkout app failed to load · keval-test-app** in the timeline. Basket amount and severity remain unchanged.
