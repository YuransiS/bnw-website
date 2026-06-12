import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "../ThemeProvider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Load employee profile using admin client to bypass RLS/session latency
  const adminSupabase = createAdminClient();
  let { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  // Auto-provision or auto-upgrade developer emails to 'superman' role
  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  if (user.email && devEmails.includes(user.email.toLowerCase()) && (!profile || (profile.role !== "admin" && profile.role !== "superman"))) {
    try {
      const { createAdminClient } = await import("@/utils/supabase/server");
      const adminSupabase = createAdminClient();
      await adminSupabase.from("profiles").upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        role: "superman",
      });
      // Re-fetch the profile to reflect changes
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .single();
      profile = updatedProfile;
    } catch (e) {
      console.error("Failed to auto-upgrade user to admin/superman role:", e);
    }
  }

  const userEmail = profile?.email || user.email || "";
  const isActualDev = !!((user.email && devEmails.includes(user.email.toLowerCase())) || 
                       (profile && (profile.role === "admin" || profile.role === "superman")));

  let userRole = profile?.role || "pending";
  if (isActualDev) {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get("crm_impersonated_role")?.value;
    if (impersonated && ["superman", "producer", "rop", "sales", "pending"].includes(impersonated)) {
      userRole = impersonated;
    }
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";

  // Strict check: if pending, redirect straight to /admin/pending waiting screen
  if (userRole === "pending") {
    redirect("/admin/pending");
  }

  const isSuperman = userRole === "admin" || userRole === "superman";

  // Fetch allowed projects mapping dynamically
  let allowedProjects: { id: string; name: string; slug: string }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active")
      .order("name");
    const projectsList = allProj || [];

    allowedProjects = projectsList.filter((p) => p.is_active);
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  return (
    <ThemeProvider>
      {/* Background visual orb */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* Sidebar navigation panel */}
      <Sidebar
        isSuperman={isSuperman}
        allowedProjects={allowedProjects}
        userRole={userRole}
        userEmail={userEmail}
        fullName={fullName}
        isActualDev={isActualDev}
        actualRole={profile?.role || "superman"}
      />

      {/* Main content grid */}
      <main className="flex-grow p-6 md:p-10 relative z-10 overflow-x-hidden overflow-y-auto min-w-0">
        {children}
      </main>
    </ThemeProvider>
  );
}
