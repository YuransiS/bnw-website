"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { statusMapper } from "@/lib/statusMapper";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { devLogger } from "@/utils/logger";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Helper to check user session, role, and allowed projects
export async function getSessionAndAccess(selectedProjectSlug?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch profile using admin client to bypass RLS or session latency
  const adminSupabase = createAdminClient();
  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  let profile = profileData;

  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  const isActualDev = (user.email && devEmails.includes(user.email.toLowerCase())) ||
    (profile && (profile.role === "admin" || profile.role === "superman"));

  if (isActualDev) {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get("crm_impersonated_role")?.value;
    if (impersonated && ["superman", "producer", "rop", "sales", "pending"].includes(impersonated)) {
      profile = profile ? { ...profile, role: impersonated } : { id: user.id, email: user.email || "", role: impersonated };
    }
  }

  if (!profile || profile.role === "pending") {
    throw new Error("Access Pending Approval");
  }

  const isSuperman = profile.role === "admin" || profile.role === "superman";

  // Fetch allowed projects mapping
  let allowedProjects: { id: string; name: string; slug: string }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active")
      .order("name");
    const projectsList = allProj || [];

    allowedProjects = projectsList.filter((p) => p.is_active);
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  // Resolve current active project slug
  let activeSlug = selectedProjectSlug;
  if (!activeSlug && allowedProjects.length > 0) {
    activeSlug = isSuperman ? "all" : allowedProjects[0].slug;
  }

  // Verify access to requested slug
  if (activeSlug === "all" && !isSuperman) {
    activeSlug = allowedProjects.length > 0 ? allowedProjects[0].slug : undefined;
  }

  if (activeSlug && activeSlug !== "all" && !allowedProjects.some((p) => p.slug === activeSlug)) {
    activeSlug = allowedProjects.length > 0 ? allowedProjects[0].slug : undefined;
  }

  devLogger.info(
    "Auth & Session",
    `User ${user.email} authenticated. Role: ${profile.role}. Active Project: ${activeSlug}`,
    { allowedProjects: allowedProjects.map((p) => p.slug) }
  );

  return {
    user,
    profile,
    isSuperman,
    allowedProjects,
    activeSlug,
  };
}

