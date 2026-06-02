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
    .eq("project_id", "b526cfcf-2856-43b9-a299-65239e0f6c27");

  if (error) {
    console.error("Error:", error);
    return;
  }

  const sheets = {};
  orders.forEach((o) => {
    const meta = o.metadata || {};
    const sheet = meta.original_sheet || "NONE";
    const status = o.status;
    if (!sheets[sheet]) {
      sheets[sheet] = { count: 0, paid: 0, statuses: {}, amounts: {} };
    }
    sheets[sheet].count++;
    if (status === "closed_won" || status === "Approved" || status === "Оплачено") {
      sheets[sheet].paid++;
    }
    sheets[sheet].statuses[status] = (sheets[sheet].statuses[status] || 0) + 1;
    sheets[sheet].amounts[o.amount] = (sheets[sheet].amounts[o.amount] || 0) + 1;
  });

  console.log("Victoria sheets breakdown:", JSON.stringify(sheets, null, 2));
}

check();
