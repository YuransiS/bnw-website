import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Settings, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "../actions";

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

  // Load employee profile to verify role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  const userEmail = profile?.email || user.email || "";
  const userRole = profile?.role || "manager";

  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col md:flex-row font-sans">
      {/* Background visual orb */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* Sidebar container */}
      <aside className="w-full md:w-64 border-r border-white/5 bg-[#0C0C0F] p-6 flex flex-col justify-between relative z-10 shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-6">
            <span className="text-xl font-black tracking-tighter uppercase text-white">
              B&W <span className="text-emerald-500">CRM</span>
            </span>
          </div>

          {/* CRM Navigation */}
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white transition-all font-semibold text-sm cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-500" />
              Аналітика & Ліди
            </Link>

            {userRole === "admin" && (
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white transition-all font-semibold text-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                Налаштування
              </Link>
            )}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="px-2">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Співробітник
            </p>
            <p className="text-sm font-bold truncate max-w-full text-white/90 mt-1">
              {userEmail}
            </p>
            <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1.5">
              {userRole === "admin" ? "Адміністратор" : "Менеджер"}
            </span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/15 cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
              Вийти з системи
            </button>
          </form>
        </div>
      </aside>

      {/* Main content grid */}
      <main className="flex-grow p-6 md:p-10 relative z-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
