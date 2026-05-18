// Shared Microsoft Graph API client.
// All email modules import from here to avoid duplicating OAuth token logic.

const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

export const SENDER_EMAIL =
  process.env.SENDER_EMAIL || "info@hustadcompanies.com";

export async function getGraphToken(): Promise<string> {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Azure credentials missing: AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_SECRET"
    );
  }

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: "https://graph.microsoft.com/.default",
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || "Failed to acquire Graph token");
  }
  return data.access_token;
}

export async function sendGraphMail(
  accessToken: string,
  to: string,
  subject: string,
  html: string,
  cc?: string
): Promise<void> {
  const payload: any = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: "true",
  };

  if (cc) {
    payload.message.ccRecipients = [{ emailAddress: { address: cc } }];
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail ${res.status}: ${text}`);
  }
}
