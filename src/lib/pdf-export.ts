import jsPDF from "jspdf";
import type { SessionState } from "@/types/session";
import { format } from "date-fns";
import { getPhotoBlob, blobToBase64 } from "@/lib/photoStorage";
import { AGREEMENT_SECTIONS, WISCONSIN_CLAIM_NOTICE } from "@/components/screens/b16_b19/constants";

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

function fmtDate(iso?: string | null) {
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
      return { title: "Your Direct Repair Report", tag: "Inspection Complete · Repair Recommended", badgeText: "Report Delivered", badgeType: "executed" };
    case "full_restoration":
      return { title: "Your Roof Replacement Proposal", tag: "Inspection Complete · Full Replacement", badgeText: "Proposal in Progress", badgeType: "proposal" };
    default:
      return { title: "Inspection Complete", tag: "Inspection Complete · No Action", badgeText: "Completed", badgeType: "executed" };
  }
}

function getBadgeColors(type: string): { bg: C3, txt: C3 } {
  if (type === "executed") return { bg: T.emerald500, txt: T.white };
  if (type === "proposal") return { bg: T.blue600, txt: T.white };
  if (type === "urgent") return { bg: T.red600, txt: T.white };
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

function drawBadgeRight(d: jsPDF, text: string, rightX: number, y: number, color: C3, bgColor: C3) {
  d.setFont("helvetica", "bold"); d.setFontSize(6.5);
  const capText = text.replace(/\b\w/g, l => l.toUpperCase());
  const w = d.getTextWidth(capText) + 8;
  const x = rightX - w;
  sf(d, bgColor); sd(d, color); d.setLineWidth(0.4);
  d.roundedRect(x, y, w, 8, 4, 4, "FD");
  st(d, color);
  d.text(capText, x + 4, y + 5.5);
  return w + 4; // Add 4px horizontal gap between badges
}

async function renderHeader(d: jsPDF, cfg: any, pt: PathType, s: SessionState) {
  const headerHeight = pt === "no_action" ? 55 : 50;
  checkPage(d, headerHeight);
  sf(d, T.slate900); d.rect(0, Y, PW, headerHeight, "F");
  
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
  st(d, bColors.txt); d.setFont("helvetica", "bold"); d.setFontSize(7);
  const bW = d.getTextWidth(cfg.badgeText.toUpperCase()) + 8;
  sf(d, bColors.bg); d.roundedRect(PW - M - bW, Y + 8, bW, 9, 4.5, 4.5, "F");
  d.text(cfg.badgeText.toUpperCase(), PW - M - bW / 2, Y + 14.2, { align: "center" });

  if (pt === "no_action") {
    // Top badge right aligned
    let bx = PW - M;
    bx -= drawBadgeRight(d, "NO ACTION REQUIRED TODAY", bx, Y + 22, T.emerald500, T.slate900);
    
    // Priorities / Tags right aligned
    bx = PW - M;
    bx -= drawBadgeRight(d, "Documentation", bx, Y + 32, T.blue400, T.slate900);
    bx -= drawBadgeRight(d, "Maintenance", bx, Y + 32, T.amber500, T.slate900);
    bx -= drawBadgeRight(d, "Roof Longevity", bx, Y + 32, T.emerald500, T.slate900);
    bx -= drawBadgeRight(d, "Monitor", bx, Y + 32, T.amber500, T.slate900);

    if (s.buyerData?.buyerPriorities && s.buyerData.buyerPriorities.length > 0) {
      bx = PW - M;
      for (let i = s.buyerData.buyerPriorities.length - 1; i >= 0; i--) {
        const text = s.buyerData.buyerPriorities[i].replace(/_/g, " ").toLowerCase();
        bx -= drawBadgeRight(d, text, bx, Y + 42, T.gray300, T.slate900);
      }
    }
  }

  // Tag & Title
  st(d, T.amber400); d.setFontSize(6); d.text(cfg.tag.toUpperCase(), M, Y + 32);
  st(d, T.white); d.setFont("times", "bold"); d.setFontSize(18);
  d.text(cfg.title, M, Y + 41);
  
  Y += headerHeight;
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

function drawBadge(d: jsPDF, text: string, x: number, y: number, color: C3, bgColor: C3) {
  d.setFont("helvetica", "normal"); d.setFontSize(7);
  const w = d.getTextWidth(text) + 6;
  sf(d, bgColor); sd(d, color); d.setLineWidth(0.3);
  d.roundedRect(x, y, w, 6, 2, 2, "FD");
  st(d, color);
  d.text(text, x + 3, y + 4.2);
  return w + 3;
}

function renderIntro(d: jsPDF, pt: PathType, s: SessionState) {
  if (pt === "no_action") {
    Y += 12; // Add padding below the property row
    st(d, T.slate900); d.setFont("times", "bold"); d.setFontSize(22);
    const headline = "Inspection complete.\nNo action is recommended today.";
    const lines = d.splitTextToSize(headline, CW) as string[];
    d.text(lines, M, Y);
    Y += lines.length * 8 + 6;
    
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const body = "Hustad completed a thorough exterior inspection and did not document meaningful storm-related conditions that support repair, emergency action, or carrier review at this time. All findings have been organized and documented for your property records.";
    const blines = d.splitTextToSize(body, CW) as string[];
    d.text(blines, M, Y);
    Y += blines.length * 5 + 6;

    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    Y += 10;
    return;
  }

  if (pt === "urgent_repair") {
    Y += 12;
    st(d, T.slate900); d.setFont("times", "bold"); d.setFontSize(22);
    const headline = "Direct repair is the recommended path forward.";
    const hLines = d.splitTextToSize(headline, CW) as string[];
    d.text(hLines, M, Y);
    Y += hLines.length * 8 + 6;
    
    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(11);
    const subhead = "The documented findings support a targeted repair scope. This path addresses what the evidence supports \u2014 nothing more. No insurance process required, faster scheduling, and full control over timing.";
    const shLines = d.splitTextToSize(subhead, CW) as string[];
    d.text(shLines, M, Y);
    Y += shLines.length * 5 + 6;

    if (s.findings?.summaryBody) {
      st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(11);
      const bLines = d.splitTextToSize(s.findings.summaryBody, CW) as string[];
      d.text(bLines, M, Y);
      Y += bLines.length * 5 + 6;
    }

    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    Y += 10;
    return;
  }

  if (pt === "carrier_review") {
    Y += 12;
    st(d, T.slate900); d.setFont("times", "bold"); d.setFontSize(22);
    const headline = "Storm findings documented. Carrier review is the recommended next step.";
    const hLines = d.splitTextToSize(headline, CW) as string[];
    d.text(hLines, M, Y);
    Y += hLines.length * 8 + 6;
    
    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(11);
    const subhead = "Hustad completed an exterior inspection and documented conditions consistent with storm-related impact. These findings do not determine insurance coverage, but they are strong enough to justify a formal carrier review before any out-of-pocket expense.";
    const shLines = d.splitTextToSize(subhead, CW) as string[];
    d.text(shLines, M, Y);
    Y += shLines.length * 5 + 6;

    if (s.findings?.summaryBody) {
      st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(11);
      const bLines = d.splitTextToSize(s.findings.summaryBody, CW) as string[];
      d.text(bLines, M, Y);
      Y += bLines.length * 5 + 6;
    }

    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(10);
    const text = "Thank you for authorizing Hustad Companies to coordinate your insurance claim. Below is your complete inspection report. No production work begins until your carrier issues a written coverage determination.";
    const lines = d.splitTextToSize(text, CW) as string[];
    d.text(lines, M, Y);
    Y += lines.length * 5 + 6;

    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    Y += 10;
    return;
  }

  let text = "";
  if (pt === "full_restoration") text = "Hustad Companies has completed your exterior inspection and documented conditions consistent with a full roof replacement. Our estimating department is preparing your custom proposal and will send it within 2-3 business days.";
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
      { l: "Repair Items", v: urgent, vc: T.red600, bg: T.red50, bc: T.red200 },
      { l: "Monitor Items", v: monitor, vc: T.amber600, bg: T.amber50, bc: T.amber200 },
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
  sf(d, T.blue50); d.rect(0, Y, PW, 20, "F");
  sd(d, T.blue200); d.setLineWidth(0.3); d.line(0, Y + 20, PW, Y + 20);
  
  st(d, T.blue800); d.setFont("helvetica", "bold"); d.setFontSize(7);
  d.text("WEATHER EVENT SUPPORT - ", M + 6, Y + 11);
  st(d, T.blue700); d.setFont("helvetica", "normal"); d.setFontSize(7);
  d.text("NWS Milwaukee and Sullivan products support a severe Dane County hail event on April 14, 2026.", M + 63, Y + 11);
  Y += 20;
}

function renderFindings(d: jsPDF, pt: PathType, s: SessionState) {
  if (pt === "no_action") {
    checkPage(d, 60);
    st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
    d.text("WHAT THIS MEANS", M, Y + 10);
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const mText = "Today's inspection did not reveal conditions that support a repair, protection, or carrier review recommendation. Any monitor-only or maintenance items have been documented as a baseline for future comparison. This is an honest finding, and it has real value as a dated property record.";
    const mLines = d.splitTextToSize(mText, CW);
    d.text(mLines, M, Y + 16);
    Y += 16 + mLines.length * 4.5 + 8;
    
    st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
    d.text("WHAT WE ARE NOT SAYING", M, Y);
    Y += 6;
    
    const notSaying = [
      "We are not saying your roof is perfect forever.",
      "We are not saying every condition needs action today.",
      "We are not asking you to make a repair or claim decision without a clear reason.",
      "We are saying the best next step today is documentation and monitoring."
    ];
    for (let i = 0; i < notSaying.length; i++) {
      st(d, i === 3 ? T.emerald500 : T.red600);
      d.text(i === 3 ? "✓" : "x", M, Y + 3);
      st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
      const lines = d.splitTextToSize(notSaying[i], CW - 10) as string[];
      const h = lines.length * 5 + 2;
      d.text(lines, M + 5, Y + 3);
      Y += h;
    }
    Y += 5;
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    return;
  }
  
  if (pt === "urgent_repair") {
    checkPage(d, 60);
    st(d, T.slate900); d.setFont("times", "normal"); d.setFontSize(14);
    d.text("Direct Repair", M, Y + 10);
    Y += 16;
    
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const mText = "Address documented items directly with a scoped repair authorization. No carrier process required. Hustad schedules repair work based on exactly what was documented during the inspection.";
    const mLines = d.splitTextToSize(mText, CW);
    d.text(mLines, M, Y);
    Y += mLines.length * 4.5 + 4;
    
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(M, Y, PW - M, Y);
    Y += 6;
    
    const bullets = [
      "Scope limited to documented findings \u2014 nothing beyond what the evidence supports.",
      "Faster scheduling with no carrier coordination delay.",
      "Full cost transparency before any work begins.",
      "You authorize exactly what gets repaired, and when."
    ];
    
    bullets.forEach(b => {
      st(d, T.red600); d.setFontSize(10); d.text("\u2022", M, Y + 3);
      st(d, T.gray600); d.setFont("helvetica", "normal");
      const lines = d.splitTextToSize(b, CW - 5) as string[];
      d.text(lines, M + 5, Y + 3);
      Y += lines.length * 4.5 + 2;
    });
    
    Y += 5;
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    return;
  }

  if (pt === "carrier_review") {
    checkPage(d, 80);
    st(d, T.slate900); d.setFont("times", "normal"); d.setFontSize(14);
    d.text("How the Carrier Review Agreement Works", M, Y + 10);
    Y += 16;
    
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const mText = "Coordinate a formal carrier inspection based on documented storm findings. Hustad prepares the documentation package. Your carrier reviews the evidence and makes a coverage determination.";
    const mLines = d.splitTextToSize(mText, CW);
    d.text(mLines, M, Y);
    Y += mLines.length * 4.5 + 4;
    
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(M, Y, PW - M, Y);
    Y += 6;
    
    const steps = [
      {
        title: "01 Document damage",
        desc: "Hustad has completed the exterior inspection and organized all findings, photos, and documentation into a structured report prepared for carrier review."
      },
      {
        title: "02 Coordinate carrier review",
        desc: "If you authorize, Hustad will coordinate the carrier inspection process and present the documented findings clearly to your insurer. Hustad does not negotiate your claim."
      },
      {
        title: "03 Confirm scope and coverage",
        desc: "Your insurance carrier reviews the documented evidence and makes the coverage determination under your policy. Hustad cannot predict or guarantee any coverage outcome."
      },
      {
        title: "04 Move forward only if you agree",
        desc: "No repair work begins until your carrier issues a written determination, you confirm the scope, and you authorize production in writing. You stay in control at every step."
      }
    ];
    
    steps.forEach(s => {
      checkPage(d, 25);
      st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(9);
      d.text(s.title, M, Y + 3);
      Y += 5;
      
      st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(9);
      const lines = d.splitTextToSize(s.desc, CW) as string[];
      d.text(lines, M, Y + 3);
      Y += lines.length * 4.5 + 4;
    });
    
    Y += 3;
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    Y += 10;
  }

  let items: string[] = [];
  
  // 1. Try to get specific finding labels from photos
  if (s.photos && s.photos.length > 0) {
    const findingSet = new Set<string>();
    s.photos.forEach(p => {
      if (p.selectedForSummary && p.label) {
        findingSet.add(p.label);
      }
    });
    // If no labels on summary photos, get labels from any photo
    if (findingSet.size === 0) {
      s.photos.forEach(p => {
        if (p.label) findingSet.add(p.label);
      });
    }
    items = Array.from(findingSet);
  }

  // 2. Fallback to finding categories if no photo labels exist
  if (items.length === 0 && s.findings?.findingCategories && s.findings.findingCategories.length > 0) {
    items = s.findings.findingCategories.map(c => `Documented condition: ${c}`);
  }

  // 3. Fallback to AI summary body split into sentences if all else fails
  if (items.length === 0 && s.findings?.summaryBody) {
    items = s.findings.summaryBody.split(/(?<=\.)\s+/).filter(l => l.trim().length > 0);
  }

  // 4. Final fallback
  if (items.length === 0) {
    items = [
      "Exterior inspection completed.",
      "Photo documentation collected for property records."
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
    st(d, T.amber500);
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
  
  for (let i = 0; i < photos.length; i += 3) {
    checkPage(d, h + 15);
    let cx = M;
    const rowPhotos = photos.slice(i, i + 3);
    
    for (let j = 0; j < 3; j++) {
      if (j < rowPhotos.length) {
        const p = rowPhotos[j];
        try {
          let fmt = p.dataUrl.includes("image/png") ? "PNG" : "JPEG";
          d.addImage(p.dataUrl, fmt, cx, Y, w, h);
        } catch (e) {
          sf(d, T.gray100); d.roundedRect(cx, Y, w, h, 2, 2, "F");
          sd(d, T.gray200); d.roundedRect(cx, Y, w, h, 2, 2, "S");
        }
        st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(5);
        const lines = d.splitTextToSize(p.label || `Photo ${i + j + 1}`, w - 2);
        d.text(lines, cx + w / 2, Y + h + 4, { align: "center" });
      } else if (i === 0) {
        // Only draw placeholders for the first row if fewer than 3 photos exist
        sf(d, T.gray50); d.roundedRect(cx, Y, w, h, 2, 2, "F");
        sd(d, T.gray200); d.roundedRect(cx, Y, w, h, 2, 2, "S");
      }
      cx += w + gap;
    }
    Y += h + 10;
  }
  st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(6);
  d.text("Full-resolution photos available in your inspection portal account.", M, Y);
  Y += 8;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}

function renderSteps(d: jsPDF, pt: PathType) {
  if (pt === "no_action") {
    checkPage(d, 80);
    st(d, T.slate900); d.setFont("times", "normal"); d.setFontSize(22);
    d.text("Save Baseline & Monitor", M, Y + 10);
    Y += 18;
    
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const mText = "Your inspection record is documented, organized, and saved as a baseline. If conditions change after a future storm event, you have a dated comparison point. No repair or claim action is needed today.";
    const mLines = d.splitTextToSize(mText, CW);
    d.text(mLines, M, Y);
    Y += mLines.length * 5 + 6;

    const bullets = [
      "Inspection report delivered to your property record.",
      "Baseline documentation stored for future storm comparison.",
      "Monitor items flagged with re-inspection triggers.",
      "Schedule a free recheck reminder at any time."
    ];

    bullets.forEach((b) => {
      sf(d, T.emerald500); d.circle(M + 2, Y - 1.2, 1.5, "F");
      st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
      d.text(b, M + 8, Y);
      Y += 7;
    });
    Y += 12;

    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    Y += 16;

    checkPage(d, 40);
    st(d, T.slate900); d.setFont("times", "normal"); d.setFontSize(22);
    d.text("Future Recheck Reminder", M, Y);
    Y += 10;
    st(d, T.gray600); d.setFont("helvetica", "normal"); d.setFontSize(10);
    const rText = "Set a free recheck reminder for 6 or 12 months. If a storm event occurs before then, your baseline documentation provides a before-and-after comparison.";
    const rLines = d.splitTextToSize(rText, CW);
    d.text(rLines, M, Y);
    Y += rLines.length * 5 + 10;
    
    sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
    return;
  }

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
      { t: "48-Hour Advance Notice", d: "You will receive notification at least 48 hours before your scheduled production start date." },
      { t: "Completion and Final Invoice", d: "Final invoicing will be provided upon project completion and a brief walkthrough with your rep." }
    ];
  } else if (pt === "full_restoration") {
    steps = [
      { t: "Estimating review", d: "Measurements, scope assumptions, and material basis are checked." },
      { t: "Proposal prepared", d: "Hustad creates the standard replacement proposal for owner review." },
      { t: "Owner decision", d: "Owner reviews, asks questions, selects options, or authorizes the project." }
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

function renderFooter(d: jsPDF) {
  checkPage(d, 45);
  
  // Anchor footer to the bottom of the page
  const footerHeight = 45;
  Y = PH - footerHeight;
  
  sf(d, T.slate900); d.rect(0, Y, PW, footerHeight, "F");
  
  st(d, T.gray500); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text("Hustad Companies, Inc. - Madison, Wisconsin", PW / 2, Y + 14, { align: "center" });
  d.text("Licensed Exterior Restoration Contractor - State of Wisconsin", PW / 2, Y + 19, { align: "center" });
  d.text("General Liability & Workers' Compensation Insurance Verified", PW / 2, Y + 24, { align: "center" });
  
  sd(d, T.gray800); d.line(M + 10, Y + 30, PW - M - 10, Y + 30);
  
  st(d, T.gray600); d.setFont("times", "normal"); d.setFontSize(7);
  const dis = "This report is confidential and prepared solely for the property owner identified above. It reflects conditions observed at the time of inspection and does not constitute a guarantee of insurance coverage or claim outcome.";
  const lines = d.splitTextToSize(dis, CW - 20);
  d.text(lines, PW / 2, Y + 36, { align: "center" });
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
  
  await renderHeader(d, cfg, pt, s);
  renderPropRow(d, s);
  renderIntro(d, pt, s);
  renderStats(d, pt, photos.length, s);
  if (pt === "carrier_review" || pt === "full_restoration") {
    renderStormBanner(d);
  }
  renderFindings(d, pt, s);
  await renderPhotos(d, photos);
  renderSteps(d, pt);
  // Agreement removed from summary report
  renderFooter(d);
  
  return d;
}

export async function getSummaryPDFBase64(s: SessionState): Promise<string> {
  const d = await generateReportPDF(s, [], null, "", "");
  return d.output("datauristring").split(",")[1];
}

export async function generateAgreementPDF(s: SessionState) {
  const d = new jsPDF({ compress: true });
  Y = M;
  const isSigned = !!s.signatureData.signedAt;
  
  // Simple Header
  sf(d, T.emerald500); d.rect(0, 0, PW, 2, "F");
  st(d, T.slate900); d.setFont("times", "bold"); d.setFontSize(16);
  d.text("Insurance Contingency Agreement", M, Y + 10);
  
  st(d, T.gray500); d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(`Property: ${s.property.address}`, M, Y + 16);
  d.text(`Owner: ${s.property.homeownerPrimaryName}`, M, Y + 21);
  d.text(`Date: ${fmtDate(s.createdAt)}`, M, Y + 26);
  
  Y += 36;
  
  AGREEMENT_SECTIONS.forEach((sec, idx) => {
    checkPage(d, 30);
    st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(9);
    d.text(sec.heading, M, Y);
    Y += 6;
    
    st(d, T.gray700); d.setFont("times", "normal"); d.setFontSize(8);
    const lines = d.splitTextToSize(sec.body, CW);
    d.text(lines, M, Y);
    Y += lines.length * 4 + 6;
  });
  
  // Wisconsin Notice
  checkPage(d, 40);
  sf(d, T.amber50); d.roundedRect(M, Y, CW, 35, 2, 2, "F");
  sd(d, T.amber500); d.setLineWidth(1); d.line(M, Y, M, Y + 35);
  
  st(d, T.amber800); d.setFont("helvetica", "bold"); d.setFontSize(8);
  d.text(WISCONSIN_CLAIM_NOTICE.heading.toUpperCase(), M + 6, Y + 8);
  
  st(d, T.amber900); d.setFont("helvetica", "normal"); d.setFontSize(7);
  WISCONSIN_CLAIM_NOTICE.lines.forEach((line, i) => {
    d.text(`• ${line}`, M + 6, Y + 14 + (i * 4));
  });
  Y += 45;
  
  // Required Acknowledgements
  checkPage(d, 60);
  st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(9);
  d.text("REQUIRED ACKNOWLEDGEMENTS", M, Y);
  Y += 8;
  
  const acks = [
    "I reviewed the documented inspection findings and they reflect actual conditions at my property.",
    "I understand my insurance carrier determines coverage \u2014 this agreement does not guarantee claim approval.",
    "I understand my deductible and any non-covered items remain my financial responsibility.",
    "I understand Hustad will email me the full report and executed agreement upon signing.",
    "I understand this agreement should be reviewed by all required property owners or policyholders."
  ];
  
  acks.forEach(ack => {
    checkPage(d, 15);
    st(d, isSigned ? T.emerald600 : T.gray400); d.setFontSize(10);
    d.text(isSigned ? "\u2713" : "\u25CB", M, Y + 3); // Checkmark or open circle
    
    st(d, T.slate900); d.setFont("helvetica", "normal"); d.setFontSize(8);
    const lines = d.splitTextToSize(ack, CW - 10) as string[];
    d.text(lines, M + 8, Y + 3);
    Y += lines.length * 4.5 + 2;
  });
  
  Y += 6;
  
  // Signature Block
  checkPage(d, 50);
  st(d, T.slate900); d.setFont("helvetica", "bold"); d.setFontSize(10);
  d.text("Authorization", M, Y);
  Y += 8;
  
  if (isSigned) {
    st(d, T.gray700); d.setFont("times", "italic"); d.setFontSize(9);
    d.text(`Electronically signed by ${s.signatureData.signerName} on ${fmtDate(s.signatureData.signedAt)}`, M, Y);
    Y += 6;
    if (s.signatureData.signerEmail) {
      d.text(`Email: ${s.signatureData.signerEmail}`, M, Y);
    }
  } else {
    st(d, T.gray500); d.setFont("helvetica", "italic"); d.setFontSize(9);
    d.text("UNSIGNED - FOR REVIEW ONLY", M, Y);
  }
  
  // Watermarks
  const total = d.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    d.setPage(i);
    d.setTextColor(isSigned ? 16 : 150, isSigned ? 185 : 150, isSigned ? 129 : 150); // emerald500 or gray400
    d.setFontSize(60);
    d.setGState(new (d as any).GState({ opacity: 0.1 }));
    d.text(isSigned ? "EXECUTED" : "UNSIGNED - REVIEW", PW / 2, PH / 2, { align: "center", angle: 45 });
    d.setGState(new (d as any).GState({ opacity: 1.0 }));
    
    // Page X of Y
    st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(6);
    d.text(`Page ${i} of ${total}`, PW - M, PH - 10, { align: "right" });
  }
  
  return d;
}

export async function getAgreementPDFBase64(s: SessionState): Promise<string> {
  const d = await generateAgreementPDF(s);
  return d.output("datauristring").split(",")[1];
}

export async function downloadSummaryPDF(s: SessionState) {
  const d = await generateReportPDF(s, [], null, "", "");
  const name = (s.property.homeownerPrimaryName || "Homeowner").replace(/\s+/g, "_");
  d.save(`Hustad_Inspection_Report_${name}_${s.sessionId.slice(-6).toUpperCase()}.pdf`);
}
