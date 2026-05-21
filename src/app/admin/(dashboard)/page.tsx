import React from "react";
import { createClient } from "@/utils/supabase/server";
import LeadsDashboard from "../LeadsDashboard";

// Force dynamic rendering to always show the freshest leads and analytics
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch all leads, page views and button clicks in parallel for calculations
  const [leadsRes, pageViewsRes, clicksRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("page_views").select("visitor_id"),
    supabase.from("button_clicks").select("button_id"),
  ]);

  const leads = leadsRes.data || [];
  const pageViews = pageViewsRes.data || [];
  const clicks = clicksRes.data || [];

  return (
    <LeadsDashboard
      initialLeads={leads}
      initialPageViews={pageViews}
      initialClicks={clicks}
    />
  );
}
