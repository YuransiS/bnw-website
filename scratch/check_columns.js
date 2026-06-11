const fs = require('fs');
const path = require('path');

let supabaseUrl = 'https://mfyrftpdhprjyouyjecd.supabase.co';
let supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meXJmdHBkaHByanlvdXlqZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2MDI4MiwiZXhwIjoyMDk0OTM2MjgyfQ.0BePv_YwiQN5k21qrOJnyH-zr4-aiJsDEwZTlyB2PZU';

async function run() {
  // We can query pg_trigger or information_schema
  // Since we can't run arbitrary SQL using rpc('execute_sql') easily, let's query the PostgREST API.
  // Wait, let's check if pg_catalog or information_schema is exposed under some endpoint.
  // If not, we can write a script that does a SELECT on a view if one exists, or let's try querying information_schema.
  // Actually, we can fetch from a generic table or write a PG connection. But since we don't have database password,
  // let's check if we can query pg_trigger or information_schema.triggers via rest:
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_projects_summary`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  console.log("RPC test status:", res.status);
  
  // Let's query unified_orders where order_id contains BODY_TAPE using a normal GET but page_url filter or ordering.
  // Wait, earlier we got a Cloudflare 500 error on:
  // /rest/v1/unified_orders?order_id=ilike.BODY_TAPE%
  // Let's try /rest/v1/unified_orders?order_id=eq.BODY_TAPE_1781163100049 or similar to see if it works!
  const res2 = await fetch(`${supabaseUrl}/rest/v1/unified_orders?order_id=eq.BODY_TAPE_1781163100049`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  console.log("Single order lookup status:", res2.status);
  if (res2.ok) {
    console.log("Single order lookup result:", await res2.json());
  } else {
    console.log("Error text:", await res2.text());
  }
}

run().catch(console.error);
