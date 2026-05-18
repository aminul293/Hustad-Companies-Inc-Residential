import { NextRequest, NextResponse } from "next/server";
import { approveRequest } from "@/lib/approvals/approveRequest";

export const dynamic = "force-dynamic";

// Minimal HTML returned to the manager's browser after clicking APPROVE in email.
function approvedHtml(companyId: string | null, ticketId: string | null): string {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><title>Approved</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:12px;padding:48px 40px;text-align:center;border:1px solid #e5e7eb;max-width:480px;width:90%">
    <div style="font-size:52px;margin-bottom:16px">✅</div>
    <h1 style="color:#16a34a;font-size:22px;margin:0 0 12px">Request Approved</h1>
    <p style="color:#374151;font-size:14px;margin:0 0 24px">
      The residential company and inspection ticket have been created in CenterPoint.
      The rep has been notified.
    </p>
    ${companyId ? `<p style="color:#6b7280;font-size:13px;margin:4px 0">Company ID: <strong>${companyId}</strong></p>` : ""}
    ${ticketId ? `<p style="color:#6b7280;font-size:13px;margin:4px 0">Ticket ID: <strong>${ticketId}</strong></p>` : ""}
  </div>
</body></html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:12px;padding:48px 40px;text-align:center;border:1px solid #e5e7eb;max-width:480px;width:90%">
    <div style="font-size:52px;margin-bottom:16px">⚠️</div>
    <h1 style="color:#dc2626;font-size:22px;margin:0 0 12px">Action Failed</h1>
    <p style="color:#374151;font-size:14px;margin:0">${message}</p>
  </div>
</body></html>`;
}

// ─── GET /api/approvals/[token]/approve ───────────────────────────────────────
// Triggered when the manager clicks the APPROVE button in the email.
// Returns an HTML confirmation page — no frontend required.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const result = await approveRequest(params.token);
    return new NextResponse(approvedHtml(result.companyId, result.ticketId), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return new NextResponse(errorHtml(err.message), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ─── POST /api/approvals/[token]/approve ──────────────────────────────────────
// Programmatic approval — returns JSON. Used for API-level integrations.
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const result = await approveRequest(params.token);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: (err as any).stage ?? "approval",
        message: err.message,
      },
      { status: 400 }
    );
  }
}
