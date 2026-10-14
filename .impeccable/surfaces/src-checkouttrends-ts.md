---
version: 1
slug: "src-checkouttrends-ts"
primary_target: "src/checkoutTrends.ts"
related_targets: ["src/main.ts","index.html"]
---

# Insights and recommendations

Scope: Overview insights and recommendation cards only. Mode: Operate. Preserve the existing Shopify component system, evidence rules, data sources, filtering, and fix tracking.

## Direction contract

THESIS: Give merchants one list of signals that need attention. Show qualifying comparisons alongside actionable recommendations; omit stable and collecting comparisons from the main view.

OWN-WORLD: Existing Shopify App Home components, neutral surfaces, official typography and spacing, caution reserved for qualifying findings. No new visual CSS or assets.

STORY: Read what the app detected and what to check next, inspect the paired metrics, then expand practical fix guidance or open the affected checkouts and their full timelines. Unavailable prices and unverified causes remain explicit.

FIRST VIEWPORT: The section heading has an official magic icon and combined pending count. A short introduction leads directly to the review cards, with no repeated subheading. All cards use the same full-width layout: finding and next step beside paired metrics on desktop, stacked on phones. Critical alerts come first. Comparison help and date context stay with each flagged comparison. Cards keep practical fix guidance in Show details; individual alert evidence stays in each checkout’s full activity timeline. Comparison help is available directly from each comparison card’s footer. Overview has no standalone Recorded findings table. An empty list reports no flagged issues in recorded checkouts and any data limits.

FORM: Local extension of the existing dashboard; code-led. Seed: not applicable to a scoped section refresh. Signature interaction: compare at a glance, then drill into the exact affected checkouts.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
