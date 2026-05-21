
import { config } from "dotenv";
config({ path: ".env.local" });
import { getServiceClient } from "../src/lib/supabase-server";

async function listTables() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" 
  });
  
  if (error) {
    // If RPC doesn't exist, try common table names
    console.log("RPC failed, checking common tables manually...");
    const tables = ["reps", "sessions", "inspection_sessions", "appointments", "pipeline_leads", "centerpoint_jobs", "outbound_queue"];
    for (const t of tables) {
      const { error: e } = await supabase.from(t).select('id').limit(1);
      console.log(`${t}: ${e ? "Error (" + e.message + ")" : "Exists"}`);
    }
  } else {
    console.log("TABLES:", data);
  }
}

listTables();
