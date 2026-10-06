# Catalog-based revenue model

**Historical assumed scenario:** The displayed dashboard now prefers the observed demo-order snapshot: USD705.35 AOV from 14 paid test purchases. See OBSERVED_PURCHASES.md. This catalog model remains a labeled fallback and is not the active purchase mix.

Store: build-sprint-demo.myshopify.com. Public storefront prices inspected in the logged-in Chrome browser on 6 October 2026. Currency verified from the product page's og:price:currency metadata: USD. This is a fixed price snapshot saved in Convex, not an automatic catalog sync.

The Shopify connector was connected to a different shop; it was not used as the product-price source for this model. Read-only storefront navigation provided the evidence. No Shopify API key, buyer details, new checkout events, or orders were created.

## Inspected products

| Product | Selling price | Source |
| --- | ---: | --- |
| Hydrogen snowboard | $600.00 | [Product page](https://build-sprint-demo.myshopify.com/products/the-collection-snowboard-hydrogen) |
| Complete snowboard | $699.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-complete-snowboard) |
| Multi-managed snowboard | $629.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-multi-managed-snowboard) |
| Multi-location snowboard | $729.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-multi-location-snowboard) |
| Liquid snowboard | $749.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-collection-snowboard-liquid) |
| Compare at Price snowboard (sale) | $785.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-compare-at-price-snowboard) |
| Videographer snowboard | $885.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-videographer-snowboard) |
| Inventory Not Tracked snowboard | $949.95 | [Product page](https://build-sprint-demo.myshopify.com/products/the-inventory-not-tracked-snowboard) |
| Oxygen snowboard | $1,025.00 | [Product page](https://build-sprint-demo.myshopify.com/products/the-collection-snowboard-oxygen) |
| Standard ski wax (one-time) | $24.95 | [Product page](https://build-sprint-demo.myshopify.com/products/selling-plans-ski-wax) |

Catalog source: https://build-sprint-demo.myshopify.com/collections/all. Sold-out gift cards, 3p Fulfilled Snowboard ($2,629.95), and Out of Stock Snowboard ($885.95) are excluded. Compare at Price uses the selling price $785.95, not its $885.95 reference price. Standard ski wax uses the observed one-time variant price $24.95, not the catalog's from-price $9.95 or subscription price. These are listed product prices; destination availability and every variant were not audited.

## Assumed purchase mix

80% one snowboard; 12% one snowboard plus standard wax; 6% two snowboards; 2% three snowboards. Hence 92% of modeled purchases contain one snowboard and 80% contain exactly one item. The cheaper and middle-price boards carry more weight as a modeling choice, not an observed popularity ranking.

| Hypothetical basket | Assumed share | Product subtotal |
| --- | ---: | ---: |
| Hydrogen snowboard | 28% | $600.00 |
| Complete snowboard | 20% | $699.95 |
| Multi-managed snowboard | 10% | $629.95 |
| Multi-location snowboard | 8% | $729.95 |
| Liquid snowboard | 5% | $749.95 |
| Compare at Price snowboard (sale) | 3% | $785.95 |
| Videographer snowboard | 3% | $885.95 |
| Inventory Not Tracked snowboard | 2% | $949.95 |
| Oxygen snowboard | 1% | $1,025.00 |
| Hydrogen snowboard + Standard ski wax (one-time) | 6% | $624.95 |
| Complete snowboard + Standard ski wax (one-time) | 4% | $724.90 |
| Liquid snowboard + Standard ski wax (one-time) | 2% | $774.90 |
| Hydrogen snowboard + Complete snowboard | 3% | $1,299.95 |
| Hydrogen snowboard + Liquid snowboard | 2% | $1,349.95 |
| Complete snowboard + Oxygen snowboard | 1% | $1,724.95 |
| Hydrogen snowboard + Complete snowboard + Liquid snowboard | 1% | $2,049.90 |
| Complete snowboard + Multi-location snowboard + Videographer snowboard | 1% | $2,315.85 |

The weights sum to 100%. For 100 hypothetical purchases, product sales total $75,518.00. Dividing by 100 gives a modeled average order value of **$755.18**. There are no corresponding real order IDs or session records. These baskets are never seeded into the checkout event collection.

## Action estimates

Modeled sales at risk = distinct matching checkouts with a start and no recorded completion × $755.18. Illustrative recovery = modeled sales at risk × 5%. The 5% rate is an assumption separate from the basket mix, not measured likelihood or a guaranteed outcome. Completed sessions are excluded; partial sessions without a recorded start are also excluded. Card groups overlap and must not be added; combined recovery counts each unfinished checkout once. Monetary values round to cents.

For the current 52 real browser-generated test sessions: payment has 10 eligible unfinished checkouts ($7,551.80 at risk; $377.59 illustrative recovery), validation has 30 ($22,655.40; $1,132.77), and unfinished coverage has 41 ($30,962.38; $1,548.12). The combined union is 41, not 81, so combined recovery is $1,548.12.

The test sessions have no collected cart amounts or product identities. Assigning this store-wide modeled order value to them is an explicitly hypothetical opportunity model, not a reconstruction of their actual carts. Missing completion does not prove loss or causality. Shipping, tax, extra discounts, refunds, costs, profit, seasonality, and monthly extrapolation are not modeled. Checking action tasks changes neither these figures nor Shopify. A live merchant's observed order value and validated change results must replace these assumptions before claiming real recovery.
