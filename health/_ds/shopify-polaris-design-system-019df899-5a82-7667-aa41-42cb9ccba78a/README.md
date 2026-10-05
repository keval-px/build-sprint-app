# Shopify Polaris Design System

Polaris is the design system that powers the Shopify Admin — the merchant-facing dashboard where over 4 million merchants manage their stores. It is purpose-built for **commerce dashboards**: dense data tables, complex forms, multi-step product flows, and the kind of "mission control" UI a merchant lives in for hours a day.

> "The Shopify admin is a tool for work… we balance moments of joy with our increased focus on efficiency, by optimizing the UI to the type of work merchants do." — Shopify Design

## ⚡ Current direction: Polaris web components

As of the **2025-10 release, Polaris ships as framework-agnostic web components** — custom `<s-*>` elements (`<s-page>`, `<s-section>`, `<s-button>`, `<s-text-field>`, …) that work in any framework and render natively across every Shopify surface (App Home, admin UI extensions, checkout extensions). **Polaris React (`@shopify/polaris`) is now deprecated.**

In a real app they load with one script tag and inherit the merchant's branding:

```html
<head>
  <meta name="shopify-api-key" content="%SHOPIFY_API_KEY%" />
  <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
</head>
```

That CDN bundle only renders **inside the Shopify admin**. So this project ships an **offline re-implementation** of the `s-*` elements — `polaris-web-components.js` + `polaris-web-components-forms.js` — styled with the tokens in `colors_and_type.css`, so you can author mocks in the real tag syntax and preview them anywhere. **Build new work with the web components** (`ui_kits/web-components/`); the React-style kits (`ui_kits/admin/`, `ui_kits/forms/`) remain as a visual reference for the same design language.

## Sources

This system was reconstructed from the public Polaris references below. We do not assume the reader has access — recordings of the source material live in this folder.

- **Polaris web components** — https://shopify.dev/docs/api/app-home/web-components (the current `s-*` library) and https://shopify.dev/docs/api/polaris/using-polaris-web-components (usage)
- **Polaris React docs (deprecated)** — https://polaris-react.shopify.com (legacy reference for tokens, components, content)
- **polaris-tokens** — https://github.com/Shopify/polaris-tokens (the npm package `@shopify/polaris-tokens` shipping every CSS variable)
- **polaris-icons** — https://github.com/Shopify/polaris-icons (the official 16/20px icon library, MIT-licensed)
- **Inter font** — https://rsms.me/inter (the open-source variable font used across Admin)
- **Uplifting Shopify Polaris** — https://medium.com/shopify-ux/uplifting-shopify-polaris-7c54fc6564d9 (the rationale behind the v11 visual refresh)

The **products** represented:

1. **Shopify Admin** — the merchant dashboard (the primary product Polaris exists to dress)
2. **App Home / extension surfaces** — built with the new `s-*` web components
3. **Polaris docs site** (polaris-react.shopify.com) — the reference surface where designers and developers learn the system

---

## Index

| File | What it contains |
| --- | --- |
| `colors_and_type.css` | All design tokens as CSS custom properties — colors, type scale, spacing, shadows, borders, motion |
| `fonts/` | Inter variable font (regular + italic) self-hosted |
| `assets/` | Logos, brand marks, and the Polaris icon set (subset) |
| `preview/` | Small HTML cards that populate the Design System review tab |
| `polaris-web-components.js` | **Offline `s-*` web component library** — layout, type, actions, feedback, media, modal |
| `polaris-web-components-forms.js` | **Offline `s-*` form fields** — text/email/number/money/password/search/url, select, checkbox, switch, choice-list, color, date, drop-zone |
| `ui_kits/web-components/` | **Primary UI kit** — App Home dashboard, product form, and component gallery authored in real `<s-*>` syntax |
| `ui_kits/admin/` | (Reference) React-style kit recreating Shopify Admin screens — Home, Orders, Product detail |
| `ui_kits/forms/` | (Reference) React-style kit of every form input pattern |
| `ui_kits/polaris-docs/` | (Reference) kit recreating the polaris-react.shopify.com docs site |
| `SKILL.md` | Agent-skill manifest so this folder doubles as a portable Claude Code skill |

---

## Content fundamentals

Polaris content has a precise voice: **clear, direct, and helpful — never cute.** Merchants are running real businesses, and the copy treats them like operators, not customers being marketed to.

### Tone

