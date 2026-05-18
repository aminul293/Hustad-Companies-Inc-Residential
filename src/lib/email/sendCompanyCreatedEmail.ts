const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || "info@hustadcompanies.com";
const NOTIFICATION_EMAIL = "aminul@hustadcompanies.com";

async function getGraphToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    scope: "https://graph.microsoft.com/.default",
    client_secret: CLIENT_SECRET!,
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Failed to get Graph token");
  return data.access_token;
}

export interface CompanyEmailData {
  id: string;
  name: string;
  salesStatus: string;
  timezone: string;
  streetAddress?: string;
  manager?: string;
  createdBy: string;
  timestamp: string;
}

function buildEmailHtml(c: CompanyEmailData): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#111827">${value}</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 24px;color:#111827;font-size:18px">New Residential Company Created</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${row("Company ID", c.id)}
      ${row("Name", c.name)}
      ${row("Type", "Company")}
      ${row("Customer Type", "Residential")}
      ${row("Sales Status", c.salesStatus)}
      ${row("Timezone", c.timezone)}
      ${c.streetAddress ? row("Street Address", c.streetAddress) : ""}
      ${c.manager ? row("Manager ID", c.manager) : ""}
      ${row("Created By", c.createdBy)}
      ${row("Timestamp", c.timestamp)}
    </table>
  </div>
</body>
</html>`;
}

export async function sendCompanyCreatedEmail(company: CompanyEmailData): Promise<void> {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
    throw new Error("Azure credentials missing — cannot send company notification email");
  }

  const token = await getGraphToken();

  const payload = {
    message: {
      subject: `New Residential Company Created: ${company.name}`,
      body: { contentType: "HTML", content: buildEmailHtml(company) },
      toRecipients: [{ emailAddress: { address: NOTIFICATION_EMAIL } }],
    },
    saveToSentItems: "true",
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail error ${res.status}: ${text}`);
  }
}
