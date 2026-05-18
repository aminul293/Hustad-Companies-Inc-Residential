import { getGraphToken, sendGraphMail } from "./graphClient";

export interface RepDecisionEmailData {
  decision: "approved" | "rejected";
  repEmail: string;
  repName: string;
  companyName: string;
  companyId: string | null;
  ticketId: string | null;
}

function buildApprovedHtml(d: RepDecisionEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#16a34a;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">✅ Request Approved</h1>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">
        Hi <strong>${d.repName}</strong>, your request for
        <strong>${d.companyName}</strong> has been approved.
        The company and residential inspection ticket have been created in CenterPoint.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:600;color:#374151">Company</td>
          <td style="padding:10px 14px;color:#111827">${d.companyName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600;color:#374151">CenterPoint Company ID</td>
          <td style="padding:10px 14px;color:#111827">${d.companyId ?? "—"}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:600;color:#374151">CenterPoint Ticket ID</td>
          <td style="padding:10px 14px;color:#111827">${d.ticketId ?? "—"}</td>
        </tr>
      </table>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">
        You can now proceed with the inspection. Log into CenterPoint to view the ticket.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildRejectedHtml(d: RepDecisionEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#dc2626;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">❌ Request Rejected</h1>
    </div>
    <div style="padding:32px">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">
        Hi <strong>${d.repName}</strong>, your request to create
        <strong>${d.companyName}</strong> has been rejected by the service manager.
        No company or ticket was created in CenterPoint.
      </p>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px">
        Please contact your service manager directly if you have questions about this decision.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendRepDecisionEmail(data: RepDecisionEmailData): Promise<void> {
  const token = await getGraphToken();

  const subject =
    data.decision === "approved"
      ? `✅ Approved: ${data.companyName} — Company & Ticket Created`
      : `❌ Rejected: ${data.companyName} — Request Declined`;

  const html =
    data.decision === "approved"
      ? buildApprovedHtml(data)
      : buildRejectedHtml(data);

  await sendGraphMail(token, data.repEmail, subject, html);
}
