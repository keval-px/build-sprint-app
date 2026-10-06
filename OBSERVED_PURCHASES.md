# Observed demo purchase snapshot

The user chose build-sprint-demo only. Observed test purchases are not real customer sales or a live merchant baseline.

## Source and scope

The initial Shopify Admin order export contained 11 paid orders, each one Hydrogen snowboard at USD600. On 6 October 2026, the user approved three additional multi-item checkout purchases. They were placed through the existing Test Payment Gateway using fictional buyer details, the successful test value, and verified free Standard shipping. No live payment, new credentials, fulfillment action, or payment-setting change was used.

The three actual browser purchases were:

| Basket | Product subtotal |
| --- | ---: |
| Liquid snowboard + standard one-time ski wax | USD774.90 |
| Hydrogen snowboard + Complete snowboard, Ice | USD1,299.95 |
| Two Hydrogen snowboards | USD1,200 |

Each checkout displayed its confirmed receipt. Shopify Admin confirmed three new paid orders with two items each. An updated current-page plain CSV export verified all 14 orders and their line-item quantities; the importer correctly grouped multi-row orders and the quantity-two product. The full export stays in Downloads, outside this repository. Only anonymous aggregate subtotals and basket counts enter Convex.

## Current observed result

- Paid test purchases: 14, placed 5–6 October 2026.
- Product subtotals: USD9,874.85.
- Average order value: USD9,874.85 ÷ 14 = **USD705.35**, rounded to cents.
- Single-item purchases: 11 of 14 (78.6%).
- Multi-item purchases: 3 of 14 (21.4%).
- Observed basket types: four; each new combination occurs once. Percentage labels are rounded.

All eligible purchases used the testing Bogus Gateway, with no cancellations, refunds, or discounts. The anonymous snapshot lives in `demoPurchaseSnapshots`; order IDs, buyer names, email addresses, addresses, payment references, and raw CSV rows are not stored in the app. Observed data takes priority over the prior USD755.18 hypothetical catalog model, which remains a labeled fallback.

## Recovery remains illustrative

There are now 512 stored browser events. The read window was raised from 500 to a bounded 1,000 after the new activity exposed a cutoff in the oldest checkout. The current view includes all 512 events: 55 distinct checkouts, 14 completion events, and 41 checkouts with no recorded completion. All 55 have a recorded start. If storage exceeds the 1,000-event window later, the app will flag partial coverage again.

Applying the observed test-order average to unfinished sessions models sales at risk; it does not reconstruct their actual cart values or prove abandonment. The separate 5% recovery assumption is not measured.

| Action group | Eligible unfinished sessions in view | Modeled sales at risk | Illustrative 5% recovery |
| --- | ---: | ---: | ---: |
| Payment alerts | 10 | USD7,053.50 | USD352.68 |
| Validation alerts | 30 | USD21,160.50 | USD1,058.03 |
| All unfinished journeys | 41 | USD28,919.35 | USD1,445.97 |

Combined recovery counts 41 unique unfinished checkouts once. Groups overlap; do not add the rows. Completed and unstarted sessions are excluded. No real revenue, monthly projection, profit, cause, verified fix, or shopper-demand claim is made. These purchases were deliberately scripted tests.

## Refreshing the snapshot

Export build-sprint-demo orders in Shopify Admin, then run `python3 scripts/import-demo-orders.py /path/to/orders_export.csv` from the project folder. The helper groups unique orders, excludes unpaid/cancelled/refunded purchases, accepts only USD test-gateway orders without discounts, and sends anonymous aggregates to an internal Convex mutation. An empty or unsupported export stops without changing the saved snapshot. Verify the CSV belongs to the demo store; its columns do not include a store domain.

Importing does not change Shopify or send messages. The snapshot is manual, not continuous synchronization. Refresh test data rereads Convex; it does not fetch new Shopify orders. A real merchant's purchase baseline and recovery evidence remain outside this demo-only work.
