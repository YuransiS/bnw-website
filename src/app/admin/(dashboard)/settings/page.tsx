import React from "react";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import SettingsForm from "./SettingsForm";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Next.js middleware will trigger a redirect to login page
  }

  // 2. Fetch privilege details using admin client to bypass RLS latency
  let { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Auto-provision or auto-upgrade developer emails to 'superman' / 'admin' role
  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  if (user.email && devEmails.includes(user.email.toLowerCase()) && (!profile || (profile.role !== "admin" && profile.role !== "superman"))) {
    try {
      await adminSupabase.from("profiles").upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        role: "superman",
      });
      // Re-fetch privilege details
      const { data: updatedProfile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = updatedProfile;
    } catch (e) {
      console.error("Failed to auto-upgrade user to superman role in settings page:", e);
    }
  }

  // 3. Strict gate check - Only Superman (Admin) allowed in Settings
  if (profile?.role !== "admin" && profile?.role !== "superman") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-3">
          403 Доступ заборонено
        </h1>
        <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-8">
          У вас немає прав Супермена для керування доступами холдингу B&W.
        </p>
        <Link
          href="/admin"
          className="px-6 py-3 rounded-full bg-white text-black font-extrabold text-sm hover:bg-neutral-200 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
        >
          Повернутися в CRM
        </Link>
      </div>
    );
  }

  // 4. Fetch team members profiles, projects list, and mapping in parallel
  // Use admin client to bypass RLS for administrative commands
  const [profilesRes, projectsRes, mappingRes] = await Promise.all([
    adminSupabase.from("profiles").select("id, email, role, full_name").order("email"),
    adminSupabase.from("projects").select("id, name, slug, is_active").order("name"),
    adminSupabase.from("profile_projects").select("profile_id, project_id"),
  ]);

  const profiles = profilesRes.data || [];
  const projects = projectsRes.data || [];
  const profileProjects = mappingRes.data || [];

  const isYura = user.email && (user.email.toLowerCase() === "yura3zaxar@gmail.com" || user.email.toLowerCase() === "yura3zaxar@outlook.com");
  let crmFeedback: any[] = [];
  if (isYura) {
    const { data: feedbackData } = await adminSupabase
      .from("crm_feedback")
      .select("*")
      .order("created_at", { ascending: false });
    crmFeedback = feedbackData || [];
  }

  return (
    <SettingsForm
      currentUserId={user.id}
      profiles={profiles}
      projects={projects}
      profileProjects={profileProjects}
      crmFeedback={crmFeedback}
    />
  );
}
