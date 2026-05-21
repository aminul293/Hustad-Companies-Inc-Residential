import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reps")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reps: data ?? [] });
  } catch (err: any) {
    if (err.status === 401) {
      return NextResponse.json({ error: "Unauthorized", message: "Valid session required." }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: err.status || 500 });
  }
}
