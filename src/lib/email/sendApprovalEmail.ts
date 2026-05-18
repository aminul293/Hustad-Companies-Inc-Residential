import { getGraphToken, sendGraphMail } from "./graphClient";

const MANAGER_EMAIL = "aminul@hustadcompanies.com";
const ERIC_EMAIL = "ecaturia@hustadcompanies.com";

export interface ApprovalEmailData {
  token: string;
  companyName: string;
  salesStatus: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  timezone: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: string;
  expiresAt: string;
  /** Base URL of the app (e.g. http://localhost:3004 or https://portal.hustadcompanies.com).
   *  Derived from the incoming request so the approve/reject links always work. */
  appUrl: string;
}

function buildHtml(d: ApprovalEmailData): string {
  const approveUrl = `${d.appUrl}/api/approvals/${d.token}/approve`;
  const rejectUrl = `${d.appUrl}/api/approvals/${d.token}/reject`;
  const address = [d.streetAddress, d.locality, d.region, d.postalCode]
    .filter(Boolean)
    .join(", ");

  const row = (label: string, value: string, alt = false) =>
    `<tr style="background:${alt ? "#f9fafb" : "#fff"}">
      <td style="padding:10px 14px;font-weight:600;color:#374151;width:38%;white-space:nowrap">${label}</td>
      <td style="padding:10px 14px;color:#111827">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">

    <div style="background:#1e3a5f;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Hustad Companies — Approval Required</h1>
      <p style="margin:6px 0 0;color:#93c5fd;font-size:13px">New Residential Company + Inspection Ticket Request</p>
    </div>

    <div style="padding:32px">
      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">
        A field rep has submitted a request to create a new residential company and inspection ticket in CenterPoint.
        Review the details below and approve or reject.
      </p>

      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:32px">
        ${row("Company Name", d.companyName, true)}
        ${row("Sales Status", d.salesStatus)}
        ${row("Address", address || "—", true)}
        ${row("Timezone", d.timezone)}
        ${row("Requested By", `${d.requestedBy} &lt;${d.requestedByEmail}&gt;`, true)}
        ${row("Requested At", new Date(d.requestedAt).toLocaleString())}
        ${row("Link Expires", `<span style="color:#dc2626">${new Date(d.expiresAt).toLocaleString()} (48 h)</span>`, true)}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding-right:8px">
            <a href="${approveUrl}"
               style="display:block;background:#16a34a;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">
              ✅ APPROVE
            </a>
          </td>
          <td style="padding-left:8px">
            <a href="${rejectUrl}"
               style="display:block;background:#dc2626;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">
              ❌ REJECT
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">
        This link expires ${new Date(d.expiresAt).toLocaleString()}. Do not forward this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<void> {
  const token = await getGraphToken();
  await sendGraphMail(
    token,
    MANAGER_EMAIL,
    `[APPROVAL REQUIRED] New Residential Company: ${data.companyName}`,
    buildHtml(data),
    ERIC_EMAIL
  );
}