- **Professional but conversational.** Plain language wins over jargon. Contractions are fine ("you're", "don't").
- **Confident, not bossy.** "Add a product" — not "Please add a product" or "You should add a product".
- **Helpful, never patronizing.** When something fails, say what failed and what to do, not "Oops!".
- **Action-first.** Buttons and headings start with verbs: *Add product, View report, Continue, Review and pay*.

### Casing

- **Sentence case for everything.** Buttons, headings, page titles, table column headers — all sentence case. *"Order details"*, never *"Order Details"*.
- The only Title-Cased words are proper nouns (*Shopify*, *Polaris*, *Hydrogen*) and product names (*Shop Pay*, *Shopify Markets*).

### Pronouns

- **Address the merchant as "you".** "You haven't added any products yet."
- **Refer to Shopify as "Shopify"** in app voice, not "we" — keeps the system feeling like infrastructure rather than a personality. ("Shopify will email you when…")
- **Customers of the merchant are "customers"** — never "users".

### Numbers, dates, currency

- **Tabular figures everywhere** numbers line up vertically (orders, totals, inventory). Inter's `tnum` feature is on.
- **Currency includes the symbol and ISO code in ambiguous contexts**: `$24.50 USD`.
- **Dates are written out**: *Mar 14, 2026*, *Today at 2:45 pm*. Avoid `03/14/26`.

### Emoji & exclamation marks

- **No emoji in product UI.** Polaris uses real iconography. Marketing surfaces (the docs site, blog) occasionally use one, but the admin itself does not.
- **No exclamation marks** except in genuinely celebratory empty states ("Your first order!"). Never on errors, warnings, or success toasts.

### Real examples (from the Admin)

- Empty state heading: **"Add your products"** — Subhead: *"Start by stocking your store with products your customers will love."*
- Destructive confirm: **"Delete product?"** — Body: *"This can't be undone. The product will be removed from your store and all sales channels."* — Buttons: *Cancel · Delete*
- Toast (success): **"Product added"** — not "Successfully added!" or "Great work!"
- Banner (warning): **"Your card on file is expiring"** — Body: *"Update your billing details by Mar 31 to avoid service interruption."*
- Form error: **"Enter a valid email address"** — never "Oops, that's not a valid email!"

### The vibe

Reliable. Like a well-organized desk. Polaris content reads like a competent coworker giving you straight information — never a cheerful chatbot.

---

## Visual foundations

### Color

Polaris colors are organized in **two layers**:

1. **Palette tokens** (private) — `gray-50` through `gray-900` for each hue (gray, blue, green, yellow, red, purple, magic). Internal vocabulary; never used directly.
2. **Semantic tokens** (public) — `--p-color-{element}-{role}-{state}`. *Element* is `bg`, `bg-surface`, `bg-fill`, `text`, `border`, `icon`. *Role* is `brand`, `info`, `success`, `caution`, `warning`, `critical`, `emphasis`, `magic`, `inverse`. *State* is `hover`, `active`, `selected`, `disabled`.

Key surface colors:
- **Page background** — `#F1F1F1` (cool light gray, NOT pure white)
- **Card surface** — `#FFFFFF`
- **Brand fill** (primary buttons) — `#303030` graphite + `--p-color-button-gradient-bg-fill` (a barely-there bottom-edge sheen baked into the token set)
- **Text default** — `#303030`
- **Text secondary** — `#616161`
- **Border default** — `#E3E3E3` (dividers use `border-secondary` `#EBEBEB`)
- **Surface hover** — `#F7F7F7` · **Surface selected** — `#F1F1F1`

Status hues:
- **Info** — `#0094D5` (blue) | bg `#EAF4FF`
- **Success** — `#047B5D` (green) | bg `#CDFED4`
- **Caution** — `#FFE600` (yellow) | bg `#FFF8DB`
- **Warning** — `#FFB800` (orange-yellow) | bg `#FFF1E3`
- **Critical** — `#C70A24` (red) | bg `#FEE8EB`
- **Magic** (AI) — `#8051FF` (purple) | bg `#F8F7FF`
- **Emphasis** (focus/editor) — `#005BD3` (Shopify blue) | bg `#F0F2FF`

> **Note on the "Shopify green":** the brand mark is still green (`#008060`), but the v11 admin moved the **primary button** to graphite black for better contrast on the light gray page background. Green now lives in *success* and the logo only.

### Typography

