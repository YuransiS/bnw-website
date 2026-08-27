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
  if (!lead) return false;
  if (!landingUrl || landingUrl === "all") return true;

  const targetClean = landingUrl.trim();
  const targetNorm = normalizeUrlForMatching(targetClean);
  const targetPath = targetClean.startsWith("http")
    ? (() => { try { return new URL(targetClean).pathname.toLowerCase(); } catch { return targetClean.toLowerCase(); } })()
    : targetClean.toLowerCase();

  const isTargetRoot = targetClean === "/" || targetNorm === "" || targetPath === "/" || targetPath === "";

  // Collect all items to check: lead itself + all touches in lead.history
  const itemsToCheck: any[] = [lead];
  if (Array.isArray(lead.history)) {
    itemsToCheck.push(...lead.history);
  }

  for (const item of itemsToCheck) {
    const itemUrl = normalizeUrlForMatching(getTouchPageUrl(item));
    const itemPath = (
      item.page_path ||
      item.pagePath ||
      item.metadata?.page_path ||
      item.metadata?.pagePath ||
      item.metadata?.raw_row?.page_path ||
      item.metadata?.raw_row?.raw_payload?.page_path ||
      ""
    ).trim().toLowerCase();

    const originalSheet = (
      item.metadata?.original_sheet ||
      item.metadata?.originalSheet ||
      item.metadata?.raw_row?.original_sheet ||
      item.metadata?.raw_row?.originalSheet ||
      ""
    ).trim();

    const targetSheet = (
      item.metadata?.target_sheet ||
      item.metadata?.targetSheet ||
      item.metadata?.raw_row?.target_sheet ||
      item.metadata?.raw_row?.targetSheet ||
      item.metadata?.raw_row?.raw_payload?.sheet_name ||
      ""
    ).trim();

    // 1. Root / Main Page Matching
    if (isTargetRoot) {
      if (itemPath === "/" || itemPath === "" || itemPath === "/index.html") return true;
      if (itemUrl && !itemUrl.includes("/")) return true;
      if (["Головна", "Ленд 1", "Ленд 2", "МК 2.0", "Автовеб", "Ліди МК", "Webinars"].includes(originalSheet)) return true;
    }

    // 2. Specific Path Matching (e.g. "/rozbir", "/diagnostic", "/vsl-form")
    if (targetPath && targetPath !== "/") {
      const cleanSlug = targetPath.replace(/^\//, "").replace(/\/$/, "");
      if (cleanSlug) {
        if (itemPath.includes(cleanSlug)) return true;
        if (itemUrl.includes(cleanSlug)) return true;
        if (originalSheet.toLowerCase().includes(cleanSlug) || targetSheet.toLowerCase().includes(cleanSlug)) return true;
      }
    }

    // 3. Exact URL matching
    if (targetNorm && itemUrl) {
      if (itemUrl.includes(targetNorm)) return true;
    }

    // 4. Known semantic project sheets
    if (targetPath.includes("rozbir") || targetNorm.includes("rozbir")) {
      if (originalSheet === "Ленд 3" || targetSheet === "Ленд 3" || originalSheet.toLowerCase().includes("розбір")) return true;
    }
    if (targetPath.includes("vsl") || targetNorm.includes("vsl")) {
      if (originalSheet === "VSL Форма" || originalSheet === "VSL 1 етап" || originalSheet.toLowerCase().includes("vsl")) return true;
    }
    if (targetPath.includes("diagnostic") || targetNorm.includes("diagnostic") || targetNorm.includes("quiz")) {
      if (originalSheet.toLowerCase().includes("діагностик") || originalSheet.toLowerCase().includes("квіз")) return true;
    }
  }

  return false;
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
  "visitor_id", "visitorid", "visitor_uuid", "bw_cid", "client_id", "session_id",
  "cookie", "page_path", "full_url", "target_sheet", "sheet_id", "entry_month",
  "vsl_sendpulse_stage", "api_key", "api_secret", "token", "quiz_result",
  "raw_payload", "raw_row", "diagnostics_comment", "diagnosticscomment",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "consent", "amount", "currency", "status", "action", "sp_contact_id",
  "tg_msg_id", "customer_name", "customer_phone", "uavslab", "id", "created_at",
  "name", "phone", "email", "telegram", "instagram", "ig", "insta", "phone_number",
  "contact", "phone_full", "country_code", "ip", "user_agent", "referrer", "ref",
  "fbp", "fbc", "fbclid", "gclid", "ttclid", "form_id", "lead_id", "touch_id",
  "source", "type", "event", "event_name", "timestamp", "project_id", "slug",
  "updated_at", "inserted_at", "device", "browser", "os", "screen_resolution"
]);

/**
 * Comprehensive parser for survey questions and answers from lead records
 */
export const parseSurveyQuestions = (lead: any): Array<{ key: string; label: string; value: string }> => {
  if (!lead) return [];

  const results: Array<{ key: string; label: string; value: string }> = [];
  const addedKeys = new Set<string>();

  const formatKeyToLabel = (rawKey: string): string => {
    const norm = rawKey.toLowerCase().trim();
    if (SURVEY_QUESTION_LABELS[norm]) return SURVEY_QUESTION_LABELS[norm];
    if (SURVEY_QUESTION_LABELS[rawKey]) return SURVEY_QUESTION_LABELS[rawKey];
    
    // Clean snake_case / kebab-case
    const cleaned = rawKey
      .replace(/^crm_lead_field_/, "")
      .replace(/^field_/, "")
      .replace(/^quiz_/, "")
      .replace(/^q_/, "Питання ")
      .replace(/[_-]+/g, " ")
      .trim();

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const addQA = (rawKey: string, val: any, overrideLabel?: string) => {
    if (val === undefined || val === null) return;
    
    const normKey = rawKey.toLowerCase().trim();

    // If key is quiz_result or raw_payload, unpack its nested values
    if (normKey === "quiz_result" || normKey === "raw_payload" || normKey === "answers" || normKey === "questions" || normKey === "survey_data") {
      let parsed = val;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch {}
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([subK, subVal]) => {
          addQA(subK, subVal);
        });
        return;
      }
    }

    if (EXCLUDED_SURVEY_PAYLOAD_KEYS.has(normKey)) return;

    let cleanVal = "";
    if (typeof val === "string") {
      cleanVal = val.trim();
      // Check if string is a nested JSON object
      if ((cleanVal.startsWith("{") && cleanVal.endsWith("}")) || (cleanVal.startsWith("[") && cleanVal.endsWith("]"))) {
        try {
          const parsed = JSON.parse(cleanVal);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            Object.entries(parsed).forEach(([subK, subVal]) => {
              addQA(subK, subVal);
            });
            return;
          }
        } catch {}
      }
    } else if (typeof val === "number" || typeof val === "boolean") {
      cleanVal = String(val);
    } else if (Array.isArray(val)) {
      cleanVal = val.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ");
    } else if (typeof val === "object") {
      Object.entries(val).forEach(([subK, subVal]) => {
        addQA(subK, subVal);
      });
      return;
    }

    if (!cleanVal || cleanVal === "{}" || cleanVal === "[]" || cleanVal === "null" || cleanVal === "[object Object]") return;

    const label = overrideLabel || formatKeyToLabel(rawKey);
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
        if (label && value && !EXCLUDED_SURVEY_PAYLOAD_KEYS.has(label.toLowerCase())) {
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


