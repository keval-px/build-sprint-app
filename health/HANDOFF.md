# Checkout 2.0 — project handoff

Read this together with `CLAUDE.md` (product context + IA) before making changes.
Rebind the design system at `_ds/shopify-polaris-design-system-019df899-5a82-7667-aa41-42cb9ccba78a/`.

## Deliverables

| File | What it is | State |
| --- | --- | --- |
| `Block Studio.dc.html` | Checkout blocks library + full-screen block studio (editor). Includes the upsell/template gallery. | Stable |
| `Dashboard v3.dc.html` | Current dashboard. Attribution hero, source breakdown, funnel, supporting cards. | Current |
| `Health Dashboard.dc.html` | Separate checkout-health concept (Overview / drilldown / Alerts). | Concept |
| `Dashboard v2 (backup).dc.html` | Previous dashboard iteration, kept for reference. | Archive |
| `Checkout Pulse Dashboard/` | Earlier dashboard exploration. | Archive |
| `design_handoff_checkout_boost_dashboard/` | Exported handoff package. | Archive |
| `uploads/` | Screenshots of the **real** live app — source of truth. | Reference |
| `screenshots/` | Review captures taken during design. | Reference |

## Conventions locked in

- **Container width: 1080px max, 24px side padding** across Block Studio, Dashboard v3 and Health Dashboard. Health Dashboard uses a full-width `s-page` inside a 1080px wrapper. Don't reintroduce 1240px or Polaris's default 800px.
- The block studio / editor view is intentionally **not** width-capped — it's a full-bleed three-panel overlay (config · live preview · settings). The preview column renders at Shopify's real checkout widths: 500px main / 400px order summary on desktop, 402px on mobile.
- Device switching in the studio is a **centered segmented toggle** in the top bar (desktop | mobile), active segment = white raised chip on a `#F1F1F1` track. Mobile preview surface carries a 16px radius.
- Polaris only: `s-*` web components, inline styles, sentence case, tabular numbers, no emoji (the live dashboard's "Hey there 👋" greeting is the one exception that exists in the real app).

## Design decisions and the reasoning behind them

### Blocks are organised by placement, not by type
Static targets (header, contact, shipping, order summary, footer) render automatically wherever they sit in the checkout tree. Dynamic blocks can go anywhere. Group names use merchant language, not internal taxonomy.

### Every "Add …" button opens the template gallery
The gallery leads with proven plays — each carrying pre-built rule-engine triggers and a median lift figure — with "Start from scratch" as the last option rather than the default. Rationale: merchants don't know what a good block looks like; a blank config panel is where they stall.

### Suggestions are filtered by benefit badge
So the list answers "what will this do for me" before "what is this".

### Industry benchmarks: deliberately NOT shipped
We built, iterated three times on, and then **removed** an industry-median comparison in the funnel card (floating median tick → bullet chart → contrast-aware tick).

Reason: ~200 stores is too small to segment by industry × monthly volume. Cells land at 5–15 stores, a median off 8 stores swings wildly, and the first merchant who says "that's not my industry" costs more trust than the comparison earns.

**The replacement, if the comparison comes back:** the store's own **trailing 90-day median**. Same visual, same "am I doing well?" answer, no defensibility risk, and more actionable — "below your own norm" is something a merchant can act on today; "below industry median" isn't. If shipped it needs (a) an empty state for stores with under 90 days of data (hide the tick, never fake it) and (b) a methodology label reading "your median, last 90 days" on the card.

**Industry medians become a paid tier at 1000+ stores**, when there's enough n to defend the segmentation.

The funnel card currently reads: label · bar · count · step drop-off. No comparison of any kind.

### Attribution hero
Dashboard v3 leads with revenue attributed to Checkout Boost since install (€65,750 in the mock). Underneath, "Where it came from" splits into three divider-separated columns (dot + label, then value at 18px with the percentage alongside). All mock numbers are validated to sum exactly — keep that true if you edit them.

Note: app data is EUR (€); the branding preview is CAD ($). The real app is multi-currency, so both are correct.

## Known issues in the real app (documented, not fixed)

- Value story is nearly invisible: analytics columns and the live dashboard are almost all `—`/`0`, so merchants can't see what the app earns them. This is the problem the whole dashboard effort exists to solve.
- Tab sets are inconsistent across sections (All/Active/Inactive vs All/Active/Scheduled/Expired). Combination icons are unlabeled.
- Copy bugs in live defaults: "Auto add**to** cart" (missing space); progress goal reads "**Your** are {remain_goal} away" (should be "You're").

## Open threads

1. Confirm whether the self-benchmark tick ships at all this release, or stays out.
2. Template gallery should confirm a landing with a toast, and show provenance in the studio header ("from template: …") — not yet wired.
3. Health Dashboard is still a parallel concept. Decide whether it merges into Dashboard v3 or ships as its own section.

## Notes for whoever picks this up

- Ground new work in `uploads/` (the real app), not in the concept `.dc.html` files.
- `Checkout Boost.dc.html`-era concepts contain a built-but-hidden health-score/tier model in their logic class if that idea gets revived.
- Usually design the app's main content column only; draw the full admin frame (black top bar + left nav) only when a mock needs that context.
