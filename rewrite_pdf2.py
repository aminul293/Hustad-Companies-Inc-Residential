import os

with open("src/lib/pdf-export.ts", "r") as f:
    content = f.read()

# Add imports
if 'import { getPhotoBlob, blobToBase64 }' not in content:
    content = content.replace(
        'import { format } from "date-fns";',
        'import { format } from "date-fns";\nimport { getPhotoBlob, blobToBase64 } from "@/lib/photoStorage";'
    )

# Add collectPhotos helper
if 'async function collectPhotos' not in content:
    collect_photos_code = """
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

// --- Components ---"""
    content = content.replace('// --- Components ---', collect_photos_code)

# Fix renderStats signature
content = content.replace('function renderStats(d: jsPDF, pt: PathType, photosCount: number) {', 'function renderStats(d: jsPDF, pt: PathType, photosCount: number, s: SessionState) {')

# Replace stats logic
stats_old = """  if (pt === "urgent_repair") {
    stats = [
      { l: "Repair Items", v: "4", vc: T.orange600, bg: T.orange50, bc: T.orange200 },
      { l: "Monitor Items", v: "1", vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  } else if (pt === "full_restoration") {
    stats = [
      { l: "Conditions Found", v: "9", vc: T.red600, bg: T.red50, bc: T.red200 },
      { l: "Monitor Items", v: "2", vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  } else {
    stats = [
      { l: "Storm Indicators", v: "7", vc: T.amber600, bg: T.amber50, bc: T.amber200 },
      { l: "Monitor Items", v: "2", vc: T.blue600, bg: T.blue50, bc: T.blue200 },
      { l: "Photos Taken", v: photosCount.toString(), vc: T.gray600, bg: T.gray100, bc: T.gray200 }
    ];
  }"""
stats_new = """  const urgent = s.findings?.urgentItemsCount?.toString() || "0";
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
  }"""
content = content.replace(stats_old, stats_new)

# Fix renderFindings
find_old = """function renderFindings(d: jsPDF, pt: PathType) {
  const items = pt === "urgent_repair" ? [
    "Cracked and deteriorated valley flashing - active leak risk",
    "Pipe boot penetration seals failing - moisture intrusion present",
    "Ridge cap shingles lifting and unsealed - wind vulnerability",
    "Open drip edge along north fascia - water infiltration risk"
  ] : [
    "Hail impact spatter on soft metal surfaces - gutters, downspouts",
    "Granule displacement observed across multiple roof planes",
    "Impact dents visible on ridge cap and field shingles",
    "Soft metal deformation consistent with hail impact"
  ];"""
find_new = """function renderFindings(d: jsPDF, pt: PathType, s: SessionState) {
  let items: string[] = [];
  if (s.findings?.summaryBody) {
    items = s.findings.summaryBody.split('\\n').filter(l => l.trim().length > 0);
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
  }"""
content = content.replace(find_old, find_new)

# Fix renderPhotos
photo_old = """async function renderPhotos(d: jsPDF, photos: PdfPhoto[]) {
  checkPage(d, 50);
  st(d, T.gray400); d.setFont("helvetica", "bold"); d.setFontSize(6);
  d.text("STORM EVIDENCE - STRONGEST PROOF PHOTOS", M, Y + 10);
  Y += 15;
  
  const gap = 4;
  const w = (CW - gap * 2) / 3;
  const h = 28;
  
  let cx = M;
  for (let i = 0; i < 3; i++) {
    sf(d, T.gray100); d.roundedRect(cx, Y, w, h, 2, 2, "F");
    sd(d, T.gray200); d.roundedRect(cx, Y, w, h, 2, 2, "S");
    st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(6);
    d.text(`Photo ${i + 1}`, cx + w / 2, Y + h / 2, { align: "center" });
    cx += w + gap;
  }
  
  Y += h + 8;
  st(d, T.gray400); d.setFont("helvetica", "normal"); d.setFontSize(6);
  d.text("Full-resolution photos available in your inspection portal account.", M, Y);
  Y += 8;
  sd(d, T.gray200); d.setLineWidth(0.3); d.line(0, Y, PW, Y);
}"""
photo_new = """async function renderPhotos(d: jsPDF, photos: PdfPhoto[]) {
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
}"""
content = content.replace(photo_old, photo_new)

# Fix generateReportPDF
main_old = """export async function generateReportPDF(s: SessionState, photos: any, logo: any, rid: any, ptType: any) {
  const d = new jsPDF({ compress: true });
  Y = 0;
  
  const pt = derivePathType(s);
  const cfg = getPathConfig(pt);
  
  await renderHeader(d, cfg);
  renderPropRow(d, s);
  renderIntro(d, pt);
  renderStats(d, pt, s.photos ? s.photos.length : 0);
  if (pt === "carrier_review" || pt === "full_restoration") {
    renderStormBanner(d);
  }
  renderFindings(d, pt);
  await renderPhotos(d, []);"""
main_new = """export async function generateReportPDF(s: SessionState, photosArg: any, logo: any, rid: any, ptType: any) {
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
  await renderPhotos(d, photos);"""
content = content.replace(main_old, main_new)


with open("src/lib/pdf-export.ts", "w") as f:
    f.write(content)
