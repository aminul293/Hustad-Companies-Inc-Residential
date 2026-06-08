# Hustad Email Report — Developer Specification
**Version 1.0 · June 2026**  
**Reference mockup:** `email-report-mockup.html`

---

## Overview

The email report is a transactional HTML email dispatched via Microsoft Graph (Outlook) through `/api/send-email/route.ts`. It is triggered from `B19NextSteps.tsx` after the session is completed. The PDF forensic report is attached separately; this email serves as a summary cover letter + agreement delivery vehicle.

The email **varies by path** determined by `session.findings.outcomeType`:

| `outcomeType` value | Path | Email Variant |
|---|---|---|
| `claim_review_candidate` + `signedAt` present | 1A | Claim Review — Sold |
| `claim_review_candidate` + no `signedAt` | 1B | Claim Review — Sent for Review |
| `repair_only` | 2 | Repair Only |
| `full_restoration_candidate` | 3 | Full Restoration |
| `no_damage` or `monitor_only` | 4 | No Damage / Monitor |

---

## Technical Requirements

- **Max width:** 680px centered
- **Format:** HTML email (table-based layout recommended for Outlook compatibility)
- **Background:** `#F1F5F9` page, `#FFFFFF` email body
- **Fonts:** System stack — `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`
- **Attachments:** Full forensic report PDF (`getSummaryPDFBase64`) + agreement PDF (`getAgreementPDFBase64`) when path = claim review
- **Sender:** Rep's authenticated email (from Azure AD session)
- **Subject lines:** See per-path sections below
- **Note:** Claim-sensitive emails (claim_review_candidate, full_restoration_candidate) route through the approval queue (`/api/send-email` returns 202 pending_approval). This is already implemented.

---

## Design Tokens

### Accent Colors (per path)
| Path | Accent | Hex |
|---|---|---|
| Claim Review | Blue | `#2563EB` |
| Repair Only | Red | `#DC2626` |
| Full Restoration | Amber | `#D97706` |
| No Damage / Monitor | Green | `#059669` |

### Common Colors
| Token | Hex | Usage |
|---|---|---|
| `pageBg` | `#F1F5F9` | Email outer background |
| `emailBg` | `#FFFFFF` | Email body |
| `headerBg` | `#0C0F16` | Email header band |
| `textPrimary` | `#0F172A` | Headlines, values |
| `textSecondary` | `#475569` | Body paragraphs |
| `textFaint` | `#94A3B8` | Labels, fine print |
| `border` | `#E2E8F0` | Card borders |
| `surface` | `#F8FAFC` | Card backgrounds |

---

## Shared Email Structure (All Paths)

Every email follows this skeleton in order:

```
1. Accent bar (4px, path color)
2. Header band (dark, Hustad branding + report type)
3. Status banner (status pill + headline + subheadline)
4. Email body
   a. Greeting ("Dear [homeownerPrimaryName],")
   b. Opening paragraph (path-specific)
   c. [SECTION: Property & Inspection Details]
   d. [PATH-SPECIFIC SECTIONS]
5. Footer (contact info + legal disclaimer)
```

---

## SessionState Data Fields Used

All fields sourced from `SessionState` type (`/src/types/session.ts`):

| Field | Used In |
|---|---|
| `session.property.homeownerPrimaryName` | Greeting, executed agreement |
| `session.property.address` | Property card |
| `session.property.cityStateZip` | Property card |
| `session.property.workingDateOfLoss` | Property card (claim paths only) |
| `session.property.insurerNameKnown` | Property card (claim paths only) |
| `session.property.claimNumberKnown` | Property card (if present) |
| `session.createdAt` | Inspection date |
| `session.repName` | Inspector name, executed agreement |
| `session.sessionId` | Report ID (last 8 chars, uppercase) |
| `session.findings.outcomeType` | Path determination |
| `session.findings.urgentItemsCount` | Stat chips |
| `session.findings.stormRelatedItemsCount` | Stat chips (claim path) |
| `session.findings.monitorItemsCount` | Stat chips |
| `session.findings.summaryBody` | Storm/repair/inspection summary paragraph |
| `session.findings.summaryHeadline` | Optional summary headline |
| `session.findings.weatherEvents` | Weather table (claim path) |
| `session.findings.roofingArea` | Restoration path stat chip |
| `session.signatureData.signedAt` | Determines 1A vs 1B |
| `session.signatureData.signerName` | Executed agreement card |
| `session.signatureData.signerEmail` | Executed agreement card |
| `session.signatureData.signatureImage` | Not shown in email |
| `session.signatureData.deferralReason` | 1B path, if deferred |
| `session.pathData.manufacturerSelected` | Restoration path |
| `session.pathData.warrantyOptionSelected` | Restoration path |
| `session.photos` | Photo grid (selectedForSummary = true, max 4) |
| `session.photoAssets` | Photo grid (selectedForSummary = true, !isSensitive, max 4) |
| `session.sessionStatus` | "deferred" check for 1B |

