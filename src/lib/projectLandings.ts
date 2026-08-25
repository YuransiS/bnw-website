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
  sergiy: [
    { label: "Головний (Офери)", url: "https://sergiy-chernyavskyy.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "Міні-курс «Код Масштабування»", url: "https://sergiy-chernyavskyy.vercel.app/minicourse", path: "/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] },
    { label: "Діагностика / Розбір", url: "https://sergiy-chernyavskyy.vercel.app/free/diagnostic", path: "/free/diagnostic", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "quiz", parameters: [] }
  ],
  viktoria_chernysh: [
    { label: "Головний лендинг", url: "https://viktoria-chernysh.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Інтенсив", url: "https://viktoria-chernysh.vercel.app/intensive", path: "/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] },
    { label: "VSL Травлення", url: "https://viktoria-chernysh.vercel.app/vsl-digestion", path: "/vsl-digestion", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "VSL Голод", url: "https://viktoria-chernysh.vercel.app/vsl-golod", path: "/vsl-golod", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "Урок Травлення", url: "https://viktoria-chernysh.vercel.app/vsl-digestion/lesson", path: "/vsl-digestion/lesson", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "Урок Голод", url: "https://viktoria-chernysh.vercel.app/vsl-golod/lesson", path: "/vsl-golod/lesson", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free", parameters: [] },
    { label: "Вступ у Клуб", url: "https://viktoria-chernysh.vercel.app/club/join", path: "/club/join", badgeColor: "bg-amber-500/10 text-amber-400 border border-amber-500/20", type: "paid", parameters: [] },
    { label: "Telegram Mini App", url: "https://viktoria-chernysh.vercel.app/club/mini-app", path: "/club/mini-app", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] }
  ],
  clean_klinom: [
    { label: "Головний лендинг", url: "https://clean-klinom.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] },
    { label: "Вебінар", url: "https://clean-klinom.vercel.app/web", path: "/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL Відео", url: "https://clean-klinom.vercel.app/vsl-video", path: "/vsl-video", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "Практикум", url: "https://clean-klinom.vercel.app/practicum", path: "/practicum", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Консультація / Діагностика", url: "https://clean-klinom.vercel.app/consultation", path: "/consultation", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "quiz", parameters: [] }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", path: "/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", path: "/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "Розбір (Діагностика)", url: "https://victoria-mc.vercel.app/rozbir", path: "/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Броні / Ціни", url: "https://victoria-mc.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", path: "/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] }
  ],
  sofia: [
    { label: "Основний", url: "https://economica.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Інтенсив", url: "https://economica.vercel.app/intensive", path: "/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] },
    { label: "Вебінар", url: "https://economica.vercel.app/web", path: "/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL Sofia Invest", url: "https://economica.vercel.app/sofia-invest", path: "/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "Міні-курс", url: "https://economica.vercel.app/minicourse", path: "/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] },
    { label: "Тарифи / Ціни", url: "https://economica.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "Діагностика", url: "https://economica.vercel.app/diagnostics", path: "/diagnostics", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "quiz", parameters: [] },
    { label: "Оплата Чек-аут", url: "https://economica.vercel.app/checkout", path: "/checkout", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", path: "/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free", parameters: [] },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", path: "/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", path: "/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid", parameters: [] },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", path: "/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid", parameters: [] },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", path: "/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", path: "/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", path: "/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid", parameters: [] },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", path: "/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free", parameters: [] },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", path: "/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid", parameters: [] },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", path: "/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] }
  ],
  vova_win: [
    { label: "Головний", url: "https://vova-win.club/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Марафон", url: "https://vova-win.club/marathon", path: "/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] }
  ],
  anastasia_sych: [
    { label: "Основний", url: "https://anastasiia-sych.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "Консультація", url: "https://anastasiia-sych.vercel.app/consultation", path: "/consultation", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "Діагностика", url: "https://anastasiia-sych.vercel.app/diagnostic", path: "/diagnostic", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "quiz", parameters: [] },
    { label: "Сторінка Подяки", url: "https://anastasiia-sych.vercel.app/thank-you", path: "/thank-you", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "thank_you", parameters: [] }
  ],
  nesoniaa: [
    { label: "Головна", url: "https://nesoniaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "Міні-курс", url: "https://nesoniaa.vercel.app/mini-course", path: "/mini-course", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "paid", parameters: [] },
    { label: "Міні-курс AI", url: "https://nesoniaa.vercel.app/mini-course/ai", path: "/mini-course/ai", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] },
    { label: "Міні-курс Figma", url: "https://nesoniaa.vercel.app/mini-course/figma", path: "/mini-course/figma", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Безкоштовний AI", url: "https://nesoniaa.vercel.app/mini-course/free/ai", path: "/mini-course/free/ai", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] }
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

