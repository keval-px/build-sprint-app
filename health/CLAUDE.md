# Checkout Boost — project context

## What this is
**Checkout Boost** is a merchant-facing **Shopify app, embedded inside Shopify Admin** (by Praella). It lets merchants customize their Shopify checkout: add/configure checkout blocks, run discounts, build post-purchase upsell funnels, customize shipping/payment/delivery methods, create checkout validation rules, and edit checkout branding. Project codename: **"Checkout health 2.0"** (a redesign/expansion effort).

All design work here must be grounded in the **REAL current app** (the user supplied screenshots of every section — captured below in `uploads/`). The dashboard `.dc.html` files in the repo are **concepts, not the live product**.

## Design system (binding)
- **Shopify Polaris**, bound at `_ds/ShopifyPolarisDesignSystem_019df8/`.
- Build every design as a **Design Component** (`*.dc.html`). In each DC `<helmet>` load: `colors_and_type.css`, `polaris-web-components.js`, `polaris-web-components-forms.js` from that folder.
- Compose with `<s-*>` web components (s-page, s-section, s-button, s-badge, s-text-field…). Inline styles only; Polaris tokens via the CSS. No colors/components outside Polaris.
- Voice: sentence case, plain language, tabular numbers, generally no emoji (the live dashboard greeting "Hey there 👋" is the one exception in the real app).

## Real app — information architecture (7 sections)
Frame: black admin top bar + left admin nav. Under **Apps › Checkout Boost** the sub-nav is:
1. **Dashboard** ("Hey there 👋") — a stat card (Checkout sessions, Checkout upsells) with a Last-7-days picker + Previous-vs-Current line chart; Feature requests card; Update logs card. Sparse/zeroed on the demo store.
2. **Checkout blocks** — list (tabs All/Active/Inactive; cols **Blocks · Status · Impression · Revenue · Conversion rate · Actions**) + **Customize** → full-screen **Checkout editor**: left layout tree w/ step switcher (Information/Shipping/Payment) → Header, Express checkout, Contact, Shipping, Order summary, Modal, Footer; center **live checkout preview**; right **block config**. **Add block** modal (categories: Content block, Icons & badges, Form & fields, Product upsell, Auto add to cart, SuperFans, Reviews + Create your own). Block types: Banner, Auto Add to Cart, Post-Purchase Survey, Shipping upsell, Trust badges, Cartline upsell, Badge, Controls, Review, Custom text line. Block config fields: name, style, conditions, **Display: Always/On trigger**, offer items, discount, progress bar (goal/message/colors), copyable **Block ID**.
3. **Discounts** — list (tabs All/Active/Scheduled/Expired; cols **Title · Status · Method [Code/Automatic] · Type · Combinations · Used**) + **Create discount** → **Select discount type** modal (Product, Buy X get Y, Tier, Order, Shipping) + **Browse templates**.
4. **Post purchase** — funnel list (cols **Funnel · Priority · Status · Impressions · Revenue · Revenue/visit · Conversion rate · Actions**) + **Manage priority** + **Create new funnel**.
5. **Shipping & Payment** — segmented sub-tabs **Shipping / Payment / Delivery customization**; "Choose the method to edit" → **drag-reorderable radio-select list** of methods; rename / reorder / hide.
6. **Checkout validations** — **Create from scratch** + categorized **template gallery** (Geographic/Address: Country, State/Province, ZIP/Postal, PO Box, Address keyword, Geo-based product; Fraud & Risk: Suspicious email pattern blocking; …).
7. **Branding editor** — full-screen **Branding settings** overlay: checkout-profile selector (Live badge); categories Essentials, Global, Header and footer, Main section, Order summary, Colors, Typography, Form control, Buttons and thumbnails; live preview; "You're editing live checkout profile" warning.

## Reusable UI kit (reuse these patterns)
- **Section shell:** header (app-icon › title + primary CTA + ⋯ overflow) → card with tab row + search/filter/sort cluster → analytics table → footer "Learn more about X | Need help? Contact support".
- **Two full-screen editor overlays** (Checkout editor, Branding settings): left tree/config · center live preview · right settings; title bar with app icon + X.
- **Creation entry points:** type-picker modal (Discounts), categorized template gallery (Validations), add-block modal (Blocks).
- **Controls:** segmented toggles (Always/On trigger, List/Grid, None/Discount, 3/6/9/12), drag handles, radio-select rows, conditions lists, copyable Block IDs, hex color swatches.
- **Status badges:** Active = green; Expired/Inactive = gray; Conditional = gray.
- **Currency:** app data in EUR (€); branding preview in CAD ($) — multi-currency.
- Teal/mint app icon.

## Project files
- `Checkout Boost.dc.html` — concept dashboard (ROI hero, KPI strip, **Recommended next steps** [rebuilt], conversion features, insights). NOT the live dashboard. Also has a built-but-hidden health-score/tier model in its logic.
- `Checkout Health Dashboard.dc.html` (+ `- Draft 1`) — separate concept dashboard (Overview/Checkout drilldown/Alerts; abandonment metrics). Copy in `design_handoff_checkout_health/`.
- `Canvas.dc.html`, `Canvas-2.dc.html` — empty scaffolds.
- `uploads/` — the real-app screenshots (source of truth). `screenshots/` — review/reference captures.

## Known issues / observations (not fixed)
- **Value story is invisible:** analytics columns + dashboard are nearly all `—`/`0`, so merchants can't see what the app earns them.
- Inconsistent tab sets across sections (All/Active/Inactive vs All/Active/Scheduled/Expired); unlabeled combination icons.
- Copy bugs in live defaults: "Auto add**to** cart" (missing space); progress goal "**Your** are {remain_goal} away" (should be "You're").

## What I can do here
- Redesign/extend any section as Polaris Design Components (single `.dc.html`, streams live, opens in a browser, importable).
- Match the real app's frame, section shell, editors, and control vocabulary above.
- Present multiple options side-by-side (canvas mode).
- Export: PPTX, PDF, standalone HTML, Canva, developer handoff.
- I can **view images/screenshots**, but **cannot watch video** or access the authenticated live admin — share stills.

## Conventions
- Ground new work in the **real product**, not the old mockups; preserve its terminology and IA.
- Usually design the app's **main content column**; only draw the full admin frame when a mock needs that context.
