import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SessionState } from "@/types/session";
import { compressImage } from "@/lib/images";
import { getPhotoBlob, blobToBase64 } from "@/lib/photoStorage";
import { AGREEMENT_SECTIONS, WISCONSIN_CLAIM_NOTICE } from "@/components/screens/b16_b19/constants";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type C3 = [number, number, number];
type PathType = "carrier_review" | "urgent_repair" | "no_action";
type PhotoCat = "storm" | "urgent" | "repair" | "maintenance" | "monitor" | "overview";

interface PdfPhoto {
  dataUrl: string;
  label: string;
  category: string;
  description?: string;
  severity?: string;
  annotations?: Array<{type:string;x:number;y:number;toX?:number;toY?:number;radius?:number;color:string;text?:string}>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const PATH_CFG: Record<PathType, {
  badgeLabel: string;
  headline: string;
  subhead: string;
  whatMeans: string;
  nextStep: string;
  credibilityLines: string[];
  proofLabel: string;
  showWeather: boolean;
}> = {
  carrier_review: {
    badgeLabel: "Carrier review candidate",
    headline:   "Storm findings documented. Carrier review is the recommended next step.",
    subhead:    "We completed an exterior inspection and documented conditions consistent with storm-related impact. These findings don't determine coverage, but they're strong enough to justify a formal carrier review before any out-of-pocket expense.",
    whatMeans:  "The roof is currently serviceable. The documented storm indicators — impacts to shingles, soft metals, and related surfaces — are the type of evidence carriers evaluate during a claim review. This finding doesn't guarantee coverage. It means the evidence supports asking the question.",
    nextStep:   "Review the strongest proof photos together. Confirm that what you're seeing matches the documented findings. Then decide whether you'd like us to prepare the documentation package and coordinate a carrier inspection.",
    credibilityLines: [
      "This report doesn't indicate that your carrier has approved coverage.",
      "Not every exterior condition documented is necessarily storm-related.",
      "We're not asking you to make a repair decision without reviewing the evidence first.",
      "We are saying: the documented findings are strong enough to justify the recommended next step.",
    ],
    proofLabel:  "Strongest proof photos — storm evidence",
    showWeather: true,
  },
  urgent_repair: {
    badgeLabel: "Urgent protection required",
    headline:   "Urgent condition documented. Immediate protection or repair is recommended.",
    subhead:    "We completed an exterior inspection and documented one or more conditions that create a near-term risk of water entry or additional property damage. These findings should be addressed before waiting on a larger project or coverage decision.",
    whatMeans:  "One or more documented conditions are not a future planning item — they're creating risk today. Immediate protective repair or stabilization is recommended to prevent additional damage. This scope is limited to what the evidence supports.",
    nextStep:   "Review the urgent proof photos first. Confirm the documented condition with your representative. Then authorize protective work if you're comfortable, and decide separately whether a broader inspection, repair, or carrier review makes sense.",
    credibilityLines: [
      "This doesn't mean every condition requires full replacement.",
      "We're not asking you to approve more work than the evidence supports.",
      "We are saying: the documented condition has a clear, limited repair or protection path.",
    ],
    proofLabel:  "Urgent findings — critical documentation",
    showWeather: false,
  },
  no_action: {
    badgeLabel: "No action required today",
    headline:   "Inspection complete. No action is recommended at this time.",
    subhead:    "We completed a thorough exterior inspection and didn't document meaningful storm-related conditions that support repair, emergency action, or carrier review at this time. All findings have been organized and documented for your property records.",
    whatMeans:  "Today's inspection didn't reveal conditions that support a repair, protection, or carrier review recommendation. Any monitor-only or maintenance items have been documented as a baseline for future comparison. This is an honest finding — and it has real value as a dated property record.",
    nextStep:   "Review any monitor items or maintenance notes together. Save this report as your property baseline. Consider a future recheck reminder, and know that if conditions change after a future storm event, you have a documented starting point.",
    credibilityLines: [
      "This doesn't mean your roof is perfect indefinitely.",
      "Not every condition requires immediate action.",
      "We're not asking you to make a repair or claim decision without a clear reason.",
      "We are saying: the best next step today is documentation and monitoring.",
    ],
    proofLabel:  "Inspection documentation — property record",
    showWeather: false,
  },
};

const HOW_IT_WORKS = [
  { num: "01", headline: "Document damage",           body: "Hustad has completed the exterior inspection and organized all findings, photos, and documentation into a structured report prepared for carrier review." },
  { num: "02", headline: "Coordinate carrier review",  body: "If you authorize, Hustad will coordinate the carrier inspection process and present the documented findings clearly to your insurer. Hustad does not negotiate your claim." },
  { num: "03", headline: "Confirm scope and coverage", body: "Your insurance carrier reviews the documented evidence and makes the coverage determination under your policy. Hustad cannot predict or guarantee any coverage outcome." },
  { num: "04", headline: "Move forward only if you agree", body: "No repair work begins until your carrier issues a written determination, you confirm the scope, and you authorize production in writing. You stay in control at every step." },
];

const PLAIN_ENGLISH = [
  { title: "What this agreement does",        body: "This agreement authorizes Hustad to prepare storm documentation, coordinate with your insurance carrier, and serve as your selected contractor for covered exterior restoration work — if the claim is approved and the final scope is confirmed with you." },
  { title: "What this agreement does not do", body: "This does not guarantee claim approval, coverage amount, payment timing, or final carrier scope. Your insurance carrier makes all coverage decisions under your policy." },
  { title: "Your financial responsibility",   body: "Your deductible, any depreciation holds, and non-covered items remain your financial responsibility regardless of the claim outcome. No work begins until you approve the final scope in writing." },
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Premium Light Theme
// Single cohesive light system, no dark sections
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  // Page & surface
  pageBg:    [248, 247, 243] as C3,   // premium warm off-white #F8F7F3
  surface:   [255, 255, 255] as C3,   // card white
  surface2:  [250, 249, 246] as C3,   // premium light off-white section
  surface3:  [243, 242, 238] as C3,   // subtle container

  // Borders
  border:    [228, 225, 218] as C3,
  borderMid: [208, 204, 195] as C3,

  // Typography
  text:      [26,  25,  23]  as C3,   // charcoal
  textMid:   [80,  76,  70]  as C3,   // secondary (darker for high readability)
  textFaint: [118, 114, 107] as C3,   // muted (darker for high readability)

  // Blue — informational / carrier review
  blue:      [37,   99, 235] as C3,
  blueMid:   [96,  165, 250] as C3,
  blueBg:    [239, 246, 255] as C3,
  blueBdr:   [191, 219, 254] as C3,

  // Amber — review / caution
  amber:     [180,  83,   9] as C3,
  amberMid:  [217, 119,   6] as C3,
  amberBg:   [255, 251, 235] as C3,
  amberBdr:  [252, 211,  77] as C3,

  // Green — safe / complete / no_action
  green:     [22,  163,  74] as C3,
  greenBg:   [240, 253, 244] as C3,
  greenBdr:  [167, 243, 208] as C3,

  // Red — urgent
  red:       [220,  38,  38] as C3,
  redBg:     [254, 242, 242] as C3,
  redBdr:    [252, 165, 165] as C3,
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function derivePathType(s: SessionState): PathType {
  const o = s.findings.outcomeType;
  const u = s.findings.urgentItemsCount;
  if (u > 0 || o === "repair_only")                                          return "urgent_repair";
  if (o === "claim_review_candidate" || o === "full_restoration_candidate")  return "carrier_review";
  return "no_action";
}

function getAccent(pt: PathType):    C3 { return pt === "urgent_repair" ? T.red   : pt === "no_action" ? T.green   : T.blue; }
function getAccentBg(pt: PathType):  C3 { return pt === "urgent_repair" ? T.redBg : pt === "no_action" ? T.greenBg : T.blueBg; }
function getAccentBdr(pt: PathType): C3 { return pt === "urgent_repair" ? T.redBdr: pt === "no_action" ? T.greenBdr: T.blueBdr; }

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}
function fmtDT(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
}

function classifyPdfPhoto(label: string, cat: string, desc: string): PhotoCat {
  const t = `${cat} ${label} ${desc}`.toLowerCase();
  if (t.includes("urgent") || t.includes("exposed") || t.includes("missing kickout") || t.includes("open flashing")) return "urgent";
  if (t.includes("storm") || t.includes("hail") || t.includes("wind") || t.includes("impact") || t.includes("bruise") || t.includes("dent")) return "storm";
  if (t.includes("repair") || t.includes("lifting") || t.includes("sealant") || t.includes("flashing") || t.includes("drip edge")) return "repair";
  if (t.includes("maintenance") || t.includes("debris") || t.includes("gutter") || t.includes("clog")) return "maintenance";
  if (t.includes("monitor") || t.includes("wear") || t.includes("granule") || t.includes("age")) return "monitor";
  return "overview";
}

function photoBadge(pc: PhotoCat, pt: PathType): { label: string; color: C3; bg: C3; bdr: C3; why: string } {
  switch (pc) {
    case "urgent":      return { label: "Urgent protection", color: T.red,       bg: T.redBg,   bdr: T.redBdr,   why: "Creates a near-term risk of water entry or additional property damage. Should be addressed promptly." };
    case "storm":       return { label: "Storm evidence",    color: T.blue,      bg: T.blueBg,  bdr: T.blueBdr,  why: pt === "carrier_review" ? "Supports the carrier review recommendation. Provides the type of documentation a carrier inspection requires." : "Documents storm-related impact on the property surface." };
    case "repair":      return { label: "Repair item",       color: T.blue,      bg: T.blueBg,  bdr: T.blueBdr,  why: "Can be addressed with a targeted repair. Doesn't require a full system decision." };
    case "maintenance": return { label: "Maintenance",       color: T.amber,     bg: T.amberBg, bdr: T.amberBdr, why: "Doesn't support an insurance action today. Recommended to protect system life and drainage." };
    case "monitor":     return { label: "Monitor",           color: T.amber,     bg: T.amberBg, bdr: T.amberBdr, why: "No action needed today. Documented as a baseline for comparison after any future storm event." };
    default:            return { label: "Overview",          color: T.textFaint, bg: T.surface2,bdr: T.border,   why: "General property and roof surface context for the inspection record." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const M  = 18;
const PW = 210;
const PH = 297;
const CW = PW - M * 2;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
function sf(d: jsPDF, c: C3) { d.setFillColor(c[0], c[1], c[2]); }
function sd(d: jsPDF, c: C3) { d.setDrawColor(c[0], c[1], c[2]); }
function st(d: jsPDF, c: C3) { d.setTextColor(c[0], c[1], c[2]); }

// ─────────────────────────────────────────────────────────────────────────────
// CARD COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function baseCard(d: jsPDF, x: number, y: number, w: number, h: number, bg?: C3, bdr?: C3) {
  sf(d, bg ?? T.surface);
  d.roundedRect(x, y, w, h, 2, 2, "F");
  sd(d, bdr ?? T.border);
  d.setLineWidth(0.2);
  d.roundedRect(x, y, w, h, 2, 2, "S");
}

function accentCard(d: jsPDF, x: number, y: number, w: number, h: number, accent: C3, accentBg: C3, accentBdr: C3) {
  sf(d, accentBg);
  d.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  sd(d, accentBdr);
  d.setLineWidth(0.25);
  d.roundedRect(x, y, w, h, 2.5, 2.5, "S");
  // Left accent line (inset to avoid corner clashing)
  sd(d, accent);
  d.setLineWidth(1.6);
  d.line(x + 1.2, y + 3, x + 1.2, y + h - 3);
}

function statCard(d: jsPDF, value: string | number, label: string, x: number, y: number, w: number, h: number, accent: C3, accentBg: C3, accentBdr: C3) {
  baseCard(d, x, y, w, h, accentBg, accentBdr);
  sf(d, accent); d.rect(x, y, w, 1.5, "F");
  st(d, accent); d.setFont("times", "bold"); d.setFontSize(24);
  d.text(String(value), x + w / 2, y + h * 0.58, { align: "center" });
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text(label, x + w / 2, y + h - 5, { align: "center" });
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE PILL
// ─────────────────────────────────────────────────────────────────────────────

function badgePill(d: jsPDF, label: string, x: number, y: number, color: C3, bg: C3, bdr: C3, minW?: number): number {
  const tw = (d.getStringUnitWidth(label) * 7) / (d.internal.scaleFactor ?? 2.83);
  const w  = Math.max(tw + 14, minW ?? 0);
  const h  = 7.5;
  sf(d, bg); d.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  sd(d, bdr); d.setLineWidth(0.25); d.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  sf(d, color); d.circle(x + 5, y + h / 2, 1.3, "F");
  st(d, color); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  d.text(label, x + 9, y + 5.2);
  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE / DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

function rule(d: jsPDF, x: number, y: number, w: number, color?: C3) {
  sf(d, color ?? T.border); d.rect(x, y, w, 0.2, "F");
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO LABEL
// ─────────────────────────────────────────────────────────────────────────────

function label(d: jsPDF, text: string, x: number, y: number, color?: C3) {
  st(d, color ?? T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  d.text(text.toUpperCase(), x, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION NUMBER BADGE
// ─────────────────────────────────────────────────────────────────────────────

function sectionNumBadge(d: jsPDF, num: number, cx: number, cy: number, r: number, accent: C3) {
  sf(d, accent); d.circle(cx, cy, r, "F");
  st(d, [255, 255, 255] as C3); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text(String(num), cx, cy + 2.1, { align: "center" });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE / PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function confidenceBar(d: jsPDF, x: number, y: number, w: number, filled: number, total: number, accent: C3) {
  const segW = (w - (total - 1) * 2.5) / total;
  for (let i = 0; i < total; i++) {
    const sx = x + i * (segW + 2.5);
    sf(d, i < filled ? accent : T.surface3);
    sd(d, i < filled ? accent : T.border);
    d.setLineWidth(0.15);
    d.roundedRect(sx, y, segW, 4, 0.8, 0.8, "FD");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL PAGE HEADER & FOOTER — identical across ALL pages
// ─────────────────────────────────────────────────────────────────────────────

function pageStart(d: jsPDF, acc: C3) {
  sf(d, T.pageBg); d.rect(0, 0, PW, PH, "F");
  sf(d, acc);      d.rect(0, 0, PW, 1.2, "F");
}

function pageHeader(d: jsPDF, rid: string, acc: C3, section: string) {
  pageStart(d, acc);
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Hustad", M, 9.5);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("Madison Residential", M + 14, 9.5);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text(section, PW / 2, 9.5, { align: "center" });
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(`Report ${rid}`, PW - M, 9.5, { align: "right" });
  rule(d, 0, 12, PW);
}

function pageFooter(d: jsPDF) {
  rule(d, 0, PH - 9, PW);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(5.8);
  d.text("Hustad Companies, Inc.  ·  Homeowner Inspection Report", M, PH - 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW — label + value pair
// ─────────────────────────────────────────────────────────────────────────────

function infoRow(d: jsPDF, lbl: string, val: string, x: number, y: number, w: number) {
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(lbl, x, y);
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
  const lines = d.splitTextToSize(val || "—", w) as string[];
  d.text(lines.slice(0, 2), x, y + 5.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1 — EXECUTIVE SUMMARY / COVER
// ─────────────────────────────────────────────────────────────────────────────

function renderCover(d: jsPDF, s: SessionState, pt: PathType, acc: C3) {
  const accBg  = getAccentBg(pt);
  const accBdr = getAccentBdr(pt);
  const rid    = s.sessionId.slice(-8).toUpperCase();

  pageStart(d, acc);

  // Header — no section label on cover
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Hustad", M, 9.5);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("Madison Residential", M + 14, 9.5);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(`Report ${rid}`, PW - M, 9.5, { align: "right" });
  rule(d, 0, 12, PW);

  let y = 20;

  // ── PROPERTY IDENTITY ─────────────────────────────────────────────────────
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text("Homeowner Inspection Report", M, y);
  y += 7;

  const addr = s.property.address || "Property Address";
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(22);
  const addrLines = d.splitTextToSize(addr, CW * 0.78) as string[];
  d.text(addrLines, M, y);
  y += addrLines.length * 8.5 + 1;

  if (s.property.cityStateZip) {
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(10.5);
    d.text(s.property.cityStateZip, M, y);
    y += 6;
  }
  y += 18; // Increased gap to push content down gracefully

  // ── RECOMMENDATION CARD ───────────────────────────────────────────────────
  const hlLines = d.splitTextToSize(PATH_CFG[pt].headline, CW - 18) as string[];
  const subLines = d.splitTextToSize(PATH_CFG[pt].subhead, CW - 18) as string[];
  const hlLinesCount = Math.min(hlLines.length, 2);
  const subLinesCount = Math.min(subLines.length, 3);
  const hlHeight = hlLinesCount * 6;
  const subHeight = subLinesCount * 4;
  const recH = 18 + hlHeight + subHeight + 6;

  accentCard(d, M, y, CW, recH, acc, accBg, accBdr);

  badgePill(d, PATH_CFG[pt].badgeLabel, M + 8, y + 6, acc, T.surface, accBdr);

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(13);
  d.text(hlLines.slice(0, 2), M + 8, y + 18);

  const bodyY = y + 18 + hlHeight;
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(subLines.slice(0, 3), M + 8, bodyY);
  y += recH + 20; // Increased spacing after recommendation card

  // ── STAT CARDS — only render metrics that carry real meaning ──────────────
  const sh = 32;
  const urgentCount  = s.findings.urgentItemsCount;
  const stormCount   = s.findings.stormRelatedItemsCount;
  const monitorCount = s.findings.monitorItemsCount;
  const photoCount   = (s.photoAssets?.filter(p=>p.selectedForSummary).length ?? 0)
                     + (s.photos?.filter(p=>p.selectedForSummary).length ?? 0);

  type StatDef = { value: number | string; lbl: string; acc: C3; bg: C3; bdr: C3 };
  const statsToShow: StatDef[] = [];
  if (urgentCount  > 0) statsToShow.push({ value: urgentCount,  lbl: "Urgent items",    acc: T.red,     bg: T.redBg,   bdr: T.redBdr });
  if (stormCount   > 0) statsToShow.push({ value: stormCount,   lbl: "Storm findings",  acc: T.blue,    bg: T.blueBg,  bdr: T.blueBdr });
  if (monitorCount > 0) statsToShow.push({ value: monitorCount, lbl: "Monitor items",   acc: T.amber,   bg: T.amberBg, bdr: T.amberBdr });
  if (photoCount   > 0) statsToShow.push({ value: photoCount,   lbl: "Evidence photos", acc: T.textMid, bg: T.surface, bdr: T.border });

  if (statsToShow.length === 0) {
    // No numeric findings — show an honest "all clear" state
    const hw2 = (CW - 6) / 2;
    baseCard(d, M,          y, hw2, sh, T.greenBg, T.greenBdr);
    sf(d, T.green); d.rect(M, y, hw2, 1.5, "F");
    st(d, T.green); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
    d.text("No urgent findings", M + 6, y + 13);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
    d.text("All surfaces reviewed — inspection complete", M + 6, y + 21);

    baseCard(d, M + hw2 + 6, y, hw2, sh, T.surface, T.border);
    sf(d, acc); d.rect(M + hw2 + 6, y, hw2, 1.5, "F");
    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
    d.text("Property documented", M + hw2 + 12, y + 13);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
    d.text("Findings organized for your records", M + hw2 + 12, y + 21);
  } else {
    const visible = statsToShow.slice(0, 3);
    const sw = (CW - (visible.length - 1) * 4) / visible.length;
    visible.forEach((s2, i) => {
      statCard(d, s2.value, s2.lbl, M + i * (sw + 4), y, sw, sh, s2.acc, s2.bg, s2.bdr);
    });
  }
  y += sh + 22; // Increased spacing after stats row

  // ── INSPECTOR INFO ROW ─────────────────────────────────────────────────────
  y += 2;
  const iw = (CW - 8) / 3;
  infoRow(d, "Prepared for",    s.property.homeownerPrimaryName || "Homeowner", M,           y, iw);
  infoRow(d, "Inspection date", fmtDate(s.createdAt),                           M + iw + 4,  y, iw);
  infoRow(d, "Representative",  s.repName || "—",                               M + (iw+4)*2,y, iw);
  y += 28; // Increased spacing before the bottom report structure card

  // ── WHAT'S IN THIS REPORT ─────────────────────────────────────────────────
  rule(d, M, y, CW);
  y += 6;
  baseCard(d, M, y, CW, 24, T.surface, T.border);
  st(d, T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  d.text("WHAT'S IN THIS REPORT", M + 7, y + 8);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  const sections = "Inspection findings  ·  Property details  ·  Storm documentation  ·  Recommended next steps  ·  Agreement guidance";
  const sLines = d.splitTextToSize(sections, CW - 14) as string[];
  d.text(sLines, M + 7, y + 15);

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2 — PROPERTY DETAILS & FINDINGS OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

function renderFindingsOverview(d: jsPDF, s: SessionState, pt: PathType, acc: C3) {
  const rid = s.sessionId.slice(-8).toUpperCase();

  pageHeader(d, rid, acc, "Inspection overview");
  let y = 17;

  // Intro heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("Inspection Findings & Overview", M, y + 10);
  rule(d, M, y + 13, CW);
  y += 20;

  const hw = CW / 2 - 3;
  const col2 = M + hw + 6;

  const rows: [string, string][] = [
    ["Property",       s.property.address || "—"],
    ["Inspection date",fmtDate(s.createdAt)],
    ...(s.property.workingDateOfLoss ? [["Storm date",       fmtDate(s.property.workingDateOfLoss)] as [string,string]] : []),
    ["Inspector",      s.repName || "—"],
    ...(s.property.stormBasis       ? [["Storm basis",       s.property.stormBasis] as [string,string]] : []),
    ...(s.property.insurerNameKnown  ? [["Insurance carrier", s.property.insurerNameKnown] as [string,string]] : []),
    ...(s.property.claimNumberKnown  ? [["Claim number",      s.property.claimNumberKnown] as [string,string]] : []),
  ];

  const prios = s.buyerData?.buyerPriorities ?? [];
  const prioMap: Record<string, string> = {
    roof_longevity: "Roof longevity", insurance_process: "Insurance process",
    repair_speed: "Repair speed", cost_clarity: "Cost clarity",
    warranty_coverage: "Warranty coverage", minimal_disruption: "Minimal disruption",
  };

  // Determine dynamic height for the two top columns side-by-side
  const leftCardH = 16 + rows.length * 9.5;
  const rightCardH = prios.length > 0 ? 56 + Math.ceil(prios.length / 2) * 9.5 : 54;
  const overviewH = Math.max(leftCardH, rightCardH);

  // ── PROPERTY & INSPECTION DETAILS ─────────────────────────────────────────
  baseCard(d, M, y, hw, overviewH, T.surface, T.border);
  label(d, "Property & inspection", M + 6, y + 8, T.textFaint);
  rule(d, M + 6, y + 10.5, hw - 12, T.border);

  let rY = y + 16;
  rows.forEach(([lbl, val]) => {
    st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
    d.text(lbl, M + 6, rY);
    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
    const vLines = d.splitTextToSize(val, hw - 46) as string[];
    d.text(vLines[0], M + hw - 4, rY, { align: "right" });
    rule(d, M + 6, rY + 3, hw - 12, T.border);
    rY += 9.5;
  });

  // ── FINDING SUMMARY ───────────────────────────────────────────────────────
  baseCard(d, col2, y, hw, overviewH, T.surface, T.border);
  label(d, "Finding summary", col2 + 6, y + 8, T.textFaint);
  rule(d, col2 + 6, y + 10.5, hw - 12, T.border);

  const fsw = (hw - 14) / 3;
  [
    [s.findings.urgentItemsCount,       "Urgent",        T.red,   T.redBg,   T.redBdr],
    [s.findings.stormRelatedItemsCount, "Storm-related", T.blue,  T.blueBg,  T.blueBdr],
    [s.findings.monitorItemsCount,      "Monitor",       T.amber, T.amberBg, T.amberBdr],
  ].forEach(([cnt, lbl, col, bg, bdr], i) => {
    statCard(d, cnt as number, lbl as string, col2 + 6 + i * (fsw + 3), y + 15, fsw, 32,
      col as C3, bg as C3, bdr as C3);
  });

  // Homeowner priorities inside Finding Summary card
  if (prios.length > 0) {
    let pY = y + 54;
    label(d, "Homeowner priorities", col2 + 6, pY, T.textFaint);
    pY += 6;
    prios.forEach((p, i) => {
      const px = col2 + 6 + (i % 2) * ((hw - 14) / 2 + 3);
      const py = pY + Math.floor(i / 2) * 9.5;
      baseCard(d, px, py - 5, (hw - 16) / 2, 8, T.surface, T.border);
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
      d.text(prioMap[p] ?? p.replace(/_/g, " "), px + 4, py);
    });
  }
  y += overviewH + 8;

  // ── WEATHER EVENTS ────────────────────────────────────────────────────────
  if (pt === "carrier_review" && (s.findings.stormSummary || (s.findings.weatherEvents ?? []).length > 0)) {
    const stLines = s.findings.stormSummary ? d.splitTextToSize(s.findings.stormSummary, CW - 14) as string[] : [];
    const events = s.findings.weatherEvents ?? [];
    const tableHeight = events.length > 0 ? 12 + events.length * 7 + 4 : 0;
    const weatherH = 15 + Math.min(stLines.length, 3) * 4.5 + tableHeight + 4;

    baseCard(d, M, y, CW, weatherH, T.surface, T.border);
    sf(d, acc); d.rect(M, y, CW, 1.5, "F");
    label(d, "Weather event documentation", M + 6, y + 9, acc);
    rule(d, M + 6, y + 11.5, CW - 12, T.border);

    if (s.findings.stormSummary) {
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
      d.text(stLines.slice(0, 3), M + 6, y + 16);
    }

    if (events.length > 0) {
      autoTable(d, {
        startY: y + 16 + Math.min(stLines.length, 3) * 4.5 + 2,
        margin: { left: M + 5 }, tableWidth: CW - 10,
        head: [["Date / time", "Reference", "Property relevance"]],
        body: events.map(e => [e.time, e.reference, e.relevance]),
        theme: "plain",
        headStyles:   { fillColor: [250,249,246], textColor: [80,76,70], fontSize: 6.5, fontStyle: "bold" },
        styles:       { fillColor: [255,255,255], textColor: [26,25,23],   fontSize: 7,   cellPadding: 2, lineColor: [228,225,218], lineWidth: 0.15 },
        alternateRowStyles: { fillColor: [250,249,246] },
      });
    }
    y += weatherH + 8;
  }

  // ── VALUE CHIPS ──────────────────────────────────────────────────────────
  const chips: [string, string][] = [];
  if (s.findings.estimatedClaimValue)    chips.push(["Estimated value",  s.findings.estimatedClaimValue]);
  if (s.findings.roofingArea)            chips.push(["Roof area",        `${s.findings.roofingArea} SF`]);
  if (s.pathData.manufacturerSelected)   chips.push(["Manufacturer",     s.pathData.manufacturerSelected]);
  if (s.pathData.warrantyOptionSelected) chips.push(["Warranty",         s.pathData.warrantyOptionSelected]);

  if (chips.length > 0) {
    const cw = (CW - (chips.length - 1) * 4) / chips.length;
    chips.forEach(([lbl, val], i) => {
      const cx = M + i * (cw + 4);
      baseCard(d, cx, y, cw, 22, T.surface, T.border);
      sf(d, acc); d.rect(cx, y, cw, 1.5, "F");
      st(d, T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
      d.text(lbl.toUpperCase(), cx + 6, y + 9);
      st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(10);
      d.text(val, cx + 6, y + 18);
    });
  }

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3 — RECOMMENDATION & FINDINGS DETAIL
// ─────────────────────────────────────────────────────────────────────────────

function renderRecommendation(d: jsPDF, s: SessionState, pt: PathType, acc: C3) {
  const accBg  = getAccentBg(pt);
  const accBdr = getAccentBdr(pt);
  const rid    = s.sessionId.slice(-8).toUpperCase();
  const cfg    = PATH_CFG[pt];

  pageHeader(d, rid, acc, "Recommendation");
  let y = 17;

  // Intro heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("Recommended Routing & Action", M, y + 10);
  rule(d, M, y + 13, CW);
  y += 20;

  // ── HERO BANNER ────────────────────────────────────────────────────────────
  const heroH = 48;
  sf(d, accBg); d.roundedRect(M, y, CW, heroH, 2, 2, "F");
  sd(d, accBdr); d.setLineWidth(0.3); d.roundedRect(M, y, CW, heroH, 2, 2, "S");
  sf(d, acc); d.rect(M, y, 4, heroH, "F");         // left accent

  badgePill(d, cfg.badgeLabel, M + 10, y + 6, acc, T.surface, accBdr);

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(14);
  const heroHL = d.splitTextToSize(cfg.headline, CW - 20) as string[];
  d.text(heroHL.slice(0, 2), M + 10, y + 19);

  const heroSubY = y + 19 + Math.min(heroHL.length, 2) * 7 + 2;
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
  const heroSub = d.splitTextToSize(cfg.subhead, CW - 20) as string[];
  d.text(heroSub.slice(0, 2), M + 10, heroSubY);

  y += heroH + 6;

  // ── EVIDENCE CONFIDENCE BAR ────────────────────────────────────────────────
  const photoCountR = (s.photoAssets?.filter(p => p.selectedForSummary).length ?? 0)
                    + (s.photos?.filter(p => p.selectedForSummary).length ?? 0);
  const confSegments: boolean[] = [
    s.findings.stormRelatedItemsCount > 0,
    photoCountR > 0,
    (s.findings.weatherEvents ?? []).length > 0 || !!s.findings.stormSummary,
    s.findings.urgentItemsCount > 0 || s.findings.monitorItemsCount > 0,
    !!s.findings.summaryBody,
  ];
  const filledCount = confSegments.filter(Boolean).length;

  baseCard(d, M, y, CW, 20, T.surface, T.border);
  label(d, "Evidence confidence", M + 6, y + 9, T.textFaint);
  confidenceBar(d, M + 74, y + 5.5, CW - 80, filledCount, 5, acc);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6);
  d.text(`${filledCount} of 5 evidence types documented`, M + 74, y + 17);

  y += 26;

  // ── TWO COLUMNS — what it means + credibility ──────────────────────────────
  const hw = CW / 2 - 3;
  const col2 = M + hw + 6;
  const colH = 86;

  baseCard(d, M, y, hw, colH, accBg, accBdr);
  sf(d, acc); d.rect(M, y, 3, colH, "F");
  label(d, "What this finding means", M + 8, y + 9, acc);
  rule(d, M + 8, y + 11.5, hw - 16, accBdr);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
  const wmLines = d.splitTextToSize(cfg.whatMeans, hw - 16) as string[];
  d.text(wmLines.slice(0, 8), M + 8, y + 18);

  baseCard(d, col2, y, hw, colH, T.surface, T.border);
  label(d, "What we want you to know", col2 + 6, y + 9, T.textFaint);
  rule(d, col2 + 6, y + 11.5, hw - 12, T.border);

  let cY = y + 18;
  cfg.credibilityLines.forEach(line => {
    const isPositive = line.startsWith("We are saying");
    const lbg: C3  = isPositive ? accBg   : T.surface;
    const lbdr: C3 = isPositive ? accBdr  : T.border;
    const ll = d.splitTextToSize(line, hw - 20) as string[];
    const lh = 8 + ll.length * 3.8;
    baseCard(d, col2 + 5, cY - 4, hw - 10, lh, lbg, lbdr);
    if (isPositive) { sf(d, acc); d.rect(col2 + 5, cY - 4, 2.5, lh, "F"); }
    st(d, isPositive ? T.text : T.textMid);
    d.setFont("helvetica", isPositive ? "bold" : "normal"); d.setFontSize(7.5);
    d.text(ll, col2 + 11, cY + 1);
    cY += lh + 2;
  });

  y += colH + 8;

  // ── RECOMMENDED NEXT STEP — prominent CTA strip ────────────────────────────
  const ctaH = 28;
  baseCard(d, M, y, CW, ctaH, T.surface, T.border);
  sf(d, acc); d.rect(M, y, CW, 2, "F");
  label(d, "Recommended next step", M + 6, y + 11, acc);
  st(d, T.text); d.setFont("helvetica", "normal"); d.setFontSize(8);
  const nsLines = d.splitTextToSize(cfg.nextStep, CW - 14) as string[];
  d.text(nsLines.slice(0, 2), M + 6, y + 20);

  y += ctaH + 6;

  // ── COVERAGE NOTICE ───────────────────────────────────────────────────────
  const coverageH = 22;
  baseCard(d, M, y, CW, coverageH, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 3, coverageH, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Coverage notice:", M + 8, y + 8);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
  const gLines = d.splitTextToSize(
    "Your insurance provider reviews the documented findings and makes the final coverage determination under your policy. This report documents observed conditions and does not guarantee any specific outcome.",
    CW - 14
  ) as string[];
  d.text(gLines.slice(0, 2), M + 8, y + 15);

  y += coverageH + 8;

  // ── SUMMARY BODY (optional) ───────────────────────────────────────────────
  if ((s.findings.summaryBody || s.findings.summaryHeadline) && y + 44 < PH - 20) {
    baseCard(d, M, y, CW, 44, T.surface, T.border);
    sf(d, acc); d.rect(M, y, 3, 44, "F");
    if (s.findings.summaryHeadline) {
      st(d, T.text); d.setFont("times", "bold"); d.setFontSize(12);
      d.text(s.findings.summaryHeadline, M + 8, y + 10);
    }
    if (s.findings.summaryBody) {
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
      const sbLines = d.splitTextToSize(s.findings.summaryBody, CW - 14) as string[];
      d.text(sbLines.slice(0, 3), M + 8, s.findings.summaryHeadline ? y + 20 : y + 10);
    }
    y += 52;
  }

  // ── CATEGORY CHIPS (optional) ─────────────────────────────────────────────
  const cats = s.findings.findingCategories ?? [];
  if (cats.length > 0 && y + 22 < PH - 20) {
    const catMap: Record<string,string> = {
      urgent: "Urgent", storm_related: "Storm-related", monitor_only: "Monitor",
      general: "General", shingle: "Shingles", ridge: "Ridge",
      soft_metal: "Soft metals", siding: "Siding", screen: "Screens",
      gutter: "Gutters", flashing: "Flashing", urgent_protection: "Urgent protection",
    };
    label(d, "Documented categories", M, y, T.textFaint);
    y += 6;
    const catW = (CW - (Math.min(cats.length, 6) - 1) * 4) / Math.min(cats.length, 6);
    cats.slice(0, 6).forEach((cat, i) => {
      const cx = M + i * (catW + 4);
      baseCard(d, cx, y, catW, 13, T.surface2, T.border);
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
      d.text(catMap[cat] ?? cat.replace(/_/g, " "), cx + catW / 2, y + 9, { align: "center" });
    });
  }

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4+ — EVIDENCE GALLERY
// ─────────────────────────────────────────────────────────────────────────────

async function renderEvidenceGallery(d: jsPDF, photos: PdfPhoto[], pt: PathType, acc: C3, rid: string) {
  if (photos.length === 0) return;

  const imgW  = (CW - 7) / 2;
  const imgH  = 50;
  const metaH = 48;
  const cardH = imgH + metaH;
  const colGap = 7;
  const rowGap = 8;

  let photoIdx = 0;
  let firstPage = true;

  while (photoIdx < photos.length) {
    d.addPage();
    pageHeader(d, rid, acc, "Evidence documentation");
    let y = 17;

    if (firstPage) {
      // Section heading
      st(d, T.text); d.setFont("times", "bold"); d.setFontSize(14);
      d.text(PATH_CFG[pt].proofLabel, M, y + 8);
      rule(d, M, y + 11, CW);
      y += 18;
      firstPage = false;
    }

    const chunk = photos.slice(photoIdx, photoIdx + 4);

    for (let i = 0; i < chunk.length; i++) {
      const photo = chunk[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx  = M + col * (imgW + colGap);
      const cy  = y + row * (cardH + rowGap);

      const pc    = classifyPdfPhoto(photo.label ?? "", photo.category ?? "", photo.description ?? "");
      const badge = photoBadge(pc, pt);

      // ── CARD SHELL ─────────────────────────────────────────────────────────
      baseCard(d, cx, cy, imgW, cardH, T.surface, badge.bdr);

      // ── PHOTO ──────────────────────────────────────────────────────────────
      try {
        const compressed = await compressImage(photo.dataUrl, 650);
        d.addImage(compressed, "JPEG", cx, cy, imgW, imgH, undefined, "FAST");

        // Annotations
        if (photo.annotations && photo.annotations.length > 0) {
          d.setLineWidth(0.6);
          for (const ann of photo.annotations) {
            const ac: C3 = ann.color === "#ef4444" ? T.red : T.blue;
            sd(d, ac);
            if (ann.type === "circle") {
              d.circle(cx + ann.x * imgW / 100, cy + ann.y * imgH / 100, (ann.radius ?? 5) * imgW / 100, "S");
            } else if (ann.type === "arrow") {
              d.line(cx + ann.x * imgW / 100, cy + ann.y * imgH / 100, cx + (ann.toX ?? ann.x) * imgW / 100, cy + (ann.toY ?? ann.y) * imgH / 100);
            } else if (ann.type === "label" && ann.text) {
              sf(d, ac); d.rect(cx + ann.x * imgW / 100 - 10, cy + ann.y * imgH / 100 - 3.5, 20, 7, "F");
              st(d, [255,255,255] as C3); d.setFontSize(5.5);
              d.text(ann.text.toUpperCase(), cx + ann.x * imgW / 100, cy + ann.y * imgH / 100 + 1.5, { align: "center" });
            }
          }
        }

        // Subtle bottom scrim for badge legibility
        sf(d, T.surface);
        d.rect(cx, cy + imgH - 12, imgW, 12, "F");

      } catch (_) {
        sf(d, T.surface2); d.rect(cx, cy, imgW, imgH, "F");
        st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
        d.text("Photo unavailable", cx + imgW / 2, cy + imgH / 2, { align: "center" });
      }

      // Badge on image
      badgePill(d, badge.label, cx + 3, cy + imgH - 10, badge.color, badge.bg, badge.bdr);

      // Photo number
      st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6);
      d.text(`${photoIdx + i + 1}`, cx + imgW - 4, cy + imgH - 4, { align: "right" });

      // ── CAPTION ZONE ───────────────────────────────────────────────────────
      const capY = cy + imgH + 2;

      const capTxt = photo.label || photo.description || badge.label;
      st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8);
      d.text(d.splitTextToSize(capTxt, imgW - 8)[0] as string, cx + 4, capY + 7);

      // Why it matters
      rule(d, cx + 4, capY + 10, imgW - 8, T.border);
      st(d, badge.color); d.setFont("helvetica", "bold"); d.setFontSize(6);
      d.text("Why it matters", cx + 4, capY + 16);
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
      const whyLines = d.splitTextToSize(badge.why, imgW - 8) as string[];
      d.text(whyLines.slice(0, 2), cx + 4, capY + 22);

      // Inspector note
      if (photo.description) {
        rule(d, cx + 4, capY + 31, imgW - 8, T.border);
        st(d, T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6);
        d.text("Inspector note", cx + 4, capY + 37);
        st(d, T.textMid); d.setFont("helvetica", "italic"); d.setFontSize(7);
        const noteLines = d.splitTextToSize(`"${photo.description}"`, imgW - 8) as string[];
        d.text(noteLines[0] as string, cx + 4, capY + 43);
      }
    }

    pageFooter(d);
    photoIdx += 4;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW THE PROCESS WORKS
// ─────────────────────────────────────────────────────────────────────────────

function renderHowItWorks(d: jsPDF, acc: C3, rid: string) {
  pageHeader(d, rid, acc, "Process overview");
  let y = 17;

  // Intro heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("How the process works", M, y + 10);
  rule(d, M, y + 13, CW);
  y += 20;

  // Info bar
  baseCard(d, M, y, CW, 14, T.blueBg, T.blueBdr);
  sf(d, T.blue); d.rect(M, y, 3, 14, "F");
  st(d, T.blue); d.setFont("helvetica", "normal"); d.setFontSize(8);
  const infoLines = d.splitTextToSize("Reading this page doesn't commit you to anything. Review the four steps below, then decide whether to move forward.", CW - 14) as string[];
  d.text(infoLines, M + 8, y + 5.5);
  y += 20;

  // 2×2 step cards
  const cw = (CW - 6) / 2;
  const ch = 56;

  HOW_IT_WORKS.forEach((step, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx  = M + col * (cw + 6);
    const cy  = y + row * (ch + 6);

    baseCard(d, cx, cy, cw, ch, T.surface, T.border);
    sf(d, acc); d.rect(cx, cy, cw, 1.5, "F");

    // Step number
    st(d, T.border); d.setFont("times", "normal"); d.setFontSize(28);
    d.text(step.num, cx + cw - 8, cy + 18, { align: "right" });

    // Icon circle
    baseCard(d, cx + 6, cy + 7, 14, 14, T.blueBg, T.blueBdr);
    sf(d, acc); d.circle(cx + 13, cy + 14, 3, "F");

    // Headline
    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(9.5);
    d.text(step.headline, cx + 6, cy + 28);

    // Body
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    const bLines = d.splitTextToSize(step.body, cw - 12) as string[];
    d.text(bLines.slice(0, 4), cx + 6, cy + 36);
  });

  y += ch * 2 + 6 + 14;

  // Important notice
  baseCard(d, M, y, CW, 24, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 3, 24, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Important to know:", M + 8, y + 9);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  const noticeLines = d.splitTextToSize(
    "This agreement does not guarantee claim approval, coverage, deductible waiver, a free roof, or construction start. Your insurance provider makes all coverage decisions under your policy.",
    CW - 14
  ) as string[];
  d.text(noticeLines.slice(0, 2), M + 8, y + 16);

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREEMENT REVIEW
// ─────────────────────────────────────────────────────────────────────────────

function renderAgreementReview(d: jsPDF, s: SessionState, acc: C3) {
  const rid = s.sessionId.slice(-8).toUpperCase();
  pageHeader(d, rid, acc, "Agreement review");
  let y = 17;

  // Section heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("Insurance Contingency Agreement", M, y + 10);
  rule(d, M, y + 13, CW);
  y += 20;

  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(9);
  d.text("Before authorizing, here's the agreement in plain language.", M, y);
  y += 10;

  // Plain-English 3 cards
  const pcw = (CW - 8) / 3;
  const pch = 68;
  PLAIN_ENGLISH.forEach((card, i) => {
    const cx = M + i * (pcw + 4);
    baseCard(d, cx, y, pcw, pch, T.surface, T.border);
    sf(d, acc); d.rect(cx, y, pcw, 1.5, "F");

    // Icon
    baseCard(d, cx + 6, y + 7, 14, 14, T.blueBg, T.blueBdr);
    sf(d, acc); d.circle(cx + 13, y + 14, 3, "F");

    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8);
    const titleLines = d.splitTextToSize(card.title, pcw - 12) as string[];
    d.text(titleLines, cx + 6, y + 27);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    const cLines = d.splitTextToSize(card.body, pcw - 12) as string[];
    d.text(cLines.slice(0, 8), cx + 6, y + 27 + titleLines.length * 5);
  });
  y += pch + 10;

  // Wisconsin notice
  const wLines = WISCONSIN_CLAIM_NOTICE.lines;
  const wH = 14 + wLines.length * 5.2;
  baseCard(d, M, y, CW, wH, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 3, wH, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text(WISCONSIN_CLAIM_NOTICE.heading, M + 8, y + 8);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
  wLines.forEach((line, i) => { d.text(`• ${line}`, M + 8, y + 14 + i * 5.2, { maxWidth: CW - 16 }); });
  y += wH + 12;

  // Force page break so that the full agreement text starts on a fresh page
  pageFooter(d);
  d.addPage();
  pageHeader(d, rid, acc, "Agreement details");
  y = 17;

  // Agreement text header
  rule(d, M, y, CW);
  y += 5;
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(9);
  d.text("Full agreement text — Insurance Contingency Agreement", M, y);
  y += 8;
  rule(d, M, y, CW);
  y += 6;

  const newPage = () => {
    pageFooter(d);
    d.addPage();
    pageHeader(d, rid, acc, "Agreement (continued)");
    y = 17;
  };

  AGREEMENT_SECTIONS.forEach((sec, secIdx) => {
    const bodyLines = d.splitTextToSize(sec.body, CW - 30) as string[];
    const cardH = 9 + bodyLines.length * 4.4 + 14;
    if (y + cardH > PH - 14) newPage();

    const cardBg: C3 = secIdx % 2 === 0 ? T.surface : T.surface2;
    baseCard(d, M, y, CW, cardH, cardBg, T.border);

    // Numbered circle badge
    sectionNumBadge(d, secIdx + 1, M + 9, y + cardH / 2, 5, acc);

    // Accent top bar
    sf(d, acc); d.rect(M, y, CW, 1.5, "F");

    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
    d.text(sec.heading, M + 20, y + 10);

    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    d.text(bodyLines, M + 20, y + 16);

    y += cardH + 3;
  });

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION & SIGNATURE
// ─────────────────────────────────────────────────────────────────────────────

function renderSignature(d: jsPDF, s: SessionState, acc: C3) {
  const rid = s.sessionId.slice(-8).toUpperCase();
  pageHeader(d, rid, acc, "Authorization");
  let y = 17;

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("Authorization & Signature", M, y + 10);
  rule(d, M, y + 13, CW);
  y += 22;

  const sig      = s.signatureData;
  const isSigned = !!(sig.signatureImage && sig.signedAt);

  // Status badge
  const statusColor  = isSigned ? T.green  : T.amber;
  const statusBg     = isSigned ? T.greenBg : T.amberBg;
  const statusBdr    = isSigned ? T.greenBdr : T.amberBdr;
  const statusLabel  = isSigned ? "Agreement executed" : "Signature pending";
  badgePill(d, statusLabel, M, y, statusColor, statusBg, statusBdr, 72);
  y += 14;

  const hw = CW / 2 - 3;
  const col2 = M + hw + 6;

  if (isSigned) {
    baseCard(d, M,    y, hw, 26, T.surface, T.border);
    baseCard(d, col2, y, hw, 26, T.surface, T.border);
    infoRow(d, "Signer name",  sig.signerName || "On file",         M    + 6, y + 8, hw - 10);
    infoRow(d, "Signed at",    fmtDT(sig.signedAt),                 col2 + 6, y + 8, hw - 10);
    y += 32;

    baseCard(d, M,    y, hw, 26, T.surface, T.border);
    baseCard(d, col2, y, hw, 26, T.surface, T.border);
    infoRow(d, "Signer email", sig.signerEmail || "Not provided",   M    + 6, y + 8, hw - 10);
    infoRow(d, "Property",     s.property.address || "On file",     col2 + 6, y + 8, hw - 10);
    y += 32;

    if (sig.signatureImage) {
      label(d, "Authorized owner signature", M, y, T.textFaint);
      y += 5;
      try { d.addImage(sig.signatureImage, "PNG", M, y, 80, 30); } catch (_) {}
      rule(d, M, y + 30, 80, T.borderMid);
      y += 38;
    }

    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
    d.text("Agreed to: Insurance Contingency Agreement — Hustad Companies, Inc.", M, y);
    y += 14;

  } else {
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(9);
    d.text("Signature has not yet been collected. Authorization is not complete.", M, y);
    y += 10;
    if (sig.deferralReason) {
      st(d, T.textFaint); d.setFont("helvetica", "italic"); d.setFontSize(8.5);
      d.text(`Deferral note: ${sig.deferralReason}`, M, y + 6);
      y += 16;
    }
  }

  // Signature lines
  y += 10;
  sd(d, T.borderMid); d.setLineWidth(0.5);
  d.line(M, y, M + 88, y);
  d.line(PW - M - 88, y, PW - M, y);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("Authorized owner signature / date", M, y + 5);
  d.text("Hustad Companies authorized signatory / date", PW - M - 88, y + 5);
  y += 24;

  // Final notice
  const g1 = "Final work begins only after final scope, materials, schedule, and homeowner responsibilities are confirmed in writing.";
  const g2 = "Your insurance provider determines coverage. Hustad Companies makes no guarantee of claim approval or specific outcome.";
  const gl = [...(d.splitTextToSize(g1, CW - 14) as string[]), ...(d.splitTextToSize(g2, CW - 14) as string[])];
  const gH = 12 + gl.length * 4.8;
  baseCard(d, M, y, CW, gH, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 3, gH, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Final work authorization:", M + 8, y + 8);
  st(d, T.textMid); d.setFont("helvetica", "normal");
  d.text(gl, M + 8, y + 14);

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO COLLECTION
// ─────────────────────────────────────────────────────────────────────────────

async function collectPhotos(s: SessionState): Promise<PdfPhoto[]> {
  const result: PdfPhoto[] = [];
  for (const p of (s.photoAssets ?? []).filter(a => a.selectedForSummary && !a.isSensitive)) {
    result.push({ dataUrl: p.dataUrl, label: p.caption, category: p.category, severity: p.severity, annotations: p.annotations ?? [], description: undefined });
  }
  for (const p of (s.photos ?? []).filter(ph => ph.selectedForSummary)) {
    let dataUrl = p.remoteUrl ?? p.localUri;
    if (!dataUrl) {
      const blob = await getPhotoBlob(p.storageKey);
      if (blob) dataUrl = await blobToBase64(blob);
    }
    if (dataUrl) result.push({ dataUrl, label: p.label, category: p.category, description: p.description });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

async function generateReport(session: SessionState): Promise<jsPDF> {
  const doc    = new jsPDF({ compress: true });
  const photos = await collectPhotos(session);
  const pt     = derivePathType(session);
  const acc    = getAccent(pt);
  const rid    = session.sessionId.slice(-8).toUpperCase();

  renderCover(doc, session, pt, acc);
  doc.addPage(); renderFindingsOverview(doc, session, pt, acc);
  doc.addPage(); renderRecommendation(doc, session, pt, acc);
  await renderEvidenceGallery(doc, photos, pt, acc, rid);
  doc.addPage(); renderHowItWorks(doc, acc, rid);
  doc.addPage(); renderAgreementReview(doc, session, acc);
  doc.addPage(); renderSignature(doc, session, acc);

  // Add professional Page X of Y numbers on all pages in a second pass
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    st(doc, T.textFaint); doc.setFont("helvetica", "normal"); doc.setFontSize(5.8);
    doc.text(`Page ${i} of ${totalPages}`, PW - M, PH - 4, { align: "right" });
  }

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the PDF as raw base64 (no data-URI prefix). Used for email delivery. */
export async function getSummaryPDFBase64(session: SessionState): Promise<string> {
  const doc = await generateReport(session);
  return doc.output("datauristring").split(",")[1];
}

/** Triggers a browser download. */
export async function downloadSummaryPDF(session: SessionState) {
  const doc  = await generateReport(session);
  const name = (session.property.homeownerPrimaryName || "Homeowner").replace(/\s+/g, "_");
  doc.save(`Hustad_Inspection_Report_${name}_${session.sessionId.slice(-6).toUpperCase()}.pdf`);
}
