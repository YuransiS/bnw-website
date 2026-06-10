const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

const rootDir = path.join(__dirname, '..');
const possibleFiles = ['.env.local', '.env'];
for (const file of possibleFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = val;
      }
    });
    break;
  }
}

async function run() {
  // Query 5 rows for victoria and 5 rows for sofia where page_url is null or empty
  const res1 = await fetch(`${supabaseUrl}/rest/v1/unified_orders?project_id=eq.b526cfcf-2856-43b9-a299-65239e0f6c27&limit=5`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  const res2 = await fetch(`${supabaseUrl}/rest/v1/unified_orders?project_id=eq.d4bf0cb1-b851-460d-85fa-80df4fcf85c7&limit=5`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });

  const victoriaRows = await res1.json();
  const sofiaRows = await res2.json();

  console.log("=== Victoria Rows ===");
  console.log(JSON.stringify(victoriaRows, null, 2));

  console.log("\n=== Sofia Rows ===");
  console.log(JSON.stringify(sofiaRows, null, 2));
}

run().catch(console.error);
