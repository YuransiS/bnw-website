"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Save,
  Link as LinkIcon,
  DollarSign,
  User,
  ShieldAlert,
  Key,
  Copy,
  Check,
  ClipboardCheck,
  Plus,
  Trash2,
  Globe
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import {
  updateProjectSettingsAction,
  getMetaAdAccountsAction,
  getMetaAccountCampaignsAction,
  bindProjectAdAccountAction,
  updateMetaTokenAction
} from "../../actions";
import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  userRole: string;
  initialSubTab?: "general" | "meta" | "surveys";
  onProjectUpdated?: (updatedProject: any) => void;
}

const AVAILABLE_CELLS = [
  { id: "fdb33227-45ea-493f-b04b-de954c6d84da", name: "Слободянюк Саша" },
  { id: "4944b399-429f-423e-a4ab-e24b49c71d32", name: "Уткін Дмитро" },
  { id: "53baab06-b780-4db8-b3a2-9ff31d32070e", name: "Ставицький Саша" }
];

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  project,
  userRole,
  initialSubTab = "general",
  onProjectUpdated
}: ProjectSettingsModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeSubTab, setActiveSubTab] = useState<"general" | "meta" | "surveys">(initialSubTab);
  const [name, setName] = useState(project?.name || "");
  const [cellId, setCellId] = useState(project?.cell_id || "");
  const [currency, setCurrency] = useState(project?.default_currency || "UAH");
  const [expertShare, setExpertShare] = useState(project?.expert_share_percent ?? 50);
  const [isActive, setIsActive] = useState(project?.is_active ?? true);

  // Survey Landings states
  const [surveyLandingPaths, setSurveyLandingPaths] = useState<string[]>(() => {
    if (project?.survey_landing_paths && Array.isArray(project.survey_landing_paths) && project.survey_landing_paths.length > 0) {
      return project.survey_landing_paths;
    }
    const slug = project?.slug || "";
    return (DEFAULT_PROJECT_LANDINGS[slug] || [])
      .filter((l) => l.type === "quiz" || l.path.includes("rozbir") || l.path.includes("diagnostic") || l.path.includes("anketa") || l.path.includes("consultation") || l.path.includes("vsl-form"))
      .map((l) => l.path);
  });
  const [customPathInput, setCustomPathInput] = useState("");

  // Meta Ads states
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Meta Token Editor States
  const [showTokenEditor, setShowTokenEditor] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState("");
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  // Sync state when project changes
  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setCellId(project.cell_id || "");
      setCurrency(project.default_currency || "UAH");
      setExpertShare(project.expert_share_percent ?? 50);
      setIsActive(project.is_active ?? true);
      setFeedback(null);
    }
  }, [project]);

  // Load Meta Ad Accounts and current mapping
  useEffect(() => {
    if (isOpen) {
      loadMetaAdAccounts();
    }
  }, [isOpen, project?.slug]);

  const loadMetaAdAccounts = async () => {
    setIsLoadingAccounts(true);
    setApiWarning(null);
    try {
      const res = await getMetaAdAccountsAction();
      if (res.error) throw new Error(res.error);
      if (res.apiWarning) {
        setApiWarning(res.apiWarning);
      }
      if (res.accounts) {
        setAdAccounts(res.accounts);
        const mappedAccount = res.mappings?.[project?.slug];
        if (mappedAccount) {
          setSelectedAdAccount(mappedAccount);
          loadCampaignsForAccount(mappedAccount);
        } else {
          setSelectedAdAccount("");
          setCampaigns([]);
        }
      }
    } catch (err: any) {
      console.warn("Could not load Meta Ad Accounts:", err.message);
      setFeedback({ type: "error", message: err.message || "Помилка завантаження акаунтів Meta" });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadCampaignsForAccount = async (accId: string) => {
    if (!accId) {
      setCampaigns([]);
      return;
    }
    setIsLoadingCampaigns(true);
    try {
      const res = await getMetaAccountCampaignsAction(accId);
      if (res.campaigns) {
        setCampaigns(res.campaigns);
      }
    } catch (err: any) {
      console.warn("Could not load campaigns:", err.message);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleAccountChange = (newAccId: string) => {
    setSelectedAdAccount(newAccId);
    if (newAccId) {
      loadCampaignsForAccount(newAccId);
    } else {
      setCampaigns([]);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateProjectSettingsAction(project.id, {
        name,
        cell_id: cellId || null,
        default_currency: currency,
        expert_share_percent: Number(expertShare),
        is_active: isActive
      });

      if (res.error) throw new Error(res.error);

      setFeedback({ type: "success", message: "Налаштування проекту успішно збережено!" });
      if (onProjectUpdated && res.project) {
        onProjectUpdated(res.project);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Помилка збереження" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLandingSurvey = (path: string) => {
    const clean = path.trim();
    if (surveyLandingPaths.includes(clean)) {
      setSurveyLandingPaths(surveyLandingPaths.filter((p) => p !== clean));
    } else {
      setSurveyLandingPaths([...surveyLandingPaths, clean]);
    }
  };

  const handleAddCustomPath = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customPathInput.trim();
    if (!clean) return;
    let pathToAdd = clean;
    if (pathToAdd.startsWith("http://") || pathToAdd.startsWith("https://")) {
      try {
        const u = new URL(pathToAdd);
        pathToAdd = u.pathname || "/";
      } catch {}
    }
    if (!pathToAdd.startsWith("/")) {
      pathToAdd = `/${pathToAdd}`;
    }
    if (!surveyLandingPaths.includes(pathToAdd)) {
      setSurveyLandingPaths([...surveyLandingPaths, pathToAdd]);
    }
    setCustomPathInput("");
  };

  const handleRemoveCustomPath = (pathToRemove: string) => {
    setSurveyLandingPaths(surveyLandingPaths.filter((p) => p !== pathToRemove));
  };

  const handleSaveSurveyLandings = async () => {
    if (!project?.id) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateProjectSettingsAction(project.id, {
        survey_landing_paths: surveyLandingPaths
      });
      if (res.error) throw new Error(res.error);
      setFeedback({
        type: "success",
        message: `Анкетні лендінги успішно збережено (${surveyLandingPaths.length} обрано)!`
      });
      if (onProjectUpdated && res.project) {
        onProjectUpdated(res.project);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Помилка збереження анкетних лендінгів" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMetaBinding = async () => {
    if (!project?.slug || !selectedAdAccount) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await bindProjectAdAccountAction(project.slug, selectedAdAccount);
      if (res.error) throw new Error(res.error);

      setFeedback({
        type: "success",
        message: `Рекламний кабінет ${selectedAdAccount} успішно прив'язано до проекту ${project.name}!`
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Помилка прив'язки кабінету" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  const isDevOrFounder = ["admin", "superman", "founder", "developer"].includes(userRole);

  if (!isDevOrFounder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-crm-card border border-crm-border rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-black text-crm-text">Доступ обмежено</h3>
          <p className="text-xs text-crm-muted">
            Налаштування проекту доступні виключно розробникам та фаундерам холдингу.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Закрити
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-crm-card border border-crm-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crm-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-crm-text flex items-center gap-2">
                Налаштування проекту: {project.name}
              </h2>
              <span className="text-[11px] font-mono text-crm-muted">Slug: {project.slug}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-crm-muted hover:text-crm-text hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtabs Header */}
        <div className="flex border-b border-crm-border px-6 pt-3 gap-3 bg-white/[0.01]">
          <button
            onClick={() => setActiveSubTab("general")}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "general"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-crm-muted hover:text-crm-text"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Основні параметри
          </button>

          <button
            onClick={() => setActiveSubTab("surveys")}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "surveys"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-crm-muted hover:text-crm-text"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            📋 Лендінги анкет ({surveyLandingPaths.length})
          </button>

          <button
            onClick={() => setActiveSubTab("meta")}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "meta"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-crm-muted hover:text-crm-text"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Meta Ads (Рекламний кабінет & Кампанії)
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: General Settings */}
        {activeSubTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                Офіційна назва проекту (Відображається в CRM)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Вікторія Візуал, Софія (Economica), Світлана Тейп"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-crm-muted">
                Вказуйте зрозумілу назву з іменем експерта для точної ідентифікації.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                  Лідер ячейки (Відповідальний)
                </label>
                <select
                  value={cellId}
                  onChange={(e) => setCellId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Не призначено</option>
                  {AVAILABLE_CELLS.map((cell) => (
                    <option key={cell.id} value={cell.id}>
                      {cell.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                  Основна валюта
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="UAH">UAH (₴)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                  Частка експерта (% від прибутку)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={expertShare}
                  onChange={(e) => setExpertShare(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                  Статус проекту
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-crm-text">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                    />
                    Активний проект в системі
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-crm-border flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-crm-border text-xs font-bold text-crm-muted hover:text-crm-text transition-all"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Збереження..." : "Зберегти параметри"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Survey Landings Settings */}
        {activeSubTab === "surveys" && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase text-crm-text flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                Вибір сторінок анкет та опитувань
              </h3>
              <p className="text-xs text-crm-muted leading-relaxed">
                Позначте галочками лендінги та форми реєстрації вашого проекту, які є анкетами (наприклад, опитувальники, квізи, діагностики, форми VSL). Відповіді респондентів із цих сторінок автоматично відображатимуться у вкладці <strong>«📋 Анкети»</strong>.
              </p>
            </div>

            {/* List of default and discovered landings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-crm-muted tracking-wider">
                  Лендінги проекту ({DEFAULT_PROJECT_LANDINGS[project?.slug || ""]?.length || 0})
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  Обрано для анкет: {surveyLandingPaths.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {(DEFAULT_PROJECT_LANDINGS[project?.slug || ""] || []).map((landing) => {
                  const isChecked = surveyLandingPaths.includes(landing.path.trim());
                  return (
                    <div
                      key={landing.path}
                      onClick={() => toggleLandingSurvey(landing.path)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-white shadow-sm"
                          : "bg-white/[0.02] border-crm-border hover:border-white/20 text-crm-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 shrink-0 pointer-events-none"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-crm-text truncate">
                              {landing.label}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-crm-muted shrink-0">
                              {landing.path}
                            </span>
                          </div>
                          {landing.url && (
                            <span className="text-[10px] font-mono text-crm-muted/80 truncate block mt-0.5">
                              {landing.url}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 border ${
                          isChecked
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-white/5 text-crm-muted border-white/5"
                        }`}
                      >
                        {isChecked ? "Анкета" : "Звичайний"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Path Input */}
            <div className="bg-white/[0.02] border border-crm-border rounded-2xl p-4 space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase text-crm-text flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Додати довільний URL / шлях анкетної форми
                </h4>
                <p className="text-[10px] text-crm-muted">
                  Якщо ваша форма розміщена на нестандартному роуті або піддомені (наприклад, <code>/custom-quiz</code> або <code>/free-lection/vsl-form/</code>), введіть його тут:
                </p>
              </div>

              <form onSubmit={handleAddCustomPath} className="flex gap-2">
                <input
                  type="text"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                  placeholder="напр. /anketa або /vsl-diagnostic"
                  className="flex-1 px-4 py-2 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customPathInput.trim()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Додати
                </button>
              </form>

              {/* Show custom paths if any */}
              {surveyLandingPaths.filter((p) => !(DEFAULT_PROJECT_LANDINGS[project?.slug || ""] || []).some((l) => l.path.trim() === p.trim())).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-crm-border">
                  <span className="text-[10px] font-black uppercase text-crm-muted tracking-wider block">
                    Додаткові додані шляхи:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {surveyLandingPaths
                      .filter((p) => !(DEFAULT_PROJECT_LANDINGS[project?.slug || ""] || []).some((l) => l.path.trim() === p.trim()))
                      .map((customPath) => (
                        <span
                          key={customPath}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        >
                          <span>{customPath}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomPath(customPath)}
                            className="text-emerald-300/60 hover:text-rose-400 transition-colors"
                            title="Видалити"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="pt-4 border-t border-crm-border flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-crm-border text-xs font-bold text-crm-muted hover:text-crm-text transition-all"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSaveSurveyLandings}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Збереження..." : "Зберегти анкетні лендінги"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Meta Ads Binding & Campaigns */}
        {activeSubTab === "meta" && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Account Selector Section */}
            <div className="bg-white/[0.02] border border-crm-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-crm-text flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-400" />
                    Прив&apos;язка рекламного кабінету Meta (Facebook)
                  </h4>
                  <p className="text-[10px] text-crm-muted">
                    Оберіть рекламний кабінет для автоматичного підтягування витрат та кампаній проекту.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadMetaAdAccounts}
                  disabled={isLoadingAccounts}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                  title="Оновити список з Meta API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? "animate-spin" : ""}`} />
                </button>
              </div>

              {apiWarning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-amber-200 block">Потрібно оновити токен Meta Graph API</span>
                        <span className="text-[11px] text-amber-300/80 block mt-0.5">
                          {apiWarning.includes("Session has expired") || apiWarning.includes("Error validating access token")
                            ? "Термін дії поточного токена Meta завершився. Передайте повідомлення розробнику або оновіть токен нижче."
                            : `Meta API: ${apiWarning}`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`Помилка Meta Token на проекті ${project.name}: ${apiWarning}`);
                        setCopiedError(true);
                        setTimeout(() => setCopiedError(false), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                    >
                      {copiedError ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedError ? "Скопійовано!" : "Скопіювати"}</span>
                    </button>
                  </div>

                  {["admin", "superman", "founder", "developer"].includes(userRole) && (
                    <div className="pt-2 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={() => setShowTokenEditor(!showTokenEditor)}
                        className="text-[11px] font-bold text-amber-200 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Key className="w-3 h-3" />
                        <span>{showTokenEditor ? "Приховати оновлення токена" : "Вставити новий токен Meta (System User / User Token)..."}</span>
                      </button>

                      {showTokenEditor && (
                        <div className="mt-2 space-y-2 p-3 rounded-xl bg-black/40 border border-white/10">
                          <input
                            type="password"
                            value={newTokenInput}
                            onChange={(e) => setNewTokenInput(e.target.value)}
                            placeholder="EAAWcjCyZ..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                          />
                          <div className="flex justify-between items-center text-[10px] text-white/50">
                            <span>Рекомендовано: System User Token з правами ads_read, read_insights (Never Expire)</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newTokenInput.trim()) return;
                                setIsUpdatingToken(true);
                                const res = await updateMetaTokenAction(newTokenInput.trim());
                                setIsUpdatingToken(false);
                                if (res.error) {
                                  alert(`Помилка: ${res.error}`);
                                } else {
                                  alert(res.message || "Токен оновлено!");
                                  setNewTokenInput("");
                                  setShowTokenEditor(false);
                                  loadMetaAdAccounts();
                                }
                              }}
                              disabled={isUpdatingToken || !newTokenInput.trim()}
                              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                            >
                              {isUpdatingToken ? "Перевірка..." : "Зберегти токен"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <select
                    value={selectedAdAccount}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    disabled={isLoadingAccounts}
                    className="flex-1 w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text text-xs font-bold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Оберіть рекламний кабінет зі списку --</option>
                    {adAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.id}) {acc.currency ? `— ${acc.currency}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveMetaBinding}
                    disabled={isSaving || !selectedAdAccount}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    {isSaving ? "Прив'язка..." : "Прив'язати кабінет"}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-crm-muted">
                  <span>Або введіть ID вручну:</span>
                  <input
                    type="text"
                    value={selectedAdAccount}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    placeholder="act_1451088823442765"
                    className="px-3 py-1 rounded-lg bg-crm-input-bg border border-crm-border text-crm-text text-xs font-mono focus:border-blue-500 focus:outline-none w-52"
                  />
                </div>
              </div>
            </div>

            {/* Campaigns Viewer Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-crm-muted tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Рекламні кампанії кабінету ({campaigns.length})
                </span>

                {selectedAdAccount && (
                  <button
                    onClick={() => loadCampaignsForAccount(selectedAdAccount)}
                    disabled={isLoadingCampaigns}
                    className="text-[10px] text-crm-muted hover:text-crm-text flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingCampaigns ? "animate-spin" : ""}`} />
                    Оновити кампанії
                  </button>
                )}
              </div>

              {!selectedAdAccount ? (
                <div className="p-8 text-center border border-dashed border-crm-border rounded-2xl space-y-2">
                  <Megaphone className="w-8 h-8 text-crm-muted mx-auto opacity-30" />
                  <p className="text-xs text-crm-muted font-medium">
                    Оберіть рекламний кабінет вище, щоб підтягнути всі активні рекламні кампанії.
                  </p>
                </div>
              ) : isLoadingCampaigns ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-crm-muted font-medium">
                    Завантажую кампанії з Meta Graph API v25.0...
                  </p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-6 text-center border border-crm-border rounded-2xl">
                  <p className="text-xs text-crm-muted">У цьому рекламному кабінеті не знайдено кампаній.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                  {campaigns.map((c) => {
                    const isActive = c.status === "ACTIVE" || c.effectiveStatus === "ACTIVE";
                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-crm-border hover:border-white/20 transition-all flex items-center justify-between"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"
                              }`}
                            />
                            <span className="text-xs font-bold text-crm-text truncate">{c.name}</span>
                            <span
                              className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-crm-muted">
                            <span>ID: {c.id}</span>
                            {c.objective && <span>• {c.objective}</span>}
                          </div>
                        </div>

                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-crm-muted border border-white/10 shrink-0">
                          Готова для воронки
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
