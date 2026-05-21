"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { createManagerAction, deleteManagerAction } from "./actions";
import { UserPlus, Trash2, Shield, User, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  role: string;
}

interface UserManagerFormProps {
  currentUserId: string;
  profiles: Profile[];
}

export default function UserManagerForm({
  currentUserId,
  profiles,
}: UserManagerFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  
  // Use React 19 useActionState
  const [state, formAction, isPending] = useActionState(createManagerAction, null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  const handleDelete = async (profileId: string) => {
    if (profileId === currentUserId) {
      alert("Ви не можете видалити власний акаунт!");
      return;
    }

    if (confirm("Ви впевнені, що хочете видалити цього співробітника?")) {
      const res = await deleteManagerAction(profileId);
      if (res?.error) {
        alert("Помилка видалення: " + res.error);
      }
    }
  };

  return (
    <div className="space-y-10 font-sans">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Керування співробітниками
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Додавання нових менеджерів та налаштування прав доступу
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl h-fit space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            Додати менеджера
          </h2>

          {state?.error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed">
              Менеджера успішно додано!
            </div>
          )}

          <form ref={formRef} action={formAction} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Електронна пошта
              </label>
              <input
                type="email"
                name="email"
                placeholder="manager@bnwprod.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                name="password"
                placeholder="Мінімум 6 символів"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-black transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2 text-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Створення...
                </>
              ) : (
                "Створити обліковий запис"
              )}
            </button>
          </form>
        </div>

        {/* Staff Members List */}
        <div className="lg:col-span-2 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl space-y-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Команда B&W Prod
          </h2>

          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                  <th className="p-4">Співробітник</th>
                  <th className="p-4">Права доступу</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-white/[0.01] transition-all">
                    {/* Employee Identity */}
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 border border-white/10 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-white truncate max-w-[200px] md:max-w-xs">
                          {profile.email}
                        </div>
                        {profile.id === currentUserId && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            (Ви увійшли через цей акаунт)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          profile.role === "admin"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {profile.role === "admin" ? "Адміністратор" : "Менеджер"}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      {profile.id !== currentUserId ? (
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/15 cursor-pointer transition-all"
                          title="Видалити співробітника"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-white/20 italic">Системний</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
