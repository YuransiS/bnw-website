"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Loader2, ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function AdminLoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError === "auth-callback-failed") {
        setError("Помилка авторизації: не вдалося обміняти тимчасовий код на сесію. Спробуйте ще раз або зверніться до адміністратора.");
      }
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Невірна пошта або пароль");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (data.session) {
        setSuccess("Реєстрація успішна! Автоматичний вхід...");
        setTimeout(() => {
          router.push("/admin");
          router.refresh();
        }, 1500);
      } else {
        setSuccess("Лист із посиланням для підтвердження відправлено на вашу пошту. Після підтвердження вас буде автоматично авторизовано.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Помилка під час реєстрації");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || "Помилка входу через Google");
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            Кабінет B&W CRM
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
            Платформа управління та сквозної аналітики
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("signin");
              setError(null);
              setSuccess(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              activeTab === "signin"
                ? "bg-white text-black font-extrabold shadow-lg"
                : "text-white/50 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Вхід
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setError(null);
              setSuccess(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              activeTab === "register"
                ? "bg-white text-black font-extrabold shadow-lg"
                : "text-white/50 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Реєстрація
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed">
            {success}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={activeTab === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
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
            className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-black transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2 mt-6 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {activeTab === "signin" ? "Авторизація..." : "Реєстрація..."}
              </>
            ) : (
              <>
                {activeTab === "signin" ? "Увійти до панелі" : "Зареєструвати акаунт"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-[#0C0C0F] px-4 text-white/30">Або зайти через</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3.5 rounded-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-white font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2.5 text-sm"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Вхід через Google OAuth
        </button>
      </div>
    </div>
  );
}
