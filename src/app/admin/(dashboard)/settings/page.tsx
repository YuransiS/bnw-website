import React from "react";
import { createClient } from "@/utils/supabase/server";
import SettingsForm from "./SettingsForm";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  // 1. Authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Next.js middleware will trigger a redirect to login page
  }

  // 2. Fetch privilege details
  let { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Auto-provision or auto-upgrade developer emails to 'admin' role
  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  if (user.email && devEmails.includes(user.email.toLowerCase()) && (!profile || profile.role !== "admin")) {
    try {
      const { createAdminClient } = await import("@/utils/supabase/server");
      const adminSupabase = createAdminClient();
      await adminSupabase.from("profiles").upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        role: "admin",
      });
      // Re-fetch privilege details
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = updatedProfile;
    } catch (e) {
      console.error("Failed to auto-upgrade user to admin role in settings page:", e);
    }
  }

  // 3. Strict gate check - Only Admins allowed in Settings
  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-3">
          403 Доступ заборонено
        </h1>
        <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-8">
          У вас немає адміністративних прав для перегляду та керування налаштуваннями CRM.
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

  // 4. Fetch team members profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("email");

  return (
    <SettingsForm
      currentUserId={user.id}
      profiles={profiles || []}
    />
  );
}
