import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SessionState } from "@/types/session";

/**
 * Generates and downloads a professional "Executive Storm Review" PDF package.
 * Exactly matches the high-authority format provided in the real-world sample.
 */
export async function downloadSummaryPDF(session: SessionState) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- Helper: Render Header ---
  const renderHeader = (doc: jsPDF, title: string) => {
    doc.setFillColor(34, 52, 85); // Hustad Navy
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("HUSTAD", margin, 15);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, 15, { align: "right" });
  };

  // --- Helper: Section Title ---
  const renderSectionTitle = (doc: jsPDF, address: string, subTitle: string, y: number) => {
    doc.setTextColor(185, 28, 28); // Dark Red for Address
    doc.setFontSize(22);
    doc.setFont("times", "bold");
    doc.text(address || "Property Address", margin, y);
    
    doc.setTextColor(34, 52, 85); // Navy for Subtitle
    doc.setFontSize(14);
    doc.text(subTitle, margin, y + 9);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Prepared for ${session.property.homeownerPrimaryName || "Ownership"}`, margin, y + 17);
  };

  // ===========================================================================
  // PAGE 1: EXECUTIVE COVER LETTER
  // ===========================================================================
  renderHeader(doc, "Executive Storm Review");
  renderSectionTitle(doc, session.property.address || "Property Address", "Executive Storm Review Cover Letter", 45);

  autoTable(doc, {
    startY: 75,
    body: [
      ["Property", `${session.property.address || "Property Address"} | ${session.property.cityStateZip || "Madison, WI"}`],
      ["Subject", "Executive hail review and claim decision package"],
    ],
    theme: "grid",
    styles: { cellPadding: 5, fontSize: 10, font: "helvetica" },
    columnStyles: { 0: { fontStyle: "bold", width: 40, fillColor: [245, 245, 245] } },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const introText = "Hustad prepared this executive storm package from the inspection report, supplemental field photos, and official Madison weather products for the storm file.\n\nThe source set supports a positive hail damage review on the architectural shingle inventory. Close up shingle strike photos, vinyl siding impact, and soft metal collateral support carrier review.\n\nThis package is a decision file, not a carrier determination. It is intended to help ownership confirm policy terms, inspect promptly, and choose between claim review and direct capital planning.";
  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, margin, currentY);
  
  currentY += splitIntro.length * 5 + 15;
  const path = session.findings.outcomeType === "claim_review_candidate" ? "Policy review and site inspection" : "Direct project coordination";

  autoTable(doc, {
    startY: currentY,
    head: [["Working date of loss", "Storm basis", "Recommended path"]],
    body: [[session.property.workingDateOfLoss || "04/14/2026", session.property.stormBasis || "Madison metro hail event", path]],
    theme: "grid",
    headStyles: { fillColor: [240, 243, 248], textColor: [70, 70, 70], halign: "center", fontStyle: "bold" },
    styles: { halign: "center", fontSize: 14, font: "times", textColor: [34, 52, 85], fontStyle: "bold" },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFillColor(34, 52, 85);
  doc.rect(margin, currentY, contentWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Immediate next step:", margin + 5, currentY + 11);
  doc.setFont("helvetica", "normal");
  const nextStepTxt = "Confirm deductible and settlement basis, then schedule the carrier and contractor site inspection.";
  const splitNext = doc.splitTextToSize(nextStepTxt, contentWidth - 50);
  doc.text(splitNext, margin + 42, currentY + 11);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.text(session.repName || "Ryan Bentley", margin, pageHeight - 35);
  doc.text("Hustad Companies | (608) 445 0158", margin, pageHeight - 30);

  // ===========================================================================
  // PAGE 2: EXECUTIVE HAIL ASSESSMENT
  // ===========================================================================
  doc.addPage();
  renderHeader(doc, "Executive Hail Assessment");
  renderSectionTitle(doc, session.property.address || "Property Address", "Executive Hail Assessment", 45);

  autoTable(doc, {
    startY: 75,
    head: [["Prepared for", "Property"]],
    body: [[session.property.homeownerPrimaryName || "Ownership", session.property.address || "Property Address"]],
    theme: "grid",
    headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], halign: "center" },
    styles: { halign: "center", fontSize: 10 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    head: [["Inventory source", "Storm support", "Prepared"]],
    body: [["Full inspection report for site inventory and area.", `Supplemental field photos plus ${session.property.stormBasis || "NWS MKX"} support.`, new Date().toLocaleDateString()]],
    theme: "grid",
    headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], halign: "center" },
    styles: { halign: "center", fontSize: 10 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28);
  doc.text("Executive summary and advisory", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryText = session.findings.summaryBody || "The source set combines roof inventory, field evidence, and official weather support. Together, those materials justify immediate policy review rather than delay.";
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, currentY + 8);

  currentY += 25;
  autoTable(doc, {
    startY: currentY,
    head: [["Working date of loss", "Included roofing area", "Estimated claim value"]],
    body: [[session.property.workingDateOfLoss || "04/14/2026", `${session.findings.roofingArea || "3,200"} SF`, session.findings.estimatedClaimValue || "$28,800"]],
    theme: "grid",
    headStyles: { fillColor: [240, 243, 248], textColor: [100, 100, 100], halign: "center" },
    styles: { halign: "center", fontSize: 14, font: "times", textColor: [34, 52, 85], fontStyle: "bold" },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  const boxWidth = (contentWidth - 5) / 2;
  const renderBox = (title: string, text: string, x: number, y: number, bgColor: number[]) => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(x, y, boxWidth, 40, "F");
    doc.setTextColor(34, 52, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, x + 5, y + 10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(text, boxWidth - 10), x + 5, y + 18);
  };
  renderBox("Why review now", "Close up shingle strikes and soft metal collateral support a prompt causation file for carrier review.", margin, currentY, [240, 245, 255]);
  renderBox("Decision posture", "Proceed as a positive damage package. Confirm policy terms and inspect while the evidence set is current.", margin + boxWidth + 5, currentY, [255, 252, 240]);
  currentY += 45;
  renderBox("Key qualifiers", `Inventory quantity from site measurements. Storm support tied to ${session.property.stormBasis || "April 14 Madison"} file.`, margin, currentY, [245, 245, 245]);
  renderBox("Damage certainty", "Evidence aligns with official hail reporting. High confidence for a formal carrier assessment.", margin + boxWidth + 5, currentY, [255, 245, 245]);

  // ===========================================================================
  // PAGE 3: FINDINGS & WEATHER VALIDATION
  // ===========================================================================
  doc.addPage();
  renderHeader(doc, "Findings & Weather Validation");
  renderSectionTitle(doc, session.property.address || "Property Address", "Executive Hail Assessment", 45);

  currentY = 75;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(185, 28, 28);
  doc.text("Property findings", margin, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Sec.", "Sq. Ft.", "System", "Executive take"]],
    body: [["1", session.findings.roofingArea || "3,200", "Architectural shingle", session.findings.summaryHeadline || "Close up shingle and collateral impact support a positive storm review."]],
    theme: "grid",
    headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100] },
    styles: { fontSize: 9 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;
  const renderSmallBox = (title: string, text: string, x: number, y: number, color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, boxWidth, 25, "F");
    doc.setTextColor(34, 52, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, x + 5, y + 8);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(text, boxWidth - 10), x + 5, y + 14);
  };
  renderSmallBox("Close up shingle strikes", "Close photos show granule displacement and impact marks on the asphalt shingle field.", margin, currentY, [240, 245, 255]);
  renderSmallBox("Vinyl siding impact", "Siding puncture provides exterior collateral impact support.", margin + boxWidth + 5, currentY, [255, 252, 240]);
  currentY += 30;
  renderSmallBox("Soft metal collateral", "Gutter and apron photos document exposed metal components for carrier review.", margin, currentY, [255, 245, 250]);
  renderSmallBox("Repeated roof surface evidence", "The photo set shows multiple roof surface strike locations across the shingle field.", margin + boxWidth + 5, currentY, [240, 250, 240]);

  currentY += 40;
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(12);
  doc.text("Weather validation", margin, currentY);
  autoTable(doc, {
    startY: currentY + 5,
    head: [["Time", "Official reference", "Property relevance"]],
    body: (session.findings.weatherEvents || []).map(e => [e.time, e.reference, e.relevance]),
    theme: "grid",
    headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100] },
    styles: { fontSize: 9 },
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(session.findings.stormSummary || "", margin, (doc as any).lastAutoTable.finalY + 8);

  currentY = (doc as any).lastAutoTable.finalY + 25;
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(12);
  doc.text("Immediate ownership actions", margin, currentY);
  const actionBoxWidth = (contentWidth - 10) / 4;
  const renderAction = (num: string, title: string, text: string, x: number, y: number) => {
    doc.setFillColor(240, 245, 255);
    doc.rect(x, y, actionBoxWidth, 35, "F");
    doc.setTextColor(34, 52, 85);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${num}. ${title}`, x + 3, y + 8, { maxWidth: actionBoxWidth - 6 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(text, actionBoxWidth - 6), x + 3, y + 18);
  };
  renderAction("1", "Confirm deductible", "Pull declarations and check the deductible endorsement.", margin, currentY + 5);
  renderAction("2", "Confirm settlement basis", "Confirm RCV or ACV treatment.", margin + actionBoxWidth + 3.3, currentY + 5);
  renderAction("3", "Review exclusions", "Review prior loss, cosmetic, and wear language.", margin + (actionBoxWidth * 2) + 6.6, currentY + 5);
  renderAction("4", "Choose the path", "Choose claim inspection or capital screen.", margin + (actionBoxWidth * 3) + 10, currentY + 5);

  // ===========================================================================
  // PAGE 4: RISK MITIGATION (EDUCATIONAL)
  // ===========================================================================
  doc.addPage();
  renderHeader(doc, "Strategic Risk Assessment");
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(22);
  doc.setFont("times", "bold");
  doc.text(session.property.address || "Property Address", margin, 45);
  doc.text("Hail damage does not stay cosmetic.", margin, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("On asphalt shingle roofs, hail bruising, fractures, and granule loss can turn a documented storm event into water, mold, capital, and transaction pressure if ownership waits too long to act.", margin, 62);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("This is not just a roofing issue. It is an exterior asset, risk, and capital planning issue for occupied portfolios.", margin, 78);

  currentY = 85;
  const colW = (contentWidth - 10) / 3;
  const renderRiskCol = (title: string, text: string, x: number, y: number, color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, colW, 70, "F");
    doc.setTextColor(34, 52, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, x + 5, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(text, colW - 10), x + 5, y + 18);
  };
  renderRiskCol("Short term building risk", "• Hail fractures can reduce water shedding performance.\n• EPA says wet materials should be dried within 24 to 48 hours.\n• Trapped moisture can reduce thermal performance.", margin, currentY, [240, 245, 255]);
  renderRiskCol("Long term capital risk", "• Impacted shingles do not self heal; sun and freeze keep degrading.\n• Delay can turn a claimable roof event into owner funded deck and interior work.\n• Waiting usually means more scope and less capital plan leverage.", margin + colW + 5, currentY, [255, 252, 240]);
  renderRiskCol("Sale, refinance, and lender risk", "• ASTM E2018 remains a core PCA framework for acquisitions.\n• Unresolved roof damage can trigger lender conditions, escrows, or retrades.\n• Roof issues often become transaction friction instead of insurance funded repair.", margin + (colW * 2) + 10, currentY, [255, 245, 250]);

  currentY += 85;
  renderBox("Why large deductibles can still make economic sense", "The real comparison is rarely deductible versus zero. It is deductible now versus deductible plus future water loss, mold, and transaction friction later.\nNAIC notes ACV may not fund full replacement, while RCV pays repair or replacement with like kind and quality.", margin, currentY, [240, 245, 255]);
  renderBox("Hustad financing options", "• 0% deductible financing in select cases for up to 24 months.\n• Longer terms available at the then current WSJ indexed rate.\n• Confirm the current benchmark at proposal date.", margin + boxWidth + 5, currentY, [245, 245, 245]);

  doc.setFillColor(34, 52, 85);
  doc.rect(margin, pageHeight - 50, contentWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("HUSTAD RECOMMENDED PATH: Document the damage. Review the policy. Run the deductible math. Decide before a known storm loss becomes a larger capital event.", margin + 5, pageHeight - 39, { maxWidth: contentWidth - 10 });

  // ===========================================================================
  // PAGE 5+: PHOTO DOCUMENTATION
  // ===========================================================================
  if (session.photoAssets.length > 0) {
    let currentPhotoIdx = 0;
    const photosPerPage = 8;
    const pWidth = (contentWidth - 10) / 2;
    const pHeight = 55;
    while (currentPhotoIdx < session.photoAssets.length) {
      doc.addPage();
      renderHeader(doc, "Photo Documentation");
      renderSectionTitle(doc, session.property.address || "Property Address", "Site Evidence Gallery", 45);
      session.photoAssets.slice(currentPhotoIdx, currentPhotoIdx + photosPerPage).forEach((asset, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = margin + (col * (pWidth + 10));
        const y = 75 + (row * (pHeight + 15));
        try { doc.addImage(asset.dataUrl, "JPEG", x, y, pWidth, pHeight); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text(asset.caption || "Inspection Detail", x, y + pHeight + 5); } catch (e) { doc.rect(x, y, pWidth, pHeight); doc.text("Unsupported image", x + 5, y + 25); }
      });
      currentPhotoIdx += photosPerPage;
    }
  }

  // ===========================================================================
  // LAST PAGE: AGREEMENT
  // ===========================================================================
  doc.addPage();
  renderHeader(doc, "Authorization & Agreement");
  renderSectionTitle(doc, session.property.address || "Property Address", "Storm Restoration Contingency Agreement", 45);
  autoTable(doc, { startY: 75, body: [["Owner", session.property.homeownerPrimaryName || "Ownership"], ["Property", session.property.address || "Address"], ["Contractor", "Hustad Companies"], ["Agreement Date", new Date().toLocaleDateString()]], theme: "grid", columnStyles: { 0: { fontStyle: "bold", width: 40, fillColor: [245, 245, 245] } } });
  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(34, 52, 85); doc.text("Owner Acknowledgment", margin, currentY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(doc.splitTextToSize("Owner acknowledges this is a pre execution business draft for discussion with counsel and ownership, not a promise of insurance recovery. Any binding restoration obligation arises only after an acceptable insured scope and a later signed project proposal or contract.", contentWidth), margin, currentY + 6);
  if (session.signatureData.signatureImage) { try { doc.addImage(session.signatureData.signatureImage, "PNG", margin, pageHeight - 70, 60, 30); } catch (e) {} }
  doc.setDrawColor(200, 200, 200); doc.line(margin, pageHeight - 40, margin + 80, pageHeight - 40); doc.line(pageWidth - margin - 80, pageHeight - 40, pageWidth - margin, pageHeight - 40);
  doc.setFontSize(8); doc.text("Owner / Authorized Representative", margin, pageHeight - 35); doc.text("Hustad Companies", pageWidth - margin - 80, pageHeight - 35);
  doc.setFont("helvetica", "bold"); doc.setTextColor(34, 52, 85);
  doc.text("Schedule a storm review | Ryan Bentley | (608) 445 0158", pageWidth / 2, pageHeight - 15, { align: "center" });
  doc.save(`Hustad_Dossier_${session.sessionId}.pdf`);
}
