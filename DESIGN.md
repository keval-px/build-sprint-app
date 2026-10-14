---
name: Build Sprint Checkout Evidence
description: Shopify App Home v2.0 component-only checkout investigation interface
spacing:
  compact: "small"
  standard: "base"
typography:
  metric:
    fontSize: "large-100"
components:
  page-frame:
    width: "1100px"
  metric-number:
    typography: "{typography.metric}"
---

# Design System: Build Sprint Checkout Evidence

## Overview

**Creative North Star: "Shopify App Home"**

Use Shopify App Home v2.0 web components for every visible interface element. This is the user-approved system change: official components own typography, colors, shapes, elevation, interaction states, and responsive behavior. The shipped runtime is https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js; local component definitions are pinned to @shopify/polaris-types@2.0.0-rc.0.

The health dashboard reference (health/Health Dashboard.dc.html) continues to guide information order and section purpose. Express that structure with official components; do not reproduce its custom HTML controls, dark hero, font files, palette, or card CSS. The screen should feel familiar and useful for investigating checkout evidence.

**Key Characteristics:**
- Official Shopify components throughout.
- Clear section headings, readable evidence, and restrained status emphasis.
- Component keyword scales instead of custom visual values.
- Responsive layouts composed with stacks, grids, and query containers.

The frontmatter records observed **component keywords** and the user-approved maximum page width, not a copied Shopify palette. Apply `spacing.compact` and `spacing.standard` through the `gap` property; apply `typography.metric.fontSize` through `s-number.fontSize`. Shopify resolves their visual values. `components.page-frame.width` supplies the maximum in the native root grid’s column expression, not a custom CSS rule. Font family, weights, colors, radii, shadows, and pixel spacing are not independently owned by this project.

## Colors

Color belongs to the component’s semantic properties. Use subdued text for supporting information, informational banners for scope and collection limits, critical banners for request failures, and caution badges for evidence needing investigation. Primary and secondary buttons use Shopify’s supplied variants. Official success-tone numbers may emphasize explicitly labeled modeled recovery; the tone does not verify savings.

**The Component Ownership Rule.** Use official component properties; do not assign custom CSS colors or copy internal shadow-root styles.

## Typography

Shopify owns the font family and type hierarchy. Use page and section headings for the main structure, `s-heading` for subsections, `s-paragraph` for explanations, `s-text` for labels, and `s-number` for counts, percentages, and clearly labeled observed test-order averages and modeled monetary values. Important numbers use the metric keyword in the frontmatter with the official `fontWeight="bold"` property. Supporting copy uses `color="subdued"`; emphasized short text uses `type="strong"`.

Do not load the reference’s Inter font or impose a root font size, weight scale, or line height.

## Layout

Center the entire page inside an official root `s-grid` with `gridTemplateColumns="minmax(0, min(100%, 1100px))"` and `justifyContent="center"`. The frontmatter page-frame width is the maximum; narrower screens use their available width. The shipped grid column measures 1100px at a 1440px viewport and 390px at a 390px viewport. Do not reproduce this rule with custom visual CSS.

Use `s-page` with `inlineSize="large"` inside that grid, sections for content groups, and stacks with the frontmatter spacing keywords. Page actions and notices use the official slots. Insights & recommendations has one review list of full-width cards below its short introduction. The heading pairs the official decorative magic icon with the title and combined pending item count; there is no repeated What to review subheading. Only comparisons in the review state join qualifying recommendations; healthy and collecting comparisons have no card. Critical alerts precede warning signals, and completed actions remain under Marked as done.

Use `s-query-container` and `s-grid` for responsive content. Observed metric groups use three equal columns above a container width of 600px and one below it; the evidence and coverage pair uses two equal columns above 700px and one below it. These are container rules, not global viewport breakpoints. Use official table components for event rows and their responsive presentation.

Comparison and action cards place the finding and recommended next step beside the paired metrics in a `1.5fr 1fr` grid above 700px and stack those groups at or below it. The two comparison groups, or affected-count and value, remain side by side. Expanded investigation evidence and fix checks use two equal columns above 700px and stack below. Card headings and status badges precede the summary; a divider separates that summary from the visible footer actions.

