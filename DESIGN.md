---
name: Hustad Residential Tablet Platform
description: Dark-mode field inspection and homeowner presentation app for residential storm damage assessment
colors:
  void-dark: "#06090F"
  navy-surface: "#0d1525"
  navy-elevated: "#141f33"
  navy-subtle: "#0a1020"
  navy-border: "#1e3050"
  navy-deep: "#0f1d35"
  navy-mid: "#1a2d4f"
  blue-core: "#1e4d8c"
  blue-action: "#2563ba"
  sky-highlight: "#4a8fd4"
  teal-action: "#2a8a82"
  teal-light: "#3aada3"
  amber-signal: "#c8923a"
  amber-warm: "#e0a94a"
  red-danger: "#c0392b"
  green-success: "#27774a"
  ink-primary: "#E8EDF8"
  ink-body: "#F3F4F6"
  ink-secondary: "#8BA5C5"
  ink-muted: "#567090"
  ink-faint: "#2D4060"
  cream-light: "#f5f0e8"
typography:
  display:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'DM Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  chip: "8px"
  input: "12px"
  card: "16px"
  section: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.navy-deep}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.navy-mid}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-teal:
    backgroundColor: "{colors.teal-action}"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-amber:
    backgroundColor: "{colors.amber-signal}"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.blue-action}"
    rounded: "{rounded.card}"
    padding: "12px 24px"
  card-surface:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.card}"
    padding: "20px"
  card-navy:
    backgroundColor: "{colors.navy-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "20px"
  card-subtle:
    backgroundColor: "{colors.navy-subtle}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.card}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  input-field-focus:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
---

# Design System: Hustad Residential Tablet Platform

## 1. Overview

**Creative North Star: "The Field Intelligence Dossier"**

The Hustad Tablet Platform is a professional instrument, not a consumer app. It is a dark, precise, high-craft surface designed for field reps presenting documented storm damage findings to homeowners on an iPad Air in portrait orientation. The interface projects expert authority — the kind of tool that earns trust on sight, before the rep has said a word.

The palette is built around near-void blacks and layered dark navy surfaces, with Playfair Display headings that carry editorial weight against the dark. Teal punctuates primary actions; amber signals attention states; sky-blue carries interactive highlights and focus rings. Glassmorphism appears as purposeful chrome — frosted backdrop over dark surfaces for screen footers and elevated panels — never as decoration or identity. Every screen is a composed portrait-orientation layout; the viewport is a fixed frame, not a responsive container.

This system explicitly rejects the startup dark-mode aesthetic (neon accents, violet primaries, gradient mesh wallpapers, animated particles), consumer insurance app friendliness (bright white, chatty rounded-sans), and generic enterprise field-service density (form-heavy grids, legacy chrome). It should feel like the screen version of a forensic assessment brief — precise, weighted, unapologetic.

