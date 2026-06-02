const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        process.env[key] = value;
      }
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: orders, error } = await supabase.from("unified_orders").select("status, project_id");
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  const counts = {};
  orders.forEach(o => {
    const key = `${o.project_id} - ${o.status}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  console.log("Order statuses counts:", counts);
}

check();
