
import { config } from "dotenv";
config({ path: ".env.local" });
import { getServiceClient } from "../src/lib/supabase-server";

async function runFullDiagnostics() {
  const supabase = getServiceClient();
  console.log("🚀 STARTING FULL DATABASE DIAGNOSTICS...\n");

  const results: any = {};

  // 1. REPS
  try {
    const { count, error } = await supabase.from("reps").select("id", { count: "exact", head: true });
    results.reps = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.reps = `❌ ${e.message}`; }

  // 2. CENTERPOINT JOBS
  try {
    const { count, error } = await supabase.from("centerpoint_jobs").select("id", { count: "exact", head: true });
    results.centerpoint_jobs = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.centerpoint_jobs = `❌ ${e.message}`; }

  // 3. PIPELINE LEADS
  try {
    const { count, error } = await supabase.from("pipeline_leads").select("id", { count: "exact", head: true });
    results.pipeline_leads = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.pipeline_leads = `❌ ${e.message}`; }

  // 4. APPOINTMENTS
  try {
    const { count, error } = await supabase.from("appointments").select("id", { count: "exact", head: true });
    results.appointments = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.appointments = `❌ ${e.message}`; }

  // 5. INSPECTION SESSIONS
  try {
    const { count, error } = await supabase.from("inspection_sessions").select("id", { count: "exact", head: true });
    results.inspection_sessions = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.inspection_sessions = `❌ ${e.message}`; }

  // 6. OUTBOUND QUEUE
  try {
    const { count, error } = await supabase.from("outbound_queue").select("id", { count: "exact", head: true });
    results.outbound_queue = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.outbound_queue = `❌ ${e.message}`; }

  // 7. PHOTO ASSETS
  try {
    const { count, error } = await supabase.from("photo_assets").select("id", { count: "exact", head: true });
    results.photo_assets = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.photo_assets = `❌ ${e.message}`; }

  // 8. AUDIT EVENTS
  try {
    const { count, error } = await supabase.from("audit_events").select("id", { count: "exact", head: true });
    results.audit_events = error ? `❌ ${error.message}` : `✅ Working (${count} records found)`;
  } catch (e: any) { results.audit_events = `❌ ${e.message}`; }

  // 9. CROSS-REFERENCE CHECK (Sample Join)
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, pipeline_leads(id, centerpoint_jobs(name))")
      .limit(1);
    results.relational_integrity = error ? `❌ ${error.message}` : `✅ Working (Joins successful)`;
  } catch (e: any) { results.relational_integrity = `❌ ${e.message}`; }

  // 10. STORAGE BUCKET CHECK
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    const hasPhotos = buckets?.some(b => b.id === "inspection-photos");
    results.storage_buckets = error ? `❌ ${error.message}` : (hasPhotos ? "✅ Working (inspection-photos bucket exists)" : "⚠️ inspection-photos bucket missing");
  } catch (e: any) { results.storage_buckets = `❌ ${e.message}`; }

  console.table(results);
  console.log("\n🏁 DIAGNOSTICS COMPLETE.");
}

runFullDiagnostics();
