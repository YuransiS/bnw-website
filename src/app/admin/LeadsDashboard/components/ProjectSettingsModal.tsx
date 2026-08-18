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
  ShieldAlert
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import {
  updateProjectSettingsAction,
  getMetaAdAccountsAction,
  getMetaAccountCampaignsAction,
  bindProjectAdAccountAction
} from "../../actions";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  userRole: string;
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
  onProjectUpdated
}: ProjectSettingsModalProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeSubTab, setActiveSubTab] = useState<"general" | "meta">("general");
  const [name, setName] = useState(project?.name || "");
  const [cellId, setCellId] = useState(project?.cell_id || "");
  const [currency, setCurrency] = useState(project?.default_currency || "UAH");
  const [expertShare, setExpertShare] = useState(project?.expert_share_percent ?? 50);
  const [isActive, setIsActive] = useState(project?.is_active ?? true);

  // Meta Ads states
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

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
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Повідомлення Meta API: {apiWarning} (використовуються збережені акаунти системи)</span>
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