- **Font family** — **Inter** (variable, designed for screens, with `cv11` and `tnum` OpenType features enabled). System fallback `-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, sans-serif`.
- **Mono** — `ui-monospace, SFMono-Regular, "SF Mono", Consolas, Menlo, monospace`. Used for code only.
- **Scale** — the official `--p-text-*` composites (size/line-height in px):
  - `headingXs` 12/16 · `headingSm` 13/20 · `headingMd` 14/20 · `headingLg` 20/24 · `headingXl` 24/32 · `heading2xl` 30/40 · `heading3xl` 36/48
  - `bodyXs` 11/12 · `bodySm` 12/16 · `bodyMd` **13/20 (the default)** · `bodyLg` 14/20
- **Weights** — Inter variable axis values: regular **450**, medium **550**, semibold **650**, bold **700**. Headings sm–lg are semibold (650); xl and up are bold (700). Buttons and badges are medium (550).
- **Letter spacing** — px tokens: dense `-0.2px` (lg/xl headings), denser `-0.3px` (2xl), densest `-0.54px` (3xl), normal `0`.
- **Line heights** are pinned per variant; no `1.5` blanket.
- **Numbers** use tabular figures (`font-feature-settings: 'tnum'`) so columns align.

### Spacing

A **4px base unit** with tokens named by 100-multiplier increments:

`space-025` 1px · `space-050` 2px · `space-100` 4px · `space-150` 6px · `space-200` 8px · `space-300` 12px · `space-400` 16px · `space-500` 20px · `space-600` 24px · `space-800` 32px · `space-1000` 40px · `space-1200` 48px · `space-1600` 64px · `space-2000` 80px · `space-2400` 96px · `space-2800` 112px · `space-3200` 128px

Semantic aliases: `space-card-padding` 16px · `space-card-gap` 16px · `space-button-group-gap` 8px · `space-table-cell-padding` 6px.

### Borders & radius

- **Border width** — `1px` (`border-width-025`) for 99% of cases. Inputs use the hairline `border-width-0165` (0.66px). Hairline borders, never heavy.
- **Border radius** — Polaris is **moderately rounded**, NOT pill-shaped:
  - `radius-100` 4px (checkboxes, tiny chips)
  - `radius-200` 8px (buttons, inputs, badges, nav items)
  - `radius-300` 12px (cards) — most common
  - `radius-400` 16px (modals)
  - `radius-500` 20px · `radius-750` 30px (rare, large surfaces)
  - `radius-full` (avatar, icon-only chips)

### Shadows & elevation

Polaris shadows are **soft, low, and tinted** — never hard black drops. Cards rest on the page with `shadow-100` plus the **bevel inset ring** (`shadow-bevel-100`) — v13 cards have **no 1px border**; the inset shadow draws the edge.

- `shadow-100` — `0 1px 0 rgba(26,26,26,0.07)` (resting cards)
- `shadow-200` — `0 3px 1px -1px rgba(26,26,26,0.07)` (banners, raised cards)
- `shadow-300` — `0 4px 6px -2px rgba(26,26,26,0.20)` (popovers, menus)
- `shadow-400` — `0 8px 16px -4px rgba(26,26,26,0.22)` · `shadow-500` — `0 12px 20px -8px rgba(26,26,26,0.24)` · `shadow-600` — `0 20px 20px -8px rgba(26,26,26,0.28)` (modals)
- `shadow-bevel-100` — four inset hairlines (`rgba(0,0,0,0.13)` sides, `rgba(0,0,0,0.17)` bottom, `rgba(204,204,204,0.5)` top) that give every card its crisp edge
- `shadow-button` — inset ring + white top highlight: the **secondary button** chrome (buttons have no CSS border)
- `shadow-button-primary` — `0 -1px 0 1px rgba(0,0,0,0.8) inset, 0 0 0 1px #303030 inset, 0 0.5px 0 1.5px rgba(255,255,255,0.25) inset` — the **signature pressable bevel** on primary buttons; `shadow-button-primary-inset` is the pressed state. Critical and success primaries have their own `shadow-button-primary-critical/success` sets.

### Motion

