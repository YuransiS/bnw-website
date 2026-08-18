export interface LandingParam {
  key: string;
  description?: string;
  observed_count?: number;
  last_seen_at?: string;
}

export interface ProjectLandingItem {
  id?: string;
  label: string;
  url: string;
  path: string;
  badgeColor: string;
  type: "paid" | "free" | "quiz" | "thank_you" | "other";
  parameters: LandingParam[];
  lastPingAt?: string;
}

export const DEFAULT_PROJECT_LANDINGS: Record<string, ProjectLandingItem[]> = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", path: "/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", path: "/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "rozbir", url: "https://victoria-mc.vercel.app/rozbir", path: "/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Броні", url: "https://victoria-mc.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", path: "/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", path: "/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", path: "/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL Sofia Invest", url: "https://sofifinsight.vercel.app/sofia-invest", path: "/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", path: "/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] },
    { label: "Тарифи / Ціни", url: "https://sofifinsight.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "Діагностика", url: "https://sofifinsight.vercel.app/diagnostics", path: "/diagnostics", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "quiz", parameters: [] },
    { label: "Оплата Чек-аут", url: "https://sofifinsight.vercel.app/checkout", path: "/checkout", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", path: "/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free", parameters: [] },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", path: "/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", path: "/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid", parameters: [] },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", path: "/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid", parameters: [] },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", path: "/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", path: "/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid", parameters: [] },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", path: "/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", path: "/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free", parameters: [] },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", path: "/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid", parameters: [] },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", path: "/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] }
  ],
  vova_win: [
    { label: "Марафон", url: "https://vova-win.club/marathon", path: "/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  anastasia_sych: [
    { label: "Основний", url: "https://anastasia-sych.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] }
  ],
  nesoniaa: [
    { label: "Основний", url: "https://nesoniaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] }
  ],
  sergiy: [
    { label: "Основний", url: "https://sergiy-chernyavskyy.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] }
  ],
  sandbox: [
    { label: "Головний (Sandbox)", url: "https://sandbox.bnw.internal/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Інтенсив (Тест)", url: "https://sandbox.bnw.internal/intensive", path: "/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] },
    { label: "Вебінар (Тест)", url: "https://sandbox.bnw.internal/web", path: "/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL Офер", url: "https://sandbox.bnw.internal/vsl", path: "/vsl", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "Трипваєр 990₴", url: "https://sandbox.bnw.internal/tripwire", path: "/tripwire", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] },
    { label: "Анкета / Діагностика", url: "https://sandbox.bnw.internal/diagnostics", path: "/diagnostics", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "quiz", parameters: [] },
    { label: "Оплата Курсу", url: "https://sandbox.bnw.internal/checkout", path: "/checkout", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] },
    { label: "Дякуємо (Thank You)", url: "https://sandbox.bnw.internal/thank-you", path: "/thank-you", badgeColor: "bg-green-500/10 text-green-400 border border-green-500/20", type: "thank_you", parameters: [] }
  ]
};

