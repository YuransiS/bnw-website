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

  console.log(`Found ${orders.length} paid orders.`);
  const currencies = {};
  const samples = [];
  
  orders.forEach((o) => {
    const meta = o.metadata || {};
    const curr = meta.currency || meta.lead?.currency || "NONE";
    currencies[curr] = (currencies[curr] || 0) + 1;
    samples.push({
      amount: o.amount,
      order_id: o.order_id,
      currency: curr,
      meta: o.metadata
    });
  });

  console.log("Currency fields breakdown:", currencies);
  console.log("Samples of first 20 paid orders:");
  console.log(JSON.stringify(samples.slice(0, 20), null, 2));
}

check();
