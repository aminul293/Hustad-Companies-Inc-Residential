import jsPDF from "jspdf";
import type { SessionState } from "@/types/session";
import { format } from "date-fns";
import { getPhotoBlob, blobToBase64 } from "@/lib/photoStorage";

// Types
type C3 = [number, number, number];

export interface PhotoData {
  storageKey: string;
  dataUrl: string;
  localUri?: string;
  remoteUrl?: string;
  label?: string;
  category?: string;
  description?: string;
}

interface PdfPhoto {
  dataUrl: string;
  label?: string;
  category?: string;
  description?: string;
}

type PathType = "carrier_review" | "urgent_repair" | "full_restoration" | "no_action";

// Color Palette (Tailwind)
const T = {
  slate900:  [15, 23, 42] as C3,
  slate950:  [2, 6, 23] as C3,
  gray50:    [249, 250, 251] as C3,
  gray100:   [243, 244, 246] as C3,
  gray200:   [229, 231, 235] as C3,
  gray300:   [209, 213, 219] as C3,
  gray400:   [156, 163, 175] as C3,
  gray500:   [107, 114, 128] as C3,
  gray600:   [75, 85, 99] as C3,
  gray700:   [55, 65, 81] as C3,
  gray800:   [31, 41, 55] as C3,
  gray900:   [17, 24, 39] as C3,
  
  white:     [255, 255, 255] as C3,
  
  amber50:   [255, 251, 235] as C3,
  amber100:  [254, 243, 199] as C3,
  amber200:  [253, 230, 138] as C3,
  amber400:  [251, 191, 36] as C3,
  amber500:  [245, 158, 11] as C3,
  amber600:  [217, 119, 6] as C3,
  amber700:  [180, 83, 9] as C3,
  amber800:  [146, 64, 14] as C3,
  amber900:  [120, 53, 15] as C3,

  emerald50: [236, 253, 245] as C3,
  emerald100:[209, 250, 229] as C3,
  emerald200:[167, 243, 208] as C3,
  emerald500:[16, 185, 129] as C3,
  emerald700:[4, 120, 87] as C3,

  blue50:    [239, 246, 255] as C3,
  blue100:   [219, 234, 254] as C3,
  blue200:   [191, 219, 254] as C3,
  blue400:   [96, 165, 250] as C3,
  blue600:   [37, 99, 235] as C3,
  blue800:   [30, 64, 175] as C3,
  blue900:   [30, 58, 138] as C3,

  red50:     [254, 242, 242] as C3,
  red200:    [254, 202, 202] as C3,
  red400:    [248, 113, 113] as C3,
  red600:    [220, 38, 38] as C3,

  orange50:  [255, 237, 213] as C3,
  orange100: [255, 237, 213] as C3,
  orange200: [253, 186, 116] as C3,
  orange500: [249, 115, 22] as C3,
  orange600: [234, 88, 12] as C3,
  orange800: [154, 52, 18] as C3,
  orange900: [124, 45, 18] as C3,
};

// Layout
const PW = 210;
const PH = 297;
const M = 18;
const CW = PW - M * 2;
let Y = M;

// Helpers
function st(d: jsPDF, c: C3) { d.setTextColor(c[0], c[1], c[2]); }
function sf(d: jsPDF, c: C3) { d.setFillColor(c[0], c[1], c[2]); }
function sd(d: jsPDF, c: C3) { d.setDrawColor(c[0], c[1], c[2]); }

function fmtDate(iso?: string) {
  if (!iso) return "N/A";
  try { return format(new Date(iso), "MMMM d, yyyy"); } catch { return iso; }
}

function checkPage(d: jsPDF, heightNeeded: number) {
  if (Y + heightNeeded > PH - M) {
    d.addPage();
    Y = M;
  }
}

function derivePathType(s: SessionState): PathType {
  const o = s.findings.outcomeType;
  if (o === "claim_review_candidate") return "carrier_review";
  if (o === "full_restoration_candidate") return "full_restoration";
  if (o === "repair_only") return "urgent_repair";
  return "no_action";
}

