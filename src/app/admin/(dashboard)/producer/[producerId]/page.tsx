import React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getProducerPerformanceDataAction } from "./producerActions";
import ProducerDashboardClient from "./ProducerDashboardClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ producerId: string }>;
}

export default async function ProducerPerformancePage({ params }: PageProps) {
  const { producerId } = await params;

  // 1. Authenticate user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // 2. Fetch privilege details and verify access borders
  const adminSupabase = createAdminClient();
  const { data: viewerProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSelf = user.id === producerId;
  const isSupervisor = ["founder", "developer", "cell_leader", "admin", "superman"].includes(viewerProfile?.role || "");

  if (!isSelf && !isSupervisor) {
    redirect("/admin");
  }

  // 3. Fetch fast unified producer performance data for current month initial view
  const res = await getProducerPerformanceDataAction(producerId, "this_month");
  if (!res.success || !res.data) {
    redirect("/admin");
  }

  return <ProducerDashboardClient initialData={res.data} />;
}
