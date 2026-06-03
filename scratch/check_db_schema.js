const fs = require('fs');
const path = require('path');

// Try reading environment variables from process.env, or .env, or .env.local
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // Try to find .env.local or .env in the parent directory
  const rootDir = path.join(__dirname, '..');
  const possibleFiles = ['.env.local', '.env', '.env.production', '.env.development'];
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
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.log("ENV STATS:", {
    urlFound: !!supabaseUrl,
    keyFound: !!supabaseServiceKey,
  });
  console.error("Could not find Supabase credentials in process.env or env files.");
  process.exit(1);
}

async function run() {
  console.log("Supabase URL:", supabaseUrl);
  // Get profiles table schema/info by querying a row
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?limit=1`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=representation'
    }
  });
  
  if (!res.ok) {
    console.error("Fetch failed:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("One profile row:", data);
}

run().catch(console.error);
