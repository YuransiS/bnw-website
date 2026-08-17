import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      env[clean.substring(0, idx).trim()] = clean.substring(idx + 1).trim();
    }
  }
});

const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Simulate Utkin calling getSessionAndAccess
const { data: utkinProfile } = await adminSupabase.from('profiles').select('*').eq('email', 'utkindmitriij@gmail.com').single();
const user = { id: utkinProfile.id, email: utkinProfile.email };
const profile = utkinProfile;
const isSuperman = ["admin", "superman", "founder", "developer"].includes(profile.role);
const isCellLeader = profile.role === "cell_leader";

console.log('Role:', profile.role, 'isSuperman:', isSuperman, 'isCellLeader:', isCellLeader);

// 1. Get cellIds
const { data: cells } = await adminSupabase
  .from("cells")
  .select("id")
  .eq("cell_leader_id", user.id);
const cellIds = (cells || []).map((c) => c.id);
console.log('Cell IDs for leader:', cellIds);

// 2. Get cellProj
const { data: cellProj } = await adminSupabase
  .from("projects")
  .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent")
  .in("cell_id", cellIds)
  .order("name");
const allowedProjects = (cellProj || []).filter((p) => p.is_active);
console.log('Allowed Projects for leader:');
console.table(allowedProjects);

// 3. Call get_superman_summary with adminSupabase vs userSupabase
const { data: rawSummary, error: sumErr } = await adminSupabase.rpc("get_superman_summary");
console.log('get_superman_summary error:', sumErr);
console.log('rawSummary count:', rawSummary?.length);

const summary = (rawSummary || []).map((p) => ({
  project_id: p.project_id,
  project_name: p.project_name,
  project_slug: p.project_slug,
  cell_id: p.cell_id,
  revenue_uah: Number(p.uah_revenue || 0),
  expenses_uah: Number(p.spend || 0),
  revenue_usd: Number(p.usd_revenue || 0),
  revenue_eur: Number(p.eur_revenue || 0),
  leads_count: Number(p.leads_count || 0),
  cpl: Number(p.cpl || 0),
}));

// Filter like in actions.ts:
const allowedIds = new Set(allowedProjects.map((p) => p.id));
const filteredSummary = summary.filter((p) => allowedIds.has(p.project_id));
console.log('filteredSummary count:', filteredSummary.length);
console.table(filteredSummary);

// Filter in CellDashboardPage:
const cellId = cellIds[0];
const cellProjects = filteredSummary.filter((p) => p.cell_id === cellId);
console.log('cellProjects in CellDashboardPage for cellId', cellId, 'count:', cellProjects.length);
console.table(cellProjects);
