import { getGraphToken, sendGraphMail } from "./graphClient";

const DUSTIN_EMAIL = "dustin@hustadcompanies.com";
const SYSTEM_EMAIL = "system@hustadcompanies.com";

export interface LeadDeletedEmailData {
  jobName: string;
  ticketId: string;
  deletedBy: string;
  deletedByEmail: string;
  ownerEmail?: string;
  pipelineStatus: string;
}

function buildHtml(d: LeadDeletedEmailData): string {
  const row = (label: string, value: string, alt = false) =>
    `<tr style="background:${alt ? "#f9fafb" : "#fff"}">
      <td style="padding:10px 14px;font-weight:600;color:#374151;width:38%;white-space:nowrap">${label}</td>
      <td style="padding:10px 14px;color:#111827">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">

    <div style="background:#dc2626;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Hustad Companies — Lead Force Deleted</h1>
      <p style="margin:6px 0 0;color:#fca5a5;font-size:13px">A Pipeline Lead has been force-deleted from the tablet</p>
    </div>

    <div style="padding:32px">
      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">
        A lead was just force-deleted from the active Pipeline. The CenterPoint job has been automatically reverted to "New Service".
      </p>

      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:32px">
        ${row("Job Name / Address", d.jobName, true)}
        ${row("Ticket ID", d.ticketId)}
        ${row("Pipeline Status", d.pipelineStatus, true)}
        ${row("Deleted By", `${d.deletedBy} &lt;${d.deletedByEmail}&gt;`)}
        ${row("Account Holder", d.ownerEmail || "None", true)}
      </table>
    </div>
  </div>
</body>
</html>`;
}

export async function sendLeadDeletedEmail(data: LeadDeletedEmailData): Promise<void> {
  const token = await getGraphToken();
  const to = data.ownerEmail && data.ownerEmail.includes("@") ? data.ownerEmail : SYSTEM_EMAIL;
  
  await sendGraphMail(
    token,
    to,
    `[LEAD DELETED] ${data.jobName} removed from Pipeline`,
    buildHtml(data),
    DUSTIN_EMAIL
  );
}
