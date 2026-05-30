---
target: src/components/screens/B12_B15.tsx
total_score: 24
p0_count: 0
p1_count: 4
timestamp: 2026-05-30T08-22-57Z
slug: src-components-screens-b12-b15-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Progress bar + path badge + "Selected" chip are solid; no loading state for async photos |
| 2 | Match System / Real World | 3 | Copy is genuinely excellent — homeowner language, credibility block, "What We Are Not Saying" is trust-building gold |
| 3 | User Control and Freedom | 2 | Back always present; unlock requires full screen jump rather than inline; no keyboard dismiss on modals |
| 4 | Consistency and Standards | 2 | B12/B13 glass system is completely different from the Tailwind `.card`/`.btn-primary` system; B15 has its own third visual language |
| 5 | Error Prevention | 2 | B15 CTA disabled until choice is made — good; no confirmation before urgent protection authorization |
| 6 | Recognition Rather Than Recall | 3 | Path selection cards show both radio + "Tap to select" label; SemanticBadge always shows text alongside icon |
| 7 | Flexibility and Efficiency | 2 | Rep Companion is a genuine accelerator; no swipe gestures on photo lightbox |
| 8 | Aesthetic and Minimalist Design | 2 | B12 has 8+ scrollable sections with eyebrows on each; 7-layer cinematic background; hero metric widgets; visual noise everywhere |
| 9 | Error Recovery | 2 | Photo empty state is handled; no error paths for async modal operations (recheck scheduling) |
| 10 | Help and Documentation | 3 | Rep Companion with scripted opening, guided questions, guardrail, and transition is exceptional — the best feature on these screens |
| **Total** | | **24/40** | **Acceptable — significant improvements needed before these screens earn full field trust** |

---

## Anti-Patterns Verdict

**Does this look AI-generated?** Yes — in three specific ways that are recoverable.

**LLM Assessment:** The content strategy is genuinely excellent and not slop. The three-path `PAGE_CONFIGS` system, the credibility block, the Rep Companion with scripted guardrails — these reflect real product thinking. The problem is the visual execution, which has defaulted to the exact startup-dark-mode aesthetic the anti-references explicitly reject. The seven-layer cinematic background (gradient mesh + purple ambient globs + film grain), the violet/purple accent throughout, the gradient CTA buttons, and the all-caps eyebrow above every single section are direct matches to the absolute-bans list. The content is excellent; the visual frame around it undercuts the "Field Intelligence Dossier" identity.

**Deterministic scan:** 1 finding — `transition: width` on the B13 progress bar fill (line 1965) causes layout thrash. Should be `transform: scaleX()`. Exit code 2.

**Visual overlays:** Browser visualization not available in this session. Fallback signal: source-code static analysis used.

---

## Overall Impression

The strongest homeowner-facing content in the entire 20-screen flow is trapped inside a visual system that reads as "SaaS dark dashboard made by Claude." The glass cards, the purple ambient globs, the gradient buttons — a homeowner standing in their driveway will subconsciously register this as a tech demo, not a professional instrument. Strip the cinematic decoration, apply the design system's actual card and button vocabulary, and these screens could be the best in the flow. The bones are excellent.

---

## What's Working

**1. The three-path content architecture.** `PAGE_CONFIGS` with path-specific headline, credibility lines, CTA label, and rep scripting for each of three outcomes is real UX design. The "no_action" path in particular — treating an honest no-finding as valuable documentation — is a differentiator that builds long-term rep credibility.

**2. The credibility block.** "What We Are Not Saying" with XCircle/CheckCircle logic is trust architecture, not decoration. It addresses homeowner objections before they're voiced. This belongs in a case study.

**3. The Rep Companion.** A FAB that opens a private coaching sheet — scripted opening comment, guided questions with note fields, guardrail, transition language — is exactly right for a field tool. The rep uses it without the homeowner seeing it. This is the screen's killer feature.

---

## Priority Issues

### [P1] Glassmorphism on every card — The Glass Protocol is broken

**What:** `DS.card` has `backdropFilter: "blur(20px)"` and is applied to every content card: property details, finding stats, weather block, "What This Means", credibility block, guided question cards. The glass card token in B12/B13 (`rgba(20,32,58,0.88)`, `blur(20px)`, `0 0 40px rgba(77,111,255,0.08)` glow) is completely separate from the project's design system card (`.card` = `#0d1525` surface + `1px #1e3050` border + `card-ambient` shadow).

**Why it matters:** Glass everywhere communicates nothing. The Glass Protocol permits it in two places: screen footer chrome (where the blur signals "this is permanently above the content") and modal overlays (where it signals "this is above the page"). On a content card, blur is pure decoration — and it's the most visible "AI made this" tell after purple. Every Hustad card should be a solid `#0d1525` surface with a hairline border.

