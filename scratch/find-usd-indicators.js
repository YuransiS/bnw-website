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
  const { data: orders, error } = await supabase
    .from("unified_orders")
    .select("amount, status, metadata, order_id")
    .eq("project_id", "b526cfcf-2856-43b9-a299-65239e0f6c27")
    .eq("status", "closed_won");

  if (error) {
    console.error("Error:", error);
    return;
  }

  // Print all distinct keys inside metadata for these orders
  const keys = new Set();
  orders.forEach(o => {
    if (o.metadata) {
      Object.keys(o.metadata).forEach(k => keys.add(k));
    }
  });
  console.log("Distinct metadata keys:", Array.from(keys));

  // Let's print the actual metadata objects for some paid orders
  console.log("Samples of metadata objects:");
  console.log(orders.slice(0, 10).map(o => ({ amount: o.amount, meta: o.metadata })));
}

check();