export async function checkProjectAccess(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") throw new Error("Access Pending Approval");
  if (profile.role === "admin" || profile.role === "superman") return true;

  const { data } = await supabase
    .from("profile_projects")
    .select("project_id")
    .eq("profile_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) throw new Error("Access Denied: You do not have access to this project.");
  return true;
}

// PROJECT LANDINGS registry for server-side lookup
const PROJECT_LANDINGS: Record<string, Array<{ label: string; url: string; badgeColor: string; type: "paid" | "free" }>> = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" }
  ],
  victoria: [
    { label: "rozbir", url: "https://victoria-mc.vercel.app/rozbir", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "Броні", url: "https://sofifinsight.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "VSL", url: "https://sofifinsight.vercel.app/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://sofifinsight.vercel.app/sofia-invest/lesson", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free" },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid" },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid" },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free" },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid" },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" }
  ],
  vova_win: [
    { label: "Марафон", url: "https://vova-win.club/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ]
};

// DSU Helper class
class DSU {
  parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const nxt = this.parent[curr];
      this.parent[curr] = root;
      curr = nxt;
    }
    return root;
  }
  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

const normalizeUrlForMatching = (url: string) => {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
};

const getTouchPageUrl = (l: any) => {
  if (!l) return "";
  return (
    l.metadata?.page_url ||
    l.metadata?.pageUrl ||
    l.metadata?.full_url ||
    l.metadata?.fullUrl ||
    l.metadata?.raw_row?.page_url ||
    l.metadata?.raw_row?.pageUrl ||
    l.page_url ||
    ""
  );
};

const getTouchUtm = (l: any, key: 'source' | 'medium' | 'campaign' | 'content' | 'term'): string => {
  if (!l) return "";
  const colVal = l[`utm_${key}`];
  if (colVal && colVal.trim()) return colVal.trim();
  const utms =
    l.metadata?.raw_row?.raw_payload?.utms ||
    l.metadata?.raw_payload?.utms ||
    l.metadata?.utms ||
    null;
  if (utms) {
    const val = utms[key] || utms[key === 'campaign' ? 'utm_campaign' : key === 'source' ? 'utm_source' : key === 'medium' ? 'utm_medium' : key === 'content' ? 'utm_content' : key === 'term' ? 'utm_term' : ''];
    if (val && String(val).trim()) return String(val).trim();
  }
  const metaVal = l.metadata?.[`utm_${key}`] || l.metadata?.[`utm${key.charAt(0).toUpperCase() + key.slice(1)}`] || l.metadata?.raw_row?.[`utm_${key}`];
  if (metaVal && String(metaVal).trim()) return String(metaVal).trim();
  return "";
};

const getUkraineOffset = (year: number, month: number, day: number): string => {
  if (month > 2 && month < 9) return "+03:00";
  if (month < 2 || month > 9) return "+02:00";
  
  const lastSunday = (m: number) => {
    const d = new Date(year, m + 1, 0);
    const dayOfWeek = d.getDay();
    return d.getDate() - dayOfWeek;
  };
  
  if (month === 2) {
    return day >= lastSunday(2) ? "+03:00" : "+02:00";
  }
  if (month === 9) {
    return day < lastSunday(9) ? "+03:00" : "+02:00";
  }
  return "+02:00";
};

const getLeadDate = (lead: any): Date => {
  const rawDateStr =
    lead.metadata?.raw_row?.Дата ||
    lead.metadata?.raw_row?.дата ||
    lead.metadata?.raw_row?.Date ||
    lead.metadata?.raw_row?.date ||
    lead.metadata?.created_at ||
    lead.metadata?.lead?.created_at;

  if (rawDateStr) {
    const str = String(rawDateStr).trim();
    const dotParts = str.split(" ")[0].split(".");
    if (dotParts.length === 3) {
      const day = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10) - 1;
      const year = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const timeStr = str.split(" ")[1];
        const hour = timeStr ? (parseInt(timeStr.split(":")[0], 10) || 0) : 12;
        const min = timeStr ? (parseInt(timeStr.split(":")[1], 10) || 0) : 0;
        const sec = timeStr ? (parseInt(timeStr.split(":")[2], 10) || 0) : 0;
        
        const offset = getUkraineOffset(year, month, day);
        const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}${offset}`;
        return new Date(isoStr);
      }
    }
    let cleanStr = str;
    if (str.includes("(")) {
      cleanStr = str.split("(")[0].trim();
    }
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return new Date(lead.created_at);
};

const statusPriority = (s: string): number => {
  if (s === "Купив курс") return 10;
  if (s === "Вирішив подумати") return 8;
  if (s === "Дзвінок проведено") return 7;
  if (s === "Назначено Дзвінок") return 6;
  if (s === "Купив(-ла) Трипвайер") return 5;
  if (s === "Списались") return 4;
  if (s === "Залишив заявку") return 3;
  if (s === "Зацікавлений лід") return 2;
  if (s === "Новий лід") return 1;
  if (s === "Відмова") return -1;
  return 0;
};

const isLeadMatchingLanding = (lead: any, landingUrl: string, activeSlug: string) => {
  if (landingUrl === "all") return true;
  const targetNorm = normalizeUrlForMatching(landingUrl);
  const targetHasPath = targetNorm.includes("/");

  return lead.history?.some((touch: any) => {
    const touchUrl = normalizeUrlForMatching(getTouchPageUrl(touch));

    const originalSheet = (
      touch.metadata?.original_sheet ||
      touch.metadata?.originalSheet ||
      touch.metadata?.raw_row?.original_sheet ||
      touch.metadata?.raw_row?.originalSheet ||
      ""
    ).trim();

    const targetSheet = (
      touch.metadata?.target_sheet ||
      touch.metadata?.targetSheet ||
      touch.metadata?.raw_row?.target_sheet ||
      touch.metadata?.raw_row?.targetSheet ||
      touch.metadata?.raw_row?.raw_payload?.sheet_name ||
      ""
    ).trim();
    const tariff = (touch.metadata?.tariff || touch.metadata?.raw_row?.tariff || "").trim();

    if (touchUrl) {
      let urlMatch = false;
      if (targetHasPath) {
        urlMatch = touchUrl.includes(targetNorm);
        if (!urlMatch && targetNorm.includes("body-taping")) {
          urlMatch = touchUrl.includes("/body-taping");
        }
      } else {
        const firstSlashIdx = touchUrl.indexOf("/");
        if (firstSlashIdx === -1) {
          urlMatch = touchUrl === targetNorm;
        } else {
          const domainPart = touchUrl.substring(0, firstSlashIdx);
          const pathPart = touchUrl.substring(firstSlashIdx + 1).trim();
          urlMatch = domainPart === targetNorm && pathPart === "";
        }
      }
      if (urlMatch) return true;
    }

    if (targetNorm.includes("svitlana3web.vercel.app")) {
      if (originalSheet === "ВЕБ (бот)" || originalSheet === "Заявки ленд Веб" || originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("facedetox.vercel.app")) {
      if (originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("tipstarinnyaa.vercel.app")) {
      if (originalSheet === "Квіз") return true;
    }
    if (targetNorm.includes("antibotox.vercel.app")) {
      if (originalSheet === "Заявки ленд веб") return true;
    }
    if (targetNorm.includes("zalomu-sny.vercel.app")) {
      if (originalSheet === "Заломи") return true;
    }
    if (targetNorm.includes("body-taping")) {
      if (originalSheet === "Тейпування тіла" || tariff === "body_taping") return true;
    }

    if (targetNorm.includes("/practicum")) {
      if (originalSheet === "Практикум" || originalSheet === "Practicum_Leads" || targetSheet === "Заявки на практикум") return true;
    }
    if (targetNorm.includes("/free-lection") && !targetNorm.includes("vsl-form")) {
      if (originalSheet === "VSL 1 етап" || originalSheet === "VSL Трафик" || originalSheet === "VLS Урок") return true;
    }
    if (targetNorm.includes("/free-lection/vsl-form")) {
      if (originalSheet === "VSL Форма") return true;
    }
    if (targetNorm.includes("/rozbir")) {
      const touchPath = (touch.page_path || touch.metadata?.page_path || touch.metadata?.raw_row?.page_path || "").trim().toLowerCase();
      if (originalSheet === "Ленд 3" || targetSheet === "Ленд 3" || touchPath.includes("rozbir") || touchUrl.includes("/rozbir")) return true;
    }
    if (targetNorm.includes("/price")) {
      if (originalSheet === "Бронювання" || originalSheet === "Заявки на практикум" || targetSheet === "Заявки на практикум") return true;
    }
    if (targetNorm.includes("/intensive")) {
      if (targetSheet === "Заявки на інтенсив") return true;
    }
    if (targetNorm.includes("/web")) {
      if (originalSheet === "Лиды Вебинар" || originalSheet === "Webinars" || originalSheet === "Заявки ленд Веб" || originalSheet === "ВЕБ (бот)" || originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("/sofia-invest/lesson")) {
      if (originalSheet === "Заявки на урок" || originalSheet === "Анкети після уроку") return true;
    }
    if (targetNorm.includes("/sofia-invest") && !targetNorm.includes("/lesson")) {
      if (originalSheet === "VSL Трафик" || originalSheet === "VLS Урок") return true;
    }
    if (targetNorm.includes("/office")) {
      if (originalSheet === "Practicum_Leads") return true;
    }

    if (!targetHasPath) {
      if (activeSlug === "victoria" && targetNorm.includes("victoria-mc.vercel.app")) {
        if (["Ленд 1", "Ленд 2", "Ленд 3", "МК 2.0", "Автовеб", "Webinars", "Ліди МК"].includes(originalSheet)) return true;
      }
      if ((activeSlug === "svitlana" || activeSlug === "svitlana") && (targetNorm.includes("svitlanatape.vercel.app") || targetNorm.includes("svetlanatape.vercel.app"))) {
        if (["Діагностики", "Квіз", "Відповіді бот (19.05)"].includes(originalSheet)) return true;
      }
      if (activeSlug === "sofia" && targetNorm.includes("sofifinsight.vercel.app")) {
        if (!originalSheet && !targetSheet) return true;
      }
    }

    return false;
  }) || false;
};

// Fetch unified CRM dashboard and analytics data
export async function getUnifiedCRMData(
  selectedProjectSlug?: string,
  filters?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    statusFilter?: string;
    touchCountFilter?: string;
    sourceFilter?: string;
    unpaidIntentOnly?: boolean;
    startDate?: string;
    endDate?: string;
    selectedLanding?: string;
    skipTraffic?: boolean;
  }
) {
  try {
    const { isSuperman, allowedProjects, activeSlug, profile, user } = await getSessionAndAccess(selectedProjectSlug);

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Fetch unresolved transactions (amount > 0 and missing/invalid currency metadata)
    let unresolvedOrders: any[] = [];
    if (["admin", "superman", "producer", "rop"].includes(profile.role)) {
      try {
        const { data: rawUnresolved, error: unresolvedErr } = await adminSupabase
          .from("unified_orders")
          .select("id, amount, status, created_at, customer_id, project_id, metadata")
          .not("status", "in", "('Клик', 'КликФормы')")
          .gt("amount", 0);

        if (!unresolvedErr && rawUnresolved) {
          const filtered = rawUnresolved.filter((o: any) => {
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();
            return !["usd", "$", "uah", "₴", "eur", "€"].includes(metaCurrency);
          });

          if (filtered.length > 0) {
            const customerIds = Array.from(new Set(filtered.map((o) => o.customer_id).filter(Boolean)));
            const projectIds = Array.from(new Set(filtered.map((o) => o.project_id).filter(Boolean)));

            const [custs, projs] = await Promise.all([
              customerIds.length > 0
                ? adminSupabase.from("unified_customers").select("id, name, phone").in("id", customerIds).then((r) => r.data || [])
                : Promise.resolve([]),
              projectIds.length > 0
                ? adminSupabase.from("projects").select("id, name").in("id", projectIds).then((r) => r.data || [])
                : Promise.resolve([]),
            ]);

            unresolvedOrders = filtered.map((o) => {
              const customer = (custs.find((c: any) => c.id === o.customer_id) || {}) as any;
              const project = (projs.find((p: any) => p.id === o.project_id) || {}) as any;
              const landingName = o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "";
              return {
                id: o.id,
                amount: Number(o.amount || 0),
                status: o.status,
                created_at: o.created_at,
                projectId: o.project_id,
                projectName: project.name || "Невідомий проект",
                customerName: customer.name || "Невідомий клієнт",
                customerPhone: customer.phone || "",
                landingName,
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch unresolved orders:", err);
      }
    }

    // 1. Superman Global Hub mode
    if (isSuperman && activeSlug === "all") {
      const fetchAllOrdersForSummary = async () => {
        let results: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await adminSupabase
            .from("unified_orders")
            .select("id, project_id, amount, status, metadata, campaign_id, utm_campaign")
            .range(from, from + limit - 1);
          if (error) throw error;
          results = [...results, ...(data || [])];
          if ((data || []).length < limit) hasMore = false;
          else from += limit;
        }
        return results;
      };

      const [summaryRes, campaignRes] = await Promise.all([
        supabase.rpc("get_projects_summary"),
        supabase.rpc("get_campaigns_summary"),
      ]);

      // Fallback to JS queries if RPC does not exist in Supabase
      let summary = summaryRes.data || [];
      let campaigns = campaignRes.data || [];

      if (summaryRes.error || campaignRes.error) {
        // Fallback manual JS logic with full paginated fetching
        const [allProjects, allOrders, allSpends] = await Promise.all([
          supabase.from("projects").select("*").then(r => r.data || []),
          fetchAllOrdersForSummary(),
          supabase.from("daily_traffic_and_costs").select("*").then(r => r.data || []),
        ]);

        summary = (allProjects || []).map((proj) => {
          const projOrders = (allOrders || []).filter((o) => o.project_id === proj.id && o.status !== "Клик" && o.status !== "КликФормы");
          const projSpends = (allSpends || []).filter((s) => s.project_id === proj.id);

          const paidOrders = projOrders.filter((o) => {
            return statusMapper.normalize(o.status) === "closed_won";
          });

          // Filter out tripwires to match the SQL function get_projects_summary()
          const coursePaidOrders = paidOrders.filter((o) => {
            const originalSheet = String(o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "").trim();
            const targetSheet = String(o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || "").trim();
            const courseName = String(o.metadata?.leadData?.course || o.metadata?.lead?.leadData?.course || "").trim();
            const orderSlug = proj.slug || "";

            const isTripwire =
              ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
              ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
              courseName.includes("Mini-Course") ||
              courseName.includes("Practicum") ||
              courseName.includes("Практикум") ||
              courseName.includes("Міні-курс") ||
              orderSlug === "sofia" ||
              orderSlug === "valeria";

            return !isTripwire;
          });

          let usd_revenue = 0;
          let uah_revenue = 0;
          let eur_revenue = 0;

          coursePaidOrders.forEach((o) => {
            const amt = Number(o.amount || 0);
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

            const isUsd = ["usd", "$"].includes(metaCurrency);
            const isEur = ["eur", "€"].includes(metaCurrency);
            const isUah = ["uah", "₴"].includes(metaCurrency);

            if (isUsd) {
              usd_revenue += amt;
            } else if (isEur) {
              eur_revenue += amt;
            } else if (isUah) {
              uah_revenue += amt;
            }
          });

          const spend = projSpends.reduce((sum, s) => sum + Number(s.spend || 0), 0);
          const uniqueCusts = new Set(projOrders.map((o) => o.customer_id).filter(Boolean));
          const leads_count = uniqueCusts.size;
          const cpl = leads_count > 0 ? Number((spend / leads_count).toFixed(2)) : 0;

          return {
            project_id: proj.id,
            project_name: proj.name,
            project_slug: proj.slug,
            spend,
            leads_count,
            cpl,
            usd_revenue,
            uah_revenue,
            eur_revenue,
          };
        }).sort((a, b) => b.usd_revenue - a.usd_revenue || b.uah_revenue - a.uah_revenue);
      }

      // Calculate OP Leaderboard
      const [producersRes, profileProjectsRes, allProjRes, allOrdersForLeaderboard, allCostsRes] = await Promise.all([
        adminSupabase.from("profiles").select("id, email, full_name, avatar_url").eq("role", "producer"),
        adminSupabase.from("profile_projects").select("profile_id, project_id"),
        adminSupabase.from("projects").select("id, name, slug, is_active"),
        fetchAllOrdersForSummary(),
        adminSupabase.from("daily_traffic_and_costs").select("project_id, spend"),
      ]);

      const producers = producersRes.data || [];
      const mappings = profileProjectsRes.data || [];
      const projects = (allProjRes.data || []).filter((p) => p.is_active !== false);
      const orders = (allOrdersForLeaderboard || []).filter((o) => o.status !== "Клик" && o.status !== "КликФормы");
      const costs = allCostsRes.data || [];

      const leaderboard = producers.map((prod) => {
        // Find assigned projects
        const assignedIds = mappings
          .filter((m) => m.profile_id === prod.id)
          .map((m) => m.project_id);

        const assignedProjDetails = projects.filter((p) => assignedIds.includes(p.id));
        const projectNames = assignedProjDetails.map((p) => p.name).join(", ") || "—";

        // Aggregate orders revenue and leads count
        const prodOrders = orders.filter((o) => assignedIds.includes(o.project_id));
        const prodPaidOrders = prodOrders.filter((o) => {
          return statusMapper.normalize(o.status) === "closed_won";
        });

        let usd_revenue = 0;
        let uah_revenue = 0;
        let eur_revenue = 0;

        prodPaidOrders.forEach((o) => {
          const amt = Number(o.amount || 0);
          const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

          const isUsd = ["usd", "$"].includes(metaCurrency);
          const isEur = ["eur", "€"].includes(metaCurrency);
          const isUah = ["uah", "₴"].includes(metaCurrency);

          if (isUsd) {
            usd_revenue += amt;
          } else if (isEur) {
            eur_revenue += amt;
          } else if (isUah) {
            uah_revenue += amt;
          }
        });

        const uniqueProdCusts = new Set(prodOrders.map((o) => o.customer_id).filter(Boolean));
        const totalLeads = uniqueProdCusts.size;

        // Aggregate spend
        const prodCosts = costs.filter((c) => assignedIds.includes(c.project_id));
        const totalSpend = prodCosts.reduce((sum, c) => sum + Number(c.spend || 0), 0);

        const blendedRevenue = usd_revenue + (uah_revenue / 41.0) + (eur_revenue * 1.08);
        const netProfit = blendedRevenue - totalSpend;
        const roi = totalSpend > 0 ? (blendedRevenue / totalSpend) * 100 : 0;
        const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

        return {
          producerId: prod.id,
          email: prod.email,
          name: prod.full_name || prod.email,
          avatar_url: prod.avatar_url || "",
          projectNames,
          spend: totalSpend,
          leadsCount: totalLeads,
          cpl,
          usd_revenue,
          uah_revenue,
          eur_revenue,
          blended_revenue: blendedRevenue,
          profit: netProfit,
          roi,
          isLeaderOfMonth: false,
        };
      });

      // Sort by blended revenue descending
      leaderboard.sort((a, b) => b.blended_revenue - a.blended_revenue);

      // Mark the top one as leader of the month if they have some revenue
      if (leaderboard.length > 0 && leaderboard[0].blended_revenue > 0) {
        leaderboard[0].isLeaderOfMonth = true;
      }

      return {
        viewType: "all",
        role: profile.role,
        allowedProjects,
        activeSlug: "all",
        summaryData: summary,
        campaignsData: campaigns,
        producersLeaderboard: leaderboard,
        unresolvedOrders,
      };
    }

    // 2. Focused Single Project mode
    if (!activeSlug) {
      return {
        viewType: "none",
        role: profile.role,
        allowedProjects: [],
        activeSlug: "",
        leads: [],
        traffic: [],
        costs: [],
        unresolvedOrders,
      };
    }

    const activeProject = allowedProjects.find((p) => p.slug === activeSlug)!;

    // Check if there is a Head of Sales (ROP) assigned to this project
    const { data: assignedProfilesData } = await adminSupabase
      .from("profile_projects")
      .select("profiles(role)")
      .eq("project_id", activeProject.id);

    const hasRop = (assignedProfilesData || [])
      .map((item: any) => item.profiles)
      .some((p: any) => p && p.role === "rop");

    const isSalesFiltered = profile.role === "sales" && hasRop;

    // Fetch all paged records helper function in parallel
    const fetchAllParallel = async (
      countQuery: () => Promise<any> | any,
      fetchPageFn: (from: number, to: number) => Promise<any> | any
    ) => {
      const { count, error: countErr } = await countQuery();
      if (countErr) throw countErr;
      const total = count || 0;
      if (total === 0) return [];

      const limit = 1000;
      const pagesCount = Math.ceil(total / limit);
      const promises = [];

      for (let i = 0; i < pagesCount; i++) {
        const from = i * limit;
        const to = from + limit - 1;
        promises.push(fetchPageFn(from, to));
      }

      const results = await Promise.all(promises);
      let combinedData: any[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        combinedData = [...combinedData, ...(res.data || [])];
      }
      return combinedData;
    };

    // Parallel fetch using adminSupabase (bypassing RLS safely)
    const dbFetchStart = performance.now();
    const [allCustomers, allOrders, allTraffic, costsRes] = await Promise.all([
      fetchAllParallel(
        () => {
          let q = adminSupabase.from("unified_customers").select("*", { count: "exact", head: true }).eq("project_id", activeProject.id);
          if (isSalesFiltered) {
            q = q.eq("assigned_manager_id", user.id);
          }
          return q;
        },
        (from, to) => {
          let q = adminSupabase.from("unified_customers").select("*").eq("project_id", activeProject.id);
          if (isSalesFiltered) {
            q = q.eq("assigned_manager_id", user.id);
          }
          return q.range(from, to);
        }
      ),
      fetchAllParallel(
        () => adminSupabase.from("unified_orders").select("*", { count: "exact", head: true }).eq("project_id", activeProject.id),
        (from, to) => {
          return adminSupabase
            .from("unified_orders")
            .select("*")
            .eq("project_id", activeProject.id)
            .order("created_at", { ascending: false })
            .range(from, to);
        }
      ),
      filters?.skipTraffic
        ? Promise.resolve([])
        : fetchAllParallel(
            () => adminSupabase.from("traffic_clicks").select("*", { count: "exact", head: true }).eq("project_id", activeProject.id),
            (from, to) => {
              return adminSupabase
                .from("traffic_clicks")
                .select("*")
                .eq("project_id", activeProject.id)
                .order("created_at", { ascending: false })
                .range(from, to);
            }
          ),
      adminSupabase
        .from("daily_traffic_and_costs")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("date", { ascending: false })
    ]);
    const dbFetchEnd = performance.now();
    const dbFetchMs = dbFetchEnd - dbFetchStart;

    const costs = costsRes.data || [];

    // Separate real leads from raw traffic click session logs
    const leads = allOrders;
    const traffic = allTraffic;

    // Fetch all profiles to map sales manager names
    const { data: allProfiles } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name");
    const profilesList = allProfiles || [];

    // Format leads with customer fields
    const formattedLeads = leads.map((lead) => {
      const cust = allCustomers.find((c) => c.id === lead.customer_id) || {};
      const manager = profilesList.find((p) => p.id === cust.assigned_manager_id);
      const managerName = manager ? (manager.full_name || manager.email) : "";

      return {
        ...lead,
        name: cust.name || lead.metadata?.name || lead.metadata?.lead?.name || "Невідомий",
        phone: cust.phone || lead.metadata?.phone || lead.metadata?.lead?.phone || "",
        telegram: cust.telegram || lead.metadata?.telegram || lead.metadata?.lead?.telegram || "",
        email: cust.email || lead.metadata?.email || lead.metadata?.lead?.email || "",
        managerComment: cust.manager_comment || "",
        customerId: lead.customer_id || null,
        assigned_manager_id: cust.assigned_manager_id || null,
        assigned_manager_name: managerName,
      };
    });

    // --- DSU Clustering / Deduplication engine on server ---
    const jsClusteringStart = performance.now();
    const size = formattedLeads.length;
    const dsu = new DSU(size);

    const phoneMap = new Map<string, number>();
    const tgMap = new Map<string, number>();
    const emailMap = new Map<string, number>();
    const uuidMap = new Map<string, number>();

    const getDiagnosticsComment = (groupLeads: any[]): string => {
      const answers: string[] = [];
      const hasRozbir = groupLeads.some((lead) => {
        const meta = lead.metadata || {};
        const raw = meta.raw_row || {};
        const path = lead.page_path || raw.page_path || "";
        const url = lead.page_url || raw.page_url || "";
        const origSheet = meta.original_sheet || raw.original_sheet || "";
        return path === "/rozbir" || url.toLowerCase().includes("/rozbir") || origSheet === "Розбір (Old)" || origSheet === "Ленд 3";
      });
      if (hasRozbir) {
        answers.push("Анкета: rozbir");
      }
      groupLeads.forEach((lead) => {
        const meta = lead.metadata || {};
        const raw = meta.raw_row || {};

        const quizFields = [
          { key: "що турбує", label: "Що турбує" },
          { key: "Чи колола ботокс, або подібне", label: "Ботокс" },
          { key: "Тип старіння", label: "Тип старіння" },
          { key: "Рівень доходу", label: "Дохід" },
          { key: "Дохід", label: "Дохід" },
          { key: "Фінансова ціль", label: "Фінансова ціль" },
          { key: "Ціль", label: "Ціль" },
          { key: "Борги", label: "Борги" },
          { key: "Чи є борги зараз", label: "Борги" },
          { key: "За який термін вийти на 100 000$", label: "Термін 100k$" },
          { key: "Відповідь 1 (скільки витрачаєш на косметику в міс.)", label: "Витрати на косметику" },
          { key: "niche", label: "Ніша" },
          { key: "Коментар", label: "Коментар" },
          { key: "request", label: "Запит" },
          { key: "tariff", label: "Тариф" }
        ];

        quizFields.forEach((f) => {
          const val = raw[f.key] || meta[f.key];
          if (val && String(val).trim()) {
            answers.push(`${f.label}: ${String(val).trim()}`);
          }
        });

        Object.keys(raw).forEach((k) => {
          if (k.toLowerCase().includes("питання") || k.toLowerCase().includes("відповідь")) {
            const val = raw[k];
            if (val && String(val).trim()) {
              answers.push(`${k}: ${String(val).trim()}`);
            }
          }
        });

        const quizResult = raw.quiz_result || meta.quiz_result;
        if (quizResult) {
          if (typeof quizResult === "object") {
            Object.entries(quizResult).forEach(([k, v]) => {
              if (v) answers.push(`${k}: ${v}`);
            });
          } else {
            answers.push(`Quiz: ${quizResult}`);
          }
        }
        const queryVal = raw.query || meta.query;
        if (queryVal) {
          if (typeof queryVal === "object") {
            Object.entries(queryVal).forEach(([k, v]) => {
              if (v) answers.push(`${k}: ${v}`);
            });
          } else {
            answers.push(`Запит: ${queryVal}`);
          }
        }
      });

      return Array.from(new Set(answers)).join("\n");
    };

    // Cluster leads
    formattedLeads.forEach((lead: any, i: number) => {
      const phone = lead.phone?.replace(/\D/g, "") || "";
      const tg = lead.telegram?.toLowerCase().replace("@", "").trim() || "";
      const email = lead.email?.toLowerCase().trim() || "";
      const uuid = lead.visitor_uuid || "";

      if (phone.length >= 7) {
        if (phoneMap.has(phone)) dsu.union(i, phoneMap.get(phone)!);
        else phoneMap.set(phone, i);
      }
      if (tg) {
        if (tgMap.has(tg)) dsu.union(i, tgMap.get(tg)!);
        else tgMap.set(tg, i);
      }
      if (email) {
        if (emailMap.has(email)) dsu.union(i, emailMap.get(email)!);
        else emailMap.set(email, i);
      }
      if (uuid) {
        if (uuidMap.has(uuid)) dsu.union(i, uuidMap.get(uuid)!);
        else uuidMap.set(uuid, i);
      }
    });

    const groups = new Map<number, number[]>();
    for (let i = 0; i < size; i++) {
      const root = dsu.find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(i);
    }

    const normalizeStatus = (lead: any): string => {
      const s = lead.status;
      if (!s) return "Новий лід";
      const normalized = statusMapper.normalize(s);

      const originalSheet = String(lead.metadata?.original_sheet || lead.metadata?.lead?.original_sheet || "").trim();
      const targetSheet = String(lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || "").trim();
      const courseName = String(lead.metadata?.leadData?.course || lead.metadata?.lead?.leadData?.course || "").trim();
      const orderProj = allowedProjects.find((p: any) => p.id === lead.project_id);
      const orderSlug = orderProj?.slug || "";

      const isTripwire =
        ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
        ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
        courseName.includes("Mini-Course") ||
        courseName.includes("Practicum") ||
        courseName.includes("Практикум") ||
        courseName.includes("Міні-курс") ||
        orderSlug === "sofia" ||
        orderSlug === "valeria" ||
        activeProject?.slug === "sofia" ||
        activeProject?.slug === "valeria";

      const isProjectAlwaysTripwire =
        ["sofia", "valeria"].includes(orderSlug) ||
        ["sofia", "valeria"].includes(activeProject?.slug || "");

      if (normalized === "closed_won") {
        return (isTripwire || isProjectAlwaysTripwire) ? "Купив(-ла) Трипвайер" : "Купив курс";
      }
      if (normalized === "declined") {
        return "Відмова";
      }
      const lower = s.toLowerCase().trim();
      if (
        lower === "new" ||
        lower === "pending" ||
        lower === "зареєстровано" ||
        lower.includes("очікується") ||
        lower === "новий лід" ||
        lower === "новий" ||
        lower === "передано у вп" ||
        lower === "очікує оплати"
      ) {
        return "Новий лід";
      }
      if (lower === "діагностика" || lower === "диагностика" || lower === "заявка") {
        return "Залишив заявку";
      }
      if (lower === "в роботі" || lower === "списались") {
        return "Списались";
      }
      if (lower === "зустріч призначена" || lower === "назначено дзвінок" || lower === "діагн. запланована") {
        return "Назначено Дзвінок";
      }
      if (lower === "зустріч проведена" || lower === "дзвінок проведено" || lower === "діагн. проведена") {
        return "Дзвінок проведено";
      }
      if (lower === "вирішив подумати" || lower.includes("подумати")) {
        return "Вирішив подумати";
      }
      if (lower === "купив трипвайєр" || lower === "купив трипвайер" || lower === "купив(-ла) трипвайер") {
        return "Купив(-ла) Трипвайер";
      }
      if (lower === "купив курс" || lower === "купив_курс") {
        return isProjectAlwaysTripwire ? "Купив(-ла) Трипвайер" : "Купив курс";
      }
      if (lower === "зацікавлений лід" || lower === "зацікавлений") {
        return "Зацікавлений лід";
      }
      return "Новий лід";
    };

    const allClustered = Array.from(groups.values()).map((indices) => {
      const groupLeads = indices.map((idx) => formattedLeads[idx]);

      const normalizedGroupLeads = groupLeads.map((item) => {
        return {
          ...item,
          status: normalizeStatus(item)
        };
      });

      const primaryLead = normalizedGroupLeads.reduce((best, curr) => {
        const bestScore = (best.name?.length || 0) + (best.phone ? 5 : 0) + (best.telegram ? 5 : 0);
        const currScore = (curr.name?.length || 0) + (curr.phone ? 5 : 0) + (curr.telegram ? 5 : 0);
        return currScore > bestScore ? curr : best;
      }, normalizedGroupLeads[0]);

      let usdCoursePaid = 0;
      let uahCoursePaid = 0;
      let eurCoursePaid = 0;
      let usdTripwirePaid = 0;
      let uahTripwirePaid = 0;
      let eurTripwirePaid = 0;
      let usdAttempted = 0;
      let uahAttempted = 0;
      let eurAttempted = 0;

      const uniqueOrders = new Map<string, any>();
      normalizedGroupLeads.forEach((item) => {
        const orderId = item.order_id || item.id;
        const projectId = item.project_id;
        const orderKey = `${orderId}_${projectId}`;

        const existing = uniqueOrders.get(orderKey);
        if (!existing) {
          uniqueOrders.set(orderKey, item);
        } else {
          const existingIsPaid = existing.status === "Купив курс" || existing.status === "Купив(-ла) Трипвайер";
          const itemIsPaid = item.status === "Купив курс" || item.status === "Купив(-ла) Трипвайер";

          if (itemIsPaid && !existingIsPaid) {
            uniqueOrders.set(orderKey, item);
          } else if (!itemIsPaid && existingIsPaid) {
            // Keep existing
          } else {
            const existingTime = new Date(existing.created_at || 0).getTime();
            const itemTime = new Date(item.created_at || 0).getTime();
            if (itemTime > existingTime) {
              uniqueOrders.set(orderKey, item);
            } else if (itemTime === existingTime) {
              if (Number(item.amount || 0) > Number(existing.amount || 0)) {
                uniqueOrders.set(orderKey, item);
              }
            }
          }
        }
      });

      let usdCourseCount = 0;
      let uahCourseCount = 0;
      let eurCourseCount = 0;
      let usdTripwireCount = 0;
      let uahTripwireCount = 0;
      let eurTripwireCount = 0;

      uniqueOrders.forEach((item) => {
        const amt = Number(item.amount || 0);
        if (amt === 0) return;

        const metaCurrency = String(
          item.metadata?.currency ||
          item.metadata?.lead?.currency ||
          item.metadata?.raw_row?.currency ||
          item.metadata?.raw_row?.raw_payload?.currency ||
          ""
        ).trim().toLowerCase();
        const orderProj = allowedProjects.find((p: any) => p.id === item.project_id);
        const orderSlug = orderProj?.slug || "";

        const isEur = ["eur", "€"].includes(metaCurrency);
        const isUsd = ["usd", "$"].includes(metaCurrency);
        const isUah = ["uah", "₴"].includes(metaCurrency);

        const isProjectAlwaysTripwire =
          ["sofia", "valeria"].includes(orderSlug) ||
          ["sofia", "valeria"].includes(activeProject?.slug || "");

        if (item.status === "Купив курс" && !isProjectAlwaysTripwire) {
          if (isUsd) { usdCoursePaid += amt; usdCourseCount++; }
          else if (isEur) { eurCoursePaid += amt; eurCourseCount++; }
          else if (isUah) { uahCoursePaid += amt; uahCourseCount++; }
        } else if (item.status === "Купив(-ла) Трипвайер" || (item.status === "Купив курс" && isProjectAlwaysTripwire)) {
          if (isUsd) { usdTripwirePaid += amt; usdTripwireCount++; }
          else if (isEur) { eurTripwirePaid += amt; eurTripwireCount++; }
          else if (isUah) { uahTripwirePaid += amt; uahTripwireCount++; }
        } else {
          if (isUsd) usdAttempted += amt;
          else if (isEur) eurAttempted += amt;
          else if (isUah) uahAttempted += amt;
        }
      });

      const primaryStatus = normalizedGroupLeads.reduce((best, curr) => {
        return statusPriority(curr.status) > statusPriority(best) ? curr.status : best;
      }, "Новий лід");

      let finalStatus = primaryStatus;
      if (normalizedGroupLeads.length >= 2 && statusPriority(finalStatus) <= statusPriority("Зацікавлений лід")) {
        finalStatus = "Зацікавлений лід";
      }

      const isMultiSource = new Set(normalizedGroupLeads.map((l) => getTouchUtm(l, "source")).filter(Boolean)).size > 1;

      const actualOrdersDesc = normalizedGroupLeads
        .filter((l) => l.status !== "Клик" && l.status !== "КликФормы")
        .sort((a, b) => getLeadDate(b).getTime() - getLeadDate(a).getTime());

      const coldClicksDesc = normalizedGroupLeads
        .filter((l) => l.status === "Клик" || l.status === "КликФормы")
        .sort((a, b) => getLeadDate(b).getTime() - getLeadDate(a).getTime());

      const prioritizedTouches = [...actualOrdersDesc, ...coldClicksDesc];

      const utm_source = prioritizedTouches.map((l) => getTouchUtm(l, "source")).find(Boolean) || "";
      const utm_medium = prioritizedTouches.map((l) => getTouchUtm(l, "medium")).find(Boolean) || "";
      const utm_campaign = prioritizedTouches.map((l) => getTouchUtm(l, "campaign")).find(Boolean) || "";
      const utm_content = prioritizedTouches.map((l) => getTouchUtm(l, "content")).find(Boolean) || "";
      const utm_term = prioritizedTouches.map((l) => getTouchUtm(l, "term")).find(Boolean) || "";

      const page_path = normalizedGroupLeads.find((l) => l.page_path && l.page_path !== "/")?.page_path || primaryLead.page_path || "/";
      const page_url = prioritizedTouches.map(getTouchPageUrl).find((url) => url !== "") || getTouchPageUrl(primaryLead);

      return {
        ...primaryLead,
        name: primaryLead.name || "Невідомий",
        phone: primaryLead.phone || "",
        telegram: primaryLead.telegram || "",
        email: primaryLead.email || "",
        page_path,
        page_url,
        status: finalStatus,
        usdPaid: usdCoursePaid,
        uahPaid: uahCoursePaid,
        eurPaid: eurCoursePaid,
        usdTripwirePaid,
        uahTripwirePaid,
        eurTripwirePaid,
        usdAttempted,
        uahAttempted,
        eurAttempted,
        amount: usdCoursePaid,
        uahAmount: uahCoursePaid,
        eurAmount: eurCoursePaid,
        attemptedAmount: usdAttempted,
        uahAttemptedAmount: uahAttempted,
        eurAttemptedAmount: eurAttempted,
        usdCourseCount,
        uahCourseCount,
        eurCourseCount,
        usdTripwireCount,
        uahTripwireCount,
        eurTripwireCount,
        utm_source: utm_source || getTouchUtm(primaryLead, "source"),
        utm_medium: utm_medium || getTouchUtm(primaryLead, "medium"),
        utm_campaign: utm_campaign || getTouchUtm(primaryLead, "campaign"),
        utm_content: utm_content || getTouchUtm(primaryLead, "content"),
        utm_term: utm_term || getTouchUtm(primaryLead, "term"),
        history: [...normalizedGroupLeads].sort((a, b) => getLeadDate(a).getTime() - getLeadDate(b).getTime()),
        isMultiSource,
        touchCount: normalizedGroupLeads.length,
        diagnosticsComment: getDiagnosticsComment(normalizedGroupLeads),
        managerComment: primaryLead.managerComment || "",
      };
    });
    const jsClusteringEnd = performance.now();
    const jsClusteringMs = jsClusteringEnd - jsClusteringStart;

    const clusteredFiltered = allClustered.filter((lead: any) => {
      const nameVal = lead.name?.trim();
      const hasRealName = nameVal && nameVal !== "" && nameVal !== "Невідомий";
      const hasPhone = !!lead.phone?.trim();
      const hasTelegram = !!lead.telegram?.trim();
      const hasEmail = !!lead.email?.trim();
      const hasContacts = hasRealName || hasPhone || hasTelegram || hasEmail;
      const isPaid = lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер";
      return hasContacts || isPaid;
    });

    // --- Apply CRM Filters on server ---
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const searchQuery = filters?.searchQuery || "";
    const statusFilter = filters?.statusFilter || "all";
    const touchCountFilter = filters?.touchCountFilter || "all";
    const sourceFilter = filters?.sourceFilter || "all";
    const unpaidIntentOnly = filters?.unpaidIntentOnly || false;
    const startDate = filters?.startDate || "";
    const endDate = filters?.endDate || "";
    const selectedLanding = filters?.selectedLanding || "all";

    const filteredLeads = clusteredFiltered.filter((lead: any) => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchSearch =
          lead.name?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.telegram?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query);
        if (!matchSearch) return false;
      }

      // 2. Status
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;

      // 3. Touch Count
      if (touchCountFilter !== "all") {
        if (touchCountFilter === "multi") {
          if (lead.touchCount < 2) return false;
        } else if (touchCountFilter === "single") {
          if (lead.touchCount !== 1) return false;
        }
      }

      // 4. Source
      if (sourceFilter !== "all") {
        const source = lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || lead.utm_source || "";
        if (source.toLowerCase() !== sourceFilter.toLowerCase()) return false;
      }

      // 5. Unpaid intent
      if (unpaidIntentOnly) {
        const hasPayment = lead.history.some((o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0);
        const hasCheckout = lead.history.some(
          (o: any) => o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_")) || o.metadata?.payment_intent
        );
        if (hasPayment || !hasCheckout) return false;
      }

      // 6. Dates
      if (startDate) {
        const leadDate = getLeadDate(lead);
        if (leadDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const leadDate = getLeadDate(lead);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) return false;
      }

      // 7. Landing
      if (!isLeadMatchingLanding(lead, selectedLanding, activeSlug)) return false;

      return true;
    });

    // --- Statistics Calculations on server ---
    const totalLeads = filteredLeads.length;

    // Filter costs
    const filteredCosts = costs.filter((c: any) => {
      if (startDate) {
        const cDate = new Date(c.date);
        if (cDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const cDate = new Date(c.date);
        const end = new Date(endDate);
        if (cDate > end) return false;
      }
      return true;
    });
    const totalCostsSpend = filteredCosts.reduce((sum: number, c: any) => sum + Number(c.spend || 0), 0);

    const totalApplications = filteredLeads.filter((l: any) =>
      statusPriority(l.status) >= 3 ||
      l.history.some((h: any) => statusPriority(h.status) >= 3)
    ).length;

    const usdCourseRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.usdPaid || 0), 0);
    const uahCourseRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.uahPaid || 0), 0);
    const eurCourseRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.eurPaid || 0), 0);
    const usdTripwireRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.usdTripwirePaid || 0), 0);
    const uahTripwireRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.uahTripwirePaid || 0), 0);
    const eurTripwireRevenue = filteredLeads.reduce((sum, l) => sum + Number(l.eurTripwirePaid || 0), 0);

    const totalUsdRevenue = usdCourseRevenue + usdTripwireRevenue;
    const totalUahRevenue = uahCourseRevenue + uahTripwireRevenue;
    const totalEurRevenue = eurCourseRevenue + eurTripwireRevenue;

    const netProfitUsd = totalUsdRevenue - totalCostsSpend;
    const blendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
    const roi = totalCostsSpend > 0 ? (blendedRevenue / totalCostsSpend) * 100 : 0;

    const paidLeadsCount = filteredLeads.reduce((sum, l) => sum + (l.usdCourseCount || 0) + (l.uahCourseCount || 0) + (l.eurCourseCount || 0), 0);
    const paidTripwiresCount = filteredLeads.reduce((sum, l) => sum + (l.usdTripwireCount || 0) + (l.uahTripwireCount || 0) + (l.eurTripwireCount || 0), 0);
    const totalSales = paidLeadsCount + paidTripwiresCount;

    const usdSalesCount = filteredLeads.reduce((sum, l) => sum + (l.usdCourseCount || 0) + (l.usdTripwireCount || 0), 0);
    const uahSalesCount = filteredLeads.reduce((sum, l) => sum + (l.uahCourseCount || 0) + (l.uahTripwireCount || 0), 0);
    const eurSalesCount = filteredLeads.reduce((sum, l) => sum + (l.eurCourseCount || 0) + (l.eurTripwireCount || 0), 0);

    const aovUsd = usdSalesCount > 0 ? (usdCourseRevenue + usdTripwireRevenue) / usdSalesCount : 0;
    const aovUah = uahSalesCount > 0 ? (uahCourseRevenue + uahTripwireRevenue) / uahSalesCount : 0;
    const aovEur = eurSalesCount > 0 ? (eurCourseRevenue + eurTripwireRevenue) / eurSalesCount : 0;

    // Filter traffic
    const filteredTraffic = allTraffic.filter((t: any) => {
      if (startDate) {
        const tDate = new Date(t.created_at);
        if (tDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const tDate = new Date(t.created_at);
        const end = new Date(endDate);
        if (tDate > end) return false;
      }
      return true;
    });
    const totalClicks = filteredTraffic.length;
    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    const cpl = totalLeads > 0 ? totalCostsSpend / totalLeads : 0;
    const leadToSaleConv = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;

    const singleProjectStats = {
      totalLeads,
      totalClicks,
      totalSpend: totalCostsSpend,
      totalApplications,
      conversionRate,
      cpl,
      usdRevenue: totalUsdRevenue,
      uahRevenue: totalUahRevenue,
      eurRevenue: totalEurRevenue,
      usdCourseRevenue,
      uahCourseRevenue,
      eurCourseRevenue,
      usdTripwireRevenue,
      uahTripwireRevenue,
      eurTripwireRevenue,
      netProfitUsd,
      roi,
      totalSales,
      paidLeadsCount,
      paidTripwiresCount,
      leadToSaleConv,
      leadToSaleConvUsd: totalLeads > 0 ? (usdSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvUah: totalLeads > 0 ? (uahSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvEur: totalLeads > 0 ? (eurSalesCount / totalLeads) * 100 : 0,
      aovUsd,
      aovUah,
      aovEur
    };

    // --- Pre-aggregated Spline Trend Data via RPC ---
    let splineTrendData = [];
    let dbRpcMs = 0;
    if (!filters?.skipTraffic) {
      const startRpcDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endRpcDate = endDate ? new Date(endDate) : new Date();
      const dbRpcStart = performance.now();
      const { data } = await adminSupabase.rpc("get_project_daily_stats", {
        p_project_id: activeProject.id,
        p_start_date: startRpcDate.toISOString(),
        p_end_date: endRpcDate.toISOString()
      });
      splineTrendData = (data || []).map((row: any) => ({
        name: row.date_str,
        leads: Number(row.leads_count || 0),
        clicks: Number(row.clicks_count || 0)
      }));
      const dbRpcEnd = performance.now();
      dbRpcMs = dbRpcEnd - dbRpcStart;
    }

    // --- UTM Attribution Tree on server ---
    const utmTreeRoot: Record<string, any> = {};
    const getOrCreateUtmNode = (parent: any, name: string) => {
      if (!parent[name]) {
        parent[name] = {
          name,
          clicks: 0,
          leads: 0,
          usd_revenue: 0,
          uah_revenue: 0,
          revenue: 0,
          children: {}
        };
      }
      return parent[name];
    };

    filteredLeads.forEach((lead: any) => {
      const source = lead.utm_source || "direct";
      const medium = lead.utm_medium || "";
      const campaign = lead.utm_campaign || "";
      const content = lead.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      let curr = utmTreeRoot;
      path.forEach((part) => {
        const node = getOrCreateUtmNode(curr, part);
        node.leads += 1;
        const usdPaid = Number(lead.usdPaid || 0);
        const uahPaid = Number(lead.uahPaid || 0);
        node.usd_revenue += usdPaid;
        node.uah_revenue += uahPaid;
        node.revenue += usdPaid + (uahPaid / 41.0);
        curr = node.children;
      });
    });

    filteredTraffic.forEach((t: any) => {
      const source = t.utm_source || "direct";
      const medium = t.utm_medium || "";
      const campaign = t.utm_campaign || "";
      const content = t.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      let curr = utmTreeRoot;
      let possible = true;
      path.forEach((part) => {
        if (!possible) return;
        if (curr[part]) {
          curr[part].clicks += 1;
          curr = curr[part].children;
        } else {
          possible = false;
        }
      });
    });

    const finalizeUtmNodes = (nodesRecord: Record<string, any>): any[] => {
      return Object.values(nodesRecord)
        .map((node: any) => {
          const cr = node.clicks > 0 ? (node.leads / node.clicks) * 100 : 0;
          return {
            ...node,
            cr,
            children: finalizeUtmNodes(node.children)
          };
        })
        .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
    };
    const utmAttributionTree = finalizeUtmNodes(utmTreeRoot);

    // --- Diagnostics Issues on server ---
    const nameless: any[] = [];
    const unmatchedUrls: Record<string, { count: number; rawUrl: string; originalSheet: string; sampleLead: string }> = {};
    const currencyErrors: any[] = [];

    clusteredFiltered.forEach((lead: any) => {
      const nameVal = lead.name?.trim();
      const hasContacts = lead.phone || lead.telegram || lead.email;
      if ((!nameVal || nameVal === "Невідомий") && hasContacts) {
        nameless.push(lead);
      }

      lead.history?.forEach((touch: any) => {
        const url = getTouchPageUrl(touch);
        if (url) {
          const matched = PROJECT_LANDINGS[activeSlug]?.some((land) => {
            const normLand = land.url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
            const normTouch = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
            return normTouch.includes(normLand);
          });
          if (!matched) {
            const cleanUrl = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").trim();
            if (!unmatchedUrls[cleanUrl]) {
              unmatchedUrls[cleanUrl] = {
                count: 0,
                rawUrl: url,
                originalSheet: touch.metadata?.original_sheet || touch.metadata?.target_sheet || "direct",
                sampleLead: lead.name
              };
            }
            unmatchedUrls[cleanUrl].count++;
          }
        }

        const amt = Number(touch.amount || 0);
        if (amt > 0) {
          const metaCurrency = String(
            touch.metadata?.currency ||
            touch.metadata?.lead?.currency ||
            touch.metadata?.raw_row?.currency ||
            ""
          ).trim().toLowerCase();
          if (!["usd", "$", "uah", "₴", "eur", "€"].includes(metaCurrency)) {
            currencyErrors.push({
              leadId: lead.id,
              leadName: lead.name,
              amount: amt,
              currency: metaCurrency || "missing",
              date: getLeadDate(touch)
            });
          }
        }
      });
    });

    const diagnosticsIssues = {
      nameless,
      unmatchedUrls: Object.values(unmatchedUrls).sort((a, b) => b.count - a.count),
      currencyErrors
    };

    // --- Page Slice (Pagination) ---
    const startIndex = (page - 1) * pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

    // List of unique sources for filter dropdown
    const uniqueSources = Array.from(new Set(clusteredFiltered.map((l: any) => {
      return l.metadata?.target_sheet || l.metadata?.lead?.target_sheet || l.utm_source || "";
    }).filter(Boolean)));

    // Fetch sales managers for the active project
    let salesManagers: { id: string; email: string; full_name: string }[] = [];
    if (activeProject && ["admin", "superman", "producer", "rop"].includes(profile.role)) {
      const { data: assignedSales } = await adminSupabase
        .from("profile_projects")
        .select("profile_id, profiles(id, email, role, full_name)")
        .eq("project_id", activeProject.id);

      salesManagers = (assignedSales || [])
        .map((item: any) => item.profiles)
        .filter((p: any) => p && p.role === "sales")
        .map((p: any) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name || p.email
        }));
    }

    // Prepare dataHealth Check stats
    const checkLeadDateParseable = (lead: any): boolean => {
      const rawDateStr =
        lead.metadata?.raw_row?.Дата ||
        lead.metadata?.raw_row?.дата ||
        lead.metadata?.raw_row?.Date ||
        lead.metadata?.raw_row?.date ||
        lead.metadata?.created_at ||
        lead.metadata?.lead?.created_at;

      if (!rawDateStr) return true;

      const str = String(rawDateStr).trim();
      const dotParts = str.split(" ")[0].split(".");
      if (dotParts.length === 3) {
        const day = parseInt(dotParts[0], 10);
        const month = parseInt(dotParts[1], 10) - 1;
        const year = parseInt(dotParts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return true;
        }
      }
      let cleanStr = str;
      if (str.includes("(")) {
        cleanStr = str.split("(")[0].trim();
      }
      const parsed = Date.parse(cleanStr);
      return !isNaN(parsed);
    };

    let leadsWithoutUuidCount = 0;
    let ordersWithAmountAndClickStatusCount = 0;
    let unparseableMetadataDatesCount = 0;

    allOrders.forEach((o: any) => {
      const statusStr = String(o.status || "").toLowerCase().trim();
      if (statusStr !== "клик" && statusStr !== "кликформы") {
        if (!o.visitor_uuid) {
          leadsWithoutUuidCount++;
        }
      }

      if ((statusStr === "клик" || statusStr === "кликформы") && Number(o.amount || 0) > 0) {
        ordersWithAmountAndClickStatusCount++;
      }

      const hasMetadataDate =
        o.metadata?.raw_row?.Дата ||
        o.metadata?.raw_row?.дата ||
        o.metadata?.raw_row?.Date ||
        o.metadata?.raw_row?.date ||
        o.metadata?.created_at ||
        o.metadata?.lead?.created_at;

      if (hasMetadataDate && !checkLeadDateParseable(o)) {
        unparseableMetadataDatesCount++;
      }
    });

    const dataHealth = {
      leadsWithoutUuidCount,
      ordersWithAmountAndClickStatusCount,
      unparseableMetadataDatesCount
    };

    const finalResult = {
      viewType: "single",
      role: profile.role,
      allowedProjects,
      activeSlug,
      activeProject,
      leads: paginatedLeads,
      totalCount: filteredLeads.length,
      stats: singleProjectStats,
      splineTrendData: splineTrendData || [],
      utmAttributionTree,
      diagnosticsIssues,
      uniqueSources,
      salesManagers,
      unresolvedOrders: unresolvedOrders.filter((o) => o.projectId === activeProject.id),
      filters: {
        page,
        pageSize,
        searchQuery,
        statusFilter,
        touchCountFilter,
        sourceFilter,
        unpaidIntentOnly,
        startDate,
        endDate,
        selectedLanding
      },
      dataHealth
    };

    // Calculate JSON weight in KB
    const stringified = JSON.stringify(finalResult);
    const payloadSizeKb = Math.round((stringified.length / 1024) * 10) / 10;

    const totalDuration = dbFetchMs + dbRpcMs + jsClusteringMs;
    devLogger.perf("getUnifiedCRMData", `Loaded CRM Data for slug: ${activeSlug}`, totalDuration, {
      activeSlug,
      dbFetchMs,
      dbRpcMs,
      jsClusteringMs,
      payloadSizeKb,
      unresolvedOrdersCount: unresolvedOrders.length,
      leadsCount: finalResult.leads.length,
      skipTraffic: !!filters?.skipTraffic
    });

    return {
      ...finalResult,
      performance: {
        dbFetchMs: Math.round(dbFetchMs),
        dbRpcMs: Math.round(dbRpcMs),
        jsClusteringMs: Math.round(jsClusteringMs),
        payloadSizeKb
      }
    };
  } catch (err: any) {
    devLogger.error("getUnifiedCRMData", `Failed to load CRM data: ${err.message}`, { error: err });
    console.error("Unified CRM fetching error:", err.message);
    throw err;
  }
}

// Server action to update a unified lead's status/stage
export async function updateUnifiedLeadStatusAction(orderId: string, newStatus: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch order first to check project_id for access validation
    const { data: order } = await adminSupabase
      .from("unified_orders")
      .select("project_id")
      .eq("id", orderId)
      .single();
    if (!order) throw new Error("Order not found");
    await checkProjectAccess(order.project_id);

    const { error } = await adminSupabase
      .from("unified_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update lead status" };
  }
}

// Server action to manually create a new lead in unified system
export async function createUnifiedLeadAction(
  projectId: string,
  leadData: {
    name: string;
    phone: string;
    email?: string;
    telegram?: string;
    amount?: number;
    status: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Enforce access control
    await checkProjectAccess(projectId);

    // 1. Resolve or create customer inside unified_customers
    // First query if there is a match inside the same project
    let customerId = "";
    const cleanPhone = leadData.phone.replace(/\D/g, "");

    const { data: existingCust } = await adminSupabase
      .from("unified_customers")
      .select("id")
      .eq("project_id", projectId)
      .eq("phone", cleanPhone)
      .limit(1);

    if (existingCust && existingCust.length > 0) {
      customerId = existingCust[0].id;
    } else {
      // Create new customer profile
      const { data: newCust, error: custErr } = await adminSupabase
        .from("unified_customers")
        .insert({
          project_id: projectId,
          name: leadData.name,
          phone: cleanPhone || null,
          email: leadData.email || null,
          telegram: leadData.telegram || null,
        })
        .select()
        .single();

      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    // 2. Insert the lead transaction into unified_orders
    const { data: order, error: orderErr } = await adminSupabase
      .from("unified_orders")
      .insert({
        customer_id: customerId,
        project_id: projectId,
        amount: leadData.amount || 0.0,
        status: leadData.status || "Зареєстровано",
        utm_source: leadData.utm_source || "manual",
        utm_medium: leadData.utm_medium || "crm",
        utm_campaign: leadData.utm_campaign || "manual_insertion",
        metadata: {
          created_by: user.email,
          manual: true,
        },
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    return { success: true, orderId: order.id };
  } catch (err: any) {
    return { error: err.message || "Failed to create lead" };
  }
}

export async function getDashboardData() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch privilege details using admin client
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    throw new Error("Unauthorized");
  }

  // Verify access to bw_main project
  const { data: bwMainProj } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("slug", "bw_main")
    .single();

  if (!bwMainProj) {
    throw new Error("Project bw_main not found");
  }
  await checkProjectAccess(bwMainProj.id);

  // 3. Fetch all leads, page views, and button clicks in parallel
  const [leadsRes, pageViewsRes, clicksRes] = await Promise.all([
    adminSupabase.from("leads").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("page_views").select("visitor_id"),
    adminSupabase.from("button_clicks").select("button_id"),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (pageViewsRes.error) throw pageViewsRes.error;
  if (clicksRes.error) throw clicksRes.error;

  return {
    leads: leadsRes.data || [],
    pageViews: pageViewsRes.data || [],
    clicks: clicksRes.data || [],
  };
}

export async function updateLeadStatus(
  leadId: string,
  newDbStatus: "new" | "in_progress" | "completed" | "rejected",
  newButtonId: string
) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch privilege details
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    throw new Error("Unauthorized");
  }

  // Verify access to bw_main project
  const { data: bwMainProj } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("slug", "bw_main")
    .single();

  if (!bwMainProj) {
    throw new Error("Project bw_main not found");
  }
  await checkProjectAccess(bwMainProj.id);

  // 3. Perform database update
  const { data, error } = await adminSupabase
    .from("leads")
    .update({
      status: newDbStatus,
      button_id: newButtonId,
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, lead: data };
}

// Server action to update customer manager comments
export async function updateCustomerCommentAction(customerId: string, comment: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch the existing customer comment and project_id for access validation
    const { data: customer, error: fetchError } = await adminSupabase
      .from("unified_customers")
      .select("project_id, manager_comment")
      .eq("id", customerId)
      .single();

    if (fetchError) throw fetchError;
    await checkProjectAccess(customer.project_id);

    const rawComment = customer?.manager_comment;
    let comments: any[] = [];

    if (rawComment) {
      try {
        const parsed = JSON.parse(rawComment);
        if (Array.isArray(parsed)) {
          comments = parsed;
        } else {
          throw new Error("Not an array");
        }
      } catch (e) {
        // Treat as legacy plain text comment
        comments = [{
          id: "legacy",
          text: rawComment,
          authorEmail: "system",
          authorName: "Попередній коментар",
          createdAt: new Date().toISOString()
        }];
      }
    }

    // Fetch the current user's profile for author details
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Construct the new comment object
    const newComment = {
      id: Math.random().toString(36).substring(2, 9),
      text: comment.trim(),
      authorEmail: profile?.email || user.email || "unknown",
      authorName: profile?.full_name || profile?.email || user.email || "Менеджер",
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);

    // Limit to 100 comments
    if (comments.length > 100) {
      comments = comments.slice(-100);
    }

    const updatedCommentStr = JSON.stringify(comments);

    const { error: updateError } = await adminSupabase
      .from("unified_customers")
      .update({ manager_comment: updatedCommentStr })
      .eq("id", customerId);

    if (updateError) throw updateError;

    return { success: true, managerComment: updatedCommentStr };
  } catch (err: any) {
    return { error: err.message || "Failed to update comment" };
  }
}

// Server action to assign a lead/customer to a sales manager
export async function assignLeadToManagerAction(customerId: string, managerId: string | null) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch customer to check project_id for access validation
    const { data: customer } = await adminSupabase
      .from("unified_customers")
      .select("project_id")
      .eq("id", customerId)
      .single();
    if (!customer) throw new Error("Customer not found");
    await checkProjectAccess(customer.project_id);

    // Verify target manager assignment access to project if target is not a Superman
    if (managerId) {
      const { data: managerProfile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", managerId)
        .single();

      const isSuperman = managerProfile?.role === "admin" || managerProfile?.role === "superman";

      if (!isSuperman) {
        const { data: hasAccess } = await adminSupabase
          .from("profile_projects")
          .select("project_id")
          .eq("profile_id", managerId)
          .eq("project_id", customer.project_id)
          .maybeSingle();

        if (!hasAccess) {
          throw new Error("Target manager does not have access to this project.");
        }
      }
    }

    const { error } = await adminSupabase
      .from("unified_customers")
      .update({ assigned_manager_id: managerId ? managerId : null })
      .eq("id", customerId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to assign manager" };
  }
}

// Submit error report or improvement suggestion
export async function submitCrmFeedbackAction(type: "error" | "improvement", message: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Неавторизовано.");

    const { error } = await supabase
      .from("crm_feedback")
      .insert({
        user_id: user.id,
        user_email: user.email,
        type,
        message,
      });

    if (error) throw error;
    return { success: true, message: "Дякуємо! Ваш запит успішно надіслано." };
  } catch (err: any) {
    return { error: err.message || "Не вдалося надіслати запит." };
  }
}

// Retrieve feedback items (Only for yura3zaxar@gmail.com and yura3zaxar@outlook.com)
export async function getCrmFeedbackList() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (user.email !== "yura3zaxar@gmail.com" && user.email !== "yura3zaxar@outlook.com")) {
      throw new Error("403 Доступ заборонено.");
    }

    const { data, error } = await supabase
      .from("crm_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.error("Failed to load crm feedback:", err);
    return [];
  }
}

// Update feedback item status (Only for yura3zaxar@gmail.com and yura3zaxar@outlook.com)
export async function updateFeedbackStatusAction(feedbackId: string, status: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (user.email !== "yura3zaxar@gmail.com" && user.email !== "yura3zaxar@outlook.com")) {
      throw new Error("403 Доступ заборонено.");
    }

    const { error } = await supabase
      .from("crm_feedback")
      .update({ status })
      .eq("id", feedbackId);

    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update status." };
  }
}

// Server action to update currency of a transaction
export async function updateOrderCurrencyAction(
  orderId: string,
  currency: "usd" | "uah" | "eur",
  bulk?: { landingName: string; amount: number }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch existing order metadata and project_id for access verification
    const { data: order, error: fetchError } = await adminSupabase
      .from("unified_orders")
      .select("project_id, metadata")
      .eq("id", orderId)
      .single();

    if (fetchError) throw fetchError;
    await checkProjectAccess(order.project_id);

    const newMetadata = {
      ...(order?.metadata || {}),
      currency: currency,
    };

    const { error: updateError } = await adminSupabase
      .from("unified_orders")
      .update({ metadata: newMetadata })
      .eq("id", orderId);

    if (updateError) throw updateError;

    if (bulk && bulk.landingName) {
      const { data: matchingOrders } = await adminSupabase
        .from("unified_orders")
        .select("id, project_id, metadata")
        .eq("amount", bulk.amount)
        .not("status", "in", "('Клик', 'КликФормы')");

      if (matchingOrders && matchingOrders.length > 0) {
        const toUpdate = matchingOrders.filter((o: any) => {
          const lName = o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "";
          return lName === bulk.landingName;
        });

        for (const orderToUpdate of toUpdate) {
          try {
            await checkProjectAccess(orderToUpdate.project_id);
            const updatedMeta = {
              ...(orderToUpdate.metadata || {}),
              currency: currency,
            };
            await adminSupabase
              .from("unified_orders")
              .update({ metadata: updatedMeta })
              .eq("id", orderToUpdate.id);
          } catch (accessErr) {
            console.warn(`Bulk currency update skipped for order ${orderToUpdate.id} due to project access restriction`);
          }
        }
      }
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update order currency." };
  }
}

// Server action to override current role for debugging
export async function impersonateRoleAction(role: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
    const isActualDev = devEmails.includes(user.email?.toLowerCase() || "");

    let hasAccess = isActualDev;

    if (!hasAccess) {
      const adminSupabase = createAdminClient();
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin" || profile?.role === "superman") {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new Error("403 Forbidden");
    }

    const cookieStore = await cookies();
    if (!role) {
      cookieStore.delete("crm_impersonated_role");
    } else {
      cookieStore.set("crm_impersonated_role", role, { maxAge: 60 * 60 * 24 });
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to override role" };
  }
}

export async function traceVisitorUuidAction(phoneOrUuid: string, projectId: string) {
  try {
    const { isSuperman } = await getSessionAndAccess();
    if (!isSuperman) throw new Error("Unauthorized");

    const adminSupabase = createAdminClient();
    const cleanInput = phoneOrUuid.trim();
    if (!cleanInput) return { chain: [] };

    let visitorUuids: string[] = [];
    let phoneMatch = "";

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanInput)) {
      visitorUuids.push(cleanInput);
    } else {
      const digits = cleanInput.replace(/\D/g, "");
      if (digits.length >= 7) {
        phoneMatch = digits;
        const { data: orders } = await adminSupabase
          .from("unified_orders")
          .select("visitor_uuid, customer_id")
          .eq("project_id", projectId);

        const { data: customers } = await adminSupabase
          .from("unified_customers")
          .select("id, phone")
          .eq("project_id", projectId);

        const matchedCustomerIds = customers
          ?.filter(c => c.phone && c.phone.replace(/\D/g, "").includes(digits))
          .map(c => c.id) || [];

        if (orders) {
          orders.forEach(o => {
            if (o.visitor_uuid && (matchedCustomerIds.includes(o.customer_id))) {
              visitorUuids.push(o.visitor_uuid);
            }
          });
        }
      }
    }

    visitorUuids = Array.from(new Set(visitorUuids)).filter(Boolean);

    let clicks: any[] = [];
    let orders: any[] = [];

    if (visitorUuids.length > 0) {
      const [clicksRes, ordersRes] = await Promise.all([
        adminSupabase
          .from("traffic_clicks")
          .select("*")
          .eq("project_id", projectId)
          .in("visitor_uuid", visitorUuids),
        adminSupabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", projectId)
          .in("visitor_uuid", visitorUuids)
      ]);
      clicks = clicksRes.data || [];
      orders = ordersRes.data || [];
    }

    if (phoneMatch) {
      const { data: customerData } = await adminSupabase
        .from("unified_customers")
        .select("id, phone")
        .eq("project_id", projectId);

      const matchedCustomerIds = customerData
        ?.filter(c => c.phone && c.phone.replace(/\D/g, "").includes(phoneMatch))
        .map(c => c.id) || [];

      if (matchedCustomerIds.length > 0) {
        const { data: phoneOrders } = await adminSupabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", projectId)
          .in("customer_id", matchedCustomerIds);

        if (phoneOrders) {
          phoneOrders.forEach(o => {
            if (!orders.some(existing => existing.id === o.id)) {
              orders.push(o);
            }
          });
        }
      }
    }

    const chain: any[] = [];

    clicks.forEach(c => {
      chain.push({
        type: "click",
        id: c.id,
        created_at: c.created_at,
        status: c.status,
        utm_source: c.utm_source,
        utm_medium: c.utm_medium,
        utm_campaign: c.utm_campaign,
        utm_content: c.utm_content,
        utm_term: c.utm_term,
        page_path: c.page_path,
        page_url: c.page_url,
        visitor_uuid: c.visitor_uuid,
        is_broken: false,
      });
    });

    orders.forEach(o => {
      const isBroken = !o.visitor_uuid;
      chain.push({
        type: "order",
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        utm_source: o.utm_source,
        utm_medium: o.utm_medium,
        utm_campaign: o.utm_campaign,
        utm_content: o.utm_content,
        utm_term: o.utm_term,
        page_path: o.page_path,
        page_url: o.page_url,
        visitor_uuid: o.visitor_uuid,
        amount: o.amount,
        is_broken: isBroken,
        error_message: isBroken ? "Потерян трекер сессии" : null
      });
    });

    chain.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { chain };
  } catch (err: any) {
    return { error: err.message || "Failed to trace visitor" };
  }
}
