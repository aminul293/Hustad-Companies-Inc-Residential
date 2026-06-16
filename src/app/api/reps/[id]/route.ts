import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MANAGER_EMAILS = ["aminul@hustadcompanies.com", "system@hustadcompanies.com"];
const VALID_ROLES = ["manager", "sales_rep", "viewer"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);

    // Only managers can update rep roles
    const isManager =
      auth.role === "manager" ||
      auth.role === "admin" ||
      MANAGER_EMAILS.includes(auth.email);

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden: Manager access required." }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reps")
      .update({ role })
      .eq("id", params.id)
      .select("id, name, email, role")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, rep: data });
  } catch (err: any) {
    if (err.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
