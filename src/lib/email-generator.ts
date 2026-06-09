import type { SessionState, OutcomeType } from "@/types/session";
import { AGREEMENT_SECTIONS, WISCONSIN_CLAIM_NOTICE } from "@/components/screens/b16_b19/constants";

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function derivePathType(s: SessionState) {
  const o = s.findings.outcomeType;
  const u = s.findings.urgentItemsCount;
  if (o === "repair_only")                                                  return "urgent_repair";
  if (o === "full_restoration_candidate")                                   return "full_restoration";
  if (o === "claim_review_candidate")                                       return "carrier_review";
  if (u > 0)                                                                return "urgent_repair";
  return "no_action";
}

// ─── Table Helpers ─────────────────────────────────────────────────────────────
const T_START = `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="background-color: #f5f5f7; padding: 40px 16px;">`;
const T_END = `</td></tr></table>`;
const CONTAINER_START = `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5ea; border-radius: 8px; overflow: hidden; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.03);"><tr><td>`;
const CONTAINER_END = `</td></tr></table>`;

const LOGO = `
<table border="0" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td width="32" height="32" align="center" valign="middle" style="background-color: #fbbf24; border-radius: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; color: #0f172a; font-size: 16px;">H</td>
    <td style="padding-left: 10px;">
      <div style="color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; font-size: 13px; letter-spacing: 2px; line-height: 1.1;">HUSTAD</div>
      <div style="color: #fbbf24; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; line-height: 1.1; margin-top: 2px;">COMPANIES</div>
    </td>
  </tr>
</table>
`;

const LOGO_DARK = `
<table border="0" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td width="32" height="32" align="center" valign="middle" style="background-color: #fbbf24; border-radius: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; color: #0f172a; font-size: 16px;">H</td>
    <td style="padding-left: 10px;">
      <div style="color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; font-size: 13px; letter-spacing: 2px; line-height: 1.1;">HUSTAD</div>
      <div style="color: #d97706; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; line-height: 1.1; margin-top: 2px;">COMPANIES</div>
    </td>
  </tr>
</table>
`;

function getBadge(text: string, v: "executed" | "pending" | "proposal"): string {
  const map = {
    executed: "background-color: #10b981; color: #ffffff;",
    pending:  "background-color: #fef3c7; color: #b45309;",
    proposal: "background-color: #eff6ff; color: #2563eb;",
  };
  return `<table border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="${map[v]} padding: 6px 14px; border-radius: 99px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">${text}</td></tr></table>`;
}

function renderHeader(title: string, tag: string, bt: string, bv: "executed" | "pending" | "proposal", ac: string = "#fbbf24"): string {
  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0f172a;">
      <tr>
        <td style="padding: 40px 40px 32px 40px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 40px;">
            <tr>
              <td align="left">${LOGO}</td>
              <td align="right">${getBadge(bt, bv)}</td>
            </tr>
          </table>
          <p style="color: ${ac}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 8px 0;">${tag}</p>
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 400; margin: 0; line-height: 1.3; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${title}</h1>
        </td>
      </tr>
    </table>
  `;
}

function renderPropRow(prop: string, date: string, insp: string): string {
  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fafafa; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 24px 40px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right: 48px; padding-bottom: 8px;">
                <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px 0;">Property</p>
                <p style="color: #1c1c1e; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; margin: 0;">${prop}</p>
              </td>
              <td style="padding-right: 48px; padding-bottom: 8px;">
                <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px 0;">Inspection Date</p>
                <p style="color: #1c1c1e; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; margin: 0;">${date}</p>
              </td>
              <td style="padding-right: 48px; padding-bottom: 8px;">
                <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px 0;">Inspector</p>
                <p style="color: #1c1c1e; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; margin: 0;">${insp}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderStats(stats: { l: string; v: string; vc: string }[]): string {
  let cols = stats.map(s => `
    <td width="33%" align="center" style="padding: 24px; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px;">
      <div style="font-size: 32px; font-weight: 300; color: ${s.vc}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1;">${s.v}</div>
      <div style="color: #8e8e93; font-size: 11px; font-weight: 500; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-top: 8px; line-height: 1.3; text-transform: uppercase; letter-spacing: 0.5px;">${s.l}</div>
    </td>
  `).join(`<td width="16">&nbsp;</td>`);

  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 32px 40px;">
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Inspection Summary</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>${cols}</tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderStormBanner(): string {
  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fefce8; border-bottom: 1px solid #fef08a;">
      <tr>
        <td style="padding: 16px 40px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td valign="top" style="padding-right: 12px; font-size: 16px;">⚡</td>
              <td valign="top" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6;">
                <span style="font-weight: 600; color: #a16207;">STORM EVENT CONFIRMED &mdash; </span>
                <span style="color: #b45309;">NWS products support a severe hail event at this location.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderFindings(items: string[], label = "Documented Conditions", iconColor = "#d97706", icon = "&bull;"): string {
  let listItems = items.map(f => `
    <tr>
      <td valign="top" style="padding-right: 12px; color: ${iconColor}; font-size: 16px; line-height: 1.5;">${icon}</td>
      <td valign="top" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; color: #3a3a3c; line-height: 1.6; padding-bottom: 12px;">${f}</td>
    </tr>
  `).join('');

  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 32px 40px;">
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0;">${label}</p>
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">${listItems}</table>
        </td>
      </tr>
    </table>
  `;
}

