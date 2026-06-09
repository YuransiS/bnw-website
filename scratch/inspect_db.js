const fs = require('fs');
const path = require('path');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
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

async function run() {
  console.log("Using Supabase Url:", supabaseUrl);
  
  // 1. Fetch from unified_orders
  const resOrders = await fetch(`${supabaseUrl}/rest/v1/unified_orders?limit=5`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    }
  });
  if (resOrders.ok) {
    const orders = await resOrders.json();
    console.log("Unified Orders Sample Metadata Keys:");
    orders.forEach((o, i) => {
      console.log(`Order ${i} ID: ${o.id}, Status: ${o.status}, Amount: ${o.amount}`);
      console.log(`Metadata keys:`, o.metadata ? Object.keys(o.metadata) : null);
      if (o.metadata) {
        console.log(`Metadata snippet:`, JSON.stringify(o.metadata).substring(0, 300));
      }
    });
  } else {
    console.error("Failed to fetch orders:", resOrders.status, await resOrders.text());
  }

  // 2. Fetch from unified_customers
  const resCust = await fetch(`${supabaseUrl}/rest/v1/unified_customers?limit=5`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    }
  });
  if (resCust.ok) {
    const custs = await resCust.json();
    console.log("Unified Customers Sample Keys:");
    custs.forEach((c, i) => {
      console.log(`Customer ${i} ID: ${c.id}, Name: ${c.name}`);
      console.log(`Keys:`, Object.keys(c));
    });
  }
}

run().catch(console.error);
