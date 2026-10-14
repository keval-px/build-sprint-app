# Checkout Health

A Shopify Plus app that watches checkout and shows where it loses money: observed checkout journeys, abandoned baskets, drop-off by stage, and evidence-backed findings with a next step. Built with TypeScript, Shopify Polaris web components and a self-hosted Convex backend.

The app never invents a cause, a lost-revenue figure or a missing basket value. Unknown stays Unknown, browser events are treated as untrusted observations, and test data is labelled as test data.

## How it works

- **Web pixel** (`extensions/checkout-evidence`): listens to Shopify checkout events and sends an anonymous payload (hashed checkout and event IDs, alert category, device class, subtotal). No buyer details.
- **Backend** (`convex/`): verifies Shopify sessions and signed notifications, collects pixel events, syncs orders and abandoned checkouts every minute through read-only Admin GraphQL, and stores signed checkout prices.
- **Shared logic** (`shared/`): rebuilds checkout journeys, outcomes, basket values, funnels and findings. Most of the behaviour lives here and is covered by `tests/`.
- **Frontend** (`src/`, `index.html`): the embedded Shopify admin page. Data loads when the page opens and when dates change.

## Run locally

The app runs on self-hosted Convex in Docker (OrbStack on macOS). See [LOCAL.md](LOCAL.md) for the full runbook.

```sh
npm ci
npm run local:up        # start the local Convex instances and gateway
npm run local:deploy    # build and upload the app to the local sandbox
npm run local:shopify   # start a temporary public tunnel for Shopify testing
```

Shopify credentials stay in an owner-only file under `.local/`, which is ignored by Git.

## Checks

```sh
npm test            # unit and integration tests
npm run build       # typecheck, Polaris component check and production bundle
npm run test:local  # local runtime and gateway tests
```

CI runs `npm test` and `npm run build` on every push and pull request.

## Project notes

[PRODUCT.md](PRODUCT.md) describes the product and milestones, [PLAN.md](PLAN.md) the current plan and change log, and [DESIGN.md](DESIGN.md) the interface rules.
