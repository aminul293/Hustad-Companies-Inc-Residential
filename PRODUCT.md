# Product

## Register

product

## Users

Hustad residential field reps — storm damage inspectors and salespeople who carry an iPad Air (portrait, fixed ~820×1180 px viewport) into the field. They use this app at homeowner properties: standing in driveways, at kitchen tables, in variable outdoor light, while speaking directly to homeowners making major insurance decisions. The primary professional context is a rep walking a homeowner through documented hail damage findings, iPad in hand.

Secondary user: managers and admins in the RepCommandCenter dashboard, reviewing pipeline, jobs, and rep performance from a desktop browser.

## Product Purpose

A 20-screen tablet workflow that takes a field rep from job setup through storm damage photo documentation and closes with a homeowner agreement capture. The app compresses what was previously a multi-step paper and photo process into a single authenticated session: job verification, compliance photo checklist, damage assessment, homeowner presentation, and digital signature.

Success looks like a rep who walks out of every appointment with a signed agreement and a complete documentation record that supports an insurance claim. The interface must make the rep look authoritative and prepared — the homeowner's trust in Hustad is partly earned through the quality of the tool.

Remaining in development: automated outbound queue (cron job), PDF dossier generation, PWA offline mode, admin override UI.

## Brand Personality

Precise, Premium, Trustworthy. The voice is a seasoned expert — calm, authoritative, no fluff. The interface communicates that Hustad has done this thousands of times and knows exactly what the findings mean. Confidence without arrogance. The tool should disappear into the task while projecting quiet professional authority.

## Anti-references

- **Generic field-service apps** (Salesforce Field Service, ServiceMax): bureaucratic, dense, designed for enterprise IT administrators — not for earning homeowner trust in person
- **Consumer insurance apps**: conversational, bright, rounded, patronizing — designed for claimants, not professionals
- **2015-era enterprise mobile grids**: large tap-target grids, bright-white backgrounds, no design intent beyond touch compliance
- **Startup dark-mode clichés**: neon/violet accents, gradient mesh wallpapers, purple primary color, particle animations, glassmorphism used as decorative wallpaper, "AI agent" tool aesthetic
- **Sales-deck presentation UI**: any screen that makes the homeowner feel like they are watching a salesperson run a pitch app rather than seeing a professional's documented findings

## Design Principles

1. **Earned authority.** Every screen communicates that the rep is showing documented professional findings — not pitching. Visual hierarchy, typography weight, and data density must project expertise.
2. **Portrait permanence.** Designed for iPad Air in fixed portrait orientation. No fluid typography, no responsive pivots. Every screen is a composed, deliberate layout — not a grid that adapts.
3. **Evidence-first hierarchy.** Data, findings, and status read at a glance. Navigation chrome and UI scaffolding recede. The homeowner's eye goes to the finding, not the interface.
4. **Dark as field context.** Dark mode reduces screen glare in outdoor conditions and elevates the visual weight of photos and data. It is a functional choice, not an aesthetic preference.
5. **Touch-confident targets.** Every interactive element is optimized for thumb operation: ≥44px tap targets, clear affordances, forgiving touch zones. No dependency on hover states.

## Accessibility & Inclusion

WCAG AA baseline. Touch targets ≥44px on all interactive elements. Three theme modes supported: dark (primary field use), light, and high-contrast (`.high-contrast` class with full overrides in globals.css). Reduced motion must be respected via `prefers-reduced-motion: reduce`. Controls must be self-evident without tooltip or hover dependency — the app is used by reps with varying technical fluency.
