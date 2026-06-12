const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = fs.readFileSync(envPath, 'utf-8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/^"|"\s*$/g, '');
    }
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfyrftpdhprjyouyjecd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Project UUID for Svitlana
const projectId = 'c9876e4c-1234-4567-89ab-cdef01234567';

// --- Client-Side Helpers and Logic ---
const statusMapper = {
  normalize(s) {
    if (!s) return 'pending';
    const lower = s.toLowerCase().trim();
    if (lower.includes('оплат') || lower.includes('paid') || lower === 'closed_won' || lower === 'оплачено' || lower === 'купив') {
      if (lower.includes('не оплат') || lower.includes('unpaid') || lower.includes('pending')) {
        return 'pending';
      }
      return 'closed_won';
    }
    if (lower === 'відмова' || lower === 'declined' || lower === 'rejected') return 'declined';
    return 'pending';
  }
};

const getLeadDate = (lead) => {
  const rawDateStr = 
    lead.metadata?.raw_row?.Дата || 
    lead.metadata?.raw_row?.дата || 
    lead.metadata?.raw_row?.Date || 
    lead.metadata?.raw_row?.date ||
    lead.metadata?.created_at ||
    lead.metadata?.lead?.created_at;

  if (rawDateStr) {
    const str = String(rawDateStr).trim();
    
    // Check dd.mm.yyyy format
    const dotParts = str.split(" ")[0].split(".");
    if (dotParts.length === 3) {
      const day = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10) - 1; // 0-indexed month
      const year = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const timeStr = str.split(" ")[1];
        if (timeStr) {
          const timeParts = timeStr.split(":");
          const hour = parseInt(timeParts[0], 10) || 0;
          const min = parseInt(timeParts[1], 10) || 0;
          const sec = parseInt(timeParts[2], 10) || 0;
          return new Date(Date.UTC(year, month, day, hour, min, sec));
        }
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
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

const statusPriority = (s) => {
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

const PROJECT_LANDINGS = {
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
  ]
};

class DSU {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i) {
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
  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

const normalizeUrlForMatching = (url) => {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
};

const getTouchPageUrl = (l) => {
  if (!l) return "";
  return (
    l.metadata?.page_url ||
    l.metadata?.pageUrl ||
    l.metadata?.full_url ||
    l.metadata?.fullUrl ||
    l.page_url ||
    ""
  );
};

const getTouchUtm = (l, key) => {
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

const isLeadMatchingLanding = (lead, landingUrl) => {
  if (landingUrl === "all") return true;
  const targetNorm = normalizeUrlForMatching(landingUrl);
  const targetHasPath = targetNorm.includes("/");
  
  return lead.history?.some((touch) => {
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
    
    // Sheet semantic matching
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
    
    if (!targetHasPath) {
      if (targetNorm.includes("svitlanatape.vercel.app") || targetNorm.includes("svetlanatape.vercel.app")) {
        if (["Діагностики", "Квіз", "Відповіді бот (19.05)"].includes(originalSheet)) return true;
      }
    }
    return false;
  }) || false;
};

// --- Execution audit ---
async function audit() {
  console.log("Starting performance audit for Svitlana project (c9876e4c-1234-4567-89ab-cdef01234567)...");
  
  // 1. Fetch Customers
  console.time("Fetch Customers Time");
  let customers = [];
  let fromCust = 0;
  const limit = 1000;
  let hasMoreCust = true;
  while (hasMoreCust) {
    const { data, error } = await supabase
      .from("unified_customers")
      .select("*")
      .eq("project_id", projectId)
      .range(fromCust, fromCust + limit - 1);
    
    if (error) {
      console.error("Error fetching customers:", error);
      break;
    }
    customers = [...customers, ...(data || [])];
    if ((data || []).length < limit) hasMoreCust = false;
    else fromCust += limit;
  }
  console.timeEnd("Fetch Customers Time");

  // 2. Fetch Orders
  console.time("Fetch Orders Time");
  let orders = [];
  let fromOrders = 0;
  let hasMoreOrders = true;
  while (hasMoreOrders) {
    const { data, error } = await supabase
      .from("unified_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(fromOrders, fromOrders + limit - 1);
    
    if (error) {
      console.error("Error fetching orders:", error);
      break;
    }
    orders = [...orders, ...(data || [])];
    if ((data || []).length < limit) hasMoreOrders = false;
    else fromOrders += limit;
  }
  console.timeEnd("Fetch Orders Time");

  // 3. Fetch Traffic Clicks
  console.time("Fetch Traffic Time");
  let traffic = [];
  let fromTraffic = 0;
  let hasMoreTraffic = true;
  while (hasMoreTraffic) {
    const { data, error } = await supabase
      .from("traffic_clicks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(fromTraffic, fromTraffic + limit - 1);
    
    if (error) {
      console.error("Error fetching traffic:", error);
      break;
    }
    traffic = [...traffic, ...(data || [])];
    if ((data || []).length < limit) hasMoreTraffic = false;
    else fromTraffic += limit;
  }
  console.timeEnd("Fetch Traffic Time");

  // 4. Backend mapping
  console.time("Backend Mapping Time");
  const formattedLeads = orders.map((lead) => {
    const cust = customers.find((c) => c.id === lead.customer_id) || {};
    return {
      ...lead,
      name: cust.name || lead.metadata?.name || lead.metadata?.lead?.name || "Невідомий",
      phone: cust.phone || lead.metadata?.phone || lead.metadata?.lead?.phone || "",
      telegram: cust.telegram || lead.metadata?.telegram || lead.metadata?.lead?.telegram || "",
      email: cust.email || lead.metadata?.email || lead.metadata?.lead?.email || "",
      managerComment: cust.manager_comment || "",
      customerId: lead.customer_id || null,
      assigned_manager_id: cust.assigned_manager_id || null,
      assigned_manager_name: "",
    };
  });
  console.timeEnd("Backend Mapping Time");

  // Simulating CLIENT SIDE computations:
  console.log("\n--- Client-side simulation ---");
  const rawLeads = formattedLeads;
  const rawTraffic = traffic;
  const allowedProjects = [{ id: projectId, name: 'Svitlana', slug: 'svitlana' }];
  const activeProject = allowedProjects[0];

  // 5. Clustered Leads
  console.time("Client DSU Clustering Time");
  const size = rawLeads.length;
  const dsu = new DSU(size);

  const phoneMap = new Map();
  const tgMap = new Map();
  const emailMap = new Map();
  const uuidMap = new Map();

  const getDiagnosticsComment = (groupLeads) => {
    const answers = [];
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

  rawLeads.forEach((lead, i) => {
    const phone = lead.phone?.replace(/\D/g, "") || "";
    const tg = lead.telegram?.toLowerCase().replace("@", "").trim() || "";
    const email = lead.email?.toLowerCase().trim() || "";
    const uuid = lead.visitor_uuid || "";

    if (phone.length >= 7) {
      if (phoneMap.has(phone)) dsu.union(i, phoneMap.get(phone));
      else phoneMap.set(phone, i);
    }
    if (tg) {
      if (tgMap.has(tg)) dsu.union(i, tgMap.get(tg));
      else tgMap.set(tg, i);
    }
    if (email) {
      if (emailMap.has(email)) dsu.union(i, emailMap.get(email));
      else emailMap.set(email, i);
    }
    if (uuid) {
      if (uuidMap.has(uuid)) dsu.union(i, uuidMap.get(uuid));
      else uuidMap.set(uuid, i);
    }
  });

  const groups = new Map();
  for (let i = 0; i < size; i++) {
    const root = dsu.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }

  const normalizeStatus = (lead) => {
    const s = lead.status;
    if (!s) return "Новий лід";
    const normalized = statusMapper.normalize(s);
    
    const originalSheet = String(lead.metadata?.original_sheet || lead.metadata?.lead?.original_sheet || "").trim();
    const targetSheet = String(lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || "").trim();
    const courseName = String(lead.metadata?.leadData?.course || lead.metadata?.lead?.leadData?.course || "").trim();

    const isTripwire = 
      ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
      ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
      courseName.includes("Mini-Course") || 
      courseName.includes("Practicum") || 
      courseName.includes("Практикум") ||
      courseName.includes("Міні-курс");

    if (normalized === "closed_won") {
      return isTripwire ? "Купив(-ла) Трипвайер" : "Купив курс";
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
      return "Купив курс";
    }
    if (lower === "зацікавлений лід" || lower === "зацікавлений") {
      return "Зацікавлений лід";
    }
    return "Новий лід";
  };

  const allClustered = Array.from(groups.values()).map((indices) => {
    const groupLeads = indices.map((idx) => rawLeads[idx]);

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

    const uniqueOrders = new Map();
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
      
      const isEur = ["eur", "€"].includes(metaCurrency);
      const isUsd = !isEur && (["usd", "$"].includes(metaCurrency) || activeProject?.slug === "sofia" || activeProject?.slug === "valeria");

      if (item.status === "Купив курс") {
        if (isUsd) usdCoursePaid += amt;
        else if (isEur) eurCoursePaid += amt;
        else uahCoursePaid += amt;
      } else if (item.status === "Купив(-ла) Трипвайер") {
        if (isUsd) usdTripwirePaid += amt;
        else if (isEur) eurTripwirePaid += amt;
        else uahTripwirePaid += amt;
      } else {
        if (isUsd) usdAttempted += amt;
        else if (isEur) eurAttempted += amt;
        else uahAttempted += amt;
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
      history: [...normalizedGroupLeads].sort((a, b) => getLeadDate(a).getTime() - getLeadDate(b).getTime()),
      isMultiSource,
      touchCount: normalizedGroupLeads.length,
      diagnosticsComment: getDiagnosticsComment(normalizedGroupLeads),
      managerComment: primaryLead.managerComment || "",
    };
  });

  const clusteredFiltered = allClustered.filter((lead) => {
    const nameVal = lead.name?.trim();
    const hasRealName = nameVal && nameVal !== "" && nameVal !== "Невідомий";
    const hasPhone = !!lead.phone?.trim();
    const hasTelegram = !!lead.telegram?.trim();
    const hasEmail = !!lead.email?.trim();
    const hasContacts = hasRealName || hasPhone || hasTelegram || hasEmail;
    const isPaid = lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер";
    return hasContacts || isPaid;
  });

  console.timeEnd("Client DSU Clustering Time");
  console.log(`Clustered unique customer profiles: ${clusteredFiltered.length}`);

  // 6. processedLeads (Filtering)
  console.time("Client Filtering Time");
  const processedLeads = clusteredFiltered.filter((lead) => {
    const matchSearch =
      lead.name?.toLowerCase().includes("".toLowerCase()) ||
      lead.phone?.toLowerCase().includes("".toLowerCase()) ||
      lead.telegram?.toLowerCase().includes("".toLowerCase()) ||
      lead.email?.toLowerCase().includes("".toLowerCase());

    if (!matchSearch) return false;
    return true;
  });
  console.timeEnd("Client Filtering Time");

  // 7. singleProjectStats
  console.time("Client Stats Calculation Time");
  const totalLeads = processedLeads.length;
  const totalClicks = rawTraffic.length;
  const totalSpend = 0; // costs Res
  const totalApplications = processedLeads.filter((l) => 
    statusPriority(l.status) >= 3 || 
    l.history.some((h) => statusPriority(h.status) >= 3)
  ).length;

  const usdCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.usdPaid || 0), 0);
  const uahCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.uahPaid || 0), 0);
  const eurCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.eurPaid || 0), 0);
  const usdTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.usdTripwirePaid || 0), 0);
  const uahTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.uahTripwirePaid || 0), 0);
  const eurTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.eurTripwirePaid || 0), 0);

  const totalUsdRevenue = usdCourseRevenue + usdTripwireRevenue;
  const totalUahRevenue = uahCourseRevenue + uahTripwireRevenue;
  const totalEurRevenue = eurCourseRevenue + eurTripwireRevenue;

  const blendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);

  const paidLeads = processedLeads.filter((l) => l.status === "Купив курс");
  const paidTripwires = processedLeads.filter((l) => l.status === "Купив(-ла) Трипвайер");
  const totalSales = paidLeads.length + paidTripwires.length;
  console.timeEnd("Client Stats Calculation Time");

  // 8. splineTrendData
  console.time("Client Spline Trend Data Time");
  let start = null;
  let end = new Date();

  const dayLeads = {};
  const dayClicks = {};
  const curr = new Date();
  curr.setDate(curr.getDate() - 30); // 30 day range

  while (curr <= end) {
    const str = curr.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
    dayLeads[str] = 0;
    dayClicks[str] = 0;
    curr.setDate(curr.getDate() + 1);
  }

  processedLeads.forEach((l) => {
    const str = getLeadDate(l).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
    if (dayLeads[str] !== undefined) {
      dayLeads[str] += 1;
    }
  });

  rawTraffic.forEach((t) => {
    const str = new Date(t.created_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
    if (dayClicks[str] !== undefined) {
      dayClicks[str] += 1;
    }
  });

  const splineTrend = Object.keys(dayLeads).map((name) => ({
    name,
    leads: dayLeads[name],
    clicks: dayClicks[name],
  }));
  console.timeEnd("Client Spline Trend Data Time");

  // 9. utmAttributionTree
  console.time("Client UTM Attribution Tree Time");
  const root = {};
  const getOrCreateNode = (parent, name) => {
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

  processedLeads.forEach((lead) => {
    const source = lead.utm_source || "direct";
    const medium = lead.utm_medium || "";
    const campaign = lead.utm_campaign || "";
    const content = lead.utm_content || "";

    const path = [source, medium, campaign, content].filter(Boolean);
    let currNode = root;
    path.forEach((part) => {
      const node = getOrCreateNode(currNode, part);
      node.leads += 1;
      const usdPaid = Number(lead.usdPaid || 0);
      const uahPaid = Number(lead.uahPaid || 0);
      node.usd_revenue += usdPaid;
      node.uah_revenue += uahPaid;
      node.revenue += usdPaid + (uahPaid / 41.0);
      currNode = node.children;
    });
  });

  rawTraffic.forEach((t) => {
    const source = t.utm_source || "direct";
    const medium = t.utm_medium || "";
    const campaign = t.utm_campaign || "";
    const content = t.utm_content || "";

    const path = [source, medium, campaign, content].filter(Boolean);
    let currNode = root;
    let possible = true;
    path.forEach((part) => {
      if (!possible) return;
      if (currNode[part]) {
        currNode[part].clicks += 1;
        currNode = currNode[part].children;
      } else {
        possible = false;
      }
    });
  });

  const finalizeNodes = (nodesRecord) => {
    return Object.values(nodesRecord)
      .map((node) => {
        const cr = node.clicks > 0 ? (node.leads / node.clicks) * 100 : 0;
        return {
          ...node,
          cr,
          children: finalizeNodes(node.children)
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
  };
  const utmTree = finalizeNodes(root);
  console.timeEnd("Client UTM Attribution Tree Time");
}

audit();