**Fix:** Replace the `DS.card` inline object with the project's `.card` Tailwind class throughout B12 and B13. Remove `backdropFilter` and `WebkitBackdropFilter` from all content cards. Reserve `backdropFilter: blur(4px)` + 80% surface opacity for the footer bar only (which already uses `screen-footer` correctly). Drop `boxShadow: "0 0 40px rgba(77,111,255,0.08)"` — this is the glow-on-card anti-pattern.

**Suggested command:** `$impeccable polish src/components/screens/B12_B15.tsx`

---

### [P1] Violet/purple palette — direct anti-reference match

**What:** The Hustad palette is navy, teal, and amber. B12 and B13 introduce violet/purple in at least four places: the animated background blob at L5 (`rgba(139,92,255,0.22)`), the gradient mesh in `DS.pageBg` (`rgba(139,92,255,0.10)` center-left), the Rep Companion FAB gradient (`linear-gradient(135deg, #4D6FFF, #8B5CFF)`), and the companion save button (`rgba(139,92,255,0.20)` + `#C4AEFF` text). The page background also uses it as a radial accent.

**Why it matters:** PRODUCT.md anti-references specifically call out "startup dark-mode clichés: neon/violet accents, purple primary color, AI agent tool aesthetic." `#8B5CFF` is the exact violet that signals "AI-generated dark SaaS." It makes the inspection findings look like a productivity app, not a professional instrument.

**Fix:** Replace the Rep Companion FAB gradient with the Hustad blue: `background: #1e4d8c`, hover `#2563ba`. Replace the companion save button accent with teal. In `DS.pageBg`, remove the `rgba(139,92,255,0.10)` radial gradient; use `rgba(30,77,140,0.10)` (blue) instead. In the L5 animated blob, replace `rgba(139,92,255,0.22)` with `rgba(42,138,130,0.14)` (teal).

**Suggested command:** `$impeccable colorize src/components/screens/B12_B15.tsx`

---

### [P1] Gradient CTA button — wrong pattern and wrong colors

**What:** The primary CTA uses `btnGrad: "linear-gradient(90deg, #4A6FFF, #7B61FF, #9B5BFF)"` (blue to purple gradient) with `btnGlow: "0 8px 32px rgba(77,111,255,0.50)"`. This appears on the primary forward-action button across B12 and B13.

**Why it matters:** The DESIGN.md Two-Accent Rule says teal carries forward-commitment actions and amber carries signature moments. A blue-purple gradient button isn't in the Hustad system at all. The glow (`0 8px 32px ... 0.50`) combined with a gradient is also the "ghost-card" paired-decoration anti-pattern applied to buttons. It reads as startup SaaS.

**Fix:** For `carrier_review` and `no_action` paths, use the standard `btn-primary` (navy-deep fill, solid). For `urgent_repair`, where the action is a commitment, use `btn-teal` (teal fill, solid). Remove all `boxShadow` from the primary CTA at rest — shadow appears on hover only. Remove the gradient.

**Suggested command:** `$impeccable polish src/components/screens/B12_B15.tsx`

---

### [P1] MicroLabel eyebrow above every section — absolute ban

**What:** `MicroLabel` (11px, 2px letter-spacing, uppercase, themed accent color) appears above: "Property & Inspection Details", "Finding Summary", "Your Stated Priorities", "Weather Event Support", "Storm Evidence: Strongest Proof Photos", "Why It Matters" (×6 photo cards), "Inspector Note" (×6 photo cards), "Official Recommendation", "What This Means", "Recommended Next Step", "What We Are Not Saying", "Rep-Guided Questions". B13 adds more. B12 alone has ~18 MicroLabel instances visible across the scroll.

**Why it matters:** SKILL.md absolute ban: "Tiny uppercase tracked eyebrow above every section. The 2023-era kicker...is now the saturated AI scaffold; it appears on 55–95% of generations regardless of brief." The purpose of eyebrows is to orient the reader within a complex document. When every item gets one, they cease to orient and instead read as decoration. The effect is that nothing stands out.

**Fix:** Reserve MicroLabel for at most 3–4 truly structural section headers on the screen (e.g., "Storm Evidence: Proof Photos", "Rep-Guided Questions"). Remove it from individual field labels within cards ("Why It Matters", "Inspector Note"). Within cards, use a bold DM Sans label at 0.75rem instead. The card structure itself communicates grouping; the eyebrow is redundant.

**Suggested command:** `$impeccable quieter src/components/screens/B12_B15.tsx`

