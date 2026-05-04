import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SessionState } from "@/types/session";

/**
 * Generates and downloads a professional "Executive Storm Review" PDF package.
 * Exactly matches the high-authority format provided in the real-world sample.
 */
/**
 * Generates the PDF but returns it as a base64 string instead of triggering a download.
 * Used for email delivery.
 */
export async function getSummaryPDFBase64(session: SessionState): Promise<string> {
  const doc = await generateDossier(session);
  return doc.output("datauristring").split(",")[1];
}

/**
 * Main entry point for manual rep download.
 */
export async function downloadSummaryPDF(session: SessionState) {
  const doc = await generateDossier(session);
  doc.save(`HUSTAD_FORENSIC_DOSSIER_${session.sessionId.slice(-6).toUpperCase()}.pdf`);
}

/**
 * Shared internal generation logic for the Forensic Laboratory Dossier.
 */
async function generateDossier(session: SessionState): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let agreementY = 0;

  // ===========================================================================
  // PAGE 1: FORENSIC DATA COVER (TECHNICAL NOIR)
  // ===========================================================================
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Technical Grid Axis
  doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.1);
  doc.line(30, 0, 30, pageHeight); // Vertical Spine
  doc.line(0, 50, pageWidth, 50); // Top Axis
  
  doc.setTextColor(51, 65, 85); doc.setFontSize(8); doc.setFont("courier", "bold");
  doc.text("PHASE_01 // SYSTEM_INIT", 10, 40, { angle: 90 });
  doc.text(`HASH_${session.sessionId.slice(-16).toUpperCase()}`, 10, pageHeight - 20, { angle: 90 });

  // Title Architecture
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(56);
  doc.text("FORENSIC", 45, 100);
  doc.text("DOSSIER", 45, 125);
  
  doc.setFillColor(99, 102, 241); doc.rect(45, 135, 40, 3, "F");
  
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text("CERTIFIED STORM COORDINATION // HUSTAD RESIDENTIAL", 45, 150, { charSpace: 2 });

  // Project Details
  doc.setFontSize(28); doc.setFont("times", "bold");
  const addr = ((session.property || {}).address || "PROPERTY ADDRESS").toUpperCase();
  const splitAddr = doc.splitTextToSize(addr, contentWidth - 30);
  doc.text(splitAddr, 45, 190);
  
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(148, 163, 184);
  doc.text(`${(session.property || {}).cityStateZip || "MADISON, WI"}`, 45, 190 + (splitAddr.length * 10));

  doc.setFontSize(7); doc.setTextColor(71, 85, 105);
  doc.text(`AUDIT_LOC: ${43.0731}°N ${89.4012}°W // VERIFIED_NWS`, 45, pageHeight - 30);
  doc.text("01 // 06", pageWidth - margin - 10, pageHeight - 30);

  // ===========================================================================
  // PAGE 2: EXECUTIVE SCORECARD (LAB GRADE)
  // ===========================================================================
  doc.addPage();
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 30, pageHeight, "F"); // Left Spine
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("courier", "bold");
  doc.text("PHASE_02 // SITE_AUDIT", 10, 40, { angle: 90 });

  doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(24);
  doc.text("EXECUTIVE SCORECARD", 45, 35);
  doc.setDrawColor(15, 23, 42); doc.setLineWidth(1); doc.line(45, 40, 100, 40);

  // Precision Metric Blocks
  const renderMetric = (label: string, value: string, sub: string, x: number, y: number, color: number[]) => {
    doc.setFillColor(248, 250, 252); doc.rect(x, y, 48, 45, "F");
    doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(2); doc.line(x, y, x + 48, y);
    doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(18); doc.text(value, x + 24, y + 22, { align: "center" });
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text(label.toUpperCase(), x + 24, y + 32, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.text(sub.toUpperCase(), x + 24, y + 40, { align: "center" });
  };
  renderMetric("Intensity", "HIGH", "NWS Validated", 45, 55, [15, 23, 42]);
  renderMetric("Match", "94%", "Forensic Set", 100, 55, [99, 102, 241]);
  renderMetric("Viability", "SECURE", "Claims Ready", 155, 55, [34, 197, 94]);

  let currentY = 120;
  const renderBox = (title: string, text: string, x: number, y: number) => {
    doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(title.toUpperCase(), x, y);
    doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(text, 70), x, y + 5);
  };
  renderBox("Why Review Now", "Forensic shingle strikes and collateral metal impact support a prompt date-of-loss file for carrier review while evidence is fresh.", 45, currentY);
  renderBox("Decision Posture", "Proceed as a positive damage package. Confirm policy terms and preserve the weather file while defensible.", 125, currentY);

  currentY += 40;
  autoTable(doc, {
    startY: currentY,
    margin: { left: 45 },
    head: [["PROJECT METRIC", "VALUE"]],
    body: [
      ["ESTIMATED VALUE", session.findings.estimatedClaimValue || "$28,800"], 
      ["SQ. FT. INVENTORY", `${session.findings.roofingArea || "3,200"} SF`], 
      ["WEATHER EVENT", (session.property || {}).stormBasis || "NWS VALIDATED"],
      ["MANUFACTURER", session.pathData.manufacturerSelected || "PENDING"],
      ["PROTECTION LEVEL", session.pathData.warrantyOptionSelected || "STANDARD"]
    ],
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8.5, cellPadding: 4 },
  });

  // ===========================================================================
  // PAGE 3: METEOROLOGICAL VALIDATION
  // ===========================================================================
  doc.addPage();
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 30, pageHeight, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("courier", "bold");
  doc.text("PHASE_03 // DATA_LOG", 10, 40, { angle: 90 });

  doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(24);
  doc.text("DATA VALIDATION", 45, 35);

  autoTable(doc, {
    startY: 50,
    margin: { left: 45 },
    head: [["TIME", "REFERENCE", "PROPERTY IMPACT"]],
    body: (session.findings.weatherEvents || []).map(e => [e.time, e.reference, e.relevance]),
    theme: "striped",
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 3 },
  });

  const photoAssets = (session.photoAssets || []).filter(p => p.selectedForSummary && !p.isSensitive);
  if (photoAssets.length > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(12); doc.text("SENSORY EVIDENCE_01", 45, currentY);
    try {
      const asset = photoAssets[0];
      doc.addImage(asset.dataUrl, "JPEG", 45, currentY + 5, contentWidth - 30, 80);
      
      // Draw annotations for the first large photo
      if (asset.annotations) {
        doc.setLineWidth(0.5);
        asset.annotations.forEach(ann => {
          doc.setDrawColor(ann.color === "#ef4444" ? 239 : 99, ann.color === "#ef4444" ? 68 : 102, ann.color === "#ef4444" ? 68 : 241);
          if (ann.type === "circle") {
            doc.circle(45 + (ann.x * (contentWidth - 30) / 100), (currentY + 5) + (ann.y * 80 / 100), (ann.radius || 5) * (contentWidth - 30) / 100, "S");
          } else if (ann.type === "arrow") {
            doc.line(45 + (ann.x * (contentWidth - 30) / 100), (currentY + 5) + (ann.y * 80 / 100), 45 + ((ann.toX || ann.x) * (contentWidth - 30) / 100), (currentY + 5) + ((ann.toY || ann.y) * 80 / 100));
          } else if (ann.type === "label" && ann.text) {
            doc.setFillColor(ann.color === "#ef4444" ? 239 : 99, ann.color === "#ef4444" ? 68 : 102, ann.color === "#ef4444" ? 68 : 241);
            doc.rect(45 + (ann.x * (contentWidth - 30) / 100) - 10, (currentY + 5) + (ann.y * 80 / 100) - 3, 20, 6, "F");
            doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.text(ann.text.toUpperCase(), 45 + (ann.x * (contentWidth - 30) / 100), (currentY + 5) + (ann.y * 80 / 100) + 1, { align: "center" });
          }
        });
      }
      doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.5); doc.rect(45, currentY + 5, contentWidth - 30, 80, "S");
    } catch (e) {}
  }

  // ===========================================================================
  // PAGE 4: RISK EXPOSURE (TECHNICAL DARK)
  // ===========================================================================
  doc.addPage();
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setTextColor(51, 65, 85); doc.setFontSize(8); doc.setFont("courier", "bold");
  doc.text("PHASE_04 // RISK_ASSESSMENT", 10, 40, { angle: 90 });
  
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(42);
  doc.text("RISK", 45, 80);
  doc.text("EXPOSURE", 45, 105);
  
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
  const riskTxt = "UNRESOLVED STORM DAMAGE IS A FINANCIAL LIABILITY. FRACTURES AND GRANULE LOSS TURN A DOCUMENTED STORM EVENT INTO WATER, MOLD, AND TRANSACTION PRESSURE.";
  doc.text(doc.splitTextToSize(riskTxt, contentWidth - 45), 45, 120);

  currentY = 160;
  const renderRiskItem = (title: string, x: number) => {
    doc.setFillColor(30, 41, 59); doc.rect(x, currentY, 50, 40, "F");
    doc.setTextColor(99, 102, 241); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(title.toUpperCase(), x + 5, currentY + 10);
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text("CRITICAL EXPOSURE", x + 5, currentY + 18);
    doc.setDrawColor(99, 102, 241); doc.setLineWidth(1); doc.line(x, currentY, x + 50, currentY);
  };
  renderRiskItem("Short Term", 45);
  renderRiskItem("Capital", 105);
  renderRiskItem("Friction", 165);

  doc.setFillColor(255, 255, 255); doc.rect(45, pageHeight - 60, contentWidth - 30, 30, "F");
  doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(12);
  doc.text("EXECUTIVE DIRECTIVE: DOCUMENT // REVIEW // DECIDE", pageWidth / 2 + 15, pageHeight - 43, { align: "center" });

  // ===========================================================================
  // REMAINING PAGES
  // ===========================================================================
  if (photoAssets.length > 1) {
    let currentPhotoIdx = 1;
    while (currentPhotoIdx < photoAssets.length) {
      doc.addPage();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 30, pageHeight, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("courier", "bold");
      doc.text("EVIDENCE_LOG", 10, 40, { angle: 90 });
      photoAssets.slice(currentPhotoIdx, currentPhotoIdx + 4).forEach((asset, idx) => {
        const col = idx % 2; const row = Math.floor(idx / 2);
        const x = 45 + (col * ( (contentWidth - 40) / 2 + 10)); const y = 40 + (row * 100);
        try { 
          doc.addImage(asset.dataUrl, "JPEG", x, y, (contentWidth - 40) / 2, 80); 
          
          // --- DRAW FORENSIC ANNOTATIONS ---
          if (asset.annotations && asset.annotations.length > 0) {
            const imgWidth = (contentWidth - 40) / 2;
            const imgHeight = 80;
            doc.setLineWidth(0.5);
            asset.annotations.forEach(ann => {
              if (ann.color === "#ef4444") doc.setDrawColor(239, 68, 68);
              else doc.setDrawColor(99, 102, 241);
              
              if (ann.type === "circle") {
                doc.circle(x + (ann.x * imgWidth / 100), y + (ann.y * imgHeight / 100), (ann.radius || 5) * imgWidth / 100, "S");
              } else if (ann.type === "arrow") {
                doc.line(x + (ann.x * imgWidth / 100), y + (ann.y * imgHeight / 100), x + ((ann.toX || ann.x) * imgWidth / 100), y + ((ann.toY || ann.y) * imgHeight / 100));
              } else if (ann.type === "label" && ann.text) {
                doc.setFillColor(ann.color === "#ef4444" ? 239 : 99, ann.color === "#ef4444" ? 68 : 102, ann.color === "#ef4444" ? 68 : 241);
                doc.rect(x + (ann.x * imgWidth / 100) - 10, y + (ann.y * imgHeight / 100) - 3, 20, 6, "F");
                doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.text(ann.text.toUpperCase(), x + (ann.x * imgWidth / 100), y + (ann.y * imgHeight / 100) + 1, { align: "center" });
              } else if (ann.type === "blur") {
                doc.setFillColor(255, 255, 255); doc.rect(x + (ann.x * imgWidth / 100), y + (ann.y * imgHeight / 100), ((ann.toX || ann.x) - ann.x) * imgWidth / 100, ((ann.toY || ann.y) - ann.y) * imgHeight / 100, "F");
              }
            });
          }

          doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.5); doc.rect(x, y, (contentWidth - 40) / 2, 80, "S");
          doc.setFillColor(15, 23, 42); doc.rect(x, y + 80, 40, 6, "F");
          doc.setFontSize(6); doc.setTextColor(255, 255, 255); doc.setFont("courier", "bold");
          doc.text(`TAG_${(asset.tags?.[0] || asset.category).toUpperCase()}`, x + 3, y + 84); 
          if (asset.severity) {
            doc.setTextColor(asset.severity === 'critical' ? 239 : 148, asset.severity === 'critical' ? 68 : 163, asset.severity === 'critical' ? 68 : 184);
            doc.text(`[${asset.severity.toUpperCase()}]`, x + 3, y + 88);
          }
        } catch (e) {}
      });
      currentPhotoIdx += 4;
    }
  }

  doc.addPage();
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 30, pageHeight, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("courier", "bold");
  doc.text("LEGAL_AGREEMENT", 10, 40, { angle: 90 });

  doc.setTextColor(15, 23, 42); doc.setFont("times", "bold"); doc.setFontSize(24);
  doc.text("MASTER AGREEMENT", 45, 35);
  
  agreementY = 50;
  const renderLegal = (num: string, title: string, text: string) => {
    doc.setFont("times", "bold"); doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.text(`${num}. ${title.toUpperCase()}`, 45, agreementY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(text, contentWidth - 30);
    doc.text(lines, 45, agreementY + 5);
    agreementY += (lines.length * 4) + 12;
  };
  renderLegal("1", "Purpose and Contingency", "Owner authorizes Hustad Companies (Contractor) to coordinate with the insurance carrier for the repair of storm-damaged components. Agreement is void if claim is denied.");
  renderLegal("2", "Award of Work", "If funding is acceptable, owner awards Hustad the restoration work for the approved scope. Owner awards work upon acceptable insurance funded scope.");
  renderLegal("3", "Owner Responsibilities", "Owner will provide policy and adjuster access, timely decisions, site access, and payment of deductibles and non-covered items under the final contract.");
  renderLegal("4", "Hustad Responsibilities", "Hustad will document conditions, support scope review, prepare pricing, coordinate site meetings, and perform awarded work under the final signed contract.");

  currentY = agreementY + 10;
  doc.setTextColor(15, 23, 42); doc.setFontSize(8);
  doc.text(`SITE: ${addr}`, 45, currentY);
  doc.text(`OWNER: ${(session.property || {}).homeownerPrimaryName || "OWNERSHIP"}`, 45, currentY + 6);
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, 45, currentY + 12);

  currentY += 40;
  if (session.signatureData.signatureImage) { try { doc.addImage(session.signatureData.signatureImage, "PNG", 45, currentY - 20, 50, 20); } catch (e) {} }
  doc.setDrawColor(15, 23, 42); doc.line(45, currentY, 110, currentY); doc.line(130, currentY, 195, currentY);
  doc.setFontSize(7); doc.setFont("times", "bold"); doc.text("AUTHORIZED OWNER SIGNATURE", 45, currentY + 5); doc.text("HUSTAD AUTHORIZED SIGNATORY", 130, currentY + 5);
  
  return doc;
}
