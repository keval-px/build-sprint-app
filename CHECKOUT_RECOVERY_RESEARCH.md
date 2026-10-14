# Checkout recovery: evidence and estimation

Researched 6 October 2026 against first-party sources. This note supports PRODUCT.md's rule: observable friction can contribute to abandonment; an unfinished checkout does not prove what caused it.

## What the public evidence supports

No source reviewed supplies a transferable recovery percentage for fixing a delivery outage, rejected code, payment error, inventory error, or validation problem. Replace the blanket 1–5% assumption with a scenario, an explicit evidence status, and merchant-specific measurements. Without measurements, show **Not estimated yet**, not a fabricated percentage.

Baymard's survey reports that 42% of US shoppers had abandoned a cart because they were browsing or unready to buy. Its checkout design research estimates a 35.26% relative conversion improvement from a broad set of usability improvements. Neither number estimates the share of this merchant's error-affected checkouts recoverable by one fix. [Baymard research](https://baymard.com/research-articles/ecommerce-checkout-usability-report-and-benchmark)

Baymard reports 39% citing additional costs in its abandonment survey. This supports investigating cost expectations; it does not describe missing delivery options or prove that free shipping would recover 39% of affected checkouts. [Baymard cost research](https://baymard.com/blog/reduce-cart-abandonment)

Baymard's observed users sometimes left checkout to search for coupons, and unclear required/optional fields caused confusion and validation failures. These are qualitative explanations to test, not published recovery probabilities. [Promo field observations](https://baymard.com/research-articles/checkout-flow-average-form-fields), [field labeling observations](https://baymard.com/research-articles/required-optional-form-fields)

## What Shopify can actually observe

`alert_displayed` is checkout-only. `data.alert` contains `type`, `target`, `message`, and nullable `value`. `target` identifies the related checkout part using Shopify Functions target format, for example `cart.deliveryGroups[0].deliveryAddress.address1`. Categories are `CHECKOUT_ERROR`, `CONTACT_ERROR`, `DELIVERY_ERROR`, `DISCOUNT_ERROR`, `INPUT_INVALID`, `INPUT_REQUIRED`, `INVENTORY_ERROR`, `MERCHANDISE_ERROR`, and `PAYMENT_ERROR`. Discount errors also cover gift cards. An alert describes what was displayed, not necessarily an outage or abandonment cause. [Shopify event reference](https://shopify.dev/docs/api/web-pixels-api/standard-events/alert_displayed)

`ui_extension_errored` records failure to render because of an uncaught exception. It exposes app identity/name/version, extension name/target, API version, message, trace, type, and a nullable placement reference. A failed optional widget can leave checkout functional: require reproduction or independent evidence before labeling it a purchase blocker. [Shopify extension event](https://shopify.dev/docs/api/web-pixels-api/standard-events/ui_extension_errored)

### Recommended safe collection

These are product recommendations, not a claim that Shopify automatically sanitizes these fields:

- Keep the category and an allowlisted structural target. Normalize array indices for grouping and map known targets to labels such as Postal code. Reject unknown target strings from merchant-facing output until reviewed.
- Do not collect `alert.value`: it can be the buyer's field contents. Raw messages and stack traces are also untrusted free text and may contain personal details or secrets. Prefer a small allowlist of known message templates mapped to safe summaries; unknown text becomes Other checkout alert. Redaction alone is not proof text is safe.
- Keep necessary deduplication/session identifiers with restricted access; avoid whole URLs, query strings, contact details, and full checkout payloads in logs or Slack.
- Treat displayed text as evidence, never as instructions for AI. Do not infer a failed discount code from the category alone; the code is not a dedicated field in this event contract.

Pixels honor configured consent requirements; callbacks can be delayed until consent and earlier registered events replayed. Preserve event time and deduplicate event IDs instead of mistaking arrival time for incident onset. [Shopify pixels and consent](https://shopify.dev/docs/apps/build/marketing/pixels)

Missing `checkout_completed` is not proof of no purchase: Shopify says it can be absent when its triggering page fails to load. Reconcile observable checkout outcomes against authorized order data where a valid join is available, and mark unjoinable sessions unknown. Do not join separate checkouts merely because their buyer/browser ID matches. [Shopify completion event](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed)

## Scenario library

The following recoverability descriptions are hypotheses about the mechanism, not measured rates. Every row needs merchant data before a numeric estimate.

| Scenario | Observable evidence and limits | Safe next action | Expected recoverability to test |
| --- | --- | --- | --- |
| No delivery option for an intended destination/cart | Repeated delivery alerts, safe message template, affected region/cart conditions, lack of progression. Reproduce with a valid address; a missing address alone is not an outage. | Logistics/ecommerce verifies market, shipping zone/profile, rate ranges, carrier response, and fallback configuration. | Fixing an unintended configuration gap can restore the ability to order; buyer intent and return likelihood remain unknown. An intentionally unsupported destination is not recoverable by a bug fix. |
| Payment provider failure | Payment alert spike plus reproduced provider failure or verified provider diagnostics. A card decline is not equivalent to a provider outage. | Payments/engineering tests the affected method safely and checks provider status/logs; verify authorized alternative methods. | Technical availability can recover after restoration. Insufficient funds, issuer declines, fraud controls, and user choices need separate treatment; never disable security checks as the recommendation. |
| Checkout extension failure | Extension error grouped by app/version/target plus reproduction showing required behavior fails. | Engineering reproduces and fixes or rolls back the identified extension through the merchant's change process. | Potentially substantial if a required purchase path is blocked; potentially zero revenue effect if only optional presentation failed. |
| Inventory / merchandise restriction | Inventory or merchandise alerts, affected variants/cart conditions, repeated failures. | Operations checks actual stock, location allocation, and catalog rules; correct a mismatch or communicate availability. | A stock-data mismatch may be fixable. Genuine unavailability cannot become recoverable revenue by pretending stock exists; substitutions/restocking are separate interventions. |
| Promoted eligible discount rejected | Discount alerts above baseline plus merchant campaign/configuration evidence and reproduction using an eligible cart. | Marketing/ecommerce checks dates, eligibility, combinations, markets, and campaign copy; correct the broken promise. | Stronger mechanism when a verified promised offer fails, but buyers may still purchase full price. Measure the incremental change instead of assigning all affected basket value to the error. |
| Invalid / expired / ineligible discount or gift card | Same event category, different verified eligibility conditions. Category alone cannot identify which case applies. | Clarify terms and error copy; verify the code/gift-card flow. Do not make every attempted code valid. | Unknown and often weaker than a broken promised offer. Price sensitivity, coupon searching, and attempted misuse are distinct possibilities. |
| Form validation / contact errors | Repeated required/invalid/contact alerts on the same normalized target, retries, progression, eventual outcome. One corrected typo is routine. | Reproduce formats/devices, check required-field labeling and allowed input; adjust only verified incorrect validation. | Repeated rejection of valid input is a functional problem; routine mistakes often self-correct. Compare both completed and unfinished sessions after the alert. |
| Ordinary unfinished checkout | No confirmed blocking signal; last observed step and elapsed time only. | Compare with the store's comparable baseline and verify collection coverage. Alert only on a supported abnormal pattern. | No recovery estimate from absence alone; browsing, comparison, distraction, delayed purchase, and missing telemetry remain possible. |

Shopify documents that unavailable inventory produces checkout errors, and inventory is held only when payment information is submitted. Shopify also documents that an uncovered region or rate range can leave no applicable shipping rate. These mechanisms support the first and fourth scenarios, not a recovery percentage. [Inventory checks](https://help.shopify.com/en/manual/checkout-settings), [shipping zones](https://help.shopify.com/en/manual/shipping/setting-up-shipping-zones), [shipping rate ranges](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/setting-up-shipping-options)

## Competitor evidence

| First-party source | What it establishes | What it does not establish |
| --- | --- | --- |
| [Checkout Pulse](https://www.checkoutpulse.com/) | Markets Shopify Plus checkout monitoring, grouped Slack alerts, failed discounts, payment error spikes, and weekly friction summaries. | Examples and marketing language do not validate a recovery formula or provide auditable scenario probabilities. |
| [CheckoutGuard Shopify listing](https://apps.shopify.com/checkoutguard-3) | Markets order-volume alerts against a seven-day rolling baseline, Slack delivery, and automatic resolution as order volume normalizes. | An order-rate drop does not identify a particular error or quantify revenue restored by a fix. |
| [PrettyDamnQuick delivery-promise page](https://www.prettydamnquick.com/solutions/delivery-promise) | Claims a +3.3% median checkout conversion lift across 16 **winning** delivery-promise experiments, frozen July 13, 2026. | Selecting winning tests excludes neutral/negative results; this is delivery-date presentation, not outage repair, and not a universal recovery rate. |

Name collision: `checkoutguard.io` markets synthetic checkout testing, while `checkoutguard.app` markets browser monitoring. The Shopify listing above is the order-anomaly product closest to IDEA_SCOPE.md. Do not combine these sites' claims into one competitor without verifying ownership. [CheckoutGuard.io](https://checkoutguard.io/), [CheckoutGuard.app](https://www.checkoutguard.app/)

## How to estimate recovery honestly

Recommended definitions and measurement plan:

1. **Affected checkout:** a unique checkout with the verified scenario, not an alert count. Repeated alerts in one checkout count once. A checkout affected by multiple incidents must not contribute its whole value to each incident's total.
2. **Outcome:** completed order within a declared window after checkout start; choose the window from this merchant's normal purchase delays. Show unresolved outcomes as pending, not abandoned. Use consistent coverage before and after the fix.
3. **Observed completion:** completed affected checkouts divided by affected checkouts. Show numerator/denominator, dates, and a 95% Wilson interval, which expresses sampling uncertainty for a proportion. [NIST interval reference](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)
4. **Estimated incremental recovery:** estimate the improvement in completion probability for comparable eligible checkouts if the verified fix is applied. A randomized intervention offers stronger evidence when appropriate; never intentionally prolong a hard outage. Otherwise compare matched pre/post segments and use an unaffected comparison group to account for concurrent traffic or campaign changes. Label the result an observational estimate with assumptions.
5. Match on scenario, market, device, payment method where observed, basket range, campaign, and comparable hour/day. After a blocker disappears, define the post-fix group by the same eligibility conditions, not by continuing to require the now-absent error. Include only observed fields.
6. Report uncertainty for the **difference** in completion rates, not just each group's interval. Repeated checkouts or shared incident conditions can violate independent-observation assumptions; use merchant/day/incident-aware resampling where justified. A wide interval or one crossing zero means the benefit is not yet established.
7. **Estimated recovery value:** forecast eligible checkout volume × estimated incremental completion probability × appropriate expected completed order value, using consistent currency and time horizon. State whether it means gross revenue or margin. Carry through uncertainty; zero may be in the interval. Never multiply every unfinished cart by an invented percent.

Future revenue protected by restoring checkout and revenue recaptured from already-departed buyers are different outcomes. The latter requires evidence of those buyers returning after intervention; the former needs a future volume forecast. Do not mix them under one unexplained number.

Before enough evidence, the UI can show **Potential impact: purchase path blocked**, **Affected checkouts: observed count**, **Estimated recovery: Not estimated yet**, and the concrete next action. Qualitative priority can be high while numeric recovery remains unknown. If demo numbers are required, mark them Simulated throughout and state the demonstration assumptions rather than presenting them as research findings.