---

## PATH 1A — Claim Review · Agreement Executed

**Trigger condition:** `outcomeType === "claim_review_candidate"` AND `signatureData.signedAt` is present

**Email subject:** `Your Storm Inspection Report & Executed Agreement — [address]`

**Accent color:** `#2563EB` (blue)

**Attachments:** Forensic PDF + Agreement PDF (executed)

**Status banner:**
- Pill: "Agreement Executed" — green (`#059669`)
- Headline: "Your storm findings are documented and your agreement is on file."
- Sub: "This report contains your full inspection summary, damage evidence, and a copy of your executed Insurance Contingency Agreement. Keep this for your records."

**Sections in order:**

### 1. Property & Inspection Details
Card with 2-column grid:
- Property Address → `property.address + cityStateZip`
- Inspection Date → `createdAt` formatted
- Inspector → `repName`
- Report ID → `sessionId.slice(-8).toUpperCase()`
- Working Storm Date → `property.workingDateOfLoss` (only if present)
- Insurance Carrier → `property.insurerNameKnown` (only if present)

### 2. Storm Findings Summary
4 stat chips:
- Storm Items → `findings.stormRelatedItemsCount` (blue)
- Urgent Items → `findings.urgentItemsCount` (red)
- Monitor Items → `findings.monitorItemsCount` (amber)
- Photos Taken → count of selectedForSummary photos (gray)

Summary paragraph card: `findings.summaryBody`

### 3. Damage Evidence Photos
2×2 photo grid — photos where `selectedForSummary === true` (max 4)  
Each photo shows: image, category badge pill, caption label  
Badge classification logic → `classifyPdfPhoto()` from `pdf-export.ts`  
Note: "Full evidence gallery included in attached PDF report."

### 4. What Happens Next
4 numbered steps (blue circles):
1. "File or confirm your insurance claim" — carrier filing instructions
2. "Coordinate the carrier adjuster inspection" — Hustad coordinates
3. "Your carrier makes the coverage determination" — carrier decides
4. "You authorize production — nothing starts without your approval"

### 5. Your Executed Agreement
Green confirmation card:
- ✓ "Insurance Contingency Agreement — Executed"
- "Agreement is on file with Hustad Companies, Inc."
- Grid: Signed By (`signerName`), Date & Time (`signedAt`), Property (`address`), Rep (`repName`)
- Cancellation reminder: "You have 3 business days from the date signed to cancel..."

### 6. Contingency Agreement — Full Text
All 9 clauses from `AGREEMENT_SECTIONS` (constants.ts):
1. Parties and Property
2. Scope of Work
3. Insurance Contingency
4. Compensation and Payment
5. Scheduling and Production
6. Homeowner Obligations
7. Wisconsin Cancellation Rights
8. Representations and Warranties
9. Dispute Resolution

### 7. Wisconsin Notice
All 5 lines from `WISCONSIN_CLAIM_NOTICE` (constants.ts)  
Amber left-border card, amber heading.

---

## PATH 1B — Claim Review · Sent for Review (Not Signed)

**Trigger condition:** `outcomeType === "claim_review_candidate"` AND `signatureData.signedAt` is null/undefined  
(Also covers `sessionStatus === "deferred"`)

**Email subject:** `Your Storm Inspection Report & Agreement for Review — [address]`

**Accent color:** `#F59E0B` (amber) — pending authorization state

**Attachments:** Forensic PDF + Agreement PDF (unsigned watermark)

**Status banner:**
- Pill: "Sent for Review — Authorization Pending" — amber
- Headline: "Your storm inspection is complete. Review your findings and authorize your agreement."
- Sub: "...authorize your Insurance Contingency Agreement using the link provided — no need to be home."

**Sections in order:**

### 1. Property & Inspection Details
Same as 1A.

### 2. Storm Findings Summary
Same as 1A.

### 3. Damage Evidence Photos
Same as 1A.

### 4. Our Recommendation
Blue accent card:
- Headline: "Carrier review is the recommended next step."
- Body: Explains why carrier review makes sense before paying out of pocket.

### 5. What Happens Next
4 steps (amber circles):
1. "Review and authorize your agreement — from home" — use link below
2. "File or confirm your insurance claim"
3. "Hustad coordinates the adjuster inspection"
4. "You decide — no work starts without your approval"

