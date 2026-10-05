# Handoff: Checkout Boost — Dashboard redesign ("Checkout health 2.0")

## Overview
A redesigned **Dashboard** for Checkout Boost, Praella's merchant-facing Shopify app embedded in Shopify Admin. The redesign replaces the sparse "Hey there 👋" dashboard with a value-first view: revenue attributed to the app is the headline, followed by attribution breakdown, a checkout-health score, funnel analytics, offer/experiment/discount performance, and suggested next actions.

This design covers the **app's main content column only** (what renders inside the Shopify Admin app frame). The black admin top bar and left nav are supplied by Shopify and are out of scope.

## About the design files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. Your task is to **recreate this design in the app's existing codebase** (e.g. React + Polaris web components inside the embedded-app shell) using its established patterns, data layer, and the **official Polaris CDN bundle** (`https://cdn.shopify.com/shopifycloud/polaris.js`). The bundled `_ds/` folder is an offline re-implementation of Polaris used only so the prototype opens in a plain browser.

Open `Checkout Boost Dashboard v2.dc.html` directly in a browser to see the design. All layout/styling is inline in that file; all data + interaction logic is in the `<script … data-dc-script>` block at the bottom (a plain JS class — read it as the source of truth for exact values).

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final intent. Recreate pixel-perfectly using Polaris tokens/components. All numbers are **realistic sample data** — wire to real analytics.

## Page structure
One page, vertical stack. Container: `max-width: 1240px`, centered, `padding: 24px 32px 96px`, `gap: 20px` between rows, on Polaris page background `#F1F1F1`. Font: Inter (`--p-font-family-sans`), base text color `#303030`.

Rows, top to bottom:
1. **Hero** (full width, no card)
2. **Attributed revenue + Checkout health** (grid `1.85fr 1fr`, gap 20px)
3. **Checkout funnel + Trends since install** (grid `1fr 1fr`)
4. **Top performing offers** (full-width card)
5. **Experiments + Top discount codes** (grid `1.5fr 1fr`)
6. **Help bar** (full-width slim card)

All cards: white `#FFFFFF`, `border-radius: 12px`, `padding: 20px 22px`, shadow `0 1px 1px rgba(26,26,26,0.06)`. Card heading: 13px / 650 / `#303030`.

---

## 1 · Hero
Transparent section (no card) on the page background with a decorative **perspective floor grid** behind it (SVG: horizontal lines compressed toward a horizon at y≈26 plus radial lines converging on a vanishing point; stroke `#1A1A1A` at 4.5–11% opacity; the whole grid is masked with a vertical linear-gradient so it fades out at top and bottom). Purely decorative — a static SVG/CSS background is fine.

### 1a · Metric strip (top, centered, gap 80px, wraps)
Four columns, each: label 12px `#616161` over value 21px/22px, weight 700, tabular numerals, letter-spacing −0.3px.

1. **Date range** — value "Last 30 days" + 11px chevron. Opens dropdown on hover (see Interactions).
2. **Checkout sessions** — `17,958`, red sparkline, delta `−4%` (red `#C70A24`, 12px/650)
3. **Completion rate** — `28.7%`, green sparkline, delta `+1.8 pts` (green `#047B5D`)
4. **Upsell revenue** — `$28.4K`, green sparkline, delta `+22%`

Sparklines: 66×22px SVG line, stroke-width 1.6, green `#1F8A5B` (accent) or red `#C70A24`, no fill. Deltas hide when comparison is off (see Props).

### 1b · Headline (centered, padding 36px 0 26px)
- Kicker: `Hey {firstName}, revenue attributed to Checkout Boost:` — 12px / 650 / `#303030` / letter-spacing 0.4px
- Value: `$65,750` — 46px/50px, weight 700, letter-spacing −1px, `#1A1A1A`, tabular
- Subline: `Across upsells, discount-code orders, and assisted checkouts.` — 13px/20px `#616161`, max-width 540px

