"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  Sparkles, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Crown, 
  Layers, 
  Briefcase, 
  Building2,
  ShieldAlert,
  Globe
} from "lucide-react";
import { getCellsAction } from "../actions";
import { createClient } from "@/utils/supabase/client";

interface TopHeaderProps {
  isSuperman: boolean;
  allowedProjects: any[];
  userRole: string;
  userEmail: string;
  fullName: string;
  isActualDev: boolean;
  actualRole: string;
  profiles: any[];
  profileProjects: any[];
}

export default function TopHeader({
  isSuperman,
  allowedProjects,
  userRole,
  userEmail,
  fullName,
  isActualDev,
  actualRole,
  profiles,
  profileProjects
}: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cells, setCells] = useState<any[]>([]);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Retrieve current user profile
  const currentProfile = React.useMemo(() => {
    return profiles.find(p => p.email?.toLowerCase() === userEmail.toLowerCase());
  }, [profiles, userEmail]);

  const currentUserId = currentProfile?.id || "";

  // Fetch cells list for header tabs
  useEffect(() => {
    getCellsAction().then((res) => {
      if (Array.isArray(res)) {
        setCells(res);
      }
    });
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine user's home path
  const isFounderOrAdmin = ["admin", "superman", "founder", "developer"].includes(userRole);
  const isCellLeader = userRole === "cell_leader";
  const isProducer = userRole === "producer";

  // Active state checkers
  const isFounderActive = pathname === "/admin/founder" || pathname === "/admin";
  const activeCellId = pathname.includes("/admin/cell/") ? pathname.split("/cell/")[1]?.split("/")[0] : "";
  const activeProjectId = pathname.includes("/admin/project/") ? pathname.split("/project/")[1]?.split("/")[0] : "";

  // Handle Logout
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  // User display title
  const displayName = fullName || currentProfile?.full_name || userEmail.split("@")[0] || "Користувач";
  const userInitials = displayName.charAt(0).toUpperCase();

  // Find cell leader's cell
  const leaderCell = isCellLeader ? cells.find(c => c.cell_leader_id === currentUserId) : null;

  // Find producer's ID
  const producerId = isProducer ? currentUserId : "";

  return (
    <header className="sticky top-0 z-50 bg-[#0C0C0F]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3 w-full">
      <div className="w-full mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link 
            href={isFounderOrAdmin ? "/admin/founder" : (leaderCell ? `/admin/cell/${leaderCell.id}` : "/admin")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-[#0C0C0F] rounded-[10px] flex items-center justify-center">
                <Crown className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                B&W <span className="text-emerald-400">Holding</span>
              </span>
              <span className="text-[9px] text-white/30 font-bold block tracking-widest uppercase">
                Analytics CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Role-Based Navigation Header Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar max-w-2xl">
          
          {/* Founder / Admin Navigation */}
          {isFounderOrAdmin && (
            <>
              <Link
                href="/admin/founder"
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isFounderActive
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Головна (Founders)
              </Link>

              {/* 3 Cells Direct Links */}
              {cells.map((cell) => {
                const isActive = activeCellId === cell.id;
                return (
                  <Link
                    key={cell.id}
                    href={`/admin/cell/${cell.id}`}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? "bg-white text-black shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    {cell.name}
                  </Link>
                );
              })}
            </>
          )}

          {/* Cell Leader Navigation */}
          {isCellLeader && (
            <Link
              href={leaderCell ? `/admin/cell/${leaderCell.id}` : "#"}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 text-black flex items-center gap-1.5 whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5" />
              Головна ({leaderCell?.name || "Моя Ячейка"})
            </Link>
          )}

          {/* Producer Navigation */}
          {isProducer && (
            <Link
              href={`/admin/producer/${producerId}`}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 text-black flex items-center gap-1.5 whitespace-nowrap"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Головна (Мої Проекти)
            </Link>
          )}
        </nav>

        {/* Right: SendPulse-Style Account Menu Popover */}
        <div className="relative shrink-0" ref={accountRef}>
          <button
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-black font-black text-xs flex items-center justify-center shadow-md">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-black text-white block truncate max-w-[120px]">
                {displayName}
              </span>
              <span className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider block">
                {userRole}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform ${isAccountOpen ? "rotate-180" : ""}`} />
          </button>

          {/* SendPulse-style Dropdown Popover */}
          {isAccountOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0C0C0F] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-150 space-y-2">
              
              {/* Account summary header */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs font-black text-white truncate">{displayName}</p>
                <p className="text-[10px] text-white/40 truncate mt-0.5">{userEmail}</p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Роль: {userRole}
                </div>
              </div>

              {/* Navigation links inside popover */}
              <div className="space-y-1 pt-1">
                <Link
                  href="/admin/settings"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  Налаштування аккаунта
                </Link>
                
                {isFounderOrAdmin && (
                  <Link
                    href="/admin/users"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-purple-400" />
                    Керування доступами
                  </Link>
                )}
              </div>

              {/* Logout action button */}
              <div className="border-t border-white/5 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  Вийти з системи
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
