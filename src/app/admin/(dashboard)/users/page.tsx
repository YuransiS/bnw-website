import React from "react";
import { createClient } from "@/utils/supabase/server";
import UserManagerForm from "./UserManagerForm";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // 1. Authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Will trigger redirect in layout or middleware
  }

  // 2. Fetch privilege details
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 3. Strict gate check - Only Admins allowed here
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
          У вас немає адміністративних прав для перегляду та керування списком співробітників.
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
    <UserManagerForm
      currentUserId={user.id}
      profiles={profiles || []}
    />
  );
}
