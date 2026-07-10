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

export const parseClientDateRange = (dateStr: string, isEnd: boolean): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const offset = getUkraineOffset(year, month, day);
      const hourStr = isEnd ? "23:59:59" : "00:00:00";
      const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hourStr}${offset}`;
      return new Date(isoStr);
    }
  }
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
  let decimalPart = parts[1];

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
export const formatDualCurrency = (usd: number, uah: number, eur: number = 0) => {
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

export const formatDualProfit = (usdRevenue: number, spend: number, uahRevenue: number, eurRevenue: number = 0) => {
  const usdProfit = usdRevenue - spend;
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
      "Content-Type": "application/json",
      "X-HTTP-Method-Override": "QUERY"
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
  try {
    const res = await fetch("/api/crm/leads", {
      method: "QUERY",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ slug, filters: params })
    });
    
    if (res.ok) {
      return await res.json();
    }
    
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      console.warn("QUERY method rejected by server, retrying with POST tunnel override...");
      return await fetchWithPostTunnel(slug, params);
    }
    
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
  } catch (err: any) {
    console.warn("QUERY request failed (network/browser boundary), retrying with POST tunnel override:", err);
    return await fetchWithPostTunnel(slug, params);
  }
};

