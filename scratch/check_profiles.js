const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env.local
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join("=").trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase URL or service role key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log("Fetching profiles...");
  const { data: profiles, error: err1 } = await supabase
    .from("profiles")
    .select("*");
  
  if (err1) {
    console.error("Error fetching profiles:", err1);
  } else {
    console.log("Profiles in DB:", profiles);
  }

  console.log("\nFetching auth users...");
  const { data: users, error: err2 } = await supabase.auth.admin.listUsers();
  if (err2) {
    console.error("Error listing users:", err2);
  } else {
    console.log("Auth Users:", users.users.map(u => ({ id: u.id, email: u.email })));
  }
}

main().catch(console.error);