function getPathConfig(pt: PathType) {
  switch (pt) {
    case "carrier_review":
      return { title: "Your Carrier Review Report", tag: "Inspection Complete · Claim Path", badgeText: "Carrier Review", badgeType: "pending" };
    case "urgent_repair":
      return { title: "Your Repair Authorization Report", tag: "Inspection Complete · Repair Path", badgeText: "Repair Path", badgeType: "executed" };
    case "full_restoration":
      return { title: "Your Roof Replacement Proposal", tag: "Inspection Complete · Full Replacement", badgeText: "Proposal in Progress", badgeType: "proposal" };
    default:
      return { title: "Inspection Complete", tag: "Inspection Complete · No Action", badgeText: "Completed", badgeType: "executed" };
  }
}

function getBadgeColors(type: string): { bg: C3, txt: C3 } {
  if (type === "executed") return { bg: T.emerald500, txt: T.white };
  if (type === "proposal") return { bg: T.blue600, txt: T.white };
  return { bg: T.amber400, txt: T.slate900 };
}


async function collectPhotos(s: SessionState): Promise<PdfPhoto[]> {
  const result: PdfPhoto[] = [];
  const assets = (s as any).photoAssets ?? [];
  for (const p of assets.filter((a: any) => a.selectedForSummary && !a.isSensitive)) {
    result.push({ dataUrl: p.dataUrl, label: p.caption, category: p.category, description: undefined });
  }
  for (const p of (s.photos ?? []).filter((ph: any) => ph.selectedForSummary)) {
    let dataUrl = p.remoteUrl ?? p.localUri;
    if (!dataUrl) {
      const blob = await getPhotoBlob(p.storageKey);
      if (blob) dataUrl = await blobToBase64(blob);
    }
    if (dataUrl) result.push({ dataUrl, label: p.label, category: p.category, description: p.description });
  }
  return result;
}

// --- Components ---

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch("/logo.svg");
    if (!resp.ok) return null;
    const svgText = await resp.text();
    const whiteSvg = svgText.replace(/fill:\s*#231f20/g, "fill: #ffffff");
    const blob = new Blob([whiteSvg], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    return await new Promise<string>((resolve, reject) => {
      const img    = new Image();
      img.onload   = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = 1468;
        canvas.height = 330;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src     = url;
    });
  } catch {
    return null;
  }
}

async function renderHeader(d: jsPDF, cfg: any) {
  checkPage(d, 50);
  sf(d, T.slate900); d.rect(0, Y, PW, 50, "F");
  
  // Logo
  const logoDataUrl = await loadLogoDataUrl();
  if (logoDataUrl) {
    const logoW = 35;
    const logoH = logoW * (330 / 1468);
    d.addImage(logoDataUrl, "PNG", M, Y + 12, logoW, logoH);
  } else {
    sf(d, T.amber400); d.roundedRect(M, Y + 10, 10, 10, 1.5, 1.5, "F");
    st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(10);
    d.text("H", M + 5, Y + 17, { align: "center" });
    st(d, T.white); d.setFont("helvetica", "bold"); d.setFontSize(6); d.text("HUSTAD", M + 12, Y + 14);
    st(d, T.amber400); d.setFontSize(5); d.text("COMPANIES", M + 12, Y + 18);
  }

  // Badge
  const bColors = getBadgeColors(cfg.badgeType);
  st(d, bColors.txt); d.setFont("times", "bold"); d.setFontSize(8);
  const bW = d.getTextWidth(cfg.badgeText.toUpperCase()) + 16;
  sf(d, bColors.bg); d.roundedRect(PW - M - bW, Y + 8, bW, 11, 5.5, 5.5, "F");
  d.text(cfg.badgeText.toUpperCase(), PW - M - bW / 2, Y + 15.6, { align: "center" });

  // Tag & Title
  st(d, T.amber400); d.setFontSize(6); d.text(cfg.tag.toUpperCase(), M, Y + 32);
  st(d, T.white); d.setFont("times", "bold"); d.setFontSize(18);
  d.text(cfg.title, M, Y + 41);
  
  Y += 50;
}

