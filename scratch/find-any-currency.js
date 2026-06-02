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
    .select("amount, status, metadata, order_id, project_id");

  if (error) {
    console.error("Error:", error);
    return;
  }

  const withCurrency = [];
  const projectsCount = {};
  
  orders.forEach((o) => {
    const meta = o.metadata || {};
    const str = JSON.stringify(meta).toLowerCase();
    if (str.includes("usd") || str.includes("uah") || str.includes("грн") || str.includes("currency") || str.includes("$") || str.includes("₴")) {
      withCurrency.push(o);
      projectsCount[o.project_id] = (projectsCount[o.project_id] || 0) + 1;
    }
  });

  console.log(`Found ${withCurrency.length} orders with currency-like words in metadata across all projects.`);
  console.log("Breakdown by project:", projectsCount);
  if (withCurrency.length > 0) {
    console.log("Samples:", JSON.stringify(withCurrency.slice(0, 5), null, 2));
  }
}

check();