### 1c · Suggested action chips (centered row, gap 12px, wraps)
Pill buttons (white bg, radius 999px, padding 6px 12px, shadow `0 1px 1px rgba(26,26,26,0.10)`), each: label 12px/550 `#303030` + estimated-impact badge (12px/550, `#047B5D` on `#CDFED4`, radius 8px, padding 2px 9px, tabular).

These are **general suggested actions** (AfterSell-style recommendations), not alerts:
- `Create a post-purchase funnel` · `+$2.1K/mo est.`
- `Add trust badges to checkout` · `+0.4 pts est.`
- `Set up a shipping upsell` · `+$1.3K/mo est.`

Hover: shadow deepens to `0 3px 8px rgba(26,26,26,0.13)` + 1px inset ring `rgba(0,0,0,0.10)`. Each chip deep-links to the relevant creation flow (Post purchase → create funnel; Checkout blocks → add trust-badge block; Checkout blocks → shipping upsell). Chips should be driven by store state — suppress ones already done.

## 2 · Attributed revenue (left card)
- Header: title + "i" info tooltip (15px circle, `#EBEBEB` bg, `?` cursor help). Tooltip copy: *"Revenue from accepted upsells, orders using Checkout Boost discount codes, and checkouts the app assisted. Orders may be counted where Checkout Boost contributed to the sale."*
- Value `$65,750` (28px/30px 700) + green badge `+18%` (`#047B5D` on `#CDFED4`)
- Legend right: `This period` (solid `#1F8A5B` swatch) / `Previous` (dashed `#C9CCD0`) — 11px `#8A8A8A`
- **Chart**: 680×210 SVG area chart, 30 points. Current period: smooth line `#1F8A5B` stroke-width 2.4 with gradient fill fading down; previous period: dashed `#C9CCD0` line, no fill. Recreate with your charting lib.
- **Where it came from** (below hairline `#EBEBEB`): 10px stacked horizontal bar (radius 999px) + 3-column legend. Segments: `Upsells` `$28,400` 43% `#0F5C3C` · `Discount codes` `$31,500` 48% `#1F8A5B` · `Assisted / influenced` `$5,850` 9% `#C9CCD0`. Legend rows: 10px square dot (radius 3px), name 12px `#616161`, value 13px/650, pct 11px `#8A8A8A`.

## 3 · Checkout health (right card)
- Header: title + tier badge `Advanced` (12px/650 white on `#005BD3`, radius 8px)
- **Score ring**: 116×116 SVG, r=52, stroke-width 9, track `#EDEDED`, progress `#047B5D` (round linecap, dasharray = score/100 × circumference, rotated −90°). Center: `82` (30px/700) over `out of 100` (11px `#8A8A8A`).
- **Factors list** (gap 9px): 18px circular icon + 13px label.
  - Done (✓, bg `#047B5D`, label `#303030`): `Express checkout enabled`, `Free-shipping bar is live`, `Trust badges on payment step`
  - Attention (!, bg `#B98900`, label `#616161`): `Post-purchase funnel incomplete`, `1 discount code failing`
- **Audit upsell** (below hairline): 12px/17px `#616161` copy — *"Run a full scan of your checkout for issues hurting conversion, with step-by-step fixes."* + bold `Available on higher plans.` — then full-width Polaris primary button `Run checkout audit`.

## 4 · Checkout funnel (left card)
Header: title + period label (12px `#616161`). Five step rows (gap 14px), each:
- Step name 13px `#303030` — value 13px/650 tabular — pct 12px `#8A8A8A` (48px right-aligned)
- 8px progress bar (track `#F1F1F1`, fill radius 999px, width = pct): fill `#303030` for intermediate steps, `#1F8A5B` for the final step
- Step-to-step drop count right of the bar: 11px `#C70A24`, e.g. `−5,567`

Data: Checkout sessions 17,958 (100%) → Contact info 12,391 (69.0%) → Shipping method 8,979 (50.0%) → Payment 6,555 (36.5%) → Order completed 5,154 (28.7%).

