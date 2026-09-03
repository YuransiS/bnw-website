import { createAdminClient } from "@/utils/supabase/server";
import { statusMapper, isPaidStatus } from "@/lib/statusMapper";



import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";

const PROJECT_LANDINGS = DEFAULT_PROJECT_LANDINGS;

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

const getTouchPagePath = (l: any) => {
  if (!l) return "";
  return (
    l.page_path ||
    l.metadata?.page_path ||
    l.metadata?.pagePath ||
    l.metadata?.raw_row?.page_path ||
    l.metadata?.raw_row?.pagePath ||
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

  let targetPath = "";
  try {
    const parsed = new URL(landingUrl.startsWith("http") ? landingUrl : `https://${landingUrl}`);
    targetPath = parsed.pathname.replace(/\/$/, "") || "/";
  } catch {
    targetPath = landingUrl.replace(/^https?:\/\/[^\/]+/, "").replace(/\/$/, "") || "/";
  }

  return lead.history?.some((touch: any) => {
    const touchUrl = normalizeUrlForMatching(getTouchPageUrl(touch));
    const touchPath = (getTouchPagePath(touch) || "").trim().replace(/\/$/, "") || "/";

    if (touchPath && targetPath) {
      if (targetPath === "/" && (touchPath === "/" || touchPath === "")) {
        return true;
      }
      if (targetPath !== "/" && (touchPath === targetPath || touchPath.includes(targetPath) || targetPath.includes(touchPath))) {
        return true;
      }
    }

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
      if (activeSlug === "svitlana" && (targetNorm.includes("svitlanatape.vercel.app") || targetNorm.includes("svetlanatape.vercel.app"))) {
        if (["Діагностики", "Квіз", "Відповіді бот (19.05)"].includes(originalSheet)) return true;
      }
      if (activeSlug === "sofia" && targetNorm.includes("sofifinsight.vercel.app")) {
        if (!originalSheet && !targetSheet) return true;
      }
    }

    return false;
  }) || false;
};

const isBlacklistedPhone = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 7) return true;
  const allSame = /^(\d)\1+$/.test(clean);
  if (allSame) return true;
  const sequences = [
    "1234567", "12345678", "123456789", "1234567890",
    "9876543", "98765432", "987654321", "9876543210"
  ];
  if (sequences.some(seq => clean.includes(seq))) return true;
  const dummies = [
    "380000000000", "380500000000", "380660000000", "380990000000",
    "380930000000", "380970000000", "380630000000", "380670000000",
    "380680000000", "380980000000", "380950000000", "380501234567",
    "380671234567", "380931234567", "380631234567"
  ];
  if (dummies.includes(clean)) return true;
  return false;
};

const isBlacklistedTelegram = (tg: string): boolean => {
  if (!tg) return true;
  const clean = tg.toLowerCase().replace("@", "").trim();
  if (clean.length < 3) return true;
  
  // Telegram usernames can ONLY contain latin letters, digits, and underscores
  // If it has spaces, Cyrillic, dashes or special characters (e.g. "немає username", "нема"), reject
  if (/[\s\-\–\/\\,.]/.test(clean)) return true;
  if (/[а-яА-ЯіїєґІЇЄҐ]/.test(clean)) return true;
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(clean)) return true;

  const ignored = new Set([
    "test", "tg", "none", "null", "unknown", "no", "empty", "telegram",
    "невідомий", "неизвестно", "dummy", "qwerty", "asdfgh", "tbd", "na",
    "user", "admin", "nousername", "no_username", "notg", "no_tg", "no_telegram",
    "anon", "anonymous", "client", "guest", "undefined"
  ]);
  if (ignored.has(clean)) return true;
  if (/^\d+$/.test(clean) && clean.length >= 7) return true;
  return false;
};


