import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
  const testId = "00000000-0000-0000-0000-000000000000";
  console.log("Testing compound button_id insertion...");
  const { data, error } = await supabase
    .from("leads")
    .insert({
      id: testId,
      name: "Test User",
      phone: "+380999999999",
      button_id: "header_cta::scheduled_call",
      visitor_id: "00000000-0000-0000-0000-000000000000",
      status: "in_progress"
    })
    .select();

  if (error) {
    console.error("Compound button_id check failed:", error.message);
  } else {
    console.log("Compound button_id check succeeded! Inserted data:", data);
    // Clean up
    await supabase.from("leads").delete().eq("id", testId);
  }
}

check();