- **Duration** — a 0–500ms scale in 50ms steps (`duration-0` … `duration-500`), plus `duration-5000` for loaders. 100ms for taps/buttons · 150ms for hovers · 200ms popovers · 300ms modals/nav.
- **Easing** — `ease` `cubic-bezier(0.25, 0.1, 0.25, 1)` is the workhorse. `ease-out` is `cubic-bezier(0.19, 0.91, 0.38, 1)` for entries; `ease-in` `cubic-bezier(0.42, 0, 1, 1)` for exits; plus `ease-in-out` and `linear`.
- **Keyframes ship as tokens** — `--p-motion-keyframes-{bounce,fade-in,pulse,spin,appear-above,appear-below}` with their `@keyframes` blocks in the token stylesheet.
- **No bounces.** Polaris does not use spring physics or overshoot easing on UI surfaces. Movement is small, fast, and confident.
- **Fades and short slides only.** Popovers use `appear-above/below` (4px translate + fade). No 3D, no rotates, no scale-pulse.

### Hover, press, focus, disabled

- **Hover** — backgrounds shift to a slightly darker neutral (e.g. `bg-fill` `#FFFFFF` → `#FAFAFA`, `bg-surface` → `#F7F7F7`). Text stays. No elevation jump.
- **Active (pressed)** — backgrounds shift one more step darker; buttons swap to their `*-inset` shadow token. **No transform/scale** (primary buttons nudge their label 1px down).
- **Focus** — a 2px **outline** in `--p-color-border-focus` (`#005BD3`) with `outline-offset: 1px` (`border-width-050` + `space-025`). Always visible for keyboard users. Polaris v13 uses outlines, not box-shadow rings.
- **Disabled** — `opacity` is NOT used. Instead a dedicated `*-disabled` token (e.g. `bg-fill-disabled` `rgba(0,0,0,0.05)`) is applied, and text drops to `#B5B5B5`.

### Layout & structure

- **Page max-width** — **998px** (`primary-max` 662 + `secondary-max` 320 + 16 gutter), with 24px side padding. The Admin frame: **56px top bar** (`#1A1A1A`, inverse) + fixed **240px nav rail** (`#EBEBEB`) + fluid main column on `#F1F1F1`.
- **Card grid** — content is organized into **white cards** with 12px radius, `shadow-100` + the `shadow-bevel-100` inset edge (no 1px border). Cards almost always have a 13px/650 heading at top and 16px padding.
- **Density** — 13px body, 28px nav rows and buttons, 6px table cell padding (12px at row edges). The admin is data-dense by design.
- **Contextual save bar** — unsaved-changes actions appear in a dark bar that **replaces the top bar** (56px, `#1A1A1A`, white primary button), not a bottom sticky bar.

### Backgrounds, imagery, transparency

- **Backgrounds are flat.** No gradients on page or card surfaces. Period.
- **Imagery is rare** in product UI; when used (empty states, onboarding, gift card hero), it's **clean line illustrations** with a limited palette pulling from the brand greens, plus selective spot color. Never photos in product chrome.
- **No background patterns or textures.**
- **Transparency** is reserved for `transparent` token usages (tabs, ghost buttons sitting on changing surfaces) and for the **modal backdrop** (`rgba(0,0,0,0.71)`).
- **Backdrop blur** is used sparingly — only on the global search command palette (`backdrop-filter: blur(8px)`).

### Brand vibe

Modern, trustworthy, slightly sober. The visual mood is **black graphite + cool light gray + white cards**, with status colors used like jewelry — small, precise, only when they earn their keep. No glow, no gradients, no purple-to-blue hero washes. The design says *"this is your business — let's get to work."*

---

## Iconography

