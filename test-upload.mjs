import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const fileContent = "dummy pdf content";
  const { data, error } = await supabase.storage.from("inspection-reports").upload("test-file.txt", fileContent, { upsert: true });
  if (error) {
    console.error("Upload failed:", error);
  } else {
    console.log("Upload succeeded!", data);
  }
}

run();
