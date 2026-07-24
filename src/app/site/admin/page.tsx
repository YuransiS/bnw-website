import React from "react";
import BwMainDashboard from "@/app/admin/BwMainDashboard";
import { ThemeProvider } from "@/app/admin/ThemeProvider";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function SiteAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Ensure user has access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperman = ["admin", "superman", "founder", "developer"].includes(profile?.role || "");

  if (!isSuperman) {
    redirect("/admin/pending");
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#0C0C0F]">
        <BwMainDashboard 
          initialLeads={[]}
          initialPageViews={[]}
          initialClicks={[]}
        />
      </div>
    </ThemeProvider>
  );
}
