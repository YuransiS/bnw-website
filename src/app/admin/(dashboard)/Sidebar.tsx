"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  Menu,
  X,
  Sparkles,
  Zap,
  Target,
  Flame,
  Layers,
  Activity,
  Award,
  Crown,
  Briefcase,
  Loader2
} from "lucide-react";
import { signOutAction } from "../actions";

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  isSuperman: boolean;
  allowedProjects: Project[];
  userRole: string;
  userEmail: string;
  fullName: string;
}

// Deterministic premium icon assignment based on project attributes
const getProjectIcon = (slug: string, index: number) => {
  const cleanSlug = slug.toLowerCase();
  if (cleanSlug.includes("main") || cleanSlug.includes("bw")) {
    return Crown;
  }
  
  const icons = [Sparkles, Zap, Target, Flame, Layers, Activity, Award, Globe];
  return icons[index % icons.length] || Briefcase;
};

export default function Sidebar({
  isSuperman,
  allowedProjects,
  userRole,
  userEmail,
  fullName
}: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileOpen(false);
    startTransition(() => {
      router.push(href);
      router.refresh();
    });
  };

  const isSettingsPage = pathname === "/admin/settings";
  const activeSlug = isSettingsPage ? "" : (searchParams.get("slug") || (isSuperman ? "all" : allowedProjects[0]?.slug || ""));

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Sync collapsed state from localStorage after mount
  useEffect(() => {
    setIsMounted(true);
    const cachedState = localStorage.getItem("crm-sidebar-collapsed");
    if (cachedState) {
      setIsCollapsed(cachedState === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("crm-sidebar-collapsed", String(newState));
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin" || role === "superman") return "Супермен";
    if (role === "producer") return "Продюсер";
    if (role === "sales") return "Продажі";
    return role;
  };

  const getUserInitials = () => {
    const name = fullName || userEmail || "U";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden w-full bg-[#0C0C0F] border-b border-white/5 px-6 py-4 flex justify-between items-center z-50 shrink-0 relative">
        <span className="text-lg font-black tracking-tighter uppercase text-white">
          B&W <span className="text-emerald-500">CRM</span>
        </span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-white/80 hover:text-white"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile menu */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 h-screen z-50 flex flex-col justify-between border-r border-white/5 bg-[#0C0C0F] p-5 shrink-0 transition-all duration-300 ease-in-out select-none
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Toggle Collapse Desktop button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3.5 top-8 bg-neutral-900 border border-white/10 hover:border-emerald-500/40 rounded-full p-1.5 cursor-pointer transition-all z-50 text-white/60 hover:text-white hidden md:flex hover:scale-105 active:scale-95 duration-200"
          title={isCollapsed ? "Розгорнути меню" : "Згорнути меню"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Upper Side Panel block */}
        <div className="space-y-8">
          {/* Logo & Branding */}
          <div className={`flex items-center gap-2 border-b border-white/5 pb-5 ${isCollapsed ? "justify-center" : ""}`}>
            <span className="text-xl font-black tracking-tighter uppercase text-white transition-all">
              {isCollapsed ? (
                <span className="text-emerald-500">B&W</span>
              ) : (
                <>
                  B&W <span className="text-emerald-500">CRM</span>
                </>
              )}
            </span>
          </div>

          {/* Primary & Navigation sections */}
          <nav className="space-y-6">
            {allowedProjects.some((p) => p.slug === "bw_main") && (
              <div className="space-y-1">
                {/* Home website link - now maps to main site statistics */}
                <div className="relative group">
                  <Link
                    href="/admin?slug=bw_main"
                    onClick={(e) => handleLinkClick(e, "/admin?slug=bw_main")}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                      activeSlug === "bw_main"
                        ? "bg-white text-black shadow-lg border-white font-extrabold"
                        : "border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                  >
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    {!isCollapsed && <span>Головний сайт</span>}
                  </Link>
                  {isCollapsed && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                      Головний сайт
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projects list container */}
            <div className="space-y-2">
              {!isCollapsed && (
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest px-4">
                  Проекти
                </p>
              )}
              <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar p-0.5">
                {/* Hub "Всі експерти" link - merged into projects submenu list */}
                {isSuperman && (
                  <div className="relative group">
                    <Link
                      href="/admin?slug=all"
                      onClick={(e) => handleLinkClick(e, "/admin?slug=all")}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-xs font-black cursor-pointer ${
                        activeSlug === "all"
                          ? "bg-white text-black shadow-lg border-white"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                      } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {!isCollapsed && <span className="truncate">Всі експерти</span>}
                    </Link>
                    {isCollapsed && (
                      <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                        Всі експерти
                      </div>
                    )}
                  </div>
                )}

                {/* Core Project "B&W Main" - featured at the top with custom divider */}
                {allowedProjects.some((p) => p.slug === "bw_main") && (
                  <>
                    <div className="relative group">
                      <Link
                        href="/admin?slug=bw_main"
                        onClick={(e) => handleLinkClick(e, "/admin?slug=bw_main")}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-xs font-black cursor-pointer ${
                          activeSlug === "bw_main"
                            ? "bg-white text-black shadow-lg border-white font-extrabold"
                            : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                        } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                      >
                        <Crown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {!isCollapsed && <span className="truncate">B&W Main</span>}
                      </Link>
                      {isCollapsed && (
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                          B&W Main
                        </div>
                      )}
                    </div>
                    <div className="border-b border-white/5 my-2" />
                  </>
                )}

                {/* Individual dynamic projects - excludes main site */}
                {allowedProjects.filter(p => p.slug !== "bw_main").map((proj, idx) => {
                  const ProjIcon = getProjectIcon(proj.slug, idx);
                  const isCurrent = activeSlug === proj.slug;
                  return (
                    <div key={proj.slug} className="relative group">
                      <Link
                        href={`/admin?slug=${proj.slug}`}
                        onClick={(e) => handleLinkClick(e, `/admin?slug=${proj.slug}`)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-xs font-black cursor-pointer ${
                          isCurrent
                            ? "bg-white text-black shadow-lg border-white"
                            : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                        } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                      >
                        <ProjIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {!isCollapsed && <span className="truncate">{proj.name}</span>}
                      </Link>
                      {isCollapsed && (
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                          {proj.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Lower/Bottom block: Settings, Profile & Logout */}
        <div className="pt-6 border-t border-white/5 space-y-4 shrink-0">
          {/* Relocated settings route link */}
          {isSuperman && (
            <div className="relative group">
              <Link
                href="/admin/settings"
                onClick={(e) => handleLinkClick(e, "/admin/settings")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                  isSettingsPage
                    ? "bg-white text-black shadow-lg border-white font-extrabold"
                    : "border-white/5 hover:border-emerald-500/25 bg-white/5 hover:bg-white/10 text-white"
                } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
              >
                <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && <span>Налаштування</span>}
              </Link>
              {isCollapsed && (
                <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                  Налаштування
                </div>
              )}
            </div>
          )}

          {/* User profile card details */}
          <div className={`px-1.5 ${isCollapsed ? "flex flex-col items-center text-center space-y-2" : ""}`}>
            {isCollapsed ? (
              <div
                className="w-10 h-10 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-400 tracking-tighter relative group cursor-default"
                title={`${fullName || userEmail} (${getRoleLabel(userRole)})`}
              >
                {getUserInitials()}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0C0C0F]" />
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  Співробітник
                </p>
                <p className="text-sm font-black truncate max-w-full text-white mt-1" title={fullName || userEmail}>
                  {fullName || userEmail}
                </p>
                {fullName && (
                  <p className="text-[11px] text-white/45 truncate max-w-full mt-0.5" title={userEmail}>
                    {userEmail}
                  </p>
                )}
                <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border mt-2.5 ${
                  isSuperman
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : userRole === "producer"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {getRoleLabel(userRole)}
                </span>
              </div>
            )}
          </div>

          {/* Sign Out Trigger action button */}
          <form action={signOutAction} className="w-full">
            {isCollapsed ? (
              <div className="relative group">
                <button
                  type="submit"
                  className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 hover:border-red-500/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl">
                  Вийти з системи
                </div>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/15 cursor-pointer transition-all hover:scale-[1.01] duration-150"
              >
                <LogOut className="w-4 h-4" />
                Вийти з системи
              </button>
            )}
          </form>
        </div>
      </aside>

      {/* Loading Overlay for Next.js Page transitions */}
      {isPending && (
        <div className="fixed inset-0 bg-[#060608]/70 backdrop-blur-md z-[9999] flex flex-col items-center justify-center gap-4 transition-all duration-300 animate-in fade-in">
          <div className="relative">
            {/* Outer pulsating glow orb */}
            <div className="absolute inset-0 bg-emerald-500/25 rounded-full blur-2xl animate-pulse" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Завантаження даних
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 animate-pulse">
              Оновлення аналітики...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