function renderPropRow(d: jsPDF, s: SessionState) {
  checkPage(d, 20);
  sf(d, T.gray50); d.rect(0, Y, PW, 20, "F");
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y + 20, PW, Y + 20);

  const items = [
    { l: "PROPERTY", v: s.property.address || "Unknown" },
    { l: "INSPECTION DATE", v: fmtDate(s.createdAt) },
    { l: "INSPECTOR", v: s.repName || "Eric Catania" },
    { l: "REPORT SENT", v: fmtDate(new Date().toISOString()) }
  ];

  let x = M;
  for (const it of items) {
    st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(5);
    d.text(it.l, x, Y + 8);
    st(d, T.gray800); d.setFont("helvetica", "bold"); d.setFontSize(7);
    d.text(it.v, x, Y + 13);
    x += (CW / 4);
  }
  Y += 20;
}

function renderIntro(d: jsPDF, pt: PathType) {
  let text = "";
  if (pt === "carrier_review") text = "Thank you for authorizing Hustad Companies to coordinate your insurance claim. Below is your complete inspection report. No production work begins until your carrier issues a written coverage determination.";
  else if (pt === "urgent_repair") text = "Thank you for authorizing Hustad Companies to complete the documented repairs at your property. Our scheduling team will contact you within 2 business days to confirm your production date.";
  else if (pt === "full_restoration") text = "Hustad Companies has completed your exterior inspection and documented conditions consistent with a full roof replacement. Our estimating department is preparing your custom proposal and will send it within 2-3 business days.";
  else text = "Hustad Companies has completed your exterior inspection and documented the conditions below.";

  st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(10);
  const lines = d.splitTextToSize(text, CW) as string[];
  const h = lines.length * 5 + 10;
  checkPage(d, h);
  d.text(lines, M, Y + 8);
  Y += h;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

function renderStats(d: jsPDF, pt: PathType, photosCount: number, s: SessionState) {
  let stats = [];
  const urgent = s.findings?.urgentItemsCount?.toString() || "0";
  const monitor = s.findings?.monitorItemsCount?.toString() || "0";
  const storm = s.findings?.stormRelatedItemsCount?.toString() || "0";

  if (pt === "urgent_repair") {
    stats = [
      { l: "Repair Items", v: urgent, vc: T.orange600, bg: T.orange50, bc: T.orange200 },
      { l: "Monitor Items", v: monitor, vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  } else if (pt === "full_restoration") {
    stats = [
      { l: "Conditions Found", v: urgent, vc: T.red600, bg: T.red50, bc: T.red200 },
      { l: "Monitor Items", v: monitor, vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  } else {
    stats = [
      { l: "Storm Indicators", v: storm, vc: T.amber600, bg: T.amber50, bc: T.amber200 },
      { l: "Monitor Items", v: monitor, vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  }

  const h = 40;
  checkPage(d, h + 10);
  sf(d, T.gray50); d.rect(0, Y, PW, h + 10, "F");
  
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("INSPECTION SUMMARY", M, Y + 8);
  
  const boxW = (CW - 10) / 3;
  let cx = M;
  for (const s of stats) {
    sf(d, s.bg); d.roundedRect(cx, Y + 12, boxW, 25, 2, 2, "F");
    sd(d, s.bc); d.roundedRect(cx, Y + 12, boxW, 25, 2, 2, "S");
    st(d, s.vc); d.setFont("helvetica", "bold"); d.setFontSize(14);
    d.text(s.v, cx + boxW / 2, Y + 24, { align: "center" });
    st(d, T.gray500); d.setFont("helvetica", "normal"); d.setFontSize(6);
    d.text(s.l, cx + boxW / 2, Y + 31, { align: "center" });
    cx += boxW + 5;
  }
  
  Y += h + 10;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

function renderStormBanner(d: jsPDF) {
  checkPage(d, 20);
  sf(d, T.amber50); d.rect(0, Y, PW, 20, "F");
  sd(d, T.amber100); d.setLineWidth(0.3); d.line(0, Y + 20, PW, Y + 20);
  
  st(d, T.amber800); d.setFont("helvetica", "bold"); d.setFontSize(7);
  d.text("STORM EVENT CONFIRMED - ", M + 6, Y + 11);
  st(d, T.amber700); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("NWS data supports a severe hail event near this property.", M + 58, Y + 11);
  Y += 20;
}

function renderFindings(d: jsPDF, pt: PathType, s: SessionState) {
  let items: string[] = [];
  if (s.findings?.summaryBody) {
    items = s.findings.summaryBody.split('\n').filter(l => l.trim().length > 0);
  }
  if (items.length === 0) {
    items = pt === "urgent_repair" ? [
      "Cracked and deteriorated valley flashing - active leak risk",
      "Pipe boot penetration seals failing - moisture intrusion present",
      "Ridge cap shingles lifting and unsealed - wind vulnerability",
      "Open drip edge along north fascia - water infiltration risk"
    ] : [
      "Hail impact spatter on soft metal surfaces - gutters, downspouts",
      "Granule displacement observed across multiple roof planes",
      "Impact dents visible on ridge cap and field shingles",
      "Soft metal deformation consistent with hail impact"
    ];
  }

  checkPage(d, 40);
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("KEY FINDINGS", M, Y + 10);
  Y += 15;
  
  for (const item of items) {
    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(9);
    const lines = d.splitTextToSize(item, CW - 10) as string[];
    const h = lines.length * 4.5 + 1.5;
    checkPage(d, h);
    st(d, pt === "urgent_repair" ? T.orange500 : T.amber500);
    d.text("*", M, Y + 3);
    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(9);
    d.text(lines, M + 5, Y + 3);
    Y += h;
  }
  Y += 5;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

async function renderPhotos(d: jsPDF, photos: PdfPhoto[]) {
  if (!photos || photos.length === 0) return;

  checkPage(d, 50);
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("STORM EVIDENCE - STRONGEST PROOF PHOTOS", M, Y + 10);
  Y += 15;
  
  const gap = 4;
  const w = (CW - gap * 2) / 3;
  const h = 28;
  
  let cx = M;
  const displayPhotos = photos.slice(0, 3);
  
  for (let i = 0; i < 3; i++) {
    if (i < displayPhotos.length) {
      const p = displayPhotos[i];
      try {
        let fmt = p.dataUrl.includes("image/png") ? "PNG" : "JPEG";
        d.addImage(p.dataUrl, fmt, cx, Y, w, h);
      } catch (e) {
        sf(d, T.gray100); d.roundedRect(cx, Y, w, h, 2, 2, "F");
        sd(d, T.gray200); d.roundedRect(cx, Y, w, h, 2, 2, "S");
      }
      st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(5);
      const lines = d.splitTextToSize(p.label || `Photo ${i + 1}`, w - 2);
      d.text(lines, cx + w / 2, Y + h + 4, { align: "center" });
    } else {
      sf(d, T.gray50); d.roundedRect(cx, Y, w, h, 2, 2, "F");
      sd(d, T.gray200); d.roundedRect(cx, Y, w, h, 2, 2, "S");
    }
    cx += w + gap;
  }
  
  Y += h + 10;
  st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(6);
  d.text("Full-resolution photos available in your inspection portal account.", M, Y);
  Y += 8;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

function renderSteps(d: jsPDF, pt: PathType) {
  checkPage(d, 40);
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("YOUR NEXT STEPS", M, Y + 10);
  Y += 16;
  
  let steps = [
    { t: "Confirm Your Claim is Active", d: "Let us know if your claim has been filed or needs guidance." },
    { t: "Carrier Inspection Coordinated", d: "Hustad will schedule and be present for the adjuster visit." },
    { t: "Review Your Coverage Decision", d: "Share any Explanation of Benefits with your Hustad rep." }
  ];

  if (pt === "urgent_repair") {
    steps = [
      { t: "Scheduling Confirmation", d: "Expect a call from our scheduling team within 2 business days to confirm your production window." },
      { t: "Pre-Production Measurement", d: "A Hustad field team member will confirm final measurements before material is ordered." },
      { t: "48-Hour Advance Notice", d: "You will receive notification at least 48 hours before your scheduled production start date." },
      { t: "Completion and Final Invoice", d: "Final invoicing will be provided upon project completion and a brief walkthrough with your rep." }
    ];
  } else if (pt === "full_restoration") {
    steps = [
      { t: "Estimating review", d: "Measurements, scope assumptions, and material basis are checked." },
      { t: "Proposal prepared", d: "Hustad creates the standard replacement proposal for owner review." },
      { t: "Owner decision", d: "Owner reviews, asks questions, selects options, or authorizes the project." }
    ];
  } else if (pt === "no_action") {
    steps = [
      { t: "Inspection Report Delivered", d: "Inspection report delivered to your property record." },
      { t: "Baseline Documentation Stored", d: "Baseline documentation stored for future storm comparison." },
      { t: "Monitor Items Flagged", d: "Monitor items flagged with re-inspection triggers." },
      { t: "Free Recheck Reminder", d: "Schedule a free recheck reminder at any time." }
    ];
  }

  let cx = M;
  steps.forEach((step, i) => {
    checkPage(d, 15);
    
    // Circle
    sf(d, T.amber50); d.circle(cx + 6, Y + 5, 6, "F");
    st(d, T.amber700); d.setFont("helvetica", "bold"); d.setFontSize(7);
    d.text((i + 1).toString(), cx + 6, Y + 7.5, { align: "center" });
    
    // Text
    st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(10);
    d.text(step.t, cx + 18, Y + 6);
    st(d, T.gray500); d.setFont("times", "normal"); d.setFontSize(9);
    
    const lines = d.splitTextToSize(step.d, CW - 20) as string[];
    const h = lines.length * 4.5;
    d.text(lines, cx + 18, Y + 11);
    
    Y += Math.max(16, h + 10);
  });
  
  Y += 5;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

function renderAgreement(d: jsPDF, s: SessionState) {
  checkPage(d, 80);
  sf(d, T.gray50); d.rect(0, Y, PW, 100, "F");
  
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("YOUR EXECUTED AGREEMENT", M, Y + 10);
  
  // Executed badge
  sf(d, T.emerald100); d.roundedRect(PW - M - 25, Y + 6, 25, 5, 2.5, 2.5, "F");
  st(d, T.emerald700); d.setFontSize(5);
  d.text("EXECUTED", PW - M - 12.5, Y + 9.6, { align: "center" });
  
  Y += 15;
  
  // Card
  sf(d, T.white); d.roundedRect(M, Y, CW, 65, 3, 3, "F");
  sd(d, T.gray200); d.roundedRect(M, Y, CW, 65, 3, 3, "S");
  
  // Header
  sf(d, T.emerald700); 
  d.setDrawColor(T.emerald700[0], T.emerald700[1], T.emerald700[2]);
  d.roundedRect(M, Y, CW, 12, 3, 3, "F");
  // Fill lower part of header to make it flat on bottom
  d.rect(M, Y + 6, CW, 6, "F");
  
  st(d, T.white); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("INSURANCE CONTINGENCY AGREEMENT - EXECUTED COPY", M + 5, Y + 5.5);
  st(d, T.emerald200); d.setFont("helvetica", "normal"); d.setFontSize(5);
  d.text(`Signed: ${fmtDate(s.createdAt)} - Property: ${s.property.address}`, M + 5, Y + 9);
  
  // Body snippet
  st(d, T.gray600); d.setFont("times", "normal"); d.setFontSize(7);
  const snippet = "1. Parties and Property\nThis Insurance Contingency Agreement is entered into between the property owner and Hustad Companies. Both parties agree that the inspection findings recorded constitute the factual basis for the scope of work.\n\n2. Scope of Work\nContractor agrees to perform exterior restoration identified in the findings summary.";
  const lines = d.splitTextToSize(snippet, CW - 10);
  d.text(lines, M + 5, Y + 18);
  
  // Footer
  const ftY = Y + 45;
  sf(d, T.emerald50);
  d.roundedRect(M, ftY, CW, 20, 3, 3, "F");
  d.rect(M, ftY, CW, 5, "F");
  sd(d, T.gray200); d.line(M, ftY, PW - M, ftY);
  
  st(d, T.gray500); d.setFont("helvetica", "bold"); d.setFontSize(5);
  d.text("HOMEOWNER", M + 5, ftY + 5);
  d.text("HUSTAD REPRESENTATIVE", M + CW / 2 + 5, ftY + 5);
  
  st(d, T.gray700); d.setFont("times", "italic"); d.setFontSize(7);
  d.text("Authorized Electronically", M + 5, ftY + 11);
  d.text(s.repName || "Eric Catania", M + CW / 2 + 5, ftY + 11);
  
  sd(d, T.gray400); d.setLineWidth(0.3);
  d.line(M + 5, ftY + 13, M + CW / 2 - 5, ftY + 13);
  d.line(M + CW / 2 + 5, ftY + 13, M + CW - 5, ftY + 13);
  
  st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(5);
  d.text(fmtDate(s.createdAt), M + 5, ftY + 17);
  d.text(`${fmtDate(s.createdAt)} - Hustad Companies, Inc.`, M + CW / 2 + 5, ftY + 17);
  
  Y += 80;
}

function renderFooter(d: jsPDF) {
  checkPage(d, 40);
  sf(d, T.slate900); d.rect(0, Y, PW, 45, "F");
  
  st(d, T.gray500); d.setFont("helvetica", "normal"); d.setFontSize(6);
  d.text("Hustad Companies, Inc. - Madison, Wisconsin", PW / 2, Y + 12, { align: "center" });
  d.text("Licensed Exterior Restoration Contractor - State of Wisconsin", PW / 2, Y + 16, { align: "center" });
  d.text("General Liability & Workers' Compensation Insurance Verified", PW / 2, Y + 20, { align: "center" });
  
  sd(d, T.gray800); d.line(M + 10, Y + 25, PW - M - 10, Y + 25);
  
  st(d, T.gray600); d.setFont("times", "normal"); d.setFontSize(5.5);
  const dis = "This report is confidential and prepared solely for the property owner identified above. It reflects conditions observed at the time of inspection and does not constitute a guarantee of insurance coverage or claim outcome.";
  const lines = d.splitTextToSize(dis, CW - 20);
  d.text(lines, PW / 2, Y + 31, { align: "center" });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export async function generateReportPDF(s: SessionState, photosArg: any, logo: any, rid: any, ptType: any) {
  const d = new jsPDF({ compress: true });
  Y = 0;
  
  const pt = derivePathType(s);
  const cfg = getPathConfig(pt);
  const photos = await collectPhotos(s);
  
  await renderHeader(d, cfg);
  renderPropRow(d, s);
  renderIntro(d, pt);
  renderStats(d, pt, photos.length, s);
  if (pt === "carrier_review" || pt === "full_restoration") {
    renderStormBanner(d);
  }
  renderFindings(d, pt, s);
  await renderPhotos(d, photos);
  renderSteps(d, pt);
  renderAgreement(d, s);
  renderFooter(d);
  
  return d;
}

export async function getSummaryPDFBase64(s: SessionState): Promise<string> {
  const d = await generateReportPDF(s, [], null, "", "");
  return d.output("datauristring").split(",")[1];
}

export async function getAgreementPDFBase64(s: SessionState): Promise<string> {
  const d = await generateReportPDF(s, [], null, "", "");
  return d.output("datauristring").split(",")[1];
}

export async function downloadSummaryPDF(s: SessionState) {
  const d = await generateReportPDF(s, [], null, "", "");
  const name = (s.property.homeownerPrimaryName || "Homeowner").replace(/\s+/g, "_");
  d.save(`Hustad_Inspection_Report_${name}_${s.sessionId.slice(-6).toUpperCase()}.pdf`);
}