Polaris ships its own icon library: **[polaris-icons](https://github.com/Shopify/polaris-icons)**, MIT-licensed. ~480 icons total.

- **Format** — SVG (no icon font). Each icon ships at a **single 20×20 viewBox** in the current shipping version. (Older versions also had a 16×16 "minor" variant.)
- **Style** — outlined at **1.5px stroke**, mostly. Filled variants exist for navigation states (selected sidebar items, status indicators).
- **Color** — drawn in `currentColor`. Recolor by setting CSS `color`. The token to use is `--p-color-icon` (`#4A4A4A`) for default, `--p-color-icon-secondary` (`#8A8A8A`) for muted.
- **No icon font.** SVG components only. In React: `<Icon source={ProductIcon} />`.
- **No emoji** in product UI. The docs site occasionally uses one in a marketing context but the admin never does.
- **No unicode glyphs as icons.** A `+` add affordance is the `PlusIcon`, never the character.

This project ships a **subset of polaris-icons** in `assets/icons/` covering the icons most likely to appear in mocks: navigation, common actions, statuses, and arrows. If a needed icon is missing, copy it from the polaris-icons repo verbatim — never redraw.

---

## Polaris web components (`s-*`) — API reference

The current component model. Author mocks with these tags; load `polaris-web-components.js` then `polaris-web-components-forms.js` after `colors_and_type.css`. Every element is a real custom element with shadow-DOM chrome, so you write clean semantic markup and set **attributes**, not classes.

### Layout & structure
| Tag | Key attributes | Notes |
| --- | --- | --- |
| `s-page` | `heading`, `subtitle`, `fullWidth` | Page shell, centered 800px (1040 if `fullWidth`). Slot actions with `slot="primary-action"` / `slot="secondary-actions"`. |
| `s-section` | `heading` | **The card.** White surface, 12px radius, border, shadow. Slot a header action with `slot="actions"`. |
| `s-stack` | `direction="block\|inline"`, `gap`, `alignItems`, `justifyContent`, `wrap` | Flexbox. `block`=column (default), `inline`=row. |
| `s-grid` | `columns` (n) or `gridTemplateColumns`, `gap` | CSS grid. |
| `s-box` | `padding*`, `background`, `borderWidth`, `borderRadius`, `borderBlockEnd` | Spacing/border primitive — **not** a card. |
| `s-divider` | — | Hairline rule. |
| `s-unordered-list` / `s-ordered-list` | — | Wrap `<li>` children. |

### Typography
| Tag | Attributes |
| --- | --- |
| `s-heading` | `variant` (`headingSm/Md/Lg`) |
| `s-paragraph` | `tone` |
| `s-text` | `variant` (`bodySm/Md/Lg`, `heading*`), `tone` (`subdued/critical/success/info/caution`), `weight` (`semibold/bold`) |

### Actions
| Tag | Attributes |
| --- | --- |
| `s-button` | `variant` (`primary/secondary/tertiary/auto/plain`), `tone` (`critical`), `size` (`slim/large`), `icon`, `loading`, `disabled`, `href`, `fullWidth`, `command`+`commandFor` |
| `s-link` | `href`, `external`, `tone` |
| `s-button-group`, `s-clickable`, `s-chip` (`removable`) | — |

### Feedback
- `s-badge` — `tone` (`default/info/success/attention/warning/critical/magic`), `progress` (`incomplete/partiallyComplete/complete`)
- `s-banner` — `tone`, `heading`, `dismissible`
- `s-spinner` — `size`

### Media
- `s-icon` — `icon` (kebab name, e.g. `menu-horizontal`), `tone`, `size`
- `s-thumbnail` — `src`, `size`
- `s-avatar` — `initials` / `name` / `src`, `size`
- `s-image` — `src`, `borderRadius`

### Forms — all emit standard `change`/`input` events; read `el.value` / `el.checked`
| Tag | Notes |
| --- | --- |
| `s-text-field` | `label`, `value`, `placeholder`, `helpText`, `error`, `required`, `disabled`, `prefix`, `suffix`, `icon`, `multiline` |
| `s-email-field` / `s-url-field` / `s-search-field` / `s-password-field` | Typed text fields (search has a leading icon, password a show/hide toggle) |
| `s-text-area` | Multi-line |
| `s-number-field` | Stepper buttons; `suffix`, `step` |
| `s-money-field` | `$` prefix + `USD` suffix |
| `s-select` | Wrap native `<option>` children |
| `s-checkbox` | `label`, `checked`, `indeterminate`, `details`, `disabled` |
| `s-switch` | `label`, `details`, `checked` — instant on/off |
| `s-choice-list` + `s-choice` | `multiple` toggles radio↔checkbox; `s-choice` takes `label`, `details`, `selected` |
| `s-color-field` | Swatch + hex |
| `s-date-field` | Read-only field + calendar icon |
| `s-drop-zone` | File upload area |

### Overlays
- `s-modal` — `heading`, `id`. Open with `<s-button command="--show" commandFor="modal-id">`, close with `command="--hide"` or `modalEl.hideOverlay()`. Slot footer buttons with `slot="footer"`.

### Spacing keywords (gap / padding)
`none · extraSmall (4) · small (8) · base (12) · medium (16) · large (20) · extraLarge (24)` — pass keywords, not px.

> **Fidelity note:** the real `polaris.js` forbids CSS overrides (components inherit merchant branding). This offline build approximates Shopify's default branding from the Polaris tokens; it's for **design mocks**, not production. For production, load the official CDN bundle.
