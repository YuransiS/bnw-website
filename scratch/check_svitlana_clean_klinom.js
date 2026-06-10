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
  const res = await fetch(`${supabaseUrl}/rest/v1/unified_orders?project_id=eq.c9876e4c-1234-4567-89ab-cdef01234567&page_url=ilike.*clean-klinom*&limit=5`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  
  if (!res.ok) {
    console.error("Fetch failed:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Found Svitlana orders with clean-klinom URL:", data.length);
  if (data.length > 0) {
    console.log("Sample:", JSON.stringify(data[0], null, 2));
  }
}

run().catch(console.error);