function renderPhotos(label = "Storm Evidence &middot; Strongest Proof Photos"): string {
  let boxes = [];
  for(let i=1; i<=6; i++) {
    boxes.push(`
      <td width="32%" align="center" style="background-color: #f9f9f9; border: 1px solid #f0f0f0; border-radius: 6px; padding: 32px 0;">
        <span style="font-size: 24px; color: #d1d1d6;">&#128247;</span>
        <div style="color: #8e8e93; font-size: 11px; font-weight: 500; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-top: 8px;">Photo ${i}</div>
      </td>
    `);
  }
  let row1 = `<tr>${boxes[0]}<td width="2%">&nbsp;</td>${boxes[1]}<td width="2%">&nbsp;</td>${boxes[2]}</tr>`;
  let row2 = `<tr><td colspan="5" height="12"></td></tr><tr>${boxes[3]}<td width="2%">&nbsp;</td>${boxes[4]}<td width="2%">&nbsp;</td>${boxes[5]}</tr>`;

  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 32px 40px;">
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0;">${label}</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
            ${row1}
            ${row2}
          </table>
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; margin: 16px 0 0 0;">Full-resolution photos available in your inspection portal account.</p>
        </td>
      </tr>
    </table>
  `;
}

function renderSteps(items: {t: string, d: string}[]): string {
  let steps = items.map((s, i) => `
    <tr>
      <td valign="top" width="28" style="padding-right: 16px; padding-bottom: 24px;">
        <table border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td width="28" height="28" align="center" valign="middle" style="background-color: #f3f4f6; color: #4b5563; border-radius: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700;">${i+1}</td></tr></table>
      </td>
      <td valign="top" style="padding-bottom: 24px;">
        <p style="color: #1c1c1e; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">${s.t}</p>
        <p style="color: #636366; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; margin: 0;">${s.d}</p>
      </td>
    </tr>
  `).join('');

  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 32px 40px 8px 40px;">
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 24px 0;">Your Next Steps</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">${steps}</table>
        </td>
      </tr>
    </table>
  `;
}

