import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching cells...");
  const { data: existingCells } = await supabase.from("cells").select("*");
  console.log("Existing cells:", existingCells);

  // Clear out cell_id from projects to remove foreign key constraints
  console.log("Clearing cell_id from projects...");
  await supabase.from("projects").update({ cell_id: null }).neq("id", "00000000-0000-0000-0000-000000000000");

  // Delete all existing cells
  console.log("Deleting all cells...");
  await supabase.from("cells").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Create the new cells
  const newCells = ["Слободянюк Саша", "Ставицкий Саша", "Уткин Дмитрий"];
  for (const name of newCells) {
    console.log(`Creating cell: ${name}...`);
    const { error } = await supabase.from("cells").insert({ name });
    if (error) {
      console.error(`Error creating ${name}:`, error);
    }
  }

  console.log("Done updating cells.");
}

main().catch(console.error);