Only `body { margin: 0; }` and `[hidden] { display: none !important; }` remain in application CSS. Visibility is application state; all visual layout belongs to the components.

## Elevation & Depth

Official sections, buttons, badges, and banners supply their own surface treatment, shadows, and interaction feedback. Do not create a project shadow scale or recreate the former custom card elevation.

## Shapes

The official components determine corners, outlines, borders, and control silhouettes. Do not add a project radius scale, custom card outline, or native control styled to resemble Polaris.

## Components

### Buttons

Use `s-button` with `variant="primary"` for the main action and `variant="secondary"` for supporting actions. Shopify supplies hover, focus, active, loading, and disabled visuals. Navigation uses two buttons with `aria-pressed`; the selected view uses the primary variant.

### Chips

Use `s-badge` for short status labels. Comparison cards use warning tone for Needs your review and neutral tone for Collecting data or No change flagged. Action-card badges use the finding's severity tone; Marked as done uses neutral tone. These indicate review or reported-action status, not a verified cause, fix, or reward.

### Cards / Containers

Use `s-section` for comparison and action cards, composed with official stacks and grids. Other sections may use their documented heading, subheading, and action slots. Flagged comparison cards show a bold title, Needs your review badge, medium-weight What we detected and What you should do next labels, paired percentages and sample counts, and the observation window. Time comparisons label Recent half and Earlier half; device comparisons label Mobile and Desktop. Their footer includes the affected-checkout count and How comparisons work. Recorded activity is available in individual checkout details; comparison cards do not repeat an alert table or have an empty details expansion. Stable and collecting comparisons remain internal detection states, without placeholder cards or an independent comparison section.

In each flagged comparison card’s footer, the How comparisons work tertiary button opens an official popover with the observation and comparison method: one hour per checkout, equal halves for time comparisons, the same period for device comparisons, at least 20 checkouts in each group, current complete tracking, and a 10-percentage-point review threshold. Unknown devices and tablets are excluded from device comparisons. The popover states that a difference warrants investigation rather than proving a checkout problem. Eligible checkout-start dates, the notice that newer checkouts are still being observed, and the local test-data label stay inside the relevant card.

Action cards keep the heading, severity badge, What we detected, What you should do next, latest matching alert date when available, affected count and percentage, and affected basket value visible while collapsed. Inventory uses Item value before alert. Missing prices display Unavailable and Some prices weren’t recorded; recorded amounts retain Not confirmed lost revenue. A visible footer pairs the secondary View affected checkouts button with the tertiary Show/Hide details button. The latter exposes its state with `aria-expanded` and `aria-controls` and expands the Why we flagged this evidence, How you can test your change instructions, relevant settings link, and completion control. Individual alert events, timestamps and checkout steps remain in each checkout’s details rather than repeating an aggregate alert table. Existing fixes also reveal reported retests and later activity in the expanded area; their outcome summary stays visible when collapsed.

Mark as done records the team's action without verifying the result, as the copy beside the control states. Completed actions move under Marked as done; matching alerts can return them to review. Saving disables completion controls, failures show a critical banner, and successful updates restore focus to the visible details button. Retest records remain self-reported and later purchases do not prove a change worked. An empty review list says No issues flagged in the checkouts we’ve recorded, retains Browse recorded checkouts, and explains when more current data is needed. It does not certify checkout health. Comparison signals disappear automatically when the comparison no longer qualifies; they do not acquire manual fix controls.

### Inputs / Fields

Use `s-checkbox` for investigation steps and its official label, checked, and disabled properties. Loading and saving disable the controls. No calculator or order-value field is currently rendered. Any future approved field must use the matching official component.

### Navigation

Embedded Shopify uses App Bridge `s-app-nav`: Overview is the home route, and Checkouts, Fix history and Alerts have separate page URLs under `/api/shopify/app`. Shopify renders the menu in its desktop sidebar and mobile navigation. The former title-bar view buttons are hidden. Each route reloads independently with the correct page heading. Evidence buttons open Checkouts with the selected insight and dates in the URL; checkout search, status and sort also survive refresh, and Clear filters removes the insight from the URL. The standalone demo retains its `s-stack` view buttons. Focus follows deliberate navigation and checklist actions.

