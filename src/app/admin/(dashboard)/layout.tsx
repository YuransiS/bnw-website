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

  // Auto-provision or auto-upgrade developer emails to 'founder' role
  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  if (user.email && devEmails.includes(user.email.toLowerCase()) && (!profile || (profile.role !== "founder" && profile.role !== "developer"))) {
    try {
      const { createAdminClient } = await import("@/utils/supabase/server");
      const adminSupabase = createAdminClient();
      await adminSupabase.from("profiles").upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        role: "founder",
      });
      // Re-fetch the profile to reflect changes
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .single();
      profile = updatedProfile;
    } catch (e) {
      console.error("Failed to auto-upgrade user to founder role:", e);
    }
  }

  const userEmail = profile?.email || user.email || "";
  const isActualDev = !!((user.email && devEmails.includes(user.email.toLowerCase())) || 
                       (profile && (profile.role === "admin" || profile.role === "superman" || profile.role === "founder" || profile.role === "developer")));

  const userRole = profile?.role || "pending";

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";

  // Strict check: if pending, redirect straight to /admin/pending waiting screen
  if (userRole === "pending") {
    redirect("/admin/pending");
  }

  const isSuperman = ["admin", "superman", "founder", "developer"].includes(userRole);
  const isCellLeader = userRole === "cell_leader";

  // Fetch allowed projects mapping dynamically
  let allowedProjects: { id: string; name: string; slug: string; cell_id?: string | null }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id")
      .order("name");
    const projectsList = allProj || [];

    allowedProjects = projectsList.filter((p) => p.is_active);
  } else if (isCellLeader) {
    // Cell Leader role sees all projects belonging to their cell(s)
    const { data: cells } = await adminSupabase
      .from("cells")
      .select("id")
      .eq("cell_leader_id", user.id);
    const cellIds = (cells || []).map((c) => c.id);

    if (cellIds.length > 0) {
      const { data: cellProj } = await adminSupabase
        .from("projects")
        .select("id, name, slug, is_active, cell_id")
        .in("cell_id", cellIds)
        .order("name");
      const projectsList = cellProj || [];
      allowedProjects = projectsList.filter((p) => p.is_active);
    }
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active, cell_id)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  // Fetch profiles and mappings for the hierarchical Sidebar
  const { data: dbProfiles } = await adminSupabase
    .from("profiles")
    .select("id, email, role, full_name")
    .order("email");
  const { data: dbProfileProjects } = await adminSupabase
    .from("profile_projects")
    .select("profile_id, project_id");
  const profilesList = dbProfiles || [];
  const profileProjectsList = dbProfileProjects || [];

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
        profiles={profilesList}
        profileProjects={profileProjectsList}
      />

      {/* Main content grid */}
      <main className="flex-grow p-6 md:p-10 relative z-10 overflow-x-hidden overflow-y-auto min-w-0">
        {children}
      </main>
    </ThemeProvider>
  );
}
