"use client";

import React, { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Clock, ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { signOutAction } from "../actions";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [checking, setChecking] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let interval: NodeJS.Timeout;

    // 1. Initial user check
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/admin/login");
          return;
        }

        setUserEmail(user.email || "");

        // Check current profile role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile && profile.role !== "pending") {
          // Already approved, send straight to CRM
          window.location.href = "/admin";
          return;
        }

        setChecking(false);

        // 2. Set up active 3-second polling to auto-approve without relogging
        interval = setInterval(async () => {
          try {
            const { data: freshProfile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single();

            if (freshProfile && freshProfile.role !== "pending") {
              clearInterval(interval);
              // Approved! Trigger a hard window reload to bypass Next router caches
              window.location.href = "/admin";
            }
          } catch (err) {
            console.error("Polling profile status error:", err);
          }
        }, 3000); // 3 seconds
      } catch (err) {
        console.error("Error during checkUser:", err);
      }
    };

    checkUser();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router]);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Перевірка доступу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic ambient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/[0.02] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#060608]/90 to-[#060608] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#0C0C0F]/80 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Dynamic Icon with pulse */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)] animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Очікує підтвердження
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
            Акаунт зареєстровано: {userEmail}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/60 leading-relaxed text-left space-y-2.5">
          <div className="flex gap-2 text-yellow-400 font-extrabold items-center">
            <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Необхідне схвалення адміністратора</span>
          </div>
          <p>
            Ваш обліковий запис успішно створено, але доступ до проектів наразі обмежено.
          </p>
          <p>
            Ми автоматично перевіряємо статус схвалення кожні 3 секунди. Як тільки адміністратор надасть вам роль, сторінка оновиться сама!
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/15 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 duration-200 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Вийти з акаунту
          </button>
        </div>
      </div>
    </div>
  );
}
