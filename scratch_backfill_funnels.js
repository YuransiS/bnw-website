const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillFunnels() {
  console.log('Fetching active funnels...');
  const { data: funnels, error: funnelsError } = await supabase
    .from('funnels')
    .select('*');

  if (funnelsError) {
    console.error('Failed to fetch funnels:', funnelsError);
    return;
  }

  console.log(`Found ${funnels.length} funnels. Starting backfill...`);

  for (const funnel of funnels) {
    console.log(`Processing funnel: ${funnel.name} (ID: ${funnel.id}, Project ID: ${funnel.project_id})`);

    const campaignIds = funnel.campaign_ids || [];
    const landingSlugs = funnel.landing_slugs || [];

    // 1. Backfill daily_traffic_and_costs (costs)
    let totalCostsUpdated = 0;
    for (const campaignId of campaignIds) {
      if (!campaignId.trim()) continue;
      const { data, error, count } = await supabase
        .from('daily_traffic_and_costs')
        .update({ funnel_id: funnel.id })
        .eq('project_id', funnel.project_id)
        .ilike('campaign_name', `%${campaignId.trim()}%`)
        .select('id');

      if (error) {
        console.error(`Error updating daily_traffic_and_costs for campaign ${campaignId}:`, error);
      } else {
        totalCostsUpdated += (data || []).length;
      }
    }
    console.log(`- Updated ${totalCostsUpdated} cost records for funnel ${funnel.name}`);

    // 2. Backfill unified_orders (leads)
    let totalLeadsUpdated = 0;

    // Match by campaigns
    for (const campaignId of campaignIds) {
      if (!campaignId.trim()) continue;
      const { data, error } = await supabase
        .from('unified_orders')
        .update({ funnel_id: funnel.id })
        .eq('project_id', funnel.project_id)
        .gte('created_at', funnel.start_date)
        .ilike('utm_campaign', `%${campaignId.trim()}%`)
        .select('id');

      if (error) {
        console.error(`Error updating unified_orders by campaign ${campaignId}:`, error);
      } else {
        totalLeadsUpdated += (data || []).length;
      }
    }

    // Match by landing slugs
    for (const slug of landingSlugs) {
      if (!slug.trim()) continue;
      const { data, error } = await supabase
        .from('unified_orders')
        .update({ funnel_id: funnel.id })
        .eq('project_id', funnel.project_id)
        .gte('created_at', funnel.start_date)
        .or(`utm_campaign.ilike.%${slug.trim()}%,page_path.ilike.%${slug.trim()}%,page_url.ilike.%${slug.trim()}%`)
        .select('id');

      if (error) {
        console.error(`Error updating unified_orders by landing slug ${slug}:`, error);
      } else {
        totalLeadsUpdated += (data || []).length;
      }
    }
    console.log(`- Updated ${totalLeadsUpdated} lead/order records for funnel ${funnel.name}`);
  }

  console.log('Backfill process completed successfully.');
}

backfillFunnels();
