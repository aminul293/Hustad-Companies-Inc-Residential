import { NextRequest, NextResponse } from "next/server";
import { rejectRequest } from "@/lib/approvals/rejectRequest";

export const dynamic = "force-dynamic";

function rejectedHtml(): string {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><title>Rejected</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:12px;padding:48px 40px;text-align:center;border:1px solid #e5e7eb;max-width:480px;width:90%">
    <div style="font-size:52px;margin-bottom:16px">❌</div>
    <h1 style="color:#dc2626;font-size:22px;margin:0 0 12px">Request Rejected</h1>
    <p style="color:#374151;font-size:14px;margin:0 0 16px">
      The company creation request has been rejected.
      No company or ticket was created in CenterPoint.
    </p>
    <p style="color:#9ca3af;font-size:13px;margin:0">The rep has been notified.</p>
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

// ─── GET /api/approvals/[token]/reject ────────────────────────────────────────
// Triggered when the manager clicks the REJECT button in the email.
// Returns an HTML confirmation page — no frontend required.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await rejectRequest(params.token);
    return new NextResponse(rejectedHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return new NextResponse(errorHtml(err.message), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ─── POST /api/approvals/[token]/reject ───────────────────────────────────────
// Programmatic rejection — returns JSON.
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const result = await rejectRequest(params.token);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: (err as any).stage ?? "rejection",
        message: err.message,
      },
      { status: 400 }
    );
  }
}
