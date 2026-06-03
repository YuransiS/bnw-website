"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createUserAction, editUserAction, deleteUserAction } from "./actions";
import { UserPlus, Trash2, Shield, User, Loader2, Edit3, X, Save, CheckSquare, Square, Check } from "lucide-react";
import { useTheme } from "../../ThemeProvider";

interface Profile {
  id: string;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface ProfileProjectMapping {
  profile_id: string;
  project_id: string;
}

interface SettingsFormProps {
  currentUserId: string;
  profiles: Profile[];
  projects: Project[];
  profileProjects: ProfileProjectMapping[];
}

export default function SettingsForm({
  currentUserId,
  profiles,
  projects,
  profileProjects,
}: SettingsFormProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = isLight ? "bg-white border border-neutral-200/85 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const textSubtleClass = isLight ? "text-neutral-400" : "text-white/20";
  const tableHeaderClass = isLight ? "bg-neutral-100 text-neutral-500 border-neutral-200" : "bg-white/[0.02] text-white/40 border-white/5";
  const tableRowClass = isLight ? "hover:bg-neutral-50 border-neutral-200 text-neutral-800" : "hover:bg-white/[0.01] border-white/5 text-white/80";
  const inputClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500";
  const rolePanelClass = isLight ? "bg-neutral-50 border border-neutral-200" : "bg-white/[0.01] border border-white/5";
  const activeRoleBtnClass = isLight ? "bg-neutral-900 text-white font-extrabold" : "bg-white text-black font-extrabold";
  const inactiveRoleBtnClass = isLight ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100" : "text-white/50 hover:text-white hover:bg-white/[0.02]";
  const projectBtnClass = isLight ? "bg-white hover:bg-neutral-50 border-neutral-200" : "bg-white/[0.01] hover:bg-white/5 border-white/5";
  const employeeIconClass = isLight ? "bg-neutral-100 text-neutral-600 border-neutral-200" : "bg-white/5 text-white/60 border-white/10";

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("pending");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset states when exiting edit mode or after successful action
  const resetForm = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("pending");
    setSelectedProjects([]);
    setError(null);
  };

