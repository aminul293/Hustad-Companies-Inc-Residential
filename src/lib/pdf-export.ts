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
  annotations?: Array<{ type: string; x: number; y: number; toX?: number; toY?: number; radius?: number; color: string; text?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const PATH_CFG: Record<PathType, {
  badgeLabel: string; headline: string; subhead: string;
  whatMeans: string; nextStep: string; credibilityLines: string[];
  proofLabel: string; showWeather: boolean;
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
  { num: "01", headline: "Document damage",              body: "Hustad has completed the exterior inspection and organized all findings, photos, and documentation into a structured report prepared for carrier review." },
  { num: "02", headline: "Coordinate carrier review",    body: "If you authorize, Hustad will coordinate the carrier inspection process and present the documented findings clearly to your insurer. Hustad does not negotiate your claim." },
  { num: "03", headline: "Confirm scope and coverage",   body: "Your insurance carrier reviews the documented evidence and makes the coverage determination under your policy. Hustad cannot predict or guarantee any coverage outcome." },
  { num: "04", headline: "Move forward only if you agree", body: "No repair work begins until your carrier issues a written determination, you confirm the scope, and you authorize production in writing. You stay in control at every step." },
];

const PLAIN_ENGLISH = [
  { title: "What this agreement does",        body: "This agreement authorizes Hustad to prepare storm documentation, coordinate with your insurance carrier, and serve as your selected contractor for covered exterior restoration work — if the claim is approved and the final scope is confirmed with you." },
  { title: "What this agreement does not do", body: "This does not guarantee claim approval, coverage amount, payment timing, or final carrier scope. Your insurance carrier makes all coverage decisions under your policy." },
  { title: "Your financial responsibility",   body: "Your deductible, any depreciation holds, and non-covered items remain your financial responsibility regardless of the claim outcome. No work begins until you approve the final scope in writing." },
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  // Page surfaces
  pageBg:    [248, 247, 243] as C3,
  surface:   [255, 255, 255] as C3,
  surface2:  [250, 249, 246] as C3,
  surface3:  [243, 242, 238] as C3,

  // Cover header — deep navy band
  headerBg:  [13,  21,  37]  as C3,
  headerMid: [40,  58,  88]  as C3,
  headerDim: [100, 120, 155] as C3,

  // Borders
  border:    [228, 225, 218] as C3,
  borderMid: [208, 204, 195] as C3,

  // Typography
  text:      [26,  25,  23]  as C3,
  textMid:   [80,  76,  70]  as C3,
  textFaint: [118, 114, 107] as C3,

  // Blue — carrier review / informational
  blue:      [37,  99,  235] as C3,
  blueMid:   [96,  165, 250] as C3,
  blueBg:    [239, 246, 255] as C3,
  blueBdr:   [191, 219, 254] as C3,

  // Amber — caution / rescheduled
  amber:     [180, 83,   9]  as C3,
  amberMid:  [217, 119,  6]  as C3,
  amberBg:   [255, 251, 235] as C3,
  amberBdr:  [252, 211,  77] as C3,

  // Green — no action / complete
  green:     [22,  163,  74] as C3,
  greenBg:   [240, 253, 244] as C3,
  greenBdr:  [167, 243, 208] as C3,

  // Red — urgent
  red:       [220, 38,   38] as C3,
  redBg:     [254, 242, 242] as C3,
  redBdr:    [252, 165, 165] as C3,
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
const M   = 18;          // page margin
const PW  = 210;
const PH  = 297;
const CW  = PW - M * 2; // 174 — content width
const HDR = 52;          // cover dark header band height

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function derivePathType(s: SessionState): PathType {
  const o = s.findings.outcomeType;
  const u = s.findings.urgentItemsCount;
  if (u > 0 || o === "repair_only")                                         return "urgent_repair";
  if (o === "claim_review_candidate" || o === "full_restoration_candidate") return "carrier_review";
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
    case "urgent":      return { label: "Urgent protection", color: T.red,       bg: T.redBg,    bdr: T.redBdr,   why: "Creates a near-term risk of water entry or additional property damage. Should be addressed promptly." };
    case "storm":       return { label: "Storm evidence",    color: T.blue,      bg: T.blueBg,   bdr: T.blueBdr,  why: pt === "carrier_review" ? "Supports the carrier review recommendation. Provides the type of documentation a carrier inspection requires." : "Documents storm-related impact on the property surface." };
    case "repair":      return { label: "Repair item",       color: T.blue,      bg: T.blueBg,   bdr: T.blueBdr,  why: "Can be addressed with a targeted repair. Doesn't require a full system decision." };
    case "maintenance": return { label: "Maintenance",       color: T.amber,     bg: T.amberBg,  bdr: T.amberBdr, why: "Doesn't support an insurance action today. Recommended to protect system life and drainage." };
    case "monitor":     return { label: "Monitor",           color: T.amber,     bg: T.amberBg,  bdr: T.amberBdr, why: "No action needed today. Documented as a baseline for comparison after any future storm event." };
    default:            return { label: "Overview",          color: T.textFaint, bg: T.surface2, bdr: T.border,   why: "General property and roof surface context for the inspection record." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
function sf(d: jsPDF, c: C3) { d.setFillColor(c[0], c[1], c[2]); }
function sd(d: jsPDF, c: C3) { d.setDrawColor(c[0], c[1], c[2]); }
function st(d: jsPDF, c: C3) { d.setTextColor(c[0], c[1], c[2]); }

function baseCard(d: jsPDF, x: number, y: number, w: number, h: number, bg?: C3, bdr?: C3) {
  sf(d, bg ?? T.surface);
  d.roundedRect(x, y, w, h, 2, 2, "F");
  sd(d, bdr ?? T.border);
  d.setLineWidth(0.18);
  d.roundedRect(x, y, w, h, 2, 2, "S");
}

function accentCard(d: jsPDF, x: number, y: number, w: number, h: number, accent: C3, bg: C3, bdr: C3) {
  sf(d, bg);
  d.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  sd(d, bdr);
  d.setLineWidth(0.22);
  d.roundedRect(x, y, w, h, 2.5, 2.5, "S");
  sd(d, accent);
  d.setLineWidth(2);
  d.line(x + 1.4, y + 4, x + 1.4, y + h - 4);
}

function statCard(d: jsPDF, value: string | number, label: string, x: number, y: number, w: number, h: number, accent: C3, bg: C3, bdr: C3) {
  baseCard(d, x, y, w, h, bg, bdr);
  sf(d, accent); d.rect(x, y, w, 2, "F");
  st(d, accent); d.setFont("times", "bold"); d.setFontSize(28);
  d.text(String(value), x + w / 2, y + h * 0.58, { align: "center" });
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
  d.text(label, x + w / 2, y + h - 5.5, { align: "center" });
}

function badgePill(d: jsPDF, label: string, x: number, y: number, color: C3, bg: C3, bdr: C3, minW?: number): number {
  const tw = (d.getStringUnitWidth(label) * 7) / (d.internal.scaleFactor ?? 2.83);
  const w  = Math.max(tw + 14, minW ?? 0);
  const h  = 7.5;
  sf(d, bg); d.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  sd(d, bdr); d.setLineWidth(0.2); d.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  sf(d, color); d.circle(x + 5, y + h / 2, 1.3, "F");
  st(d, color); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  d.text(label, x + 9, y + 5.2);
  return w;
}

function microLabel(d: jsPDF, text: string, x: number, y: number, color?: C3) {
  st(d, color ?? T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  d.text(text.toUpperCase(), x, y);
}

function sectionNumBadge(d: jsPDF, num: number, cx: number, cy: number, r: number, accent: C3) {
  sf(d, accent); d.circle(cx, cy, r, "F");
  st(d, [255, 255, 255] as C3); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text(String(num), cx, cy + 2.1, { align: "center" });
}

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
// PAGE CHROME — header / footer identical on every interior page
// ─────────────────────────────────────────────────────────────────────────────
function interiorPageBg(d: jsPDF) {
  sf(d, T.pageBg); d.rect(0, 0, PW, PH, "F");
}

function pageHeader(d: jsPDF, rid: string, acc: C3, section: string) {
  interiorPageBg(d);
  // Accent top bar
  sf(d, acc); d.rect(0, 0, PW, 1.2, "F");
  // Left: brand
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Hustad", M, 9.5);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("Madison Residential", M + 14, 9.5);
  // Center: section name
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text(section, PW / 2, 9.5, { align: "center" });
  // Right: report ID
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(`Report ${rid}`, PW - M, 9.5, { align: "right" });
  // Hairline rule
  sf(d, T.border); d.rect(0, 12.5, PW, 0.2, "F");
}

function pageFooter(d: jsPDF) {
  sf(d, T.border); d.rect(0, PH - 10, PW, 0.2, "F");
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(5.8);
  d.text("Hustad Companies, Inc.  ·  Homeowner Inspection Report  ·  Confidential", M, PH - 4);
}

function infoRow(d: jsPDF, lbl: string, val: string, x: number, y: number, w: number) {
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(lbl, x, y);
  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
  const lines = d.splitTextToSize(val || "—", w) as string[];
  d.text(lines.slice(0, 2), x, y + 5.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1 — COVER
// ─────────────────────────────────────────────────────────────────────────────
function renderCover(d: jsPDF, s: SessionState, pt: PathType, acc: C3) {
  const accBg  = getAccentBg(pt);
  const accBdr = getAccentBdr(pt);
  const rid    = s.sessionId.slice(-8).toUpperCase();
  const cfg    = PATH_CFG[pt];

  // ── Full page background ──────────────────────────────────────────────────
  sf(d, T.pageBg); d.rect(0, 0, PW, PH, "F");

  // ── Dark navy header band ─────────────────────────────────────────────────
  sf(d, T.headerBg); d.rect(0, 0, PW, HDR, "F");
  // Accent stripe at very top
  sf(d, acc); d.rect(0, 0, PW, 2.5, "F");
  // Subtle horizontal mid-rule inside header
  sf(d, T.headerMid); d.rect(M, 33, CW, 0.25, "F");

  // Hustad wordmark — white
  st(d, [255, 255, 255] as C3); d.setFont("helvetica", "bold"); d.setFontSize(19);
  d.text("HUSTAD", M, 22);
  st(d, T.headerDim); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
  d.text("Madison Residential", M + 34, 22);

  // Report meta — right side of header
  st(d, T.headerDim); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text(`Report ${rid}`, PW - M, 22, { align: "right" });
  d.text(fmtDate(s.createdAt), PW - M, 30, { align: "right" });

  // "Homeowner Inspection Report" label
  st(d, T.headerDim); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("HOMEOWNER INSPECTION REPORT", M, 44);
  // Accent dot before label
  sf(d, acc); d.circle(M - 4.5, 43, 1.8, "F");

  // Property address inside header (bottom of band) if short
  if (s.property.address) {
    st(d, [200, 212, 230] as C3); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    const shortAddr = [s.property.address, s.property.cityStateZip].filter(Boolean).join("  ·  ");
    d.text(shortAddr, PW / 2, 44, { align: "center" });
  }

  // ── Content area (below header band) ─────────────────────────────────────
  let y = HDR + 12;

  // Outcome type eyebrow
  st(d, acc); d.setFont("helvetica", "bold"); d.setFontSize(7);
  d.text(cfg.badgeLabel.toUpperCase(), M, y);
  y += 9;

  // Property address — large serif headline
  const addr = s.property.address || "Property Address";
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(26);
  const addrLines = d.splitTextToSize(addr, CW * 0.78) as string[];
  d.text(addrLines.slice(0, 2), M, y);
  y += Math.min(addrLines.length, 2) * 9.5;

  if (s.property.cityStateZip) {
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(11);
    d.text(s.property.cityStateZip, M, y + 2);
    y += 10;
  }
  y += 8;

  // Thin accent rule under address block
  sf(d, acc); d.rect(M, y, 32, 1.5, "F");
  y += 8;

  // ── Outcome recommendation card ───────────────────────────────────────────
  const hlLines  = d.splitTextToSize(cfg.headline, CW - 20) as string[];
  const subLines = d.splitTextToSize(cfg.subhead,   CW - 20) as string[];
  const hlH      = Math.min(hlLines.length,  2) * 6.5;
  const subH     = Math.min(subLines.length, 2) * 4.5;
  const cardH    = 12 + 8 + hlH + 5 + subH + 10;

  accentCard(d, M, y, CW, cardH, acc, accBg, accBdr);
  badgePill(d, cfg.badgeLabel, M + 10, y + 9, acc, T.surface, accBdr);

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(13.5);
  d.text(hlLines.slice(0, 2), M + 10, y + 22);

  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(subLines.slice(0, 2), M + 10, y + 22 + hlH + 5);

  y += cardH + 10;

  // ── Stat cards ────────────────────────────────────────────────────────────
  const urgentCount  = s.findings.urgentItemsCount;
  const stormCount   = s.findings.stormRelatedItemsCount;
  const monitorCount = s.findings.monitorItemsCount;
  const photoCount   = (s.photoAssets?.filter(p => p.selectedForSummary).length ?? 0)
                     + (s.photos?.filter(p => p.selectedForSummary).length ?? 0);

  type StatDef = { value: number | string; lbl: string; acc: C3; bg: C3; bdr: C3 };
  const stats: StatDef[] = [];
  if (urgentCount  > 0) stats.push({ value: urgentCount,  lbl: "Urgent items",    acc: T.red,     bg: T.redBg,   bdr: T.redBdr   });
  if (stormCount   > 0) stats.push({ value: stormCount,   lbl: "Storm findings",  acc: T.blue,    bg: T.blueBg,  bdr: T.blueBdr  });
  if (monitorCount > 0) stats.push({ value: monitorCount, lbl: "Monitor items",   acc: T.amber,   bg: T.amberBg, bdr: T.amberBdr });
  if (photoCount   > 0) stats.push({ value: photoCount,   lbl: "Evidence photos", acc: T.textMid, bg: T.surface, bdr: T.border   });

  const sh = 36;
  if (stats.length > 0) {
    const vis = stats.slice(0, 4);
    const sw  = (CW - (vis.length - 1) * 5) / vis.length;
    vis.forEach((s2, i) => statCard(d, s2.value, s2.lbl, M + i * (sw + 5), y, sw, sh, s2.acc, s2.bg, s2.bdr));
  } else {
    baseCard(d, M, y, CW, sh, T.greenBg, T.greenBdr);
    sf(d, T.green); d.rect(M, y, CW, 2, "F");
    st(d, T.green); d.setFont("helvetica", "bold"); d.setFontSize(9.5);
    d.text("No urgent findings — inspection complete", M + CW / 2, y + sh / 2 + 3, { align: "center" });
  }
  y += sh + 10;

  // ── Inspector metadata strip ──────────────────────────────────────────────
  const metaH = 28;
  baseCard(d, M, y, CW, metaH, T.surface, T.border);
  const iw = (CW - 12) / 3;
  // Vertical dividers
  sf(d, T.border);
  d.rect(M + iw + 6, y + 6, 0.2, metaH - 12, "F");
  d.rect(M + (iw + 6) * 2, y + 6, 0.2, metaH - 12, "F");

  infoRow(d, "Prepared for",    s.property.homeownerPrimaryName || "Homeowner", M + 6,                y + 6, iw);
  infoRow(d, "Inspection date", fmtDate(s.createdAt),                           M + iw + 12,          y + 6, iw);
  infoRow(d, "Representative",  s.repName || "—",                               M + (iw + 6) * 2 + 6, y + 6, iw);
  y += metaH + 10;

  // ── Contents strip ────────────────────────────────────────────────────────
  sf(d, T.surface2); d.roundedRect(M, y, CW, 18, 2, 2, "F");
  sd(d, T.border); d.setLineWidth(0.15); d.roundedRect(M, y, CW, 18, 2, 2, "S");
  st(d, T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("THIS REPORT INCLUDES", M + 8, y + 7);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
  d.text("Inspection findings  ·  Evidence photographs  ·  Our recommendation  ·  Process guide  ·  Agreement guidance", M + 8, y + 14);

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2 — PROPERTY DETAILS & FINDINGS OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
function renderFindingsOverview(d: jsPDF, s: SessionState, pt: PathType, acc: C3) {
  const rid = s.sessionId.slice(-8).toUpperCase();
  pageHeader(d, rid, acc, "Inspection overview");
  let y = 16;

  // Section heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(18);
  d.text("Inspection Findings & Property Detail", M, y + 11);
  sf(d, acc); d.rect(M, y + 14, 28, 1.5, "F");
  y += 22;

  const hw   = CW / 2 - 3;
  const col2 = M + hw + 6;

  // ── Left: property detail table ──────────────────────────────────────────
  const rows: [string, string][] = [
    ["Property",        s.property.address || "—"],
    ["Inspection date", fmtDate(s.createdAt)],
    ...(s.property.workingDateOfLoss  ? [["Storm date",        fmtDate(s.property.workingDateOfLoss)]  as [string,string]] : []),
    ["Inspector",       s.repName || "—"],
    ...(s.property.stormBasis        ? [["Storm basis",        s.property.stormBasis]                  as [string,string]] : []),
    ...(s.property.insurerNameKnown   ? [["Insurance carrier",  s.property.insurerNameKnown]             as [string,string]] : []),
    ...(s.property.claimNumberKnown   ? [["Claim number",       s.property.claimNumberKnown]             as [string,string]] : []),
  ];

  const prios = s.buyerData?.buyerPriorities ?? [];
  const prioMap: Record<string, string> = {
    roof_longevity: "Roof longevity", insurance_process: "Insurance process",
    repair_speed: "Repair speed",     cost_clarity: "Cost clarity",
    warranty_coverage: "Warranty",    minimal_disruption: "Low disruption",
  };

  const leftH  = 14 + rows.length * 10 + 2;
  const rightH = 54 + (prios.length > 0 ? 10 + Math.ceil(prios.length / 2) * 10 : 0);
  const colH   = Math.max(leftH, rightH);

  // Property detail card
  baseCard(d, M, y, hw, colH, T.surface, T.border);
  sf(d, acc); d.rect(M, y, hw, 2, "F");
  microLabel(d, "Property & Inspection", M + 6, y + 9, T.textFaint);
  sf(d, T.border); d.rect(M + 6, y + 11.5, hw - 12, 0.2, "F");

  let rY = y + 18;
  rows.forEach(([lbl, val], idx) => {
    if (idx % 2 === 1) { sf(d, T.surface2); d.rect(M + 1, rY - 5, hw - 2, 9.5, "F"); }
    st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
    d.text(lbl, M + 6, rY);
    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8);
    const vLines = d.splitTextToSize(val, hw - 48) as string[];
    d.text(vLines[0], M + hw - 5, rY, { align: "right" });
    sf(d, T.border); d.rect(M + 6, rY + 2.5, hw - 12, 0.15, "F");
    rY += 10;
  });

  // ── Right: finding summary + priorities ───────────────────────────────────
  baseCard(d, col2, y, hw, colH, T.surface, T.border);
  sf(d, acc); d.rect(col2, y, hw, 2, "F");
  microLabel(d, "Finding Summary", col2 + 6, y + 9, T.textFaint);
  sf(d, T.border); d.rect(col2 + 6, y + 11.5, hw - 12, 0.2, "F");

  // 3 mini stat tiles inside card
  const fsw = (hw - 14) / 3;
  [
    [s.findings.urgentItemsCount,       "Urgent",        T.red,   T.redBg,   T.redBdr],
    [s.findings.stormRelatedItemsCount, "Storm-related", T.blue,  T.blueBg,  T.blueBdr],
    [s.findings.monitorItemsCount,      "Monitor",       T.amber, T.amberBg, T.amberBdr],
  ].forEach(([cnt, lbl, col, bg, bdr], i) => {
    statCard(d, cnt as number, lbl as string, col2 + 6 + i * (fsw + 3), y + 15, fsw, 34,
      col as C3, bg as C3, bdr as C3);
  });

  // Homeowner priorities
  if (prios.length > 0) {
    let pY = y + 56;
    microLabel(d, "Homeowner Priorities", col2 + 6, pY, T.textFaint);
    pY += 8;
    prios.forEach((p, i) => {
      const px = col2 + 6 + (i % 2) * ((hw - 14) / 2 + 3);
      const py = pY + Math.floor(i / 2) * 10;
      baseCard(d, px, py - 5.5, (hw - 16) / 2, 9, T.surface2, T.border);
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
      d.text(prioMap[p] ?? p.replace(/_/g, " "), px + 4, py);
    });
  }

  y += colH + 10;

  // ── Weather events (carrier review only) ─────────────────────────────────
  if (pt === "carrier_review" && (s.findings.stormSummary || (s.findings.weatherEvents ?? []).length > 0)) {
    const stLines = s.findings.stormSummary ? d.splitTextToSize(s.findings.stormSummary, CW - 16) as string[] : [];
    const events  = s.findings.weatherEvents ?? [];
    const tblH    = events.length > 0 ? 14 + events.length * 7.5 : 0;
    const wH      = 15 + Math.min(stLines.length, 3) * 5 + tblH + 8;

    baseCard(d, M, y, CW, wH, T.surface, T.border);
    sf(d, acc); d.rect(M, y, CW, 2, "F");
    microLabel(d, "Weather Event Documentation", M + 6, y + 9, acc);
    sf(d, T.border); d.rect(M + 6, y + 11.5, CW - 12, 0.2, "F");

    if (s.findings.stormSummary) {
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
      d.text(stLines.slice(0, 3), M + 6, y + 17);
    }

    if (events.length > 0) {
      autoTable(d, {
        startY: y + 17 + Math.min(stLines.length, 3) * 5 + 4,
        margin: { left: M + 5 }, tableWidth: CW - 10,
        head: [["Date / time", "Reference", "Property relevance"]],
        body: events.map(e => [e.time, e.reference, e.relevance]),
        theme: "plain",
        headStyles:  { fillColor: [250, 249, 246], textColor: [80, 76, 70], fontSize: 6.5, fontStyle: "bold" },
        styles:      { fillColor: [255, 255, 255], textColor: [26, 25, 23], fontSize: 7.5, cellPadding: 2.5, lineColor: [228, 225, 218], lineWidth: 0.15 },
        alternateRowStyles: { fillColor: [250, 249, 246] },
      });
    }
    y += wH + 10;
  }

  // ── Value chips ───────────────────────────────────────────────────────────
  const chips: [string, string][] = [];
  if (s.findings.estimatedClaimValue)    chips.push(["Estimated value",  s.findings.estimatedClaimValue]);
  if (s.findings.roofingArea)            chips.push(["Roof area",        `${s.findings.roofingArea} SF`]);
  if (s.pathData.manufacturerSelected)   chips.push(["Manufacturer",     s.pathData.manufacturerSelected]);
  if (s.pathData.warrantyOptionSelected) chips.push(["Warranty",         s.pathData.warrantyOptionSelected]);

  if (chips.length > 0 && y + 26 < PH - 14) {
    const cw2 = (CW - (chips.length - 1) * 5) / chips.length;
    chips.forEach(([lbl, val], i) => {
      const cx = M + i * (cw2 + 5);
      baseCard(d, cx, y, cw2, 24, T.surface, T.border);
      sf(d, acc); d.rect(cx, y, cw2, 2, "F");
      microLabel(d, lbl, cx + 6, y + 9);
      st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(11);
      d.text(val, cx + 6, y + 19);
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
  let y = 16;

  // Section heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(18);
  d.text("Our Recommendation", M, y + 11);
  sf(d, acc); d.rect(M, y + 14, 24, 1.5, "F");
  y += 22;

  // ── Hero recommendation banner ────────────────────────────────────────────
  const heroHL  = d.splitTextToSize(cfg.headline, CW - 22) as string[];
  const heroSub = d.splitTextToSize(cfg.subhead,   CW - 22) as string[];
  const heroH   = 14 + 8 + Math.min(heroHL.length, 2) * 7 + 6 + Math.min(heroSub.length, 3) * 5 + 10;

  sf(d, accBg); d.roundedRect(M, y, CW, heroH, 3, 3, "F");
  sd(d, accBdr); d.setLineWidth(0.25); d.roundedRect(M, y, CW, heroH, 3, 3, "S");
  sf(d, acc); d.roundedRect(M, y, 5, heroH, 1.5, 1.5, "F");

  badgePill(d, cfg.badgeLabel, M + 12, y + 9, acc, T.surface, accBdr);

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(14);
  const hl1Y = y + 22;
  d.text(heroHL.slice(0, 2), M + 12, hl1Y);

  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
  d.text(heroSub.slice(0, 3), M + 12, hl1Y + Math.min(heroHL.length, 2) * 7 + 5);

  y += heroH + 8;

  // ── Evidence confidence bar ───────────────────────────────────────────────
  const photoCount = (s.photoAssets?.filter(p => p.selectedForSummary).length ?? 0)
                   + (s.photos?.filter(p => p.selectedForSummary).length ?? 0);
  const confSegs = [
    s.findings.stormRelatedItemsCount > 0,
    photoCount > 0,
    (s.findings.weatherEvents ?? []).length > 0 || !!s.findings.stormSummary,
    s.findings.urgentItemsCount > 0 || s.findings.monitorItemsCount > 0,
    !!s.findings.summaryBody,
  ];
  const filled = confSegs.filter(Boolean).length;

  baseCard(d, M, y, CW, 22, T.surface, T.border);
  microLabel(d, "Evidence Confidence", M + 6, y + 9, T.textFaint);
  confidenceBar(d, M + 70, y + 6, CW - 76, filled, 5, acc);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(`${filled} of 5 evidence types documented`, M + 70, y + 18, { maxWidth: CW - 76 });
  y += 30;

  // ── What this means (full width) ──────────────────────────────────────────
  const wmLines = d.splitTextToSize(cfg.whatMeans, CW - 16) as string[];
  const wmH     = 14 + Math.min(wmLines.length, 6) * 5 + 8;

  baseCard(d, M, y, CW, wmH, accBg, accBdr);
  sf(d, acc); d.rect(M, y, 4, wmH, "F");
  microLabel(d, "What this finding means", M + 10, y + 9, acc);
  sf(d, accBdr); d.rect(M + 10, y + 11.5, CW - 16, 0.2, "F");
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
  d.text(wmLines.slice(0, 6), M + 10, y + 17);
  y += wmH + 8;

  // ── Credibility lines ─────────────────────────────────────────────────────
  const crdLabel = "What we want you to know";
  microLabel(d, crdLabel, M, y, T.textFaint);
  y += 7;

  cfg.credibilityLines.forEach(line => {
    const isPositive = line.startsWith("We are saying");
    const ll    = d.splitTextToSize(line, CW - 20) as string[];
    const lh    = 8 + ll.length * 4.2;
    const lbg   = isPositive ? accBg   : T.surface;
    const lbdr  = isPositive ? accBdr  : T.border;

    baseCard(d, M, y, CW, lh, lbg, lbdr);
    if (isPositive) { sf(d, acc); d.rect(M, y, 4, lh, "F"); }
    st(d, isPositive ? T.text : T.textMid);
    d.setFont("helvetica", isPositive ? "bold" : "normal"); d.setFontSize(8);
    d.text(ll, isPositive ? M + 10 : M + 6, y + 6);
    y += lh + 4;
  });

  y += 4;

  // ── Recommended next step CTA ─────────────────────────────────────────────
  if (y + 30 < PH - 14) {
    const nsLines = d.splitTextToSize(cfg.nextStep, CW - 16) as string[];
    const nsH     = 14 + Math.min(nsLines.length, 2) * 5 + 8;

    baseCard(d, M, y, CW, nsH, T.surface, T.border);
    sf(d, acc); d.rect(M, y, CW, 2, "F");
    microLabel(d, "Recommended Next Step", M + 6, y + 10, acc);
    st(d, T.text); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
    d.text(nsLines.slice(0, 2), M + 6, y + 19);
    y += nsH + 8;
  }

  // ── Coverage notice ───────────────────────────────────────────────────────
  if (y + 22 < PH - 14) {
    baseCard(d, M, y, CW, 22, T.amberBg, T.amberBdr);
    sf(d, T.amber); d.rect(M, y, 4, 22, "F");
    st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
    d.text("Coverage notice:", M + 10, y + 8);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    const gLines = d.splitTextToSize(
      "Your insurance provider reviews the documented findings and makes the final coverage determination. This report documents observed conditions and does not guarantee any specific outcome.",
      CW - 16
    ) as string[];
    d.text(gLines.slice(0, 2), M + 10, y + 15);
  }

  // ── Optional AI summary ───────────────────────────────────────────────────
  if (s.findings.summaryBody || s.findings.summaryHeadline) {
    const sbY = y + 30;
    if (sbY + 44 < PH - 14) {
      baseCard(d, M, sbY, CW, 44, T.surface, T.border);
      sf(d, acc); d.rect(M, sbY, 4, 44, "F");
      if (s.findings.summaryHeadline) {
        st(d, T.text); d.setFont("times", "bold"); d.setFontSize(12);
        d.text(s.findings.summaryHeadline, M + 10, sbY + 11);
      }
      if (s.findings.summaryBody) {
        st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
        const sbL = d.splitTextToSize(s.findings.summaryBody, CW - 16) as string[];
        d.text(sbL.slice(0, 4), M + 10, s.findings.summaryHeadline ? sbY + 20 : sbY + 11);
      }
    }
  }

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4+ — EVIDENCE GALLERY  (2 rows × 2 cols = 4 photos per page)
// Photos are 30% taller than v1 for greater visual impact
// ─────────────────────────────────────────────────────────────────────────────
async function renderEvidenceGallery(d: jsPDF, photos: PdfPhoto[], pt: PathType, acc: C3, rid: string) {
  if (photos.length === 0) return;

  const colGap = 7;
  const rowGap = 8;
  const imgW   = (CW - colGap) / 2;
  const imgH   = 65;     // 30 % taller than v1 (was 50 mm)
  const metaH  = 50;
  const cardH  = imgH + metaH;

  let photoIdx = 0;
  let firstPage = true;

  while (photoIdx < photos.length) {
    d.addPage();
    pageHeader(d, rid, acc, "Evidence documentation");
    let y = 16;

    if (firstPage) {
      st(d, T.text); d.setFont("times", "bold"); d.setFontSize(16);
      d.text(PATH_CFG[pt].proofLabel, M, y + 9);
      sf(d, acc); d.rect(M, y + 12, 22, 1.5, "F");
      y += 20;
      firstPage = false;
    }

    const chunk = photos.slice(photoIdx, photoIdx + 4);

    for (let i = 0; i < chunk.length; i++) {
      const photo = chunk[i];
      const col   = i % 2;
      const row   = Math.floor(i / 2);
      const cx    = M + col * (imgW + colGap);
      const cy    = y + row * (cardH + rowGap);

      const pc    = classifyPdfPhoto(photo.label ?? "", photo.category ?? "", photo.description ?? "");
      const badge = photoBadge(pc, pt);

      // Card shell
      baseCard(d, cx, cy, imgW, cardH, T.surface, badge.bdr);

      // Photo
      try {
        let compressed = await compressImage(photo.dataUrl, 800);
        if (compressed.startsWith("http")) {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";
            tempImg.onload = () => resolve(tempImg);
            tempImg.onerror = reject;
            tempImg.src = compressed;
          });
          d.addImage(img, "JPEG", cx, cy, imgW, imgH, undefined, "FAST");
        } else {
          d.addImage(compressed, "JPEG", cx, cy, imgW, imgH, undefined, "FAST");
        }

        // Annotations
        if (photo.annotations && photo.annotations.length > 0) {
          d.setLineWidth(0.7);
          for (const ann of photo.annotations) {
            const ac: C3 = ann.color === "#ef4444" ? T.red : T.blue;
            sd(d, ac);
            if (ann.type === "circle") {
              d.circle(cx + ann.x * imgW / 100, cy + ann.y * imgH / 100, (ann.radius ?? 5) * imgW / 100, "S");
            } else if (ann.type === "arrow") {
              d.line(cx + ann.x * imgW / 100, cy + ann.y * imgH / 100, cx + (ann.toX ?? ann.x) * imgW / 100, cy + (ann.toY ?? ann.y) * imgH / 100);
            } else if (ann.type === "label" && ann.text) {
              sf(d, ac); d.rect(cx + ann.x * imgW / 100 - 10, cy + ann.y * imgH / 100 - 3.5, 20, 7, "F");
              st(d, [255, 255, 255] as C3); d.setFontSize(5.5);
              d.text(ann.text.toUpperCase(), cx + ann.x * imgW / 100, cy + ann.y * imgH / 100 + 1.5, { align: "center" });
            }
          }
        }

        // Bottom scrim for badge legibility
        sf(d, T.surface); d.rect(cx, cy + imgH - 12, imgW, 12, "F");

      } catch (_) {
        sf(d, T.surface2); d.rect(cx, cy, imgW, imgH, "F");
        st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
        d.text("Photo unavailable", cx + imgW / 2, cy + imgH / 2, { align: "center" });
      }

      // Badge pill on image bottom
      badgePill(d, badge.label, cx + 4, cy + imgH - 11, badge.color, badge.bg, badge.bdr);

      // Photo sequence number
      st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(6);
      d.text(`${photoIdx + i + 1}`, cx + imgW - 4, cy + imgH - 4, { align: "right" });

      // ── Caption zone ────────────────────────────────────────────────────────
      const capY = cy + imgH + 3;

      // Label
      const capTxt = photo.label || badge.label;
      st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
      const capLines = d.splitTextToSize(capTxt, imgW - 8) as string[];
      d.text(capLines.slice(0, 2), cx + 4, capY + 7);
      const capLH = Math.min(capLines.length, 2) * 5.5;

      // "Why it matters" section
      const wyY = capY + 8 + capLH;
      sf(d, badge.bg); d.roundedRect(cx + 4, wyY, imgW - 8, 22, 1.5, 1.5, "F");
      sd(d, badge.bdr); d.setLineWidth(0.15); d.roundedRect(cx + 4, wyY, imgW - 8, 22, 1.5, 1.5, "S");
      st(d, badge.color); d.setFont("helvetica", "bold"); d.setFontSize(6);
      d.text("WHY IT MATTERS", cx + 8, wyY + 6);
      st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7);
      const whyLines = d.splitTextToSize(badge.why, imgW - 14) as string[];
      d.text(whyLines.slice(0, 2), cx + 8, wyY + 12);

      // Inspector note (if present)
      if (photo.description && photo.description.length > 0) {
        const noteY = wyY + 26;
        st(d, T.textFaint); d.setFont("helvetica", "bold"); d.setFontSize(6);
        d.text("INSPECTOR NOTE", cx + 4, noteY);
        st(d, T.textMid); d.setFont("helvetica", "italic"); d.setFontSize(7.5);
        const noteLines = d.splitTextToSize(`"${photo.description}"`, imgW - 8) as string[];
        d.text(noteLines.slice(0, 2), cx + 4, noteY + 6);
      }
    }

    pageFooter(d);
    photoIdx += 4;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW THE PROCESS WORKS — horizontal step strips (replaces 2×2 grid)
// ─────────────────────────────────────────────────────────────────────────────
function renderHowItWorks(d: jsPDF, acc: C3, rid: string) {
  pageHeader(d, rid, acc, "Process overview");
  let y = 16;

  // Section heading
  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(18);
  d.text("How the Process Works", M, y + 11);
  sf(d, acc); d.rect(M, y + 14, 22, 1.5, "F");
  y += 22;

  // Info banner
  const infoText = "Reading this page doesn't commit you to anything. Review the four steps, then decide.";
  baseCard(d, M, y, CW, 18, T.blueBg, T.blueBdr);
  sf(d, T.blue); d.rect(M, y, 4, 18, "F");
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
  d.text(infoText, M + 10, y + 11);
  y += 26;

  // Step strips
  const stepH    = 42;
  const stepGap  = 6;
  const numR     = 10;  // number circle radius
  const numCX    = M + numR + 2;
  const textX    = M + numR * 2 + 10;
  const textW    = CW - numR * 2 - 14;

  HOW_IT_WORKS.forEach((step, i) => {
    const sy = y + i * (stepH + stepGap);

    baseCard(d, M, sy, CW, stepH, i % 2 === 0 ? T.surface : T.surface2, T.border);
    sf(d, acc); d.rect(M, sy, CW, 2, "F");

    // Number circle
    sf(d, acc); d.circle(numCX, sy + stepH / 2, numR, "F");
    // Large ghost number in background
    st(d, T.surface3); d.setFont("times", "bold"); d.setFontSize(36);
    d.text(step.num, numCX + numR + 2, sy + stepH / 2 + 6, { align: "left" });
    // White number in circle
    st(d, [255, 255, 255] as C3); d.setFont("helvetica", "bold"); d.setFontSize(10);
    d.text(step.num.replace(/^0/, ""), numCX, sy + stepH / 2 + 3.5, { align: "center" });

    // Headline
    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(10.5);
    d.text(step.headline, textX, sy + 14);

    // Body
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
    const bLines = d.splitTextToSize(step.body, textW) as string[];
    d.text(bLines.slice(0, 3), textX, sy + 23);
  });

  y += HOW_IT_WORKS.length * (stepH + stepGap) + 6;

  // Important notice
  const noticeLines = d.splitTextToSize(
    "This agreement does not guarantee claim approval, coverage, deductible waiver, a free roof, or construction start. Your insurance provider makes all coverage decisions under your policy.",
    CW - 16
  ) as string[];
  const noticeH = 12 + noticeLines.length * 5 + 8;

  baseCard(d, M, y, CW, noticeH, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 4, noticeH, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Important to know:", M + 10, y + 9);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(noticeLines, M + 10, y + 16);

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREEMENT REVIEW (plain-English + full legal text)
// ─────────────────────────────────────────────────────────────────────────────
function renderAgreementReview(d: jsPDF, s: SessionState, acc: C3) {
  const rid = s.sessionId.slice(-8).toUpperCase();
  pageHeader(d, rid, acc, "Agreement review");
  let y = 16;

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(18);
  d.text("Insurance Contingency Agreement", M, y + 11);
  sf(d, acc); d.rect(M, y + 14, 28, 1.5, "F");
  y += 22;

  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(9.5);
  d.text("Before authorizing, here's the agreement in plain language.", M, y);
  y += 12;

  // Plain-English cards — stacked full-width for readability
  PLAIN_ENGLISH.forEach((card, i) => {
    const titleLines = d.splitTextToSize(card.title, CW - 52) as string[];
    const bodyLines  = d.splitTextToSize(card.body,  CW - 52) as string[];
    const cardH      = Math.max(46, 12 + titleLines.length * 6 + 4 + bodyLines.length * 5 + 10);

    baseCard(d, M, y, CW, cardH, i % 2 === 0 ? T.surface : T.surface2, T.border);
    sf(d, acc); d.rect(M, y, 4, cardH, "F");

    // Icon circle
    baseCard(d, M + 8, y + (cardH - 18) / 2, 18, 18, T.blueBg, T.blueBdr);
    sf(d, acc); d.circle(M + 17, y + cardH / 2, 4, "F");
    sectionNumBadge(d, i + 1, M + 17, y + cardH / 2, 4, acc);

    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(9);
    d.text(titleLines, M + 34, y + 13);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
    d.text(bodyLines, M + 34, y + 13 + titleLines.length * 6 + 4);
    y += cardH + 6;
  });

  y += 4;

  // Wisconsin notice
  const wLines = WISCONSIN_CLAIM_NOTICE.lines;
  const wH     = 14 + wLines.length * 5.5;
  if (y + wH < PH - 14) {
    baseCard(d, M, y, CW, wH, T.amberBg, T.amberBdr);
    sf(d, T.amber); d.rect(M, y, 4, wH, "F");
    st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
    d.text(WISCONSIN_CLAIM_NOTICE.heading, M + 10, y + 9);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    wLines.forEach((line, i) => { d.text(`• ${line}`, M + 10, y + 15 + i * 5.5, { maxWidth: CW - 16 }); });
  }

  // New page for full agreement text
  pageFooter(d);
  d.addPage();
  pageHeader(d, rid, acc, "Agreement details");
  y = 16;

  st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(9.5);
  d.text("Full Agreement Text — Insurance Contingency Agreement", M, y + 6);
  sf(d, T.border); d.rect(M, y + 9, CW, 0.2, "F");
  y += 16;

  const newPage = () => {
    pageFooter(d);
    d.addPage();
    pageHeader(d, rid, acc, "Agreement (continued)");
    y = 16;
  };

  AGREEMENT_SECTIONS.forEach((sec, idx) => {
    const bodyLines = d.splitTextToSize(sec.body, CW - 28) as string[];
    const ch        = 10 + bodyLines.length * 4.6 + 14;
    if (y + ch > PH - 14) newPage();

    const bg: C3 = idx % 2 === 0 ? T.surface : T.surface2;
    baseCard(d, M, y, CW, ch, bg, T.border);
    sf(d, acc); d.rect(M, y, CW, 2, "F");
    sectionNumBadge(d, idx + 1, M + 9, y + ch / 2, 5, acc);

    st(d, T.text); d.setFont("helvetica", "bold"); d.setFontSize(8.5);
    d.text(sec.heading, M + 20, y + 10);
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    d.text(bodyLines, M + 20, y + 17);
    y += ch + 4;
  });

  pageFooter(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION & SIGNATURE
// ─────────────────────────────────────────────────────────────────────────────
function renderSignature(d: jsPDF, s: SessionState, acc: C3) {
  const rid    = s.sessionId.slice(-8).toUpperCase();
  pageHeader(d, rid, acc, "Authorization");
  let y = 16;

  st(d, T.text); d.setFont("times", "bold"); d.setFontSize(18);
  d.text("Authorization & Signature", M, y + 11);
  sf(d, acc); d.rect(M, y + 14, 24, 1.5, "F");
  y += 24;

  const sig      = s.signatureData;
  const isSigned = !!(sig.signatureImage && sig.signedAt);

  // Status badge
  const sColor = isSigned ? T.green  : T.amber;
  const sBg    = isSigned ? T.greenBg : T.amberBg;
  const sBdr   = isSigned ? T.greenBdr : T.amberBdr;
  badgePill(d, isSigned ? "Agreement executed" : "Signature pending", M, y, sColor, sBg, sBdr, 72);
  y += 16;

  const hw   = CW / 2 - 3;
  const col2 = M + hw + 6;

  if (isSigned) {
    // Info grid — 2×2
    baseCard(d, M,    y, hw, 30, T.surface, T.border);
    baseCard(d, col2, y, hw, 30, T.surface, T.border);
    infoRow(d, "Signer name",  sig.signerName  || "On file",      M    + 6, y + 8, hw - 10);
    infoRow(d, "Signed at",    fmtDT(sig.signedAt),               col2 + 6, y + 8, hw - 10);
    y += 36;

    baseCard(d, M,    y, hw, 30, T.surface, T.border);
    baseCard(d, col2, y, hw, 30, T.surface, T.border);
    infoRow(d, "Signer email", sig.signerEmail || "Not provided",  M    + 6, y + 8, hw - 10);
    infoRow(d, "Property",     s.property.address || "On file",    col2 + 6, y + 8, hw - 10);
    y += 38;

    if (sig.signatureImage) {
      microLabel(d, "Authorized Owner Signature", M, y, T.textFaint);
      y += 8;
      baseCard(d, M, y, 90, 36, T.surface, T.border);
      try { d.addImage(sig.signatureImage, "PNG", M + 2, y + 2, 86, 32); } catch (_) {}
      y += 44;
    }

    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8.5);
    d.text("Agreed to: Insurance Contingency Agreement — Hustad Companies, Inc.", M, y);
    y += 16;

  } else {
    st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(9.5);
    d.text("Signature has not yet been collected. Authorization is not complete.", M, y);
    y += 12;
    if (sig.deferralReason) {
      st(d, T.textFaint); d.setFont("helvetica", "italic"); d.setFontSize(8.5);
      d.text(`Deferral note: ${sig.deferralReason}`, M, y + 4);
      y += 16;
    }
    y += 8;
  }

  // Signature lines for wet-ink backup
  sd(d, T.borderMid); d.setLineWidth(0.4);
  d.line(M, y, M + 86, y);
  d.line(PW - M - 86, y, PW - M, y);
  st(d, T.textFaint); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("Owner signature / date", M, y + 5.5);
  d.text("Hustad Companies authorized signatory / date", PW - M - 86, y + 5.5);
  y += 22;

  // Final authorization notice
  const g1    = "Final work begins only after final scope, materials, schedule, and homeowner responsibilities are confirmed in writing.";
  const g2    = "Your insurance provider determines coverage. Hustad Companies makes no guarantee of claim approval or specific outcome.";
  const gl    = [...(d.splitTextToSize(g1, CW - 16) as string[]), ...(d.splitTextToSize(g2, CW - 16) as string[])];
  const gH    = 12 + gl.length * 5 + 8;
  baseCard(d, M, y, CW, gH, T.amberBg, T.amberBdr);
  sf(d, T.amber); d.rect(M, y, 4, gH, "F");
  st(d, T.amber); d.setFont("helvetica", "bold"); d.setFontSize(7.5);
  d.text("Final work authorization:", M + 10, y + 9);
  st(d, T.textMid); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(gl, M + 10, y + 16);

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

  // Page X of Y — second pass
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    st(doc, T.textFaint); doc.setFont("helvetica", "normal"); doc.setFontSize(5.8);
    doc.text(`Page ${i} of ${total}`, PW - M, PH - 4, { align: "right" });
  }

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns PDF as raw base64 (no data-URI prefix). Used for email delivery. */
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
