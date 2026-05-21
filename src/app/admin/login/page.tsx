"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Force a hard router refresh and redirect to admin dashboard
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Невірна пошта або пароль");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Cinematic styling atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#060608]/90 to-[#060608] pointer-events-none" />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-md bg-[#0C0C0F]/80 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow behind the logo */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            Вхід у B&W CRM
          </h1>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
            Кабінет співробітника
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
              Електронна пошта
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@bnwprod.com"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
              Пароль
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-black transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2 mt-6 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Авторизація...
              </>
            ) : (
              <>
                Увійти до панелі
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
