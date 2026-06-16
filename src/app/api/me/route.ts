import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MANAGER_EMAILS = ["aminul@hustadcompanies.com", "system@hustadcompanies.com"];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const supabase = getServiceClient();

    // Look up role from the DB (set by manager via PATCH /api/reps/[id])
    const { data: rep } = await supabase
      .from("reps")
      .select("id, name, email, role")
      .eq("id", auth.repId)
      .maybeSingle();

    // Fall back to email-based manager detection if the role column doesn't exist yet
    const dbRole = (rep as any)?.role ?? null;
    const role: string =
      dbRole ??
      (MANAGER_EMAILS.includes(auth.email) ? "manager" : "sales_rep");

    return NextResponse.json({
      id:    auth.repId,
      email: auth.email,
      name:  auth.name,
      role,
    });
  } catch (err: any) {
    if (err.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