### 6. Action Required — Review & Authorize Your Agreement
Amber pending card:
- Heading: "Your agreement is ready to sign."
- Paragraph explaining what the agreement does
- **CTA Button:** "Review & Authorize Agreement →" → links to `[REVIEW_LINK]`  
  *(This is the remote signing URL — needs to be generated and included in the email payload)*
- Cancellation note: "You have 3 business days from today to cancel without penalty."

### 7. Contingency Agreement — Full Text (UNSIGNED)
Same 9 clauses as 1A, but header reads:  
"Review copy — authorization required to execute"

### 8. Wisconsin Notice
Same as 1A.

---

## PATH 2 — Repair Only

**Trigger condition:** `outcomeType === "repair_only"`

**Email subject:** `Your Repair Inspection Report — [address]`

**Accent color:** `#DC2626` (red)

**Attachments:** Forensic PDF only (no agreement PDF)

**Status banner:**
- Pill: "Service Quote Being Prepared" — red
- Headline: "A targeted repair has been documented at your property."
- Sub: "...focused service item we can quote and schedule directly...No work begins until you approve."

**Sections in order:**

### 1. Property & Inspection Details
- No storm date field
- No insurance carrier field

### 2. Repair Findings Summary
3 stat chips:
- Repair Items → `findings.urgentItemsCount` (red)
- Monitor Items → `findings.monitorItemsCount` (amber)
- Photos Taken → photo count (gray)

Summary paragraph: `findings.summaryBody`

### 3. Repair Evidence Photos
2×2 grid — same photo logic as claim path, badge colors per category

### 4. Documented Repair Items
List of scope items — sourced from `session.findings.findingItems` (or equivalent field)  
Each item shows: category, description, location/note  
Left border colored red for repair items, amber for monitor items

### 5. What Happens Next
3 steps (red circles):
1. "Service opportunity created" — routes to service team
2. "You receive your repair quote for review" — 1–2 business days
3. "You approve — then we schedule" — no work before authorization

### 6. Important Notes
Checkmark list (4 items from `REPAIR_TERMS` in constants.ts):
- Scope limited to documented items only
- Direct repair arrangement — not insurance claim
- No work begins before written approval
- If additional damage found, Hustad notifies before proceeding

**No agreement section for this path.**

---

## PATH 3 — Full Restoration / Direct Buy

**Trigger condition:** `outcomeType === "full_restoration_candidate"`

**Email subject:** `Your Replacement Proposal Request Confirmation — [address]`

**Accent color:** `#D97706` (amber)

**Attachments:** Forensic PDF only

**Status banner:**
- Pill: "Proposal in Progress" — amber
- Headline: "Your replacement has been requested. Estimating is preparing your proposal."
- Sub: "This report confirms your replacement request...Hustad estimating is currently preparing your proposal package."

**Sections in order:**

### 1. Property & Project Details
Grid includes:
- Project Type → `pathData.manufacturerSelected ? "Roof Replacement — [Manufacturer]" : "Roof Replacement / Exterior Scope"`
- Proposal Status → "Estimating in progress"
- No storm date / carrier fields

### 2. Project Request Summary
3 stat chips:
- "REPL" (replacement) — amber
- Roof Area → `findings.roofingArea + " SF"` if present
- Context Photos → photo count

Project context paragraph: `findings.summaryBody`

### 3. Property Context Photos
2×2 photo grid — categories labeled as "Overview" and "Project Context"

### 4. Estimating In Progress Hero
Dark background card with icon:
- "Estimating Is Preparing Your Proposal"
- "...Your proposal will be sent to you for review before anything is priced, scheduled, or authorized."

### 5. What Your Proposal Will Include
8-item 2-column grid:
- Verified roof measurements · Material scope & assumptions
- Warranty path options · System components
- Exclusions clearly listed · Owner-selectable upgrades
- Access & staging notes · Approval instructions

### 6. What to Expect & When
4-step vertical timeline:
1. Today — Estimating review begins
2. Within 2–5 business days — Proposal sent
3. You review and ask questions
4. You authorize — then production is scheduled

### 7. Important Note
Amber accent card:
- "This is a request confirmation — not a final price or contract."
- Explains proposal will control final scope and pricing.

**No agreement section for this path.**

---

## PATH 4 — No Damage / Monitor Only

**Trigger condition:** `outcomeType === "no_damage"` or `outcomeType === "monitor_only"`

**Email subject:** `Your Property Inspection Report — [address]`

**Accent color:** `#059669` (green)

**Attachments:** Forensic PDF only