  // Populate form for editing
  const handleEditClick = (profile: Profile) => {
    setEditingUser(profile);
    setEmail(profile.email);
    setPassword("");
    setRole(profile.role);
    
    // Find assigned projects from mapping list
    const assignedIds = profileProjects
      .filter((p) => p.profile_id === profile.id)
      .map((p) => p.project_id);
    
    setSelectedProjects(assignedIds);
    setError(null);
    setSuccess(null);
    
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle project selection
  const handleToggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
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

    if ((role === "producer" || role === "sales" || role === "rop") && selectedProjects.length === 0) {
      setError("Будь ласка, оберіть хоча б один проект для Продюсера чи Відділу продажів.");
      return;
    }

    startTransition(async () => {
      if (editingUser) {
        // Edit Mode
        const res = await editUserAction(
          editingUser.id,
          email,
          password.trim() || undefined,
          role,
          selectedProjects
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
        formData.append("projectIds", JSON.stringify(selectedProjects));

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

  const getRoleLabel = (roleKey: string) => {
    switch (roleKey) {
      case "admin":
      case "superman":
        return "Супермен";
      case "producer":
        return "Операційний продюсер";
      case "rop":
        return "Керівник відділу продажів (РОП)";
      case "sales":
        return "Відділ продажів";
      case "pending":
        return "Очікує схвалення";
      default:
        return roleKey;
    }
  };

  const getRoleBadgeStyle = (roleKey: string) => {
    switch (roleKey) {
      case "admin":
      case "superman":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "producer":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "rop":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "sales":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse";
      default:
        return "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20";
    }
  };

  return (
    <div className="space-y-10 font-sans">
      <div>
        <h1 className={`text-3xl font-black uppercase tracking-tight flex items-center gap-3 ${isLight ? "text-neutral-900" : "text-white"}`}>
          Налаштування CRM
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unified Create / Edit Form */}
        <div className={`lg:col-span-1 p-6 rounded-2xl h-fit space-y-6 relative overflow-hidden ${cardClass}`}>
          <div className={`absolute -top-12 -left-12 w-28 h-28 ${editingUser ? "bg-indigo-500/5" : "bg-emerald-500/5"} rounded-full blur-xl pointer-events-none`} />

          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
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
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  isLight ? "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${textMutedClass}`}>
                Електронна пошта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@bnwprod.com"
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm ${inputClass}`}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${textMutedClass}`}>
                  Пароль
                </label>
                {editingUser && (
                  <span className={`text-[9px] italic ${isLight ? "text-neutral-400" : "text-white/30"}`}>
                    Залиште порожнім, щоб не змінювати
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? "Новий пароль (необов'язково)" : "Мінімум 6 symbols"}
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm ${inputClass}`}
                required={!editingUser}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${textMutedClass}`}>
                Рівень доступу (Роль)
              </label>
              <div className={`space-y-1 p-1 rounded-xl ${rolePanelClass}`}>
                {[
                  { key: "pending", label: "Очікує схвалення (Pending)" },
                  { key: "superman", label: "Супермен (Superman)" },
                  { key: "producer", label: "Операційний продюсер (Producer)" },
                  { key: "rop", label: "Керівник відділу продажів (РОП)" },
                  { key: "sales", label: "Відділ продажів (Sales)" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setRole(item.key);
                      if (item.key === "pending") {
                        setSelectedProjects([]);
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer text-left transition-all flex items-center justify-between ${
                      role === item.key || (item.key === "superman" && role === "admin")
                        ? activeRoleBtnClass
                        : inactiveRoleBtnClass
                    }`}
                  >
                    <span>{item.label}</span>
                    {(role === item.key || (item.key === "superman" && role === "admin")) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Project selection - show for all roles except pending */}
            {role !== "pending" && (
              <div className={`space-y-2 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-300 ${borderClass}`}>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${textMutedClass}`}>
                  Прив'язати проекти (Доступ)
                </label>
                
                {projects.length === 0 ? (
                  <p className={`text-xs italic ${textSubtleClass}`}>Проекти не знайдені в БД.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {projects.map((proj) => {
                      const isChecked = selectedProjects.includes(proj.id);
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => handleToggleProject(proj.id)}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all cursor-pointer ${projectBtnClass}`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className={`w-4 h-4 shrink-0 ${isLight ? "text-neutral-300" : "text-white/20"}`} />
                          )}
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isLight ? "text-neutral-800" : "text-white/90"}`}>{proj.name}</p>
                            <p className={`text-[9px] font-semibold uppercase ${isLight ? "text-neutral-400" : "text-white/30"}`}>{proj.slug}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
        <div className={`lg:col-span-2 p-6 rounded-2xl space-y-6 ${cardClass}`}>
          <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
            <Shield className="w-5 h-5 text-emerald-500" />
            Команда B&W Prod
          </h2>

          <div className={`overflow-x-auto border rounded-xl ${borderClass}`}>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className={`uppercase tracking-widest font-black border-b ${tableHeaderClass}`}>
                  <th className="p-4">Співробітник</th>
                  <th className="p-4">Рівень доступу</th>
                  <th className="p-4">Дозволені проекти</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? "divide-neutral-200" : "divide-white/5"}`}>
                {profiles.map((profile) => {
                  // Find all projects assigned to this user
                  const userProjIds = profileProjects
                    .filter((mapping) => mapping.profile_id === profile.id)
                    .map((mapping) => mapping.project_id);

                  const assignedNames = projects
                    .filter((proj) => userProjIds.includes(proj.id))
                    .map((proj) => proj.name);

                  return (
                    <tr key={profile.id} className={`transition-all ${tableRowClass}`}>
                      {/* Employee Identity */}
                      <td className="p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${employeeIconClass}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-extrabold text-sm truncate max-w-[150px] md:max-w-xs ${isLight ? "text-neutral-900" : "text-white"}`} title={profile.email}>
                            {profile.email}
                          </div>
                          {profile.id === currentUserId && (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block mt-0.5">
                              (Ваш акаунт)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getRoleBadgeStyle(profile.role)}`}>
                          {getRoleLabel(profile.role)}
                        </span>
                      </td>

                      {/* Projects Names List */}
                      <td className="p-4">
                        {profile.role === "admin" || profile.role === "superman" ? (
                          <span className="text-[10px] text-emerald-400/70 font-black uppercase tracking-wider">
                            Усі проекти (Безліміт)
                          </span>
                        ) : assignedNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedNames.map((name) => (
                              <span
                                key={name}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  isLight ? "bg-neutral-100 text-neutral-700 border-neutral-200" : "bg-white/5 text-white/70 border-white/5"
                                }`}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-[10px] italic ${textSubtleClass}`}>Немає доступу</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right space-x-2 shrink-0">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