## 5 · Trends since install (right card)
Header: title + `since Feb 12, 2026` (from install date). Rows (gap 14px): label 12px `#616161`, then `before → after` + green delta badge — before 14px `#8A8A8A`, arrow 12px, after 20px/700 `#1A1A1A`.
- `Checkout conversion` 26.2% → 28.7% `+2.5 pts`
- `Average order value` $59.90 → $65.00 `+8.5%`
- `Revenue per session` $15.69 → $18.66 `+18.9%`

Disclaimer 11px/15px `#8A8A8A`: *"Store-wide metrics — they moved while Checkout Boost was installed, but aren't solely attributed to it."*

Sub-section below hairline — **Protected by validation rules** (12px/650 `#616161`): `Active validation rules · 4` and `Risky checkouts blocked · 142` (label 12px `#616161`, value 13px/650).

## 6 · Top performing offers (full-width card)
Header: title + `View all` link (12px/550 `#005BD3`). Table as CSS grid `2.4fr 1fr 1fr 1fr 0.8fr`, gap 12px. Column heads 12px/550 `#8A8A8A`: Offer · Type · Impressions (right) · Revenue (right) · Conv. (right). Rows: 13px padding-block, hairline `#F4F4F4` dividers; name 13px/650; type 12px `#616161`; numbers 13px tabular; revenue 13px/650 **green `#047B5D`**.

Rows: Shipping upsell - EU / Upsell block / 8,600 / $11,200 / 5.4% · Shipping upsell - US/CA / Upsell block / 6,900 / $9,400 / 4.8% · Cartline upsell / Upsell block / 5,400 / $7,800 / 4.1% · Auto Add to Cart / Auto add / 4,500 / $5,300 / 3.6% · Care kit upsell / Post-purchase funnel / 2,200 / $4,100 / 6.2% · Coffee grinder add-on / Post-purchase funnel / 1,700 / $2,900 / 4.7%.

## 7 · Experiments (left card)
Header: title + "i" tooltip (*"A/B tests split checkout sessions randomly between variants, so lifts shown here are measured — not modeled."*) + `Create experiment` link. Per experiment (divided by `#F4F4F4` hairlines):
- Name 13px/650 + status badge: `Running` (`#005BD3` on `#F0F2FF`) or `Winner applied` (`#047B5D` on `#CDFED4`)
- Variant rows: key A/B (11px/650) · label 12px `#616161` · 110×6px bar (leader `#1F8A5B`, other `#C9CCD0`, width proportional to conv) · conv 12px/650 right-aligned
- Meta line 11px `#8A8A8A`

Data: **Shipping upsell - EU · offer copy** (Running) — A "Free returns included" 5.1% / B "Arrives before Jul 12" 5.8% — "4,210 sessions · B leading +0.7 pts · not yet significant". **Trust badges · placement** (Winner applied) — A "Below order summary" 27.9% / B "On payment step" 29.1% — "B won · +1.2 pts completion · applied Jun 18".

## 8 · Top discount codes (right card)
Header: title + `View all` link. Rows (hairline dividers): code in monospace 13px/650 (`WELCOME10`, `CJ2Z2XO5OX`, `FREESHIP65`, `BUNDLE15`), sub-line `{Code|Automatic} · {n} uses` 11px `#8A8A8A`, revenue right 13px/650 green (`$11,600` / `$9,400` / `$7,200` / `$3,300`).

## 9 · Help bar (slim, full width)
Card with reduced padding `12px 22px`, single row, space-between, wraps.
- Left: `Need help with Checkout Boost?` — 13px `#616161`
- Right (gap 8px, separated by 1×14px `#EBEBEB` dividers): `Email support` · `Documentation` · `Request a feature` · `What's new` — 12px/550 `#005BD3`, padding 5px 10px, radius 8px, hover bg `#F7F7F7`.
- Wire up: Email support → mailto/support widget; Documentation → docs site; Request a feature → feature-request board; What's new → changelog.

---

