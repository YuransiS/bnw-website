"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function getDashboardData() {
  const supabase = await createClient();
  
  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch privilege details
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Unauthorized");
  }

  // 3. Fetch all leads, page views, and button clicks in parallel
  const [leadsRes, pageViewsRes, clicksRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("page_views").select("visitor_id"),
    supabase.from("button_clicks").select("button_id"),
  ]);

  return {
    leads: leadsRes.data || [],
    pageViews: pageViewsRes.data || [],
    clicks: clicksRes.data || [],
  };
}

export async function updateLeadStatus(
  leadId: string,
  newDbStatus: "new" | "in_progress" | "completed" | "rejected",
  newButtonId: string
) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Perform database update
  const { data, error } = await supabase
    .from("leads")
    .update({
      status: newDbStatus,
      button_id: newButtonId,
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, lead: data };
}
