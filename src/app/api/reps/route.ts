import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("reps")
    .select("id, name, email, role, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reps: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: err.status || 500 });
  }
}