### Evidence Tables and Notices

Use official `s-table` components for event times, names, categories, observed test-purchase baskets, and disclosed fallback basket assumptions. Use `s-banner` for collection scope and errors, `s-divider` for separators, and official text components for limitations and loading messages.

## Do's and Don'ts

### Do:
- Do use Shopify App Home v2.0 web components for every visible element.
- Do use documented component properties and keyword scales checked against the pinned official manifest.
- Do preserve the health reference’s useful section purposes through official components.
- Do keep uncertainty and unavailable values visibly explained with official text and banners.
- Do check populated overview and drill-down states at desktop and phone widths after component changes.

### Don't:
- Don’t reintroduce custom visual CSS, native styled controls, copied font files, or a separate palette.
- Don’t recreate the removed calculator, visible points, or reward badges.
- Don’t use status styling to imply a verified merchant incident, fix, or recovered money.
- Don’t add Impact or Slack screens during milestone 1; their product plans remain in PRODUCT.md and PLAN.md.

Component compatibility is checked by `npm run check:ui` using Shopify’s published component manifest, followed by TypeScript and browser checks. Feature rules and current test-data limitations remain in PLAN.md: observed purchases from build-sprint-demo supply the displayed test-order average and basket mix. Where an abandoned-checkout snapshot exists, action amounts use only recorded unrecovered basket subtotals with verified anonymous-session links; unmatched or conflicting links remain Unknown, with no average-order-value substitution. Recorded basket value is not proof of lost revenue, and 5% recovery remains illustrative rather than verified; checklist progress is personal per browser in Convex and does not verify a store fix. The current manual snapshot’s date, paid-order count, product subtotal, observed average, and basket shares must be shown or inspectable; use the saved snapshot values rather than fixed assumptions. The recovery rate remains independently illustrative at 5%; the prior USD755.18 catalog model is only a labeled fallback. Refresh rereads Convex, not an automatic Shopify sync. Snapshot provenance, fallback weights, deduplication, and recovery limitations belong in ABANDONED_CHECKOUTS.md, OBSERVED_PURCHASES.md, CATALOG_MODEL.md, and PLAN.md, not the visual token system.

### Checkout event timeline

The user requested Shopify Admin’s Campaign Autopilot timeline as the visual reference. Expanded checkout details use an ordered event list with a gray connected rail, circular markers, and times aligned at the right. All recorded events and categories remain visible in chronological order, including events after completion. Only an actual `checkout_completed` event receives a green marker; this is not an active/loading indicator. Dates and seconds remain visible for investigation.

The public App Home v2.0 component manifest has no timeline component. This surface therefore permits narrowly scoped CSS for the decorative rail and dots on `s-box[data-timeline-marker]`. Shopify components continue to own all text, layout, controls, and remaining surfaces. This is a narrowly scoped exception to the component-only visual styling rule above.

Collapsed checkout journeys follow the Health Dashboard reference’s compact row structure: checkout identifier and start time, observed outcome, recorded error category, basket value, and an expansion button. Progress, event/error counts, value provenance, anonymous ID, and the complete event timeline remain in expanded details. Rows use official small spacing; the list retains separators and responsive two-column wrapping on phones.

Timeline events use compact vertical padding and one-line date/time labels, retaining seconds. Event categories sit beside their event names when space permits, with caution-tone badges for input validation and neutral badges for other categories. Long event labels wrap on phones; timestamps stay together. The decorative dot position follows the compact row padding.

