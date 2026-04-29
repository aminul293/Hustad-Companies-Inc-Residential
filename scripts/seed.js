// Run with: node scripts/seed.js
// Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars. Create .env.local first.");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding database...");

  // Create default admin rep
  const { data: existing } = await db
    .from("reps")
    .select("id")
    .eq("email", "admin@hustad.com")
    .single();

  if (existing) {
    console.log("Admin rep already exists. Skipping.");
  } else {
    const { error } = await db.from("reps").insert({
      email: "admin@hustad.com",
      name: "Hustad Admin",
      password_hash: bcrypt.hashSync("hustad2026", 10),
      pin_hash: bcrypt.hashSync("1234", 8),
      role: "admin",
      active: true,
    });

    if (error) {
      console.error("Failed to create admin:", error.message);
    } else {
      console.log("Created admin rep: admin@hustad.com / hustad2026 (PIN: 1234)");
    }
  }

  // Create a sample field rep
  const { data: existingRep } = await db
    .from("reps")
    .select("id")
    .eq("email", "rep@hustad.com")
    .single();

  if (existingRep) {
    console.log("Sample rep already exists. Skipping.");
  } else {
    const { error } = await db.from("reps").insert({
      email: "rep@hustad.com",
      name: "Lee Hustad",
      password_hash: bcrypt.hashSync("field2026", 10),
      pin_hash: bcrypt.hashSync("5678", 8),
      role: "rep",
      active: true,
    });

    if (error) {
      console.error("Failed to create rep:", error.message);
    } else {
      console.log("Created field rep: rep@hustad.com / field2026 (PIN: 5678)");
    }
  }

  console.log("Seed complete.");
}

seed().catch(console.error);