## Interactions & behavior
- **Date-range picker**: opens on hover of the Date range column (mouseenter/mouseleave on the wrapper; use click-toggle if you prefer). Popover: 248px, white, radius 12px, shadow `0 4px 6px -2px rgba(26,26,26,0.20)` + 1px inset ring, padding 6px, appears below-left with 8px offset. Presets: Today / Last 7 days / Last 30 days / Last 90 days / Last 12 months — rows 8px 10px padding, radius 8px, selected bg `#F1F1F1` + green ✓, hover `#F7F7F7`. Below a divider: **Custom range** — two date inputs + full-width dark `Apply range` button (`#303030`, hover `#1A1A1A`); applying sets the label to e.g. `Jun 1 – Jun 28`. Changing range must refetch all page metrics.
- **Hover states**: chips (shadow deepens), popover rows / help links (`#F7F7F7` bg). No transforms/scale.
- **Focus**: 2px outline `#005BD3`, offset 1px, on all interactive elements.
- **Links** (`View all`, `Create experiment`): navigate to the respective app sections.
- **Loading**: skeleton cards in place of each row while metrics load.
- **Empty/new-install state** is not designed here — needs a follow-up for stores with no data yet (the prototype assumes an active store).
- Comparison off (`showComparison=false`) hides: KPI delta badges, revenue +18% badge, chart legend, previous-period line.

## State & data
UI state: `dateRange` (preset label or custom from/to), `rangeOpen`, custom from/to values.

Data requirements per date range: checkout sessions, completion rate, upsell revenue (+ previous-period series for each); attributed revenue total + daily series (current & previous) + source breakdown (upsells / discount codes / assisted); funnel counts per step; since-install before/after for conversion, AOV, revenue-per-session; validation-rule count + blocked count; top offers (name, type, impressions, revenue, conversion); experiments (variants, conv, status, meta); top discount codes (code, method, uses, revenue); health score + factor checklist; suggested actions with estimated impact; merchant first name; install date; plan tier.

Config (prototype props, exposed as tweaks): `period` (default "Last 30 days"), `currencySymbol` ($ / € / £ — app data is multi-currency, EUR in production demo store), `showComparison` (bool), `installDate` (ISO date).

## Design tokens
Polaris tokens throughout (`colors_and_type.css` in this bundle = the token sheet). Key values:
- Page bg `#F1F1F1` · card `#FFFFFF` · hairlines `#EBEBEB` (section) and `#F4F4F4` (rows) · input border `#E3E3E3`
- Text: primary `#303030`, strong `#1A1A1A`, secondary `#616161`, muted `#8A8A8A`
- Accent green (charts/bars) `#1F8A5B` · dark green `#0F5C3C` · success text `#047B5D` on `#CDFED4` · critical `#C70A24` on `#FEE8EB` · info/link `#005BD3` on `#F0F2FF` · caution icon `#B98900` · neutral chart gray `#C9CCD0`
- Radius: 12px cards, 16px hero, 8px badges/buttons/inputs, 999px pills/bars · Shadows: card `0 1px 1px rgba(26,26,26,0.06)`, popover `0 4px 6px -2px rgba(26,26,26,0.20)`
- Type: Inter; weights 450 (body), 550 (medium/labels), 650 (semibold), 700 (bold); sizes 11/12/13/14/20/21/28/30/46; **tabular numerals on every number**
- Spacing: 4px base grid; 20px between cards; 20px 22px card padding

## Content rules (Polaris voice)
Sentence case everywhere; no emoji; no exclamation marks; merchant addressed as "you"; currency with symbol; tabular figures.

## Assets
No image assets. All graphics (sparklines, area chart, health ring, perspective grid) are inline SVG — recreate with your charting library or copy the SVG generation from the prototype's script block. Icons: use polaris-icons (the only glyphs here are a chevron, ✓ and !).

## Files
- `Checkout Boost Dashboard v2.dc.html` — the complete design (markup + logic). Open in a browser.
- `screenshots/` — section-by-section captures (01 hero → 06 help bar) for quick visual reference; the HTML file remains the source of truth for exact values.
- `support.js` — prototype runtime (renders the design file; not for production)
- `_ds/ShopifyPolarisDesignSystem_019df8/` — offline Polaris tokens + web components (prototype only; use the official Polaris CDN bundle in production)
