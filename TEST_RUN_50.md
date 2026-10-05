# 50-checkout test run — 5 October 2026

Store: build-sprint-demo.myshopify.com (Shopify Plus development store).

Generated through the real Shopify storefront and checkout in Chrome. Every listed session comes from received browser events; no fixtures or invented orders were inserted into Convex.

## Verified outcomes

| Recorded outcome | Additional sessions |
| --- | ---: |
| Checkout started; no completion | 10 |
| Payment failure; no completion | 10 |
| Completed | 10 |
| Shipping submitted; no completion | 10 |
| Contact submitted; no completion | 10 |

The payment-failure group used seven simulated declined payments (test card value 2) and three simulated gateway failures (value 3), all visibly verified in checkout. Successful test payments used value 1. No real payment card or charge was used.

The dashboard contains 52 sessions, 11 completions, and 482 events including the earlier two tests. Evidence is not truncated.

## Interpretation limits

- Unfinished means no completion event observed; it does not prove abandonment or its cause.
- Several checkouts were revisited to finish the intended scenarios. Event gaps include the test run and retries, not measured customer hesitation.
- An early browser helper targeted one older checkout repeatedly. An independent event audit exposed this; direct tab handling was used to complete and verify distinct outcomes. Repeated genuine alerts remain in that session, so alert frequency is not representative of real shoppers.
- Fictional test contact and address details were entered into Shopify. Convex receives only anonymous event IDs, checkout IDs, event names, times, and error categories.
- These are deliberately generated test outcomes, not a live merchant problem, revenue estimate, or production conversion rate.
- Validation alerts also appeared for the fictional address. A recorded category is not enough to identify the exact field or cause.

## Checking the result

Open https://neighborly-nightingale-843.convex.site/, tap Refresh test data, and expect 52 checkout sessions, 11 completions, and 41 with no completion observed. Open Checkout drill-down and expand sessions to inspect actual events and outcomes.

## Anonymous session audit

| Checkout ID prefix | Recorded outcome | Received events |
| --- | --- | ---: |
| 3e70657a39dd | Checkout started; no completion | 1 |
| fcf524996b0f | Checkout started; no completion | 1 |
| 6a3460066365 | Payment failure; no completion | 12 |
| 07d7dd9646a3 | Payment failure; no completion | 12 |
| 927d44df6be4 | Payment failure; no completion | 12 |
| b1054e41d5e1 | Payment failure; no completion | 12 |
| a2de74e44546 | Payment failure; no completion | 12 |
| 21967abbeeeb | Payment failure; no completion | 12 |
| 2021019db555 | Payment failure; no completion | 12 |
| f26f1cd02ba1 | Payment failure; no completion | 12 |
| 26b27fb12d39 | Completed | 76 |
| d63398ac9576 | Payment failure; no completion | 12 |
| 644668f68946 | Payment failure; no completion | 12 |
| 8c96f3da73a7 | Shipping submitted; no completion | 13 |
| e51159f32d60 | Shipping submitted; no completion | 10 |
| 66484368f585 | Shipping submitted; no completion | 10 |
| 542f47f6c662 | Shipping submitted; no completion | 10 |
| 9bd7bb57e8d6 | Shipping submitted; no completion | 10 |
| b12d58c17810 | Shipping submitted; no completion | 10 |
| 8bf9f03ac6dd | Shipping submitted; no completion | 10 |
| c0806d9d3622 | Shipping submitted; no completion | 10 |
| 0cd02d73ecdc | Shipping submitted; no completion | 10 |
| b1a888ccaf05 | Shipping submitted; no completion | 10 |
| e87c1fe387e8 | Contact submitted; no completion | 6 |
| 9eef2be5d926 | Contact submitted; no completion | 6 |
| 554dcd9d1fd7 | Contact submitted; no completion | 6 |
| 05c1b68b45f7 | Contact submitted; no completion | 6 |
| 9f10d99981df | Contact submitted; no completion | 6 |
| 0fd15f43c4be | Contact submitted; no completion | 6 |
| 2fa8b4325352 | Contact submitted; no completion | 6 |
| 4d41db13260f | Contact submitted; no completion | 6 |
| 5b6e6297c58b | Contact submitted; no completion | 6 |
| 844d9320a859 | Contact submitted; no completion | 6 |
| af2e57f713d7 | Completed | 12 |
| 6fd78628d600 | Completed | 12 |
| d20f77346b12 | Completed | 8 |
| fc6d50d1f4c0 | Completed | 11 |
| a71a667afaf7 | Completed | 11 |
| 864c60346d84 | Completed | 11 |
| d5f4885960f3 | Completed | 11 |
| 0e636a5add9d | Completed | 11 |
| 4fa3b95cd7fa | Completed | 7 |
| 1fba5e9c31cf | Checkout started; no completion | 1 |
| 777b65c03e32 | Checkout started; no completion | 1 |
| 32993d8a12c5 | Checkout started; no completion | 1 |
| 3f57f0d2aa7d | Checkout started; no completion | 1 |
| 3786d0960498 | Checkout started; no completion | 1 |
| 9503ac7fc219 | Checkout started; no completion | 1 |
| 8b30ecb9a897 | Checkout started; no completion | 1 |
| 4bdb7f89d4e1 | Checkout started; no completion | 1 |
