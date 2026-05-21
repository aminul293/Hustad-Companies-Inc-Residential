
import { config } from "dotenv";
config({ path: ".env.local" });
import { getServiceClient } from "../src/lib/supabase-server";

async function checkSchema() {
  const supabase = getServiceClient();
  const tables = ["reps", "inspection_sessions", "appointments", "pipeline_leads"];
  
  for (const t of tables) {
    console.log(`\nTABLE: ${t}`);
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log("Keys:", Object.keys(data[0]));
      // Check types by looking at the first record
      Object.entries(data[0]).forEach(([k, v]) => {
        console.log(`- ${k}: ${typeof v} (${v})`);
      });
    } else {
      console.log("No data to check types.");
    }
  }
}

checkSchema();
