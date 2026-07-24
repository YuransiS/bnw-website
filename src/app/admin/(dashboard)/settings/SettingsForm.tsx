"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createUserAction, editUserAction, deleteUserAction, toggleProjectActiveAction, createCellAction, updateCellAction, deleteCellAction } from "./actions";
import { updateFeedbackStatusAction } from "../../actions";
import { UserPlus, Trash2, Shield, User, Loader2, Edit3, X, Save, CheckSquare, Square, Check, Briefcase, Layers } from "lucide-react";
import { useTheme } from "../../ThemeProvider";

interface Profile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

interface ProfileProjectMapping {
  profile_id: string;
  project_id: string;
}

interface FeedbackItem {
  id: string;
  created_at: string;
  user_email: string;
  type: "error" | "improvement";
  message: string;
  status: string;
}

interface Cell {
  id: string;
  name: string;
  cell_leader_id?: string | null;
}

interface SettingsFormProps {
  currentUserId: string;
  profiles: Profile[];
  projects: Project[];
  profileProjects: ProfileProjectMapping[];
  crmFeedback?: FeedbackItem[];
  cells?: Cell[];
}

export default function SettingsForm({
  currentUserId,
  profiles,
  projects,
  profileProjects,
  crmFeedback = [],
  cells = [],
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
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("pending");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newCellName, setNewCellName] = useState("");
  const [newCellLeader, setNewCellLeader] = useState("");
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingCellName, setEditingCellName] = useState("");
  const [editingCellLeader, setEditingCellLeader] = useState("");
  const [cellError, setCellError] = useState("");
  const [cellSuccess, setCellSuccess] = useState("");

  // Determine if the current user is yura3zaxar
  const currentUser = profiles.find((p) => p.id === currentUserId);
  const currentUserEmail = currentUser?.email || "";
  const isYura = currentUserEmail.toLowerCase() === "yura3zaxar@gmail.com" || currentUserEmail.toLowerCase() === "yura3zaxar@outlook.com";

  // Reset states when exiting edit mode or after successful action
  const resetForm = () => {
    setEditingUser(null);
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("pending");
    setSelectedProjects([]);
    setSelectedCellId("");
    setError(null);
  };

  // Populate form for editing
  const handleEditClick = (profile: Profile) => {
    setEditingUser(profile);
    setEmail(profile.email);
    setFullName(profile.full_name || "");
    setPassword("");
    setRole(profile.role);
    
    const managedCell = cells.find(c => c.cell_leader_id === profile.id);
    setSelectedCellId(managedCell?.id || "");
    
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
      setError("Будь ласка, оберіть хоча б один проект для Продюсера, РОПа чи Відділу продажів.");
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
          selectedProjects,
          fullName,
          selectedCellId || undefined
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
        formData.append("fullName", fullName);
        formData.append("password", password);
        formData.append("role", role);
        formData.append("projectIds", JSON.stringify(selectedProjects));
        formData.append("cellId", selectedCellId);

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

  const handleToggleProjectActive = (projectId: string, currentStatus: boolean) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await toggleProjectActiveAction(projectId, !currentStatus);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.message || "Статус проекту успішно оновлено!");
      }
    });
  };

  const handleUpdateFeedbackStatus = (feedbackId: string, status: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateFeedbackStatusAction(feedbackId, status);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Статус повідомлення успішно оновлено!");
      }
    });
  };

  const handleCreateCell = (e: React.FormEvent) => {
    e.preventDefault();
    setCellError("");
    setCellSuccess("");
    const cleanName = newCellName.trim();
    if (!cleanName) {
      setCellError("Назва осередку не може бути порожньою.");
      return;
    }

    startTransition(async () => {
      const res = await createCellAction(cleanName, newCellLeader || null);
      if (res.error) {
        setCellError(res.error);
      } else {
        setCellSuccess(res.message || "Осередок створено!");
        setNewCellName("");
        setNewCellLeader("");
      }
    });
  };

  const handleUpdateCell = (e: React.FormEvent) => {
    e.preventDefault();
    setCellError("");
    setCellSuccess("");
    if (!editingCellId) return;
    const cleanName = editingCellName.trim();
    if (!cleanName) {
      setCellError("Назва осередку не може бути порожньою.");
      return;
    }

    startTransition(async () => {
      const res = await updateCellAction(editingCellId, cleanName, editingCellLeader || null);
      if (res.error) {
        setCellError(res.error);
      } else {
        setCellSuccess(res.message || "Осередок оновлено!");
        setEditingCellId(null);
        setEditingCellName("");
        setEditingCellLeader("");
      }
    });
  };

  const handleDeleteCell = (cellId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей осередок?")) return;
    setCellError("");
    setCellSuccess("");

    startTransition(async () => {
      const res = await deleteCellAction(cellId);
      if (res.error) {
        setCellError(res.error);
      } else {
        setCellSuccess(res.message || "Осередок видалено!");
      }
    });
  };

  const getRoleLabel = (roleKey: string) => {
    switch (roleKey) {
      case "admin":
      case "superman":
        return "Супермен";
      case "founder":
        return "Фаундер";
      case "cell_leader":
        return "Керівник ячейки";
      case "producer":
        return "Операційний продюсер";
      case "rop":
        return "Керівник ВП (РОП)";
      case "sales":
        return "Відділ продажів";
      case "expert":
        return "Експерт / Партнер";
      case "marketer":
        return "Маркетолог";
      case "developer":
        return "Розробник";
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
      case "founder":
        return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
      case "cell_leader":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "producer":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "rop":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "sales":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "expert":
        return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      case "marketer":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      case "developer":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse";
      default:
        return "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20";
    }
  };

  const getCellLeaderEmail = (leaderId?: string | null) => {
    if (!leaderId) return "Не призначено";
    const leader = profiles.find(p => p.id === leaderId);
    return leader ? leader.full_name || leader.email : "Невідомий";
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
                Ім'я та Прізвище
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ім'я Прізвище"
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm ${inputClass}`}
              />
            </div>

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
                placeholder={editingUser ? "Новий пароль (необов'язково)" : "Мінімум 6 символів"}
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
                  { key: "founder", label: "Фаундер (Founder)" },
                  { key: "cell_leader", label: "Керівник ячейки (Cell Leader)" },
                  { key: "producer", label: "Операційний продюсер (Producer)" },
                  { key: "developer", label: "Розробник (Developer)" }
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
                      role === item.key
                        ? activeRoleBtnClass
                        : inactiveRoleBtnClass
                    }`}
                  >
                    <span>{item.label}</span>
                    {role === item.key && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {role === "cell_leader" && (
              <div className={`space-y-2 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-300 ${borderClass}`}>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${textMutedClass}`}>
                  Закріпити ячейку (Керування)
                </label>
                <select
                  value={selectedCellId}
                  onChange={(e) => setSelectedCellId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm ${inputClass}`}
                >
                  <option value="" disabled className={isLight ? "text-neutral-900 bg-white" : "text-white bg-[#0C0C0F]"}>Оберіть ячейку...</option>
                  {cells.map((cell) => (
                    <option
                      key={cell.id}
                      value={cell.id}
                      className={isLight ? "text-neutral-900 bg-white" : "text-white bg-[#0C0C0F]"}
                    >
                      {cell.name} {cell.cell_leader_id && cell.cell_leader_id !== editingUser?.id ? "(Вже має керівника)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Project selection - show for all roles except pending */}
            {role !== "pending" && (
              <div className={`space-y-2 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-300 ${borderClass}`}>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${textMutedClass}`}>
                  Прив'язати проекти (Доступ)
                </label>
                
                {projects.filter(p => p.is_active !== false).length === 0 ? (
                  <p className={`text-xs italic ${textSubtleClass}`}>Немає активних проектів в БД.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {projects.filter(p => p.is_active !== false).map((proj) => {
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
                    .filter((proj) => userProjIds.includes(proj.id) && proj.is_active !== false)
                    .map((proj) => proj.name);

                  return (
                    <tr key={profile.id} className={`transition-all ${tableRowClass}`}>
                      {/* Employee Identity */}
                      <td className="p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${employeeIconClass}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-extrabold text-sm truncate max-w-[150px] md:max-w-xs ${isLight ? "text-neutral-900" : "text-white"}`} title={profile.full_name || profile.email}>
                            {profile.full_name || profile.email}
                          </div>
                          {profile.full_name && (
                            <div className={`text-[10px] truncate max-w-[150px] md:max-w-xs ${textMutedClass}`} title={profile.email}>
                              {profile.email}
                            </div>
                          )}
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

        {/* Cell Management Section */}
        <div className={`lg:col-span-3 p-6 rounded-2xl space-y-6 ${cardClass}`}>
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
              <Layers className="w-5 h-5 text-emerald-500" />
              Керування осередками (Ячейками)
            </h2>
            <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-white/60">
              Всього: {cells.length}
            </span>
          </div>

          {cellError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed animate-in fade-in">
              {cellError}
            </div>
          )}

          {cellSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold leading-relaxed animate-in fade-in">
              {cellSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Col: Cells list */}
            <div className="md:col-span-2 space-y-3">
              <p className={`text-xs font-bold uppercase tracking-wider ${textMutedClass}`}>
                Список осередків холдингу
              </p>
              
              <div className="space-y-3">
                {cells.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-4 pl-1">Немає осередків в системі. Створіть перший праворуч.</p>
                ) : (
                  cells.map((cell) => {
                    const isCellEditing = editingCellId === cell.id;
                    const leaderText = getCellLeaderEmail(cell.cell_leader_id);
                    return (
                      <div
                        key={cell.id}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          isCellEditing
                            ? "bg-indigo-500/5 border-indigo-500/30"
                            : isLight
                            ? "bg-neutral-50/50 border-neutral-200"
                            : "bg-white/[0.01] border-white/5 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`font-extrabold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                            {cell.name}
                          </p>
                          <p className={`text-[10px] font-semibold uppercase mt-0.5 ${textMutedClass}`}>
                            Керівник: <span className="text-emerald-450 font-bold">{leaderText}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCellId(cell.id);
                              setEditingCellName(cell.name);
                              setEditingCellLeader(cell.cell_leader_id || "");
                              setCellError("");
                              setCellSuccess("");
                            }}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/15 cursor-pointer transition-all inline-flex items-center"
                            title="Редагувати осередок"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCell(cell.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/15 cursor-pointer transition-all inline-flex items-center"
                            title="Видалити осередок"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Col: Add/Edit Cell form */}
            <div className={`p-5 rounded-xl border ${isLight ? "bg-neutral-50 border-neutral-200" : "bg-white/[0.01] border-white/5"}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-1.5 ${isLight ? "text-neutral-900" : "text-white"}`}>
                {editingCellId ? "Редагувати осередок" : "Створити новий осередок"}
              </h3>
              
              <form onSubmit={editingCellId ? handleUpdateCell : handleCreateCell} className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${textMutedClass}`}>
                    Назва осередку
                  </label>
                  <input
                    type="text"
                    value={editingCellId ? editingCellName : newCellName}
                    onChange={(e) => editingCellId ? setEditingCellName(e.target.value) : setNewCellName(e.target.value)}
                    placeholder="Наприклад: Ячейка Дмитра"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-bold text-white"
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${textMutedClass}`}>
                    Керівник осередку
                  </label>
                  <select
                    value={editingCellId ? editingCellLeader : newCellLeader}
                    onChange={(e) => editingCellId ? setEditingCellLeader(e.target.value) : setNewCellLeader(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-bold text-white cursor-pointer"
                  >
                    <option value="" className="bg-[#0C0C0F] text-white/50">Не призначено</option>
                    {profiles
                      .filter(p => p.role === "cell_leader")
                      .map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0C0C0F] text-white">
                          {p.full_name || p.email}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-grow py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg cursor-pointer transition-all shadow-md"
                  >
                    {editingCellId ? "Зберегти" : "Створити"}
                  </button>
                  
                  {editingCellId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCellId(null);
                        setEditingCellName("");
                        setEditingCellLeader("");
                      }}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg cursor-pointer transition-all border border-white/5"
                    >
                      Скасувати
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Projects Management Section */}
        <div className={`lg:col-span-3 p-6 rounded-2xl space-y-6 ${cardClass}`}>
          <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
            <Briefcase className="w-5 h-5 text-emerald-500" />
            Проекти холдингу B&W
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const isActive = proj.is_active !== false;
              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? isLight
                        ? "bg-neutral-50/50 border-neutral-200"
                        : "bg-white/[0.01] border-white/5"
                      : isLight
                      ? "bg-neutral-100/50 border-neutral-200 opacity-60"
                      : "bg-white/[0.002] border-white/2 opacity-40"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`font-extrabold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                      {proj.name}
                    </p>
                    <p className={`text-[10px] font-semibold uppercase ${textMutedClass}`}>
                      {proj.slug}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleProjectActive(proj.id, isActive)}
                    disabled={isPending}
                    className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20"
                        : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
                    }`}
                  >
                    {isActive ? "Активний" : "Вимкнений"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Section (Visible only to yura3zaxar@gmail.com and yura3zaxar@outlook.com) */}
        {isYura && (
          <div className={`lg:col-span-3 p-6 rounded-2xl space-y-6 ${cardClass}`}>
            <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
              <Shield className="w-5 h-5 text-emerald-500 animate-pulse" />
              Зворотній зв'язок: Помилки та Пропозиції (Тільки для вас)
            </h2>

            <div className={`overflow-x-auto border rounded-xl ${borderClass}`}>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`uppercase tracking-widest font-black border-b ${tableHeaderClass}`}>
                    <th className="p-4">Час</th>
                    <th className="p-4">Співробітник</th>
                    <th className="p-4">Тип</th>
                    <th className="p-4">Повідомлення</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? "divide-neutral-200" : "divide-white/5"}`}>
                  {crmFeedback.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-white/30 italic">
                        Повідомлень поки що немає
                      </td>
                    </tr>
                  ) : (
                    crmFeedback.map((item) => {
                      const itemDate = new Date(item.created_at).toLocaleString("uk-UA");
                      return (
                        <tr key={item.id} className={`transition-all ${tableRowClass}`}>
                          <td className="p-4 font-bold text-neutral-400 whitespace-nowrap">
                            {itemDate}
                          </td>
                          <td className="p-4 font-black">
                            {item.user_email}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              item.type === "error"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {item.type === "error" ? "Помилка" : "Покращення"}
                            </span>
                          </td>
                          <td className="p-4 max-w-md font-medium leading-relaxed break-words whitespace-pre-wrap">
                            {item.message}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              item.status === "new"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                                : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                            }`}>
                              {item.status === "new" ? "Нове" : "Опрацьовано"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {item.status === "new" ? (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, "resolved")}
                                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-lg border border-emerald-500/15 cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider"
                              >
                                Виконано
                              </button>
                            ) : (
                              <span className={`text-xs italic pr-2 ${textSubtleClass}`}>Опрацьовано</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
