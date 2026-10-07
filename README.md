# Jimmy’s Bakery · Checkout Health

A Shopify demo app for reviewing checkout sessions, alerts, and recorded completion events. Built with TypeScript, Shopify Polaris, and Convex.

## Run locally

```sh
npm ci
npm run dev
```

The connected app needs your own Convex project and Shopify development app settings. Copy `shopify.app.example.toml` to `shopify.app.toml` and configure your app. Keep credentials in local environment settings; they are not included in this repository. The current implementation targets the `build-sprint-demo.myshopify.com` development store.

## Dashboard

The dashboard name is Jimmy’s Bakery; the connected store remains the identified development store. It includes compact recommendations, up to three qualifying priority issues, counted issue filters, last observed checkout steps, recorded step intervals, grouped error diagnostics, comparable-period metrics, and CSV exports of filtered checkouts and events.

Fix history retains applied, retested and undone markers for the same authorized store or anonymous demo viewer. Before/after figures describe recorded activity and do not establish recovered revenue. Focused alerts check while the app is open and visible, once a minute, and can be paused or dismissed by type. Shipping alerts require distinct unresolved checkouts; error-rate alerts require a recent sample and a measured baseline. Missing history and step transitions remain unknown.

## Checks

```sh
npm test
npm run build
```

## Deploy

With your Convex deployment configured:

```sh
npm run deploy
```

Deployment uses Convex static hosting. Pushing to GitHub does not deploy the app.

## Checkout prices

Per-session prices arrive through signed Shopify `checkouts/create` and `checkouts/update` notifications. The receiver keeps only a checkout-token hash, dates, currency, subtotal, total, and completion status. It rejects stale updates and uses Shopify totals including shipping. GraphQL provides aggregate abandoned-checkout totals and matched order prices; previously verified historical identities remain saved.

Notification activation is separate from refreshing the dashboard. After approving this data flow and connecting the Shopify app, the owner enables `SHOPIFY_CHECKOUT_PRICES_ENABLED` in Convex and runs the internal `shopify:enableCheckoutPrices` action. `shopify:checkoutPriceStatus` verifies the subscriptions. No legacy checkout REST reader is used.

## Data

The dashboard uses controlled demo checkout evidence. Test orders do not represent real revenue or prove a recovery effect. Public demo results and authenticated Shopify records are kept separate.

This repository contains a snapshot of the current app source. Local credentials, design reference uploads, and earlier local Git history are excluded.

## Audit and live number checks

See [AUDIT.md](AUDIT.md) for requirements, cleanup, numeric and browser verification, and pilot limits. `npm run audit:metrics` performs a read-only check of live public demo totals. It needs network access; regular CI tests and builds remain independent of live data.