The Checkout reference table column uses the first 12 characters of the existing anonymous checkout reference. In the signed-in Shopify app, a unique exact checkout-token hash match replaces that title with the Shopify order name (for example, Order #1017). Order names remain in authenticated evidence only; the public demo keeps anonymous references. Expanded details show the full reference beside a status badge and retain the timeline.

Expanded timeline counts begin with elapsed checkout time in minutes:seconds. Measure from the earliest checkout start to the first subsequent completion, or the last recorded event when unfinished. Missing starts show Time unknown; this measures the observed journey, not active browsing time. Always display the alert count, including zero.

Matched order titles link to their exact Shopify order resource through shopify://admin/orders/{id} with target _top. Only authenticated Shopify snapshots supply order IDs; unmatched or ambiguous checkouts remain plain text.

Checkout drill-down uses the native Shopify s-table with 24 checkouts per page and its built-in previous/next controls. Filter the complete checkout set before slicing a page; insight and date changes reset to page one. Counts show the visible range and total page count. The table adapts to Shopify’s list layout on phones. Show details opens a single native s-modal containing the full timeline and elapsed/event/alert summary.

The drill-down table has a compact Shopify search/filter toolbar: checkout reference or order number search, completion status, and alert category. Search trims whitespace and ignores case; all criteria intersect with the selected insight before pagination. Clear filters restores every checkout in the selected dates. No-result states retain the toolbar. Search, status and sort controls stack on narrow screens. Quick issue filters stay in one horizontal row inside a native Shopify scroll box; swipe, trackpad scrolling and keyboard focus can reach every filter without wrapping.

The table sort control offers newest/oldest checkout start and highest/lowest recorded basket value. Sort the filtered complete result set before paginating, reset to page one on sort changes, and keep unknown values last in both value directions. Ties use newest checkout start and a stable checkout ID order.

Unmatched checkout row labels use # followed by the anonymous 12-character reference. Started dates use Today or Yesterday when they match the viewer’s local calendar day, otherwise the actual day/month, with 24-hour time. Order labels and links remain unchanged.

The duplicate checkout count above the table is removed. Pagination uses a single footer row with the visible range, compact Page X/Y summary, and native Shopify previous/next icon buttons. Boundary buttons disable correctly and the footer remains one line on phone screens.

Basket values now prefer unique exact Shopify record matches: completed journeys use current order totals; unfinished journeys use abandoned checkout totals including shipping and tax. Browser subtotals remain an observed fallback. Overview and average abandoned values use the same Shopify totals. Action values retain product subtotals. Date selection filters journey starts and aggregate record dates separately without removing identity lookup records.

Checkout prices now have a supported signed-notification source keyed by the original checkout token hash. It updates per-session totals independently from GraphQL abandoned counts. Historical verified identities remain readable without additional REST calls. Activation is deliberately separate from data refresh and requires explicit approval of the data sent to the Convex endpoint; the receiver is disabled by default.

Jimmy’s Bakery is the user-approved dashboard name; connected-store metadata and the demo-data label retain the actual source identity. Overview adds qualifying priority issues, comparable-period metrics and error diagnostics. Checkout drill-down adds counted quick filters, a last-observed-step column, recorded step intervals and filtered CSV exports. Separate native views hold fix history and focused in-app alerts. Comparisons show an explicit waiting state until sufficient history exists. Step intervals describe first recorded submissions, never field-entry time; missing payment activity stays unknown. Fix archives preserve undo and retest records without making recovered-revenue claims. Alert settings and dismissals are browser-local; alerts are computed from the data loaded with the page. All new UI uses the installed Shopify components.

The user requested removal of the Overview section titled Compared with the previous period. Its markup and rendering helper are removed; the order-pattern chart and fix-history comparisons remain separate features.

## Audit cleanup — 8 October 2026
The obsolete modeled basket and recovery library surfaces and checklist are removed. Native abandoned-basket metrics use recorded Shopify totals; recommendations use the same exact full-price precedence as the journey table. Findings retain simultaneous-step context instead of choosing an arrival order. Data loads when the page opens and when dates change; there is no background refresh, refresh button or freshness message (14 October 2026: merchants reload the browser for newer data). The official component system and decorative timeline remain; the unused local font asset is removed.


### Checkout-stage chart — 13 October 2026

The approved reference adds five horizontal stage bars below the completed-checkout cards. Shopify components own the section, responsive rows, labels, counts and four segment buttons. Chart marks on `s-box[data-funnel-bar]` are a second scoped CSS exception: grayscale stages, green completion, proportional widths and rounded ends. This does not authorize styling unrelated controls or surfaces.

Counts use recorded stages for checkouts started in the selected date range. Missing or skipped stages must not become claimed abandonment. Mobile and Desktop exclude unknown or conflicting device labels and tablets. Express pay includes positive wallet evidence only and states that payment details may arrive only at completion. Historical device labels are not inferred.

### Chart styling exceptions — recorded 14 October 2026

These existing rules in `src/style.css` and the chart code are the only other permitted custom visual values. They were already shipped; this records them so the component-only rule stays accurate. Do not extend them to other surfaces.

- `s-text[data-funnel-drop="high"]` uses red `#c52233` for stage drops above 50%. The embedded theme renders `tone="critical"` text near-black, so the tone alone does not distinguish a high drop. The element keeps `tone="critical"` for semantics.
- `#order-chart-summary` uses a dotted underline to mark the chart title as a help term, matching Shopify's help-term affordance.
- `#order-chart-help-anchor` / `#order-chart-tooltip` position the help overlay below its trigger (300px wide, 8px offset, above the chart) so opening it never changes card geometry.
- `ABANDONED_LINE_COLOR` (`#D86B76`, `shared/abandonedPattern.ts`) colours the abandoned-checkout series in the Polaris Viz order chart, which has no semantic series tone.

### Card wording — 13 October 2026

Card titles name the observed topic or alert. What we detected states the app’s recorded evidence, while What you should do next gives the merchant a concrete check; card titles use explicit bold text, while these two labels use medium weight. Only flagged comparisons appear in the review list. Missing-data explanations stay in the empty state and Data details, rather than permanent waiting cards. A rate difference, missing later activity, or rejected offer does not establish its cause. Expanded guidance distinguishes the app’s reason for flagging from the merchant’s test after a change.

### Contextual alert evidence — 13 October 2026

Overview has no separate Recorded findings section. Cards and Checkouts do not show an aggregate alert summary table. The Checkouts search and issue filters lead directly to the checkout list, without a Show alert summary control or the former price-availability explanatory line. Checkouts opened from an insight also begin at the search controls, without a matching-checkouts heading or Show all checkouts button; the existing Clear filters control removes the insight filter. Individual checkout details retain the complete timestamped timeline, alert categories, repetitions and completion evidence. Review-card details focus on why the issue was flagged, testing a change, settings links, and fix controls. No recorded data or detection rules are removed.

### Checkout details identity — 13 October 2026

The anonymous checkout modal is titled Checkout reference; matched orders use Order details. Its first content row shows the full anonymous reference (or an exactly matched order name and existing Shopify order link) beside a compact outcome badge. The former blue status banner is removed. Completion sources and genuine uncertainty remain as supporting text. The user-facing status filter and badges use Completed and Abandoned. Abandoned is the requested short label for checkouts without recorded completion; its details state that definition. Completion-source and uncertainty notes stay inside the details. Completion evidence and filter behavior remain unchanged. Anonymous references never produce guessed checkout preview links. The list retains shortened references for scanning.

Long modal references use standard word-break opportunities between 16-character chunks. This allows wrapping on phones without changing copied reference text or adding visual CSS.


### Checkout reference labels — 13 October 2026

The table header and unmatched-detail heading say Checkout reference. Search prompts accept a checkout reference or order number. A unique exact Shopify order match still displays its original order name and existing admin link; label changes never alter checkout identity.

### Overview order and checkout performance — 14 October 2026

User-approved order: the daily order chart beside one **Checkout performance** card, then Insights & recommendations, then Where checkouts drop off. Checkout performance merges completion (recorded, completed, abandoned) with abandoned value and average abandoned value; the separate Abandoned checkouts tiles are removed. When Shopify's abandoned-record count differs from observed abandoned checkouts, the card states the basis of the value rather than presenting one total. Opening an insight card whose checkouts are all unfinished sets the Abandoned status and selects the matching issue chip, so the card, chip and list show the same count. Each funnel segment states its share of started checkouts and its exclusions. Counts use thousands separators.
