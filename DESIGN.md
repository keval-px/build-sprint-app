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

Use `s-page` with `inlineSize="large"` inside that grid, sections for content groups, and stacks with the frontmatter spacing keywords. Page actions and notices use the official slots. Action cards group the heading, caution badge, and Show/Hide details control inside the section surface; a divider separates that header from metrics.

Use `s-query-container` and `s-grid` for responsive content. Observed metric groups use three equal columns above a container width of 600px and one below it; the evidence and coverage pair uses two equal columns above 700px and one below it. These are container rules, not global viewport breakpoints. Use official table components for event rows and their responsive presentation.

Only `body { margin: 0; }` and `[hidden] { display: none !important; }` remain in application CSS. Visibility is application state; all visual layout belongs to the components.

## Elevation & Depth

Official sections, buttons, badges, and banners supply their own surface treatment, shadows, and interaction feedback. Do not create a project shadow scale or recreate the former custom card elevation.

## Shapes

The official components determine corners, outlines, borders, and control silhouettes. Do not add a project radius scale, custom card outline, or native control styled to resemble Polaris.

## Components

### Buttons

Use `s-button` with `variant="primary"` for the main action and `variant="secondary"` for supporting actions. Shopify supplies hover, focus, active, loading, and disabled visuals. Navigation uses two buttons with `aria-pressed`; the selected view uses the primary variant.

### Chips

Use `s-badge` for short status labels. The action-header badge uses official caution tone and base color/size. These indicate investigation status; they are not reward badges.

### Cards / Containers

Use `s-section` for the complete action card. Compose its heading, badge, and details button inside its content with official stacks and a responsive grid; separate the metrics with an official divider. Other sections may use their documented heading, subheading, and action slots. Keep affected counts visible. Show/Hide details reveals an `s-stack` containing explanations and actions; expose its state with `aria-expanded` and `aria-controls`. This preserves expandable evidence semantics using official controls.

### Inputs / Fields

Use `s-checkbox` for investigation steps and its official label, checked, and disabled properties. Loading and saving disable the controls. No calculator or order-value field is currently rendered. Any future approved field must use the matching official component.

### Navigation

Use `s-stack` with navigation accessibility properties around the view buttons. Evidence buttons open the filtered drill-down; the clear-filter button returns to all checkouts. Focus follows deliberate navigation and checklist actions.

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
