import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import Sidebar from "./Sidebar";

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
  const userRole = profile?.role || "pending";
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";

  // Strict check: if pending, redirect straight to /admin/pending waiting screen
  if (userRole === "pending") {
    redirect("/admin/pending");
  }

  const isSuperman = userRole === "admin" || userRole === "superman";

  // Fetch allowed projects mapping dynamically
  let allowedProjects: { id: string; name: string; slug: string }[] = [];

  if (isSuperman) {
    const { data: allProj } = await supabase
      .from("projects")
      .select("id, name, slug")
      .order("name");
    const projectsList = allProj || [];

    const { data: explicitAssignments } = await supabase
      .from("profile_projects")
      .select("project_id")
      .eq("profile_id", user.id);

    const assignedProjectIds = new Set((explicitAssignments || []).map((a) => a.project_id));

    allowedProjects = projectsList.filter((p) => {
      if (p.slug === "bw_main") {
        return assignedProjectIds.has(p.id);
      }
      return true;
    });
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col md:flex-row font-sans">
      {/* Background visual orb */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* Sidebar navigation panel */}
      <Sidebar
        isSuperman={isSuperman}
        allowedProjects={allowedProjects}
        userRole={userRole}
        userEmail={userEmail}
        fullName={fullName}
      />

      {/* Main content grid */}
      <main className="flex-grow p-6 md:p-10 relative z-10 overflow-x-hidden overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
