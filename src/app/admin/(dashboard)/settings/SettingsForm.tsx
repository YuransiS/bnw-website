"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createUserAction, editUserAction, deleteUserAction } from "./actions";
import { UserPlus, Trash2, Shield, User, Loader2, Edit3, X, Save } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  role: string;
}

interface SettingsFormProps {
  currentUserId: string;
  profiles: Profile[];
}

export default function SettingsForm({
  currentUserId,
  profiles,
}: SettingsFormProps) {
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("manager");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset states when exiting edit mode or after successful action
  const resetForm = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("manager");
    setError(null);
  };

  // Populate form for editing
  const handleEditClick = (profile: Profile) => {
    setEditingUser(profile);
    setEmail(profile.email);
    setPassword("");
    setRole(profile.role as "admin" | "manager");
    setError(null);
    setSuccess(null);
    
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Будь ласка, вкажіть електронну пошту.");
      return;
    }

    startTransition(async () => {
      if (editingUser) {
        // Edit Mode
        const res = await editUserAction(
          editingUser.id,
          email,
          password.trim() || undefined,
          role
        );
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess(res.message || "Дані користувача успішно оновлено!");
          resetForm();
        }
      } else {
        // Create Mode
        if (!password) {
          setError("Будь ласка, вкажіть пароль.");
          return;
        }
        if (password.length < 6) {
          setError("Пароль має містити не менше 6 символів.");
          return;
        }
        
        // Reconstruct form data to send to server action
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("role", role);

        const res = await createUserAction(null, formData);
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess(res?.message || "Користувача успішно створено!");
          resetForm();
        }
      }
    });
  };

  const handleDelete = async (profileId: string) => {
    if (profileId === currentUserId) {
      alert("Ви не можете видалити власний акаунт!");
      return;
    }

    if (confirm("Ви впевнені, що хочете видалити цього співробітника?")) {
      setError(null);
      setSuccess(null);
      startTransition(async () => {
        const res = await deleteUserAction(profileId);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess(res.message || "Користувача успішно видалено.");
          if (editingUser && editingUser.id === profileId) {
            resetForm();
          }
        }
      });
    }
  };

  return (
    <div className="space-y-10 font-sans">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Налаштування CRM
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Керування обліковими записами співробітників, редагування ролей та прав доступу
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unified Create / Edit Form */}
        <div className="lg:col-span-1 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl h-fit space-y-6 relative overflow-hidden">
          <div className={`absolute -top-12 -left-12 w-28 h-28 ${editingUser ? "bg-indigo-500/5" : "bg-emerald-500/5"} rounded-full blur-xl pointer-events-none`} />

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              {editingUser ? (
                <>
                  <Edit3 className="w-5 h-5 text-indigo-400" />
                  Редагувати
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  Додати користувача
                </>
              )}
            </h2>
            {editingUser && (
              <button
                onClick={resetForm}
                className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                title="Скасувати редагування"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Електронна пошта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@bnwprod.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Пароль
                </label>
                {editingUser && (
                  <span className="text-[9px] text-white/30 italic">
                    Залиште порожнім, щоб не змінювати
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? "Новий пароль (необов'язково)" : "Мінімум 6 символів"}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                required={!editingUser}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Права доступу (Роль)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    role === "manager"
                      ? "bg-white text-black font-extrabold"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Менеджер (Manager)
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    role === "admin"
                      ? "bg-white text-black font-extrabold"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Адмін (Admin)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 rounded-full text-black font-black transition-all cursor-pointer shadow-lg hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2 text-sm mt-2 ${
                editingUser
                  ? "bg-indigo-400 hover:bg-indigo-300 disabled:bg-indigo-800 shadow-indigo-500/10"
                  : "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 shadow-emerald-500/10"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Збереження...
                </>
              ) : editingUser ? (
                <>
                  <Save className="w-4 h-4" />
                  Зберегти зміни
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Створити обліковий запис
                </>
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
                        <div className="font-extrabold text-sm text-white truncate max-w-[180px] md:max-w-xs">
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
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(profile)}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/15 cursor-pointer transition-all inline-flex items-center"
                        title="Редагувати користувача"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {profile.id !== currentUserId ? (
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/15 cursor-pointer transition-all inline-flex items-center"
                          title="Видалити співробітника"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-white/20 italic pr-3 inline-block">Системний</span>
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
