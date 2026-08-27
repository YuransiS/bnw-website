export const getUkraineOffset = (year: number, month: number, day: number): string => {
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

export const parseSafeDate = (dateStr: string | null | undefined, isEnd = false): Date | null => {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0);
      }
    }
  }
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0);
      }
    }
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
};

export const parseClientDateRange = (dateStr: string, isEnd: boolean): Date => {
  if (!dateStr) return new Date();
  const safe = parseSafeDate(dateStr, isEnd);
  if (safe) return safe;
  return new Date(dateStr);
};

export const statusPriority = (s: string): number => {
  if (s === "Купив курс" || s === "closed_won" || s === "Approved" || s === "Approved (Test)") return 10;
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

// Safe locale number formatting to avoid server/client hydration mismatch
export const formatLocaleNumber = (num: number) => {
  const val = Number(num);
  if (isNaN(val)) return "0";

  const str = val.toFixed(2);
  const parts = str.split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Use non-breaking space \u00A0 as thousands separator
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

  if (decimalPart === "00") {
    return integerPart;
  } else if (decimalPart.endsWith("0")) {
    return `${integerPart},${decimalPart.charAt(0)}`;
  } else {
    return `${integerPart},${decimalPart}`;
  }
};

// Currency formatting helper functions
export const formatDualCurrency = (usd: number, uah: number, eur: number = 0, currency?: "USD" | "UAH") => {
  if (currency === "UAH") {
    const totalUah = uah + (usd * 41.0) + (eur * 1.08 * 41.0);
    return `${formatLocaleNumber(totalUah)} ₴`;
  } else if (currency === "USD") {
    const totalUsd = usd + (uah / 41.0) + (eur * 1.08);
    return `$${formatLocaleNumber(totalUsd)}`;
  }

  const parts = [];
  if (usd > 0) {
    parts.push(`$${formatLocaleNumber(usd)}`);
  }
  if (uah > 0) {
    parts.push(`${formatLocaleNumber(uah)} ₴`);
  }
  if (eur > 0) {
    parts.push(`${formatLocaleNumber(eur)} €`);
  }
  if (parts.length === 0) {
    return "0 ₴";
  }
  return parts.join(" + ");
};

export const formatDualProfit = (usdRevenue: number, spend: number, uahRevenue: number, eurRevenue: number = 0, currency?: "USD" | "UAH") => {
  const usdProfit = usdRevenue - spend;
  if (currency === "UAH") {
    const totalUahProfit = (usdProfit * 41.0) + uahRevenue + (eurRevenue * 1.08 * 41.0);
    return `${totalUahProfit >= 0 ? "" : "-"}${formatLocaleNumber(Math.abs(totalUahProfit))} ₴`;
  } else if (currency === "USD") {
    const totalUsdProfit = usdProfit + (uahRevenue / 41.0) + (eurRevenue * 1.08);
    return `${totalUsdProfit >= 0 ? "" : "-"}$${formatLocaleNumber(Math.abs(totalUsdProfit))}`;
  }

  const parts = [];
  if (usdRevenue > 0 || spend > 0) {
    parts.push(`${usdProfit >= 0 ? "" : "-"}$${formatLocaleNumber(Math.abs(usdProfit))}`);
  }
  if (uahRevenue > 0) {
    parts.push(`${formatLocaleNumber(uahRevenue)} ₴`);
  }
  if (eurRevenue > 0) {
    parts.push(`${formatLocaleNumber(eurRevenue)} €`);
  }
  if (parts.length === 0) {
    return "0 ₴";
  }
  return parts.join(" + ");
};

export interface CommentItem {
  id: string;
  text: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

export const parseComments = (rawComment: string | null): CommentItem[] => {
  if (!rawComment) return [];
  try {
    const parsed = JSON.parse(rawComment);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Treat as single legacy comment
  }
  return [{
    id: "legacy",
    text: rawComment,
    authorEmail: "system",
    authorName: "Попередній коментар",
    createdAt: new Date().toISOString()
  }];
};

export const normalizeUrlForMatching = (url: string) => {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
};

export const getTouchPageUrl = (l: any) => {
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

export const getTouchUtm = (l: any, key: 'source' | 'medium' | 'campaign' | 'content' | 'term'): string => {
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

export const isLeadMatchingLanding = (lead: any, landingUrl: string) => {
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

    // 1. URL match
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

    // 2. Sheet semantic matching fallback
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

    // 3. Fallback to main page if sheet matches default and target is main page (no path)
    if (!targetHasPath) {
      if (targetNorm.includes("victoria-mc.vercel.app")) {
        if (["Ленд 1", "Ленд 2", "Ленд 3", "МК 2.0", "Автовеб", "Webinars", "Ліди МК"].includes(originalSheet)) return true;
      }
      if (targetNorm.includes("svitlanatape.vercel.app") || targetNorm.includes("svetlanatape.vercel.app")) {
        if (["Діагностики", "Квіз", "Відповіді бот (19.05)"].includes(originalSheet)) return true;
      }
      if (targetNorm.includes("sofifinsight.vercel.app")) {
        if (!originalSheet && !targetSheet) return true;
      }
    }

    return false;
  }) || false;
};

export const getLeadDate = (lead: any): Date => {
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

export const fetchWithPostTunnel = async (slug: string, params: any) => {
  const res = await fetch("/api/crm/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ slug, filters: params })
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
  }
  
  return await res.json();
};

export const fetchCRMLeads = async (slug: string, params: any) => {
  return fetchWithPostTunnel(slug, params);
};

/**
 * Extracts and cleans Instagram username from lead fields, metadata, or raw payloads
 */
export const getLeadInstagram = (lead: any): string | null => {
  if (!lead) return null;

  // 1. Direct fields
  const direct = lead.instagram || (lead as any).ig || (lead as any).insta;
  if (direct && String(direct).trim()) {
    return cleanInstagramUsername(String(direct));
  }

  // 2. Metadata / raw payload
  const meta = lead.metadata || {};
  const raw = meta.raw_row || {};
  const payload = raw.raw_payload || meta.raw_payload || (lead as any).raw_payload || {};
  
  const parsedPayload = typeof payload === "string" ? (() => {
    try { return JSON.parse(payload); } catch { return {}; }
  })() : payload;

  const candidate =
    meta.instagram || meta.ig || meta.insta ||
    raw.instagram || raw.ig || raw.insta || raw["Інстаграм"] || raw["інстаграм"] || raw["Instagram"] ||
    parsedPayload?.instagram || parsedPayload?.ig || parsedPayload?.insta || parsedPayload?.["Інстаграм"] || parsedPayload?.["Instagram"];

  if (candidate && String(candidate).trim()) {
    return cleanInstagramUsername(String(candidate));
  }

  // 3. History inspection
  if (Array.isArray(lead.history)) {
    for (const touch of lead.history) {
      const touchDirect = touch.instagram || touch.ig;
      if (touchDirect && String(touchDirect).trim()) {
        return cleanInstagramUsername(String(touchDirect));
      }
      const touchMeta = touch.metadata || {};
      const touchRaw = touchMeta.raw_row || {};
      const touchPayload = touchRaw.raw_payload || touchMeta.raw_payload || {};
      const touchCandidate =
        touchMeta.instagram || touchMeta.ig ||
        touchRaw.instagram || touchRaw.ig || touchRaw["Інстаграм"] || touchRaw["Instagram"] ||
        touchPayload?.instagram || touchPayload?.ig;
      if (touchCandidate && String(touchCandidate).trim()) {
        return cleanInstagramUsername(String(touchCandidate));
      }
    }
  }

  return null;
};

export const cleanInstagramUsername = (raw: string): string => {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\?.*$/, "");
};

/**
 * Standard question labels dictionary for mapping raw JSON keys to friendly Ukrainian titles
 */
export const SURVEY_QUESTION_LABELS: Record<string, string> = {
  purpose: "🎯 Мета / Ціль",
  goal: "🎯 Ціль",
  target_goal: "🎯 Фінансова ціль",
  financial_goal: "💰 Фінансова ціль",
  income: "💵 Поточний дохід",
  revenue: "💵 Поточний дохід",
  current_income: "💵 Поточний дохід",
  niche: "💼 Ніша / Сфера діяльності",
  sphere: "💼 Сфера діяльності",
  difficulties: "⚠️ Труднощі / Що заважає",
  problems: "⚠️ Головна проблема",
  request: "📝 Запит на розбір",
  readiness: "🚀 Готовність стартувати",
  readiness_to_start: "🚀 Готовність стартувати",
  budget: "💳 Бюджет / Інвестиції",
  term: "⏳ Бажаний термін",
  timeframe: "⏳ Термін реалізації",
  experience: "🎓 Досвід / Кваліфікація",
  debts: "💳 Наявність боргів / кредитів",
  has_debts: "💳 Чи є борги зараз",
  team: "👥 Команда / Співробітники",
  tariff: "🏷️ Обраний тариф",
  comment: "💬 Додатковий коментар",
  notes: "💬 Примітки"
};

const EXCLUDED_SURVEY_PAYLOAD_KEYS = new Set([
  "visitor_id", "visitorid", "page_path", "full_url", "target_sheet",
  "sheet_id", "entry_month", "vsl_sendpulse_stage", "api_key",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "consent", "amount", "currency", "status", "action", "sp_contact_id",
  "tg_msg_id", "customer_name", "customer_phone", "uavslab", "id", "created_at",
  "name", "phone", "email", "telegram", "instagram", "ig", "insta", "phone_number"
]);

/**
 * Comprehensive parser for survey questions and answers from lead records
 */
export const parseSurveyQuestions = (lead: any): Array<{ key: string; label: string; value: string }> => {
  if (!lead) return [];

  const results: Array<{ key: string; label: string; value: string }> = [];
  const addedKeys = new Set<string>();

  const addQA = (rawKey: string, val: any, overrideLabel?: string) => {
    if (val === undefined || val === null) return;
    const cleanVal = typeof val === "string" ? val.trim() : JSON.stringify(val);
    if (!cleanVal || cleanVal === "{}" || cleanVal === "[]" || cleanVal === "null") return;
    
    const normKey = rawKey.toLowerCase().trim();
    if (EXCLUDED_SURVEY_PAYLOAD_KEYS.has(normKey)) return;

    const label = overrideLabel || SURVEY_QUESTION_LABELS[normKey] || SURVEY_QUESTION_LABELS[rawKey] || rawKey;
    const dedupeKey = `${label.toLowerCase()}:::${cleanVal.toLowerCase()}`;
    if (!addedKeys.has(dedupeKey)) {
      addedKeys.add(dedupeKey);
      results.push({ key: rawKey, label, value: cleanVal });
    }
  };

  // 1. Parse from diagnosticsComment if present
  if (lead.diagnosticsComment && typeof lead.diagnosticsComment === "string") {
    const lines = lead.diagnosticsComment.split("\n");
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const label = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (label && value) {
          addQA(label, value, label);
        }
      }
    }
  }

  // 2. Parse from lead raw_payload & metadata
  const meta = lead.metadata || {};
  const raw = meta.raw_row || {};
  let payload = raw.raw_payload || meta.raw_payload || lead.raw_payload || {};
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch {}
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    Object.entries(payload).forEach(([k, val]) => {
      addQA(k, val);
    });
  }

  // 3. Known raw row questions
  const knownFields = [
    { key: "що турбує", label: "⚠️ Що турбує" },
    { key: "Чи колола ботокс, або подібне", label: "💉 Процедури / Ботокс" },
    { key: "Тип старіння", label: "🧬 Тип старіння" },
    { key: "Рівень доходу", label: "💰 Рівень доходу" },
    { key: "Дохід", label: "💰 Дохід" },
    { key: "Фінансова ціль", label: "🎯 Фінансова ціль" },
    { key: "Ціль", label: "🎯 Ціль" },
    { key: "Борги", label: "💳 Борги / Кредити" },
    { key: "Чи є борги зараз", label: "💳 Чи є борги зараз" },
    { key: "За який термін вийти на 100 000$", label: "⏳ Термін до 100 000$" },
    { key: "Відповідь 1 (скільки витрачаєш на косметику в міс.)", label: "💄 Витрати на косметику" },
    { key: "niche", label: "💼 Ніша" },
    { key: "request", label: "📝 Запит" },
    { key: "tariff", label: "🏷️ Тариф" },
    { key: "Коментар", label: "💬 Коментар" }
  ];

  knownFields.forEach((f) => {
    const val = raw[f.key] || meta[f.key];
    if (val) addQA(f.key, val, f.label);
  });

  // 4. Search in touches
  if (Array.isArray(lead.history)) {
    for (const touch of lead.history) {
      const touchMeta = touch.metadata || {};
      const touchRaw = touchMeta.raw_row || {};
      let touchPayload = touchRaw.raw_payload || touchMeta.raw_payload || touch.raw_payload || {};
      if (typeof touchPayload === "string") {
        try { touchPayload = JSON.parse(touchPayload); } catch {}
      }
      if (touchPayload && typeof touchPayload === "object" && !Array.isArray(touchPayload)) {
        Object.entries(touchPayload).forEach(([k, val]) => {
          addQA(k, val);
        });
      }
      knownFields.forEach((f) => {
        const val = touchRaw[f.key] || touchMeta[f.key];
        if (val) addQA(f.key, val, f.label);
      });
    }
  }

  return results;
};