**Key Characteristics:**
- Near-void background (#06090F) with three distinct dark navy depth levels
- Playfair Display for screen titles and presentation headings; DM Sans for all functional UI text; Inter for data-dense CRM and pipeline surfaces
- Glassmorphism is a purposeful architectural element for footer chrome and modals, not a decorative motif — see The Glass Protocol below
- Teal (#2a8a82) as primary action accent; amber (#c8923a) as attention and signature-state signal
- Fixed iPad Air portrait viewport — no fluid typography scale, no responsive breakpoints in the core flow

## 2. Colors: The Deep Field Palette

A four-layer dark depth stack, two accent poles, and a ruled text hierarchy.

### Primary (Dark Surfaces — canonical for field use)

- **Void Dark** (#06090F): Page background. The floor of the system. Nothing goes darker.
- **Navy Surface** (#0d1525): Card and panel background. Primary content surface.
- **Navy Elevated** (#141f33): Modal and popover backgrounds. One layer above surface.
- **Navy Subtle** (#0a1020): Inset zones, muted well backgrounds. Slightly below surface.
- **Navy Border** (#1e3050): Hairline dividers, card borders. The only visible stroke between surfaces.

### Secondary (Brand Navy — structural)

- **Navy Deep** (#0f1d35): Primary button fill, nav bar, brand identity surfaces. The saturated brand color.
- **Navy Mid** (#1a2d4f): Hover state for navy-deep surfaces; sidebar tone.

### Tertiary (Action Accents)

- **Blue Core** (#1e4d8c): Secondary action color; interactive state indicators.
- **Blue Action** (#2563ba): Focus rings, input borders on focus, link color. The primary interactive highlight.
- **Sky Highlight** (#4a8fd4): Progress bars, active indicators, secondary highlights.
- **Teal Action** (#2a8a82): Primary CTA — used for the most important next-step actions on any screen.
- **Teal Light** (#3aada3): Teal hover state.
- **Amber Signal** (#c8923a): Signature prompts, attention states, completion moments. Warm counterpoint to the blue axis.
- **Amber Warm** (#e0a94a): Amber hover state.

### Neutral (Text Hierarchy — dark mode)

- **Ink Primary** (#E8EDF8): Screen titles, primary labels, headline text.
- **Ink Body** (#F3F4F6): Body copy, descriptions, main content text.
- **Ink Secondary** (#8BA5C5): Timestamps, metadata, secondary labels.
- **Ink Muted** (#567090): Placeholder text, tertiary labels, disabled text.
- **Ink Faint** (#2D4060): Very subtle — disabled states, ghost text.

### Named Rules

**The One Surface Rule.** The four dark navy surface colors (void, surface, elevated, subtle) are the only background fills for standard screens. Do not introduce custom background colors on cards or sections — use the four-level system.

**The Two-Accent Rule.** Teal carries primary forward actions; amber carries signature moments and attention states. Blue-action carries focus/interaction affordance. Nothing else carries accent color. No gradients between them.

**The Contrast Floor.** Body text (ink-body on navy-surface) must sustain ≥4.5:1 contrast ratio. The combination of #F3F4F6 on #0d1525 reads at approximately 12:1 — this is the floor, not the ceiling. Never use ink-muted (#567090) for body text on any dark surface.

## 3. Typography: Display Serif + Functional Sans

**Display Font:** Playfair Display (400/500/600/700), Georgia fallback, serif
**Body Font:** DM Sans (300/400/500/600), system-ui fallback, sans-serif
**Data Font:** Inter (300/400/500/600), SF Pro Display fallback — used exclusively on CRM and pipeline data surfaces (RepCommandCenter, PipelineLeads, CenterPointJobs)
**Mono Font:** DM Mono (400/500), monospace — phase badges, status chips, code references

**Character:** Playfair Display against a dark background has natural editorial authority — the kind of typography that makes findings feel documented, not improvised. DM Sans is geometric and precise without being cold. The pairing works because one is demonstrably different from the other: serif display for presence and trust, geometric sans for precision and legibility.

### Hierarchy

- **Display** (Playfair Display, 600, clamp(1.5rem–2rem), line-height 1.15, -0.01em letter-spacing): Screen titles. One per screen, top of the content area. This is the rep's first visual anchor on each step.
- **Headline** (Playfair Display, 500, 1.25rem, line-height 1.25): Section headings within a screen. Used sparingly — prefer no heading if the screen has a single purpose.
- **Body** (DM Sans, 400, 1rem/16px, line-height 1.5): All descriptive copy, descriptions, compliance text. Keep to 65–75ch on prose screens.
- **Label** (DM Sans, 500, 0.875rem/14px, line-height 1.4, 0.01em tracking): Form labels, list item labels, button text. Sentence case only — never full caps on labels.
- **Mono** (DM Mono, 400, 0.875rem/14px, line-height 1.4): Phase badges (PHASE A / PHASE B), status codes, reference IDs.

### Named Rules

**The Serif-Only-for-Display Rule.** Playfair Display is for screen titles and section headings only. Buttons, labels, status chips, form fields, and table data use DM Sans. Mixing serif into functional UI elements breaks affordance legibility.

**The Inter-Only-for-Data Rule.** On CRM, pipeline, and financial data surfaces (RepCommandCenter, PipelineLeads, CenterPointJobs), use Inter with tabular figures (`font-feature-settings: "ss01" 1, "tnum" 1`). Playfair Display does not appear on data-dense screens.

**The Fixed-Scale Rule.** All typography uses fixed rem values, not fluid clamp(). The exception is `.screen-title`, which uses `clamp(1.5rem, 4vw, 2rem)` to adapt within the iPad viewport. No other type element uses clamp — the viewport is fixed and controlled.

## 4. Elevation

This system uses **purposeful tonal layering** as primary depth communication, with shadows as secondary structural support. The depth stack is expressed through the four surface colors, not through shadow contrast. Shadows appear only as state response (hover reveal, modal lift) — never as default card decoration.

The one exception is **glassmorphism chrome** on the screen footer and elevated panels. This is an architectural pattern, not a motif. It appears in exactly two contexts: the persistent screen footer (`backdrop-blur-sm`, `color-mix(in srgb, var(--bg-surface) 80%, transparent)`) and modal overlays. The blur signal communicates permanence (the footer is always there) and overlay depth (the modal is above the page). It is forbidden in content cards, section backgrounds, or any element that scrolls with content.

### Shadow Vocabulary

- **Card ambient** (`0 2px 16px rgba(15,29,53,0.10), 0 1px 3px rgba(15,29,53,0.06)`): Default card shadow. Subtle lift. Used with the 1px navy-border, never instead of it.
- **Card hover** (`0 8px 32px rgba(15,29,53,0.16), 0 2px 8px rgba(15,29,53,0.10)`): Applied on interactive card hover. Communicates selectability.
- **Elevated** (`0 20px 60px rgba(15,29,53,0.20), 0 4px 16px rgba(15,29,53,0.10)`): Modals and popovers. Structural lift, not ambient.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(74,143,212,0.15)`): Input and interactive element focus. Sky-blue at low opacity — visible without being loud.

### Named Rules

**The Glass Protocol.** Glassmorphism is permitted in exactly two places: (1) the persistent screen footer (`screen-footer` class: backdrop-blur-sm + 80% surface opacity + 1px border), and (2) elevated modal backdrops. Everywhere else it is forbidden. Cards, list items, section wrappers, and nav elements are solid surfaces from the depth stack — never blurred or translucent.

**The Flat-By-Default Rule.** Cards at rest carry a 1px navy-border and the card-ambient shadow. No additional decoration. Hover state adds the card-hover shadow. Do not pair a wide shadow (blur ≥16px) with a solid border on the same element at rest — that is the ghost-card pattern and it reads as design indecision.

## 5. Components

### Buttons

Tactile and confident. Full-width within screen containers; icon-assisted where clarity helps.

- **Shape:** Gently rounded (16px). Not pill-shaped — buttons are actions, not tags.
- **Primary (navy-deep):** `background: #0f1d35`, `color: #E8EDF8`, `padding: 16px 24px`, `border-radius: 16px`. Hover: `background: #1a2d4f`. Active: `transform: scale(0.98)`. Used for the main forward action on each screen.
- **Teal (primary CTA on data-entry screens):** `background: #2a8a82`, `color: #ffffff`. Same shape and padding. Used where the action is a submission or commitment, not just progression.
- **Amber (signature/completion moments):** `background: #c8923a`, `color: #ffffff`. Reserved for signature and agreement completion — signals the weight of the action.
- **Secondary (outline):** Transparent background, 1px solid `#1e3050` border, ink-primary text. Used for "Back" and secondary navigation.
- **Ghost (inline navigation):** Transparent, blue-action text color. For tertiary actions, help links, "Skip" type affordances.
- **States:** All buttons have `transition: all 150ms`. Active state adds `transform: scale(0.98)`. Focus: 3px sky-blue ring. Disabled: opacity 0.4, no cursor change needed (touch context).

### Cards and Containers

- **Card Surface:** `background: #0d1525`, `border: 1px solid #1e3050`, `border-radius: 16px`, `padding: 20px`, card-ambient shadow. The default content card.
- **Card Navy:** `background: #0f1d35`, no border, `border-radius: 16px`, white text. For featured or brand-heavy moments (job summary, homeowner name display).
- **Card Subtle:** `background: #0a1020` (navy-subtle), no shadow, `border-radius: 16px`. For inset/muted zones — compliance notes, secondary information.
- **No nested cards.** A card inside a card is always wrong.

### Inputs and Fields

Precise and legible. The form is documentation — it should feel authoritative.

- **Style:** `background: #0d1525` (navy-surface), `border: 1px solid #1e3050`, `border-radius: 12px`, `padding: 12px 16px`, `color: #E8EDF8`, DM Sans 1rem.
- **Focus:** Border shifts to `#2563ba` (blue-action). Shadow adds `0 0 0 3px rgba(74,143,212,0.15)`. No color change on the background.
- **Placeholder:** Ink-muted (#567090). This color must maintain ≥4.5:1 on navy-surface — it does (#567090 on #0d1525 ≈ 5.2:1). Never use ink-faint for placeholders.
- **Error:** Border shifts to red-danger (#c0392b). Error message in red-danger below the field, DM Sans 0.875rem.
- **Disabled:** Opacity 0.5. No style change beyond that.

### Screen Footer (Glass Chrome)

The persistent navigation and action bar at the bottom of every screen.

- **Structure:** Fixed at bottom, `flex-shrink-0`, `padding: 20px 32px`.
- **Background:** `color-mix(in srgb, #0d1525 80%, transparent)` — 80% navy-surface opacity.
- **Blur:** `backdrop-filter: blur(4px)` (Tailwind `backdrop-blur-sm`).
- **Border:** 1px solid #1e3050 at the top edge only.
- **This is the only element in the system that uses backdrop-filter.** Do not extend blur to any other component.

### Navigation and Screen Router

- Screen progression is linear (P00 → A01 → ... → B19). No persistent sidebar. No tab bar.
- Progress is communicated via `progress-bar` (1px track, fills with blue-action) and phase badge (DM Mono, uppercase, `PHASE A` / `PHASE B`).
- The back action lives in the footer as a secondary button. Never as a top-left chevron.

### Phase Badge and Status Chips

- **Phase badge:** `border-radius: 9999px`, DM Mono, 10-11px, uppercase, wide tracking (0.03em). Background tinted to phase (navy-mid for phase A, teal-tinted for phase B).
- **Outcome badge:** Same pill shape. Color-coded: green-success bg/fg for pass, red-danger for fail, amber for pending.
- **Stripi chips** (RepCommandCenter): Inter, 0.75rem, inline-flex with colored dot indicator. Used only on the dashboard surface.

## 6. Do's and Don'ts

### Do:
- **Do** use Playfair Display for screen titles and section headings only. The display serif earns its presence through scarcity.
- **Do** use the four-layer dark surface system (void/surface/elevated/subtle) for all backgrounds. Never introduce custom background fills outside this stack.
- **Do** keep teal for forward-commitment actions and amber for signature/completion moments. Use blue-action for interactive state and focus only.
- **Do** use the glass chrome pattern (backdrop-blur-sm + 80% surface opacity) exclusively on the screen footer and modal overlays.
- **Do** maintain ≥44px tap targets on every interactive element — this is a touch-first interface with no hover fallback.
- **Do** use Inter with tabular figures on RepCommandCenter, PipelineLeads, and CenterPointJobs. Data surfaces have their own typographic register.
- **Do** add `transition: all 150ms` and `active:scale-[0.98]` on all button elements — tactile feedback is the primary interaction signal on touch.
- **Do** write screen titles in Playfair Display with `text-wrap: balance` for even line breaks on the fixed viewport.

### Don't:
- **Don't** use glassmorphism on cards, list items, section containers, or any scrolling content element. The Glass Protocol permits it only on the screen footer and modal overlays.
- **Don't** pair a `border: 1px solid` with a wide `box-shadow` (blur ≥16px) on the same element at rest. Pick one: the border, or the shadow, not both as decoration.
- **Don't** use violet, purple, or neon accent colors. The Hustad palette is navy, teal, and amber — those three and nothing else for brand surfaces.
- **Don't** use gradient text (`background-clip: text`). Emphasis is through weight and size contrast, not gradients.
- **Don't** use Playfair Display in buttons, labels, status chips, table cells, or form controls. Serif in functional UI breaks affordance legibility.
- **Don't** add fluid `clamp()` typography beyond `.screen-title`. All other type uses fixed rem values — the viewport is fixed and controlled.
- **Don't** use `border-left` greater than 1px as a colored side accent on cards or callouts. Use full borders, background tints, or leading icons instead.
- **Don't** make the interface look like a startup AI tool — no gradient mesh backgrounds, no particle effects, no animated glow rings, no "ambient" spotlight animations on standard screens.
- **Don't** use generic enterprise mobile patterns (large icon-grid touch targets, white-background card grids, top-left hamburger nav). This is a bespoke professional instrument, not a field service app template.
- **Don't** introduce colors outside the defined palette for new screens. The palette is intentionally narrow — its constraint is what makes it read as a coherent system.