---

### [P2] Four infinitely-looping ambient glow animations — no reduced-motion

**What:** Both B12 and B13 have four Framer Motion `animate` blocks running continuously (`repeat: Infinity`, durations 24–40s): a themed accent blob (top-right), a purple blob (bottom-left), a blue bloom (top-left), and a horizon ellipse (center-bottom). All use `filter: "blur(120px)"` with transform + opacity animation. There is no `useReducedMotion()` check or `@media (prefers-reduced-motion)` alternative.

**Why it matters:** (1) Continuous blur + transform animation on four large elements is GPU-expensive on an iPad Air in field conditions. (2) The ambient glow pattern is decorative motion that conveys no state — the product register bans "decorative motion that doesn't convey state." (3) `prefers-reduced-motion` is required per DESIGN.md for all animations. (4) This is exactly the "ambient glow ring" startup AI aesthetic the anti-references describe.

**Fix:** Replace the looping blobs with static radial gradient overlays at a fixed opacity. The background depth they provide is achievable with a single CSS `radial-gradient` on the page container — no animation needed. Add `const shouldReduceMotion = useReducedMotion()` from Framer Motion and gate all non-state-change animations.

**Suggested command:** `$impeccable animate src/components/screens/B12_B15.tsx`

---

## Persona Red Flags

**Sam (Accessibility-Dependent User):** The photo lightbox has four interactive buttons (Close, Previous, Next, photo click) with no `aria-label` attributes. The `XCircle` icon serves as the close target with no accessible text. The lightbox opens without an `aria-modal` or `role="dialog"` declaration, so a screen reader has no indication it's in an overlay. The path selection radio buttons in B13 are implemented as divs with click handlers — they will not be navigable by keyboard or announced correctly by VoiceOver. A tab press on the iPad's keyboard cover will not reach them.

**Riley (Stress Tester):** When there are no photos (`allPhotos.length === 0`), B12 shows three camera-icon placeholder cards and continues to display the "6 of N shown · All in PDF" counter with N=0. The text reads "6 of 0 shown · All in PDF" — confusing since there are no photos in the PDF either. In B13, if `session.findings.urgentItemsCount` is 0 and outcome is `"repair_only"`, the path key maps to `"direct_repair"` but the `showAlternatePath` is `false` — the alternate path card doesn't render, leaving only a single option card in the right column, which creates a lopsided layout with a large empty right column.

**Field Rep (Project-Specific):** The rep is showing this screen to a homeowner on an iPad. The cinematic background and gradient buttons signal "sales app" to a homeowner who has seen plenty of SaaS pitches. The actual differentiation — the three specific credibility lines, the honest "no_action" finding — is buried under the visual noise. The homeowner's first impression of the screen is its aesthetic, not its content. A homeowner who thinks "this is a tablet sales app" will be more resistant to the findings than one who thinks "this is a professional assessment tool." The visual execution actively undermines the content strategy.

---

## Minor Observations

- **Line 1965 (detector finding):** `transition: "width 0.7s ease"` on the progress bar fill causes layout reflow. Use `transform: scaleX()` with `transform-origin: left` instead — same visual effect, compositor-only.
- **B15 inconsistency:** B15 uses `rounded-[48px]` on its main card (48px radius) and `rounded-full` on the CTA — completely inconsistent with B12/B13's 20px radius cards. B15 also uses `font-display` (Playfair Display) for its headline while B12/B13 use `font-editorial` (Cormorant Garamond). These are three different typographic registers in four consecutive screens.
- **Logo hidden on iPad:** `hidden lg:flex` hides the brand wordmark below `lg` (1024px). An iPad Air in portrait is ~820px — the Hustad logo is never visible in field use.
- **`font-inter` hardcoded inline:** Both screens hardcode `fontFamily: "'Inter', system-ui, sans-serif"` on ~40 elements, bypassing the `font-inter` Tailwind utility. When the type stack changes, these won't update.
- **B12 Finding Stats widget is a hero-metric template:** 54px numbers with uppercase colored labels and inset glow — exactly the "Big number, small label, gradient accent" SaaS cliché listed in absolute bans.

---

## Questions to Consider

- "If the homeowner looked at this screen for 5 seconds and had to describe what they saw, would they say 'damage findings' or 'app dashboard'? What needs to change for the answer to reliably be 'findings'?"
- "The Rep Companion is the most thoughtful feature on these screens. What if the insight density of the Companion sheet informed the visual hierarchy of the main screen? Could some of the background decoration be replaced with more of what matters?"
- "B15 is visually a completely different product than B12/B13. Is that intentional — a deliberate tonal shift for the urgency moment — or drift?"
