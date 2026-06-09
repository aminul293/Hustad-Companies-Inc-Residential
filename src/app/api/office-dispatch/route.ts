import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "info@hustadcompanies.com";
const OFFICE_EMAIL = process.env.OFFICE_EMAIL || "info@hustadcompanies.com";
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

async function getAccessToken() {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
    throw new Error("Azure credentials missing.");
  }
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
  if (!res.ok) throw new Error(data.error_description || "Auth failed");
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const { session, pdfBase64, fileName } = await req.json();

    if (!session || !pdfBase64) {
      return NextResponse.json({ error: "Missing session or PDF data" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const photoCount = session.photos?.length || 0;
    const syncedCount = session.photos?.filter((p: any) => p.syncStatus === "synced").length || 0;

    // 1. Upload PDF to Supabase Storage
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const storagePath = `reports/${session.repId}/${session.sessionId}/${fileName}`;

    // Ensure bucket exists — createBucket is a no-op if it already exists
    await supabase.storage.createBucket("inspection-reports", {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    const { error: uploadErr } = await supabase.storage
      .from("inspection-reports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("[OFFICE_DISPATCH] Storage Upload Failed:", uploadErr);
      throw new Error(`Storage error: ${uploadErr.message}`);
    }

    // Generate signed URL or public URL
    const { data: urlData } = supabase.storage
      .from("inspection-reports")
      .getPublicUrl(storagePath);
    
    const reportUrl = urlData.publicUrl;

    // 2. Dispatch Email to Office via Microsoft Graph
    const accessToken = await getAccessToken();
    const html = `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">OFFICE DISPATCH // INSPECTION COMPLETE</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">New Forensic Dossier Received</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Address</td>
              <td style="padding: 8px 0; font-weight: bold;">${session.property.address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Homeowner</td>
              <td style="padding: 8px 0; font-weight: bold;">${session.property.homeownerPrimaryName || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Representative</td>
              <td style="padding: 8px 0; font-weight: bold;">${session.repName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Outcome</td>
              <td style="padding: 8px 0; font-weight: bold; color: #6366f1;">${(session.findings.outcomeType || "N/A").toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Photos</td>
              <td style="padding: 8px 0; font-weight: bold;">${syncedCount} / ${photoCount} Synced</td>
            </tr>
          </table>

          <div style="margin: 32px 0; text-align: center;">
            <a href="${reportUrl}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">DOWNLOAD DOSSIER</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            TODO: ConnectTeams integration hook. Session ID: ${session.sessionId}
          </p>
        </div>
      </div>
    `;

    const mailPayload = {
      message: {
        subject: `[DISPATCH] Inspection Complete: ${session.property.address} (${session.repName})`,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: OFFICE_EMAIL } }],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: fileName,
            contentType: "application/pdf",
            contentBytes: pdfBase64,
          },
        ],
      },
      saveToSentItems: "true",
    };

    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailPayload),
    });

    if (!mailRes.ok) {
      const errText = await mailRes.text();
      console.error("[OFFICE_DISPATCH] Email Failed:", errText);
      throw new Error("Office email delivery failed");
    }

    return NextResponse.json({
      success: true,
      reportUrl,
      dispatchedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("[OFFICE_DISPATCH_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