**Status banner:**
- Pill: "Inspection Complete — No Action Required Today" — green
- Headline: "Your inspection is complete. No urgent repair or claim action is needed at this time."
- Sub: "...did not document storm damage, urgent conditions, or findings that support a repair or carrier review recommendation today."

**Sections in order:**

### 1. Property & Inspection Details
Grid includes:
- Outcome → "No action required today"
- Photo Count → "[#] documentation photos"
- No storm date / carrier fields

### 2. Inspection Summary
4 stat chips:
- Urgent Items → `0` (green)
- Storm Items → `0` (green)
- Monitor Items → `findings.monitorItemsCount` (amber)
- Photos Taken → photo count (gray)

Summary paragraph: `findings.summaryBody`

### 3. Documentation Photos
2×2 grid — badge labels: "Overview", "Property Record", "Monitor"

### 4. Monitor Items *(conditional — only if `monitorItemsCount > 0`)*
Amber card list — one card per monitor item:
- Item name / description
- Monitoring note / re-inspection trigger condition

### 5. What Today's Inspection Means
Green accent card:
- "No action is needed today — and that's a good outcome."
- Explains pre-loss baseline value

### 6. What to Do Next
3 steps (green circles):
1. "Save this report and attached PDF" — property records baseline
2. "Monitor the flagged items at your own pace"
3. "Call Hustad after any significant future storm"

**No agreement section for this path.**

---

## Photo Display Rules

- Source: `session.photoAssets` (where `selectedForSummary === true` and `!isSensitive`) + `session.photos` (where `selectedForSummary === true`)
- Max 4 photos shown in email grid (2×2)
- Photos beyond 4: note "Full gallery in attached PDF report"
- Each photo: image thumbnail, category badge pill, caption label
- If no photos: show a note that documentation is in the attached PDF
- Badge classification: use `classifyPdfPhoto(label, category, description)` logic from `pdf-export.ts`

---

## CTA Button (Path 1B Only)

The "Review & Authorize Agreement" button needs a unique review URL per session. This URL should:
- Be generated when the email is sent
- Route to `/review/[token]/page.tsx` (already exists in the codebase)
- Include the session ID encoded as a secure token
- Expire after a configurable period (recommend 30 days)

The review page at `/app/review/[token]/page.tsx` already handles remote agreement review and signing.

---

## Email Footer (All Paths)

```
Hustad Companies, Inc.
Madison Residential · info@hustadcompanies.com · (608) 000-0000

[PATH-SPECIFIC legal disclaimer]
Report ID: [sessionId.slice(-8).toUpperCase()] · Generated [createdAt formatted]
```

**Legal disclaimers by path:**

- **Claim Review:** "Hustad Companies is not a licensed public adjuster and does not guarantee insurance outcomes. All coverage decisions rest solely with the Homeowner's insurance carrier."
- **Repair Only:** "This report documents inspection findings only. It is not a binding work order or final quote. No work begins until you approve a written quote or work order."
- **Full Restoration:** "This report is a project request summary only. It is not a binding contract, final proposal, or work authorization. No work begins until a written proposal is reviewed and approved."
- **No Damage:** "This inspection report documents property conditions as observed on the inspection date. It does not constitute a warranty or guarantee that the property is free from all defects."

---

## Implementation Notes

1. **HTML email generation** — The current `html` field in `B19NextSteps.tsx` sends a basic string. Replace with a proper `generateEmailHTML(session)` function that returns the full email HTML per path.

2. **Path detection** — Use the same `derivePathType()` function from `pdf-export.ts` — do not duplicate logic.

3. **Image embedding** — Photos in email should be base64-embedded (for Outlook compatibility) or hosted URLs. Do not use `blob:` URLs — they won't work in email clients.

4. **Photo limit** — Maximum 4 photos in the email grid. Larger sets stay PDF-only.

5. **Agreement PDF attachment** — Only attach for paths 1A and 1B. Path 1A gets the executed copy; path 1B gets the unsigned copy for review.

6. **Review link (1B)** — The remote signing URL should be included as a CTA button, not just a raw link. Use `[REVIEW_LINK]` placeholder until the token generation is wired up.

7. **Test checklist before deploy:**
   - [ ] All 5 email variants render correctly in Outlook, Gmail, Apple Mail
   - [ ] Photos display (test with both base64 and hosted URL photos)
   - [ ] Agreement text is complete and legally accurate
   - [ ] CTA button links to correct review page
   - [ ] Footer disclaimer matches path
   - [ ] PDF attachment file size is reasonable (compress images in PDF)
   - [ ] Claim-sensitive emails correctly route through approval queue