// Rebuild project CRM DSU cache inside Supabase
export async function rebuildProjectCache(projectId: string, activeSlug: string) {
  const adminSupabase = createAdminClient();

  const runWithConcurrencyLimit = async <T>(
    tasks: (() => Promise<T>)[],
    concurrencyLimit: number
  ): Promise<T[]> => {
    const results: T[] = [];
    const executing = new Set<Promise<void>>();

    for (let i = 0; i < tasks.length; i++) {
      const taskIndex = i;
      const p = Promise.resolve()
        .then(() => tasks[taskIndex]())
        .then((res) => {
          results[taskIndex] = res;
        });
      executing.add(p);
      const clean = () => executing.delete(p);
      p.then(clean, clean);
      if (executing.size >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
    return results;
  };

  const fetchAllParallel = async (
    countQuery: () => Promise<any> | any,
    fetchPageFn: (from: number, to: number) => Promise<any> | any,
    concurrencyLimit = 5
  ) => {
    const { count, error: countErr } = await countQuery();
    if (countErr) throw countErr;
    const total = count || 0;
    if (total === 0) return [];

    const limit = 1000;
    const pagesCount = Math.ceil(total / limit);
    const tasks: (() => Promise<any>)[] = [];

    for (let i = 0; i < pagesCount; i++) {
      const from = i * limit;
      const to = from + limit - 1;
      tasks.push(async () => await fetchPageFn(from, to));
    }

    const results = await runWithConcurrencyLimit(tasks, concurrencyLimit);
    let combinedData: any[] = [];
    for (const res of results) {
      if (res.error) throw res.error;
      combinedData = [...combinedData, ...(res.data || [])];
    }
    return combinedData;
  };

  // Fetch all orders & customers in parallel
  const [allCustomers, allOrders] = await Promise.all([
    fetchAllParallel(
      () => adminSupabase.from("unified_customers").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      (from, to) => adminSupabase.from("unified_customers").select("*").eq("project_id", projectId).range(from, to)
    ),
    fetchAllParallel(
      () => adminSupabase.from("unified_orders").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      (from, to) => adminSupabase.from("unified_orders").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).range(from, to)
    )
  ]);

  const formattedLeads = allOrders.map((lead) => {
    const cust = allCustomers.find((c) => c.id === lead.customer_id) || {};
    return {
      ...lead,
      name: cust.name || lead.metadata?.name || lead.metadata?.lead?.name || "Невідомий",
      phone: cust.phone || lead.metadata?.phone || lead.metadata?.lead?.phone || "",
      telegram: cust.telegram || lead.metadata?.telegram || lead.metadata?.lead?.telegram || "",
      email: cust.email || lead.metadata?.email || lead.metadata?.lead?.email || "",
      managerComment: cust.manager_comment || "",
      customerId: lead.customer_id || null,
      assigned_manager_id: cust.assigned_manager_id || null,
      bw_cid: lead.bw_cid || lead.metadata?.bw_cid || (lead.customer_id ? `bw_${lead.customer_id.replace(/-/g, '').substring(0, 16)}` : "")
    };
  });

  // Perform DSU Clustering
  const size = formattedLeads.length;
  const dsu = new DSU(size);

  const phoneMap = new Map<string, number>();
  const tgMap = new Map<string, number>();
  const uuidMap = new Map<string, number>();
  const bwCidMap = new Map<string, number>();

  formattedLeads.forEach((lead: any, i: number) => {
    const phone = lead.phone?.replace(/\D/g, "") || "";
    const tg = lead.telegram?.toLowerCase().replace("@", "").trim() || "";
    const uuid = lead.visitor_uuid || "";
    const bwCid = lead.bw_cid || lead.metadata?.bw_cid || "";

    if (phone.length >= 7 && !isBlacklistedPhone(phone)) {
      if (phoneMap.has(phone)) dsu.union(i, phoneMap.get(phone)!);
      else phoneMap.set(phone, i);
    }
    if (tg && !isBlacklistedTelegram(tg)) {
      if (tgMap.has(tg)) dsu.union(i, tgMap.get(tg)!);
      else tgMap.set(tg, i);
    }
    if (uuid) {
      if (uuidMap.has(uuid)) dsu.union(i, uuidMap.get(uuid)!);
      else uuidMap.set(uuid, i);
    }
    if (bwCid && bwCid.length >= 6) {
      if (bwCidMap.has(bwCid)) dsu.union(i, bwCidMap.get(bwCid)!);
      else bwCidMap.set(bwCid, i);
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

    const pagePath = String(lead.page_path || lead.metadata?.raw_row?.page_path || lead.metadata?.page_path || "").toLowerCase();
    const tariffName = String(
      lead.metadata?.raw_row?.tariffName ||
      lead.metadata?.raw_row?.raw_payload?.tariffName ||
      lead.metadata?.tariffName ||
      lead.metadata?.tariff ||
      lead.metadata?.offer_title ||
      lead.metadata?.product_name ||
      lead.metadata?.leadData?.course ||
      lead.metadata?.lead?.leadData?.course ||
      lead.quiz_result ||
      ""
    ).toLowerCase();
    const originalSheet = String(lead.metadata?.original_sheet || lead.metadata?.lead?.original_sheet || "").trim();
    const targetSheet = String(lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || "").trim();
    const courseName = String(lead.metadata?.leadData?.course || lead.metadata?.lead?.leadData?.course || "").trim();

    const isTripwire =
      lead.metadata?.product_type === "tripwire" ||
      lead.order_type === "tripwire" ||
      pagePath.includes("minicourse") ||
      pagePath.includes("mini-course") ||
      pagePath.includes("practicum") ||
      pagePath.includes("tripwire") ||
      pagePath.includes("intensive") ||
      tariffName.includes("міні-курс") ||
      tariffName.includes("мини-курс") ||
      tariffName.includes("трипвайер") ||
      tariffName.includes("трипваєр") ||
      tariffName.includes("код масштабування") ||
      tariffName.includes("практикум") ||
      ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
      ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
      courseName.includes("Mini-Course") ||
      courseName.includes("Practicum") ||
      courseName.includes("Практикум") ||
      courseName.includes("Міні-курс") ||
      ["sofia", "valeria"].includes(activeSlug);

    if (normalized === "closed_won") {
      return isTripwire ? "Купив(-ла) Трипвайер" : "Купив курс";
    }
    if (normalized === "declined") {
      return "Відмова";
    }
    const lower = s.toLowerCase().trim();
    if (
      lower.includes("перехід до оплат") ||
      lower.includes("переход к оплат") ||
      lower.includes("клик на форму оплат") ||
      lower.includes("клік на форму оплат") ||
      lower.includes("почато оплату") ||
      lower.includes("очікується оплата") ||
      lower.includes("очікує оплати") ||
      lower === "expired"
    ) {
      return "Новий лід";
    }
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
      return isTripwire ? "Купив(-ла) Трипвайер" : (["sofia", "valeria"].includes(activeSlug) ? "Купив(-ла) Трипвайер" : "Купив курс");
    }
    if (lower === "зацікавлений лід" || lower === "зацікавлений") {
      return "Зацікавлений лід";
    }
    return "Новий лід";
  };

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

    const QUESTION_LABELS: Record<string, string> = {
      "purpose": "Мета",
      "subscription_duration": "Як давно підписана",
      "difficulties": "Складнощі з блогом",
      "readiness": "Готовність до роботи",
      "niche": "Ніша",
      "instagram": "Instagram",
      "social": "Telegram",
      "telegram": "Telegram",
      "phone": "Телефон",
      "name": "Ім'я",
      "що турбує": "Що турбує",
      "Чи колола ботокс, або подібне": "Ботокс",
      "Тип старіння": "Тип старіння",
      "Рівень доходу": "Дохід",
      "Дохід": "Дохід",
      "Фінансова ціль": "Фінансова ціль",
      "Ціль": "Ціль",
      "Борги": "Борги",
      "Чи є борги зараз": "Борги",
      "За який термін выйти на 100 000$": "Термін 100k$",
      "Відповідь 1 (скільки витрачаєш на косметику в міс.)": "Витрати на косметику",
      "Коментар": "Коментар",
      "request": "Запит",
      "tariff": "Тариф"
    };

    const EXCLUDED_KEYS = new Set([
      "visitor_id", "visitorid", "page_path", "full_url", "target_sheet",
      "sheet_id", "entry_month", "vsl_sendpulse_stage", "api_key",
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "consent", "amount", "currency", "status", "action", "sp_contact_id",
      "tg_msg_id", "customer_name", "customer_phone", "uavslab", "id", "created_at"
    ]);

    const addedKeys = new Set<string>();

    groupLeads.forEach((lead) => {
      const meta = lead.metadata || {};
      const raw = meta.raw_row || {};
      
      let payload = raw.raw_payload || meta.raw_payload || lead.raw_payload || {};
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {}
      }

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        Object.entries(payload).forEach(([k, val]) => {
          if (EXCLUDED_KEYS.has(k.toLowerCase().trim())) return;
          if (val && String(val).trim()) {
            const label = QUESTION_LABELS[k] || k;
            const formattedVal = String(val).trim();
            const uniqueKey = `${label.toLowerCase()}:${formattedVal.toLowerCase()}`;
            if (!addedKeys.has(uniqueKey)) {
              answers.push(`${label}: ${formattedVal}`);
              addedKeys.add(uniqueKey);
            }
          }
        });
      }

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
          const formattedVal = String(val).trim();
          const uniqueKey = `${f.label.toLowerCase()}:${formattedVal.toLowerCase()}`;
          if (!addedKeys.has(uniqueKey)) {
            answers.push(`${f.label}: ${formattedVal}`);
            addedKeys.add(uniqueKey);
          }
        }
      });
    });

    return Array.from(new Set(answers)).join("\n");
  };

  const calculatedCache = Array.from(groups.values()).map((indices) => {
    const groupLeads = indices.map((idx) => formattedLeads[idx]);

    const normalizedGroupLeads = groupLeads.map((item) => ({
      ...item,
      status: normalizeStatus(item)
    }));

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
      const hasProperOrderId = item.order_id && item.order_id !== item.id;

      if (!hasProperOrderId) {
        let isDuplicate = false;
        const itemTime = new Date(item.created_at || 0).getTime();

        for (const existing of uniqueOrders.values()) {
          if (
            existing.project_id === item.project_id &&
            Number(existing.amount) === Number(item.amount)
          ) {
            const existingTime = new Date(existing.created_at || 0).getTime();
            const timeDiffMin = Math.abs(itemTime - existingTime) / (1000 * 60);
            if (timeDiffMin <= 30) {
              isDuplicate = true;

              const existingIsPaid = existing.status === "Купив курс" || existing.status === "Купив(-ла) Трипвайер";
              const itemIsPaid = item.status === "Купив курс" || item.status === "Купив(-ла) Трипвайер";
              if (itemIsPaid && !existingIsPaid) {
                const existingKey = `${existing.order_id || existing.id}_${existing.project_id}`;
                uniqueOrders.delete(existingKey);
                const newKey = `${orderId}_${item.project_id}`;
                uniqueOrders.set(newKey, item);
              }
              break;
            }
          }
        }

        if (isDuplicate) {
          return;
        }
      }

      const orderKey = `${orderId}_${item.project_id}`;
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
      const rawAmt = Number(
        item.amount ||
        item.metadata?.raw_row?.amount ||
        item.metadata?.raw_row?.raw_payload?.amount ||
        item.metadata?.usd_amount ||
        item.metadata?.uah_amount ||
        0
      );
      let amt = rawAmt;
      if (amt === 0) {
        const statusStr = String(item.status || "") + " " + String(item.metadata?.raw_row?.status || "") + " " + String(item.metadata?.raw_row?.quiz_result || "");
        const match = statusStr.match(/(\d+)\s*(?:грн|uah|\$|usd|eur|€)/i);
        if (match) {
          amt = Number(match[1]);
        }
      }
      if (amt === 0) return;

      const metaCurrency = String(
        item.metadata?.currency ||
        item.metadata?.lead?.currency ||
        item.metadata?.raw_row?.currency ||
        "uah"
      ).trim().toLowerCase();

      const isEur = ["eur", "€"].includes(metaCurrency);
      const isUsd = ["usd", "$"].includes(metaCurrency);
      const isUah = isEur || isUsd ? false : true;

      const isProjectAlwaysTripwire = ["sofia", "valeria"].includes(activeSlug);

      const isPaidOrder = isPaidStatus(item.status);

      const pagePathLower = String(item.page_path || item.metadata?.raw_row?.page_path || "").toLowerCase();
      const tariffLower = String(
        item.metadata?.raw_row?.tariffName ||
        item.metadata?.raw_row?.raw_payload?.tariffName ||
        item.metadata?.tariff ||
        item.metadata?.offer_title ||
        ""
      ).toLowerCase();
      const origSheetLower = String(item.metadata?.original_sheet || item.metadata?.target_sheet || "").toLowerCase();

      const isTripwireProduct = 
        isProjectAlwaysTripwire ||
        item.status === "Купив(-ла) Трипвайер" ||
        pagePathLower.includes("minicourse") ||
        pagePathLower.includes("intensive") ||
        pagePathLower.includes("tripwire") ||
        pagePathLower.includes("practicum") ||
        tariffLower.includes("міні-курс") ||
        tariffLower.includes("мини-курс") ||
        tariffLower.includes("трипвайер") ||
        tariffLower.includes("трипваер") ||
        origSheetLower.includes("міні-курс") ||
        origSheetLower.includes("практикум") ||
        origSheetLower.includes("мини-курс") ||
        (isUah && amt <= 2500) ||
        (isUsd && amt <= 60) ||
        (isEur && amt <= 60);

      if (isPaidOrder) {
        if (isTripwireProduct) {
          if (isUsd) { usdTripwirePaid += amt; usdTripwireCount++; }
          else if (isEur) { eurTripwirePaid += amt; eurTripwireCount++; }
          else if (isUah) { uahTripwirePaid += amt; uahTripwireCount++; }
        } else {
          if (isUsd) { usdCoursePaid += amt; usdCourseCount++; }
          else if (isEur) { eurCoursePaid += amt; eurCourseCount++; }
          else if (isUah) { uahCoursePaid += amt; uahCourseCount++; }
        }
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

    const page_path = prioritizedTouches.map(getTouchPagePath).find((p) => p && p !== "/") || getTouchPagePath(primaryLead) || "/";
    const page_url = prioritizedTouches.map(getTouchPageUrl).find((url) => url !== "") || getTouchPageUrl(primaryLead);

    const latestTouch = normalizedGroupLeads.reduce((latest, curr) => {
      return getLeadDate(curr).getTime() > getLeadDate(latest).getTime() ? curr : latest;
    }, normalizedGroupLeads[0]);

    // Visited landings containment set
    const visitedLandings: string[] = [];
    const landings = PROJECT_LANDINGS[activeSlug] || [];
    landings.forEach((land) => {
      if (isLeadMatchingLanding({ history: normalizedGroupLeads, page_path, page_url, ...primaryLead }, land.url, activeSlug)) {
        visitedLandings.push(land.url);
      }
    });

    // Fallback: If visitedLandings is still empty, but page_url or page_path exists
    if (visitedLandings.length === 0) {
      if (page_url && page_url.startsWith("http")) {
        visitedLandings.push(page_url);
      } else if (page_path && page_path !== "/") {
        const defaultBase = landings[0]?.url ? new URL(landings[0].url).origin : "";
        if (defaultBase) {
          visitedLandings.push(`${defaultBase}${page_path.startsWith("/") ? "" : "/"}${page_path}`);
        } else {
          visitedLandings.push(page_path);
        }
      }
    }

    // 1. Precise Payment & Checkout Intent Detection
    const totalPaidAmount = usdCoursePaid + uahCoursePaid + eurCoursePaid + usdTripwirePaid + uahTripwirePaid + eurTripwirePaid;
    const hasPayment = totalPaidAmount > 0 || normalizedGroupLeads.some((o: any) => {
      return isPaidStatus(o.status);
    });

    const hasAttemptedAmount = (usdAttempted > 0 || uahAttempted > 0 || eurAttempted > 0);

    // Check if customer had a real failed attempt to pay for a paid product
    const hasRealPaymentAttempt = normalizedGroupLeads.some((o: any) => {
      if (isPaidStatus(o.status)) return false;

      const amt = Number(
        o.amount ||
        o.metadata?.raw_row?.amount ||
        o.metadata?.raw_row?.raw_payload?.amount ||
        o.metadata?.usd_amount ||
        o.metadata?.uah_amount ||
        0
      );
      const s = String(o.status || "").toLowerCase().trim();
      const meta = o.metadata || {};
      const raw = meta.raw_row || {};
      const rawOrderId = String(raw.order_id || meta.wfp_order_id || meta.mono_invoice_id || "").trim();
      const url = String(o.page_url || meta.page_url || raw.page_url || "").toLowerCase();
      const norm = statusMapper.normalize(o.status);

      let effectiveAmt = amt;
      if (effectiveAmt === 0) {
        const fullText = `${s} ${o.quiz_result || ""} ${raw.quiz_result || ""} ${meta.offer_title || ""} ${raw.offer_title || ""}`;
        const match = fullText.match(/(\d+)\s*(?:грн|uah|\$|usd|eur|€)/i);
        if (match) {
          effectiveAmt = Number(match[1]);
        }
      }

      const isGatewayDecline = norm === "declined" || s.includes("відхил") || s.includes("отклон") || s.includes("expired") || s.includes("не оплач") || s.includes("помилка");
      const isGatewayCheckout = s.includes("перехід до оплати") || s.includes("клик на форму оплати") || s.includes("очікується оплата") || s.includes("очікує оплати") || s.includes("почато оплату") || s.includes("кошик");
      
      const hasRealGatewayId = Boolean(
        rawOrderId && 
        rawOrderId !== "null" && 
        rawOrderId !== "undefined" && 
        !rawOrderId.startsWith("TRG_") && 
        !rawOrderId.startsWith("ELT_") && 
        rawOrderId.length > 3
      );
      const hasExplicitPaymentMeta = Boolean(meta.payment_intent || meta.wfp_order_id || meta.mono_invoice_id || meta.checkout_started);
      const isCheckoutUrl = url.includes("/checkout") || url.includes("/pay") || url.includes("/order") || url.includes("wayforpay");

      // It is ONLY a real payment attempt if there was an actual non-zero price or gateway transaction
      return (effectiveAmt > 0 || hasRealGatewayId || hasExplicitPaymentMeta) && (isGatewayDecline || isGatewayCheckout || isCheckoutUrl || effectiveAmt > 0);
    });

    // An unpaid intent is ONLY true if:
    // 1. The customer NEVER completed a successful payment (!hasPayment)
    // 2. AND they attempted to pay for a paid product (hasRealPaymentAttempt or hasAttemptedAmount)
    const isUnpaidIntent = !hasPayment && (hasRealPaymentAttempt || (hasAttemptedAmount && totalPaidAmount === 0));

    // 2. Tag Hierarchy Engine (Levels 1, 2, 3)
    const derivedTagsSet = new Set<string>();

    if (hasPayment) {
      derivedTagsSet.add("Клієнт");
      if (usdCoursePaid > 0 || uahCoursePaid > 0 || eurCoursePaid > 0) derivedTagsSet.add("Оплачено: Курс");
      if (usdTripwirePaid > 0 || uahTripwirePaid > 0 || eurTripwirePaid > 0) derivedTagsSet.add("Оплачено: Трипваєр");
    }

    if (isUnpaidIntent) {
      derivedTagsSet.add("Покинутий кошик");
    }

    // Check for diagnostic / questionnaire form lead
    const hasDiagnosticForm = normalizedGroupLeads.some((o: any) => {
      const meta = o.metadata || {};
      const raw = meta.raw_row || {};
      const path = o.page_path || raw.page_path || "";
      const url = o.page_url || raw.page_url || "";
      const origSheet = meta.original_sheet || raw.original_sheet || "";
      return path === "/rozbir" || url.toLowerCase().includes("/rozbir") || origSheet === "Розбір (Old)" || origSheet === "Ленд 3" || raw.request || meta.request || raw.purpose || raw.niche;
    });

    if (hasDiagnosticForm) {
      derivedTagsSet.add("Залишив заявку");
      derivedTagsSet.add("Анкета розбору");
    }

    // Free registration check
    const hasFreeRegistration = normalizedGroupLeads.some((o: any) => {
      const amt = Number(o.amount || 0);
      const s = String(o.status || "").toLowerCase();
      return amt === 0 && (s === "новий лід" || s === "зареєстровано" || s === "pending" || s === "new" || !s);
    });

    if (hasFreeRegistration && !hasPayment && !hasDiagnosticForm && !isUnpaidIntent) {
      derivedTagsSet.add("Зареєструвався");
      derivedTagsSet.add("Безкоштовна реєстрація");
    }

    if (isMultiSource) {
      derivedTagsSet.add("Мульти-канал");
    }

    // Level 2: Visited Landings
    visitedLandings.forEach((landUrl) => {
      let cleanLand = landUrl.replace(/^https?:\/\/[^\/]+/, "").replace(/\/$/, "");
      if (!cleanLand || cleanLand === "/") cleanLand = "/головна";
      derivedTagsSet.add(`Лендинг: ${cleanLand}`);
    });

    // Level 3: Product-specific actions
    normalizedGroupLeads.forEach((o: any) => {
      const amt = Number(o.amount || 0);
      const prodName = o.metadata?.leadData?.course || o.metadata?.lead?.leadData?.course || o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || "";
      const norm = statusMapper.normalize(o.status);
      const isPaidOrder = norm === "closed_won" || o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер";

      if (amt > 0 && prodName) {
        if (!isPaidOrder && !hasPayment) {
          derivedTagsSet.add(`Покинутий кошик: ${prodName}`);
        } else if (isPaidOrder) {
          derivedTagsSet.add(`Придбано: ${prodName}`);
        }
      }
    });

    const leadTags = Array.from(derivedTagsSet);

    return {
      project_id: projectId,
      primary_customer_id: primaryLead.customerId,
      customer_ids: Array.from(new Set(groupLeads.map((l) => l.customerId).filter(Boolean))),
      order_ids: Array.from(new Set(groupLeads.map((l) => l.id).filter(Boolean))),
      name: primaryLead.name || "Невідомий",
      phone: primaryLead.phone || "",
      telegram: primaryLead.telegram || "",
      email: primaryLead.email || "",
      status: finalStatus,
      tags: leadTags,
      page_path,
      page_url,
      touch_count: normalizedGroupLeads.length,
      usd_paid: usdCoursePaid,
      uah_paid: uahCoursePaid,
      eur_paid: eurCoursePaid,
      usd_tripwire_paid: usdTripwirePaid,
      uah_tripwire_paid: uahTripwirePaid,
      eur_tripwire_paid: eurTripwirePaid,
      usd_attempted: usdAttempted,
      uah_attempted: uahAttempted,
      eur_attempted: eurAttempted,
      usd_course_count: usdCourseCount,
      uah_course_count: uahCourseCount,
      eur_course_count: eurCourseCount,
      usd_tripwire_count: usdTripwireCount,
      uah_tripwire_count: uahTripwireCount,
      eur_tripwire_count: eurTripwireCount,
      diagnostics_comment: getDiagnosticsComment(normalizedGroupLeads),
      manager_comment: primaryLead.managerComment || "",
      utm_source: utm_source || getTouchUtm(primaryLead, "source"),
      utm_medium: utm_medium || getTouchUtm(primaryLead, "medium"),
      utm_campaign: utm_campaign || getTouchUtm(primaryLead, "campaign"),
      utm_content: utm_content || getTouchUtm(primaryLead, "content"),
      utm_term: utm_term || getTouchUtm(primaryLead, "term"),
      target_sheet: primaryLead.metadata?.target_sheet || primaryLead.metadata?.lead?.target_sheet || utm_source || "",
      is_unpaid_intent: isUnpaidIntent,
      visited_landings: visitedLandings,
      history: [...normalizedGroupLeads].sort((a, b) => getLeadDate(a).getTime() - getLeadDate(b).getTime()),
      is_multi_source: isMultiSource,
      created_at: latestTouch.created_at || latestTouch.created_at_iso || new Date().toISOString(),
      assigned_manager_id: primaryLead.assigned_manager_id || null,
      visitor_uuid: primaryLead.visitor_uuid || null,
      bw_cid: primaryLead.bw_cid || null
    };
  }).filter((c) => {
    // Filter out anonymous users that didn't pay
    const hasContacts = c.name !== "Невідомий" || c.phone || c.telegram || c.email;
    const isPaid = c.status === "Купив курс" || c.status === "Купив(-ла) Трипвайер" || statusMapper.normalize(c.status) === "closed_won";
    return hasContacts || isPaid;
  });

  // Calculate dataHealth and diagnosticsIssues for metadata
  let leadsWithoutUuidCount = 0;
  let ordersWithAmountAndClickStatusCount = 0;
  let unparseableMetadataDatesCount = 0;

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

  const nameless: any[] = [];
  const unmatchedUrls: Record<string, { count: number; rawUrl: string; originalSheet: string; sampleLead: string }> = {};
  const currencyErrors: any[] = [];

  calculatedCache.forEach((lead: any) => {
    const nameVal = lead.name?.trim();
    const hasContacts = lead.phone || lead.telegram || lead.email;
    if ((!nameVal || nameVal === "Невідомий") && hasContacts) {
      nameless.push({ id: lead.id, name: lead.name, phone: lead.phone, telegram: lead.telegram });
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

  const metadata = {
    dataHealth,
    diagnosticsIssues
  };

  // Clear any existing stale rows for this project in the staging table
  await adminSupabase.from("crm_leads_cache_staging").delete().eq("project_id", projectId);

  // Bulk insert to crm_leads_cache_staging in chunks of 500 rows
  const chunkSize = 500;
  for (let i = 0; i < calculatedCache.length; i += chunkSize) {
    const chunk = calculatedCache.slice(i, i + chunkSize);
    const { error: insertErr } = await adminSupabase.from("crm_leads_cache_staging").insert(chunk);
    if (insertErr) {
      console.error("Bulk insert to crm_leads_cache_staging failed:", insertErr);
      // Clean up staging on failure
      await adminSupabase.from("crm_leads_cache_staging").delete().eq("project_id", projectId);
      throw insertErr;
    }
  }

  // Atomically swap the staging cache into production
  const { error: swapErr } = await adminSupabase.rpc("swap_crm_leads_cache", { p_project_id: projectId });
  if (swapErr) {
    console.error("Atomic swap transaction swap_crm_leads_cache failed:", swapErr);
    // Clean up staging on failure
    await adminSupabase.from("crm_leads_cache_staging").delete().eq("project_id", projectId);
    throw swapErr;
  }

  // Save computed metadata without setting is_dirty back to false (since we lock it at start)
  const { error: updateErr } = await adminSupabase
    .from("crm_cache_dirty_queue")
    .update({ metadata })
    .eq("project_id", projectId);
  
  if (updateErr) {
    console.error("Failed to update metadata in crm_cache_dirty_queue:", updateErr);
  }
  
  console.log(`🚀 Successfully rebuilt CRM Cache (Atomic Swap) for project ${activeSlug}. Total groups cached: ${calculatedCache.length}`);
}
