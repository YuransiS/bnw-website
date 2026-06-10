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
  const res = await fetch(`${supabaseUrl}/rest/v1/projects`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  const data = await res.json();
  console.log("Projects:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