function renderFooter(s: SessionState): string {
  const cityState = s.property.cityStateZip 
    ? s.property.cityStateZip.split(/[0-9]/)[0].trim() // e.g. "Omaha, NE " -> "Omaha, NE"
    : "Midwest Region";
  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0f172a;">
      <tr>
        <td align="center" style="padding: 40px;">
          ${LOGO_DARK}
          <p style="color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6; margin: 16px 0 0 0; text-align: center;">
            Hustad Companies, Inc. &middot; ${cityState}<br>
            Licensed Exterior Restoration Contractor<br>
            General Liability &amp; Workers' Compensation Insurance Verified
          </p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 24px; border-top: 1px solid #1e293b;">
            <tr>
              <td align="center" style="padding-top: 24px;">
                <p style="color: #475569; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.6; margin: 0; text-align: center; max-width: 440px;">
                  This report is confidential and prepared solely for the property owner identified above. It reflects conditions observed at the time of inspection and does not constitute a guarantee of insurance coverage or claim outcome.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderAgreementHTML(isSigned: boolean, s: SessionState): string {
  let html = "";
  
  const dateStr = fmtDate(s.signatureData?.signedAt || s.createdAt) || "";
  const addr = s.property.address || "On file";
  const repName = s.repName || "Hustad Representative";
  const signerName = isSigned ? (s.signatureData?.signerName || "Authorized Electronically") : "Pending Review";
  const statusBadge = isSigned 
    ? `<td style="padding: 6px 12px;"><p style="color: #166534; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; margin: 0;">&#10003; EXECUTED</p></td>`
    : `<td style="padding: 6px 12px;"><p style="color: #b45309; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; margin: 0;">PENDING REVIEW</p></td>`;
  const badgeBg = isSigned ? "#dcfce7" : "#fef3c7";
  const badgeBorder = isSigned ? "#bbf7d0" : "#fde68a";

  let sectionsHtml = AGREEMENT_SECTIONS.map((sec) => `
    <tr>
      <td style="padding-bottom: 24px;">
        <p style="color: #1c1c1e; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">${sec.heading}</p>
        <p style="color: #4b5563; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.6; margin: 0;">${sec.body}</p>
      </td>
    </tr>
  `).join('');

  html += `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f7f9fa; padding: 40px 20px;">
      <tr>
        <td>
          <table width="100%" max-width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="max-width: 600px; margin: 0 auto;">
            <!-- Header Row -->
            <tr>
              <td style="padding-bottom: 16px;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left">
                      <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0;">${isSigned ? "Your Executed Agreement" : "Agreement Review Copy"}</p>
                    </td>
                    <td align="right">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${badgeBg}; border-radius: 100px; border: 1px solid ${badgeBorder};">
                        <tr>
                          ${statusBadge}
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Card -->
            <tr>
              <td>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <!-- Dark Green Header -->
                  <tr>
                    <td style="background-color: #0f766e; padding: 24px 32px;">
                      <p style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 700; margin: 0 0 4px 0;">INSURANCE CONTINGENCY AGREEMENT &mdash; ${isSigned ? "EXECUTED" : "REVIEW"} COPY</p>
                      <p style="color: #99f6e4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; margin: 0;">${isSigned ? "Signed: " : "Date: "}${dateStr} &middot; Property: ${addr}</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 32px 32px 8px 32px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        ${sectionsHtml}
                      </table>
                    </td>
                  </tr>
                  <!-- Signature Footer -->
                  <tr>
                    <td style="background-color: #ecfdf5; padding: 32px; border-top: 1px solid #e5e7eb;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td width="50%" valign="top" style="padding-right: 16px;">
                            <p style="color: #6b7280; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Homeowner</p>
                            <p style="color: #374151; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; margin: 0 0 12px 0;">${signerName === "Authorized Electronically" ? signerName : "Authorized Electronically"}</p>
                            <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px;"></div>
                            <p style="color: #9ca3af; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; margin: 0;">${dateStr}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-left: 16px;">
                            <p style="color: #6b7280; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Hustad Representative</p>
                            <p style="color: #374151; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; margin: 0 0 12px 0;">${repName}</p>
                            <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px;"></div>
                            <p style="color: #9ca3af; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; margin: 0;">${dateStr} &middot; Hustad Companies, Inc.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  let wisconsinHtml = WISCONSIN_CLAIM_NOTICE.lines.map(l => `
    <tr>
      <td valign="top" style="padding: 0 8px 6px 0; color: #b45309;">&bull;</td>
      <td valign="top" style="padding-bottom: 6px; color: #78350f; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5;">${l}</td>
    </tr>
  `).join('');

  html += `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td style="padding: 32px 40px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px;">
            <tr>
              <td>
                <p style="color: #b45309; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; margin: 0 0 12px 0;">${WISCONSIN_CLAIM_NOTICE.heading.toUpperCase()}</p>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                  ${wisconsinHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateEmailHTML(session: SessionState, reviewUrl: string | null = null): Promise<string> {
  const path = derivePathType(session);
  const isSigned = !!session.signatureData.signedAt;
  
  const prop = session.property.address;
  const dateStr = fmtDate(session.createdAt);
  const insp = session.repName || "Hustad Representative";
  const urgentCount = session.findings.urgentItemsCount;
  const monitorCount = session.findings.monitorItemsCount;
  const photoCount = session.photoAssets?.length || 0;

  const reviewButtonHtml = reviewUrl ? `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fafafa; border-bottom: 1px solid #f0f0f0;">
      <tr>
        <td align="center" style="padding: 40px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" bgcolor="#0f172a" style="border-radius: 6px;">
                <a href="${reviewUrl}" target="_blank" style="font-size: 13px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; color: #ffffff; text-decoration: none; padding: 18px 36px; border: 1px solid #0f172a; display: inline-block; border-radius: 6px; letter-spacing: 1px;">REVIEW &amp; AUTHORIZE DOSSIER</a>
              </td>
            </tr>
          </table>
          <p style="color: #8e8e93; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; margin: 16px 0 0 0;">Secure link to review findings and sign the agreement digitally.</p>
        </td>
      </tr>
    </table>
  ` : '';
  
  const stormStats = [
    { l: "Storm Indicators", v: `${session.findings.stormRelatedItemsCount || 0}`, vc: "#d97706" },
    { l: "Monitor Items",    v: `${monitorCount}`, vc: "#2563eb" },
    { l: "Photos Taken",     v: `${photoCount}`, vc: "#475569" },
  ];

  const repairStats = [
    { l: "Repair Items", v: `${urgentCount}`, vc: "#ea580c" },
    { l: "Monitor Items", v: `${monitorCount}`, vc: "#2563eb" },
    { l: "Photos Taken", v: `${photoCount}`, vc: "#475569" },
  ];

  const finds = session.findings.findingCategories && session.findings.findingCategories.length > 0
    ? session.findings.findingCategories
    : ["See full forensic dossier for detailed findings."];

  let bodyHtml = "";

  if (path === "carrier_review" && isSigned) {
    bodyHtml += renderHeader("Your Carrier Review Report", "Inspection Complete &middot; Claim Path", "Agreement Executed", "executed", "#fbbf24");
    bodyHtml += renderPropRow(prop, dateStr, insp);
    bodyHtml += `
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
        <tr><td style="padding: 32px 40px;"><p style="color: #3a3a3c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 300; line-height: 1.7; margin: 0;">Thank you for authorizing Hustad Companies to coordinate your insurance claim. Below is your complete inspection report and a copy of your executed Insurance Contingency Agreement. We will manage the carrier coordination process and keep you informed at each stage. <strong style="color: #1c1c1e; font-weight: 600;">No production work begins until your carrier issues a written coverage determination.</strong></p></td></tr>
      </table>
    `;
    bodyHtml += renderStats(stormStats);
    bodyHtml += renderStormBanner();
    bodyHtml += renderFindings(finds, "Documented Conditions", "#d97706", "&bull;");
    bodyHtml += renderPhotos("Storm Evidence &middot; Strongest Proof Photos");
    bodyHtml += renderSteps([
      { t: "Confirm Your Claim is Active", d: "Let us know if your claim has been filed, or if you need guidance on filing with your carrier." },
      { t: "Carrier Inspection Coordinated", d: "Hustad will schedule the adjuster visit and be present to ensure documented findings are accurately represented." },
      { t: "Review Your Coverage Decision", d: "Share any Explanation of Benefits or adjuster correspondence with your Hustad rep within 5 business days of receipt." },
      { t: "Production Scheduled", d: "Once coverage is confirmed in writing, we will schedule production and provide 48-hour advance notice." },
    ]);
    bodyHtml += renderAgreementHTML(isSigned, session);
  } else if (path === "carrier_review" && !isSigned) {
    bodyHtml += renderHeader("Your Carrier Review Report", "Inspection Complete &middot; Review Requested", "Awaiting Your Review", "pending", "#fbbf24");
    bodyHtml += renderPropRow(prop, dateStr, insp);
    bodyHtml += `
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
        <tr><td style="padding: 32px 40px;"><p style="color: #3a3a3c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 300; line-height: 1.7; margin: 0;">Hustad Companies has completed your exterior inspection and documented conditions consistent with storm-related impact. Based on our findings, we recommend a formal carrier review before any out-of-pocket expense. <strong style="color: #1c1c1e; font-weight: 600;">Review this report and the attached agreement at your convenience &mdash; there is no obligation to sign today.</strong></p></td></tr>
      </table>
    `;
    bodyHtml += renderStats(stormStats);
    bodyHtml += renderStormBanner();
    bodyHtml += renderFindings(finds, "Documented Conditions", "#d97706", "&bull;");
    bodyHtml += renderPhotos("Storm Evidence &middot; Strongest Proof Photos");
    bodyHtml += reviewButtonHtml;
    bodyHtml += renderAgreementHTML(isSigned, session);
    bodyHtml += renderSteps([
      { t: "Review This Report", d: "Take time to review the inspection findings and photo documentation below." },
      { t: "Review the Agreement", d: "Read the Insurance Contingency Agreement included in the attached PDF." },
      { t: "Sign to Authorize", d: "Signing authorizes Hustad to organize your documentation package and coordinate a carrier inspection." },
      { t: "File or Confirm Your Claim", d: "We can guide you on filing if needed. Let your Hustad rep know the status of your claim." },
    ]);
    bodyHtml += renderAgreementHTML(isSigned, session);
  } else if (path === "urgent_repair") {
    bodyHtml += renderHeader("Your Direct Repair Report", "Inspection Complete &middot; Repair Recommended", "Report Delivered", "executed", "#ea580c");
    bodyHtml += renderPropRow(prop, dateStr, insp);
    bodyHtml += `
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
        <tr><td style="padding: 32px 40px;"><p style="color: #3a3a3c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 300; line-height: 1.7; margin: 0;">Hustad Companies has completed your exterior inspection and identified conditions that require targeted repair. The documented scope is specific and actionable. Your inspection summary and repair documentation are included below.</p></td></tr>
      </table>
    `;
    bodyHtml += renderStats(repairStats);
    bodyHtml += renderFindings(finds, "Documented Conditions", "#ea580c", "&#9656;");
    bodyHtml += renderPhotos("Repair Documentation &middot; Inspection Photos");
    bodyHtml += renderSteps([
      { t: "Review This Report", d: "Take time to review the documented findings and recommended repair scope." },
      { t: "Scheduling Confirmation", d: "Expect a call from our scheduling team within 2 business days to confirm your production window." },
      { t: "48-Hour Advance Notice", d: "You will receive notification at least 48 hours before your scheduled production start date." },
      { t: "Completion and Final Invoice", d: "Final invoicing will be provided upon project completion and a brief walkthrough with your rep." },
    ]);
  } else if (path === "full_restoration") {
    bodyHtml += renderHeader("Your Roof Replacement Proposal", "Inspection Complete &middot; Full Replacement", "Proposal in Progress", "proposal", "#60a5fa");
    bodyHtml += renderPropRow(prop, dateStr, insp);
    bodyHtml += `
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
        <tr><td style="padding: 32px 40px;"><p style="color: #3a3a3c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 300; line-height: 1.7; margin: 0;">Hustad Companies has completed your exterior inspection and documented conditions consistent with a full roof replacement. Based on our findings, you have requested a standard replacement proposal. <strong style="color: #1c1c1e; font-weight: 600;">Our estimating department is currently preparing your custom proposal and will send it for your review within 2&ndash;3 business days.</strong> No action is required from you at this time.</p></td></tr>
      </table>
    `;
    bodyHtml += renderStats([
      { l: "Conditions Found", v: `${finds.length}`, vc: "#dc2626" },
      { l: "Monitor Items",   v: `${monitorCount}`, vc: "#2563eb" },
      { l: "Photos Taken",    v: `${photoCount}`, vc: "#475569" },
    ]);
    bodyHtml += renderFindings(finds, "Documented Conditions", "#ef4444", "&#9656;");
    bodyHtml += renderPhotos("Project context photos / reference images");
    bodyHtml += renderSteps([
      { t: "Proposal Delivered to You", d: "Your Hustad estimating team will send your custom proposal to this email address within 2&ndash;3 business days." },
      { t: "Review at Your Own Pace", d: "Take time to review the scope, material options, and pricing. No pressure and no deadline to decide." },
      { t: "Ask Questions Anytime", d: "Your Hustad representative is available to walk through any part of the proposal before you make a decision." },
      { t: "Authorize to Proceed", d: "Once you are ready to move forward, sign the proposal and we will schedule your production date." },
    ]);
  } else {
    bodyHtml += renderHeader("Your Inspection Report", "Inspection Complete &middot; Baseline Maintained", "Inspection Complete", "executed", "#34d399");
    bodyHtml += renderPropRow(prop, dateStr, insp);
    bodyHtml += `
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
        <tr><td style="padding: 32px 40px;"><p style="color: #3a3a3c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 300; line-height: 1.7; margin: 0;">We completed a thorough exterior inspection and didn't document meaningful storm-related conditions that support repair, emergency action, or carrier review at this time. All findings have been organized and documented for your property records.</p></td></tr>
      </table>
    `;
    bodyHtml += renderFindings(finds.length > 0 ? finds : ["No urgent issues found during inspection."], "Documented Conditions", "#10b981", "&#9656;");
    bodyHtml += renderPhotos("Inspection Documentation");
  }

  bodyHtml += renderFooter(session);

  return T_START + CONTAINER_START + bodyHtml + CONTAINER_END + T_END;
}
