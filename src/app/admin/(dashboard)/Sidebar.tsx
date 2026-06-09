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
  Loader2,
  AlertTriangle,
  Lightbulb,
  Check
} from "lucide-react";
import { signOutAction, submitCrmFeedbackAction, impersonateRoleAction } from "../actions";
import { useTheme } from "../ThemeProvider";

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
  isActualDev?: boolean;
  actualRole?: string;
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
  fullName,
  isActualDev,
  actualRole
}: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { theme } = useTheme();

  const [isImpersonating, setIsImpersonating] = useState(false);

  const handleImpersonate = async (role: string) => {
    setIsImpersonating(true);
    try {
      const targetRole = role === "reset" ? null : role;
      const res = await impersonateRoleAction(targetRole);
      if (res.error) throw new Error(res.error);
      router.refresh();
    } catch (err: any) {
      alert("Помилка зміни ролі: " + err.message);
    } finally {
      setIsImpersonating(false);
    }
  };

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

  // Feedback modal states
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"error" | "improvement">("error");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);

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
    if (role === "rop") return "Керівник ВП (РОП)";
    if (role === "sales") return "Продажі";
    return role;
  };

  const getUserInitials = () => {
    const name = fullName || userEmail || "U";
    return name.slice(0, 2).toUpperCase();
  };

  const handleOpenFeedback = (type: "error" | "improvement") => {
    setFeedbackType(type);
    setFeedbackMessage("");
    setFeedbackSuccess(null);
    setFeedbackError(null);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setFeedbackPending(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const res = await submitCrmFeedbackAction(feedbackType, feedbackMessage);
      if (res.error) {
        setFeedbackError(res.error);
      } else {
        setFeedbackSuccess(res.message || "Дякуємо! Ваш запит надіслано.");
      }
    } catch (err) {
      setFeedbackError("Невідома помилка при відправці.");
    } finally {
      setFeedbackPending(false);
    }
  };

  const isLight = theme === "light";
  const bgClass = isLight ? "bg-white border-neutral-200 text-neutral-900" : "bg-[#0C0C0F] border-white/5 text-white";
  const textClass = isLight ? "text-neutral-900" : "text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/45";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";

  // Hide feedback buttons ONLY for yura3zaxar@gmail.com and yura3zaxar@outlook.com
  const showFeedbackButtons = userEmail !== "yura3zaxar@gmail.com" && userEmail !== "yura3zaxar@outlook.com";

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={`md:hidden w-full px-6 py-4 flex justify-between items-center z-50 shrink-0 relative border-b ${
        isLight ? "bg-white border-neutral-200 text-neutral-900" : "bg-[#0C0C0F] border-white/5 text-white"
      }`}>
        <span className={`text-lg font-black tracking-tighter uppercase ${isLight ? "text-neutral-900" : "text-white"}`}>
          B&W <span className="text-emerald-500">CRM</span>
        </span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`p-2 rounded-xl cursor-pointer transition-all border ${
            isLight
              ? "bg-neutral-100 border-neutral-200 text-neutral-800 hover:bg-neutral-200 hover:text-neutral-950"
              : "bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10"
          }`}
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
        className={`fixed md:sticky top-0 bottom-0 left-0 h-screen z-50 flex flex-col justify-between border-r p-5 shrink-0 transition-all duration-300 ease-in-out select-none
          ${isLight ? "bg-white border-neutral-200 text-neutral-900" : "bg-[#0C0C0F] border-white/5 text-white"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Toggle Collapse Desktop button */}
        <button
          onClick={toggleCollapse}
          className={`absolute -right-3.5 top-8 rounded-full p-1.5 cursor-pointer transition-all z-50 hidden md:flex hover:scale-105 active:scale-95 duration-200 border ${
            isLight
              ? "bg-white border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:border-emerald-500"
              : "bg-neutral-900 border border-white/10 text-white/60 hover:text-white hover:border-emerald-500/40"
          }`}
          title={isCollapsed ? "Розгорнути меню" : "Згорнути меню"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Upper Side Panel block */}
        <div className="space-y-8">
          {/* Logo & Branding */}
          <div className={`flex items-center gap-2 border-b pb-5 ${isCollapsed ? "justify-center" : ""} ${isLight ? "border-neutral-200" : "border-white/5"}`}>
            <span className={`text-xl font-black tracking-tighter uppercase transition-all ${isLight ? "text-neutral-900" : "text-white"}`}>
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
            {/* Main Landing Page (B&W Main) section at the very top */}
            {allowedProjects.some((p) => p.slug === "bw_main") && (
              <div className="space-y-1">
                {!isCollapsed && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest px-4 mb-2 ${isLight ? "text-neutral-400" : "text-white/40"}`}>
                    Головний лендінг
                  </p>
                )}
                <div className="relative group">
                  <Link
                    href="/admin?slug=bw_main"
                    onClick={(e) => handleLinkClick(e, "/admin?slug=bw_main")}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                      activeSlug === "bw_main"
                        ? isLight
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md font-extrabold"
                          : "bg-white text-black shadow-lg border-white font-extrabold"
                        : isLight
                        ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700 hover:text-neutral-900"
                        : "border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                  >
                    <Crown className="w-4 h-4 text-emerald-400 shrink-0" />
                    {!isCollapsed && <span>B&W Main (Лендінг /)</span>}
                  </Link>
                  {isCollapsed && (
                    <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                      isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                    }`}>
                      B&W Main (Лендінг /)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projects list container */}
            <div className="space-y-2">
              {!isCollapsed && (
                <p className={`text-[10px] font-bold uppercase tracking-widest px-4 ${isLight ? "text-neutral-400" : "text-white/40"}`}>
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
                          ? isLight
                            ? "bg-neutral-900 text-white border-neutral-900 font-extrabold shadow-md"
                            : "bg-white text-black shadow-lg border-white font-extrabold"
                          : isLight
                          ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700 hover:text-neutral-900"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                      } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {!isCollapsed && <span className="truncate">Всі експерти</span>}
                    </Link>
                    {isCollapsed && (
                      <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                        isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                      }`}>
                        Всі експерти
                      </div>
                    )}
                  </div>
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
                            ? isLight
                              ? "bg-neutral-900 text-white border-neutral-900 font-extrabold shadow-md"
                              : "bg-white text-black shadow-lg border-white font-extrabold"
                            : isLight
                            ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700 hover:text-neutral-900"
                            : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                        } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                      >
                        <ProjIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {!isCollapsed && <span className="truncate">{proj.name}</span>}
                      </Link>
                      {isCollapsed && (
                        <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                          isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                        }`}>
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
        <div className={`pt-6 border-t space-y-4 shrink-0 ${isLight ? "border-neutral-200" : "border-white/5"}`}>
          {/* Feedback buttons (Only visible for users who are NOT yura3zaxar@gmail.com) */}
          {showFeedbackButtons && (
            <div className="space-y-1.5">
              {!isCollapsed && (
                <p className={`text-[10px] font-bold uppercase tracking-widest px-4 mb-1.5 ${isLight ? "text-neutral-400" : "text-white/40"}`}>
                  Зворотній зв'язок
                </p>
              )}
              
              <div className="relative group">
                <button
                  onClick={() => handleOpenFeedback("error")}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl border transition-all text-xs font-black cursor-pointer text-left ${
                    isLight
                      ? "bg-red-50 hover:bg-red-100 border-red-100 text-red-600 hover:text-red-700"
                      : "bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/20 text-red-400"
                  } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  {!isCollapsed && <span>Повідомити про помилку</span>}
                </button>
                {isCollapsed && (
                  <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                    isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                  }`}>
                    Повідомити про помилку
                  </div>
                )}
              </div>

              <div className="relative group">
                <button
                  onClick={() => handleOpenFeedback("improvement")}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl border transition-all text-xs font-black cursor-pointer text-left ${
                    isLight
                      ? "bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-600 hover:text-amber-700"
                      : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/10 hover:border-amber-500/20 text-amber-400"
                  } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {!isCollapsed && <span>Запропонувати покращення</span>}
                </button>
                {isCollapsed && (
                  <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                    isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                  }`}>
                    Запропонувати покращення
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Relocated settings route link */}
          {isSuperman && (
            <div className="relative group">
              <Link
                href="/admin/settings"
                onClick={(e) => handleLinkClick(e, "/admin/settings")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                  isSettingsPage
                    ? isLight
                      ? "bg-neutral-900 text-white border-neutral-900 font-extrabold shadow-md"
                      : "bg-white text-black shadow-lg border-white font-extrabold"
                    : isLight
                    ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700 hover:text-neutral-900"
                    : "border-white/5 hover:border-emerald-500/25 bg-white/5 hover:bg-white/10 text-white"
                } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}`}
              >
                <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && <span>Налаштування</span>}
              </Link>
              {isCollapsed && (
                <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                  isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                }`}>
                  Налаштування
                </div>
              )}
            </div>
          )}

          {/* Developer Impersonation Controls */}
          {isActualDev && (
            <div className="space-y-1.5 p-1 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/[0.02] mx-1.5">
              {!isCollapsed ? (
                <>
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400 px-2 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                    Режим розробника (Mock)
                  </p>
                  <div className="relative">
                    <select
                      value={userRole}
                      onChange={(e) => handleImpersonate(e.target.value)}
                      disabled={isImpersonating}
                      className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-[11px] font-bold text-white cursor-pointer"
                    >
                      <option value="reset" className="bg-[#0C0C0F] text-emerald-450 font-black">Справжня роль ({getRoleLabel(actualRole || "superman")})</option>
                      <option value="superman" className="bg-[#0C0C0F] text-white">Супермен (Superman)</option>
                      <option value="producer" className="bg-[#0C0C0F] text-white">Продюсер (Producer)</option>
                      <option value="rop" className="bg-[#0C0C0F] text-white">Керівник ВП (РОП)</option>
                      <option value="sales" className="bg-[#0C0C0F] text-white">Відділ продажів (Sales)</option>
                      <option value="pending" className="bg-[#0C0C0F] text-white">Очікує схвалення (Pending)</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-white/40 rotate-90" />
                  </div>
                </>
              ) : (
                <div className="relative group flex justify-center">
                  <button
                    disabled={isImpersonating}
                    className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Sparkles className={`w-4 h-4 ${isImpersonating ? "animate-spin" : ""}`} />
                  </button>
                  <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-2xl flex flex-col space-y-1.5 ${
                    isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                  }`}>
                    <span className="font-extrabold uppercase tracking-wider text-emerald-400">Режим розробника</span>
                    <button onClick={() => handleImpersonate("reset")} className="text-left hover:underline text-[9px] cursor-pointer">Справжня роль ({getRoleLabel(actualRole || "superman")})</button>
                    <button onClick={() => handleImpersonate("superman")} className="text-left hover:underline text-[9px] cursor-pointer">Супермен</button>
                    <button onClick={() => handleImpersonate("producer")} className="text-left hover:underline text-[9px] cursor-pointer">Продюсер</button>
                    <button onClick={() => handleImpersonate("rop")} className="text-left hover:underline text-[9px] cursor-pointer">РОП</button>
                    <button onClick={() => handleImpersonate("sales")} className="text-left hover:underline text-[9px] cursor-pointer">Sales</button>
                    <button onClick={() => handleImpersonate("pending")} className="text-left hover:underline text-[9px] cursor-pointer">Pending</button>
                  </div>
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
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${isLight ? "border-white" : "border-[#0C0C0F]"}`} />
              </div>
            ) : (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? "text-neutral-400" : "text-white/40"}`}>
                  Співробітник
                </p>
                <p className={`text-sm font-black truncate max-w-full mt-1 ${isLight ? "text-neutral-900" : "text-white"}`} title={fullName || userEmail}>
                  {fullName || userEmail}
                </p>
                {fullName && (
                  <p className={`text-[11px] truncate max-w-full mt-0.5 ${isLight ? "text-neutral-500" : "text-white/45"}`} title={userEmail}>
                    {userEmail}
                  </p>
                )}
                <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border mt-2.5 ${
                  isSuperman
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : userRole === "producer"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : userRole === "rop"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
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
                <div className={`absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 border text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-2xl ${
                  isLight ? "bg-white border-neutral-200 text-neutral-800" : "bg-neutral-900 border border-white/10 text-white"
                }`}>
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
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 transition-all duration-300 animate-in fade-in ${
          isLight ? "bg-white/85" : "bg-[#060608]/80 backdrop-blur-md"
        }`}>
          <div className="relative">
            {/* Pulsating glow orb */}
            <div className="absolute inset-0 bg-emerald-500/25 rounded-full blur-2xl animate-pulse" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className={`text-sm font-black uppercase tracking-widest ${isLight ? "text-neutral-900" : "text-white"}`}>
              Завантаження даних
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 animate-pulse">
              Оновлення аналітики...
            </p>
          </div>
        </div>
      )}

      {/* Feedback Modal Overlay */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl relative shadow-2xl space-y-4 border ${
            isLight ? "bg-white border-neutral-200 text-neutral-900" : "bg-[#0C0C0F] border-white/10 text-white"
          }`}>
            <button
              onClick={() => setIsFeedbackModalOpen(false)}
              className={`absolute top-4 right-4 p-1 rounded-lg transition-all ${
                isLight ? "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {feedbackType === "error" ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  <h3 className="text-base font-black uppercase tracking-tight">Повідомити про помилку</h3>
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 text-amber-500 animate-bounce" />
                  <h3 className="text-base font-black uppercase tracking-tight">Запропонувати покращення</h3>
                </>
              )}
            </div>

            {feedbackError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                {feedbackError}
              </div>
            )}

            {feedbackSuccess ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-6 h-6 animate-in zoom-in" />
                </div>
                <p className="text-sm font-bold text-emerald-450">{feedbackSuccess}</p>
                <button
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all cursor-pointer"
                >
                  Закрити
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${textMutedClass}`}>
                    Повідомлення
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={
                      feedbackType === "error"
                        ? "Опишіть помилку: що ви намагалися зробити, який результат очікували і що пішло не так..."
                        : "Опишіть ваше покращення: як ця ідея зробить роботу CRM зручнішою та що саме варто додати..."
                    }
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm resize-none ${
                      isLight ? "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400" : "bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                    }`}
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase transition-all cursor-pointer ${
                      isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackPending}
                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      feedbackType === "error"
                        ? "bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white"
                        : "bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 text-black"
                    }`}
                  >
                    {feedbackPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Надсилання...
                      </>
                    ) : (
                      "Надіслати"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
