"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { checkProjectAccess } from "./actions";
import { rebuildProjectCache } from "@/lib/crmCache";

const SANDBOX_PROJECT_ID = "e0000000-0000-4000-8000-000000000001";
const SANDBOX_PROJECT_SLUG = "sandbox";

/**
 * Seed or reset the entire Sandbox test project with comprehensive, realistic production data.
 */
export async function seedSandboxProjectAction() {
  try {
    const adminSupabase = createAdminClient();

    // 1. Ensure Sandbox Project exists in `projects`
    const { data: firstCell } = await adminSupabase
      .from("cells")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const cellId = firstCell?.id || null;

    const { error: projErr } = await adminSupabase.from("projects").upsert({
      id: SANDBOX_PROJECT_ID,
      name: "🧪 Sandbox (Тестовий Проект)",
      slug: SANDBOX_PROJECT_SLUG,
      is_active: true,
      cell_id: cellId,
      default_currency: "UAH",
      revenue_model: "50_50",
      expert_share_percent: 50.0,
      fixed_fee_amount: 0.0,
      contract_model: "50/50_profit",
      target_currency: "USD",
      traffic_budget_plan: 150000,
      financial_goal_plan_usd: 25000,
      acquiring_fee_percent: 2.0
    });

    if (projErr) throw projErr;

    // 2. Ensure all existing profiles have access to the Sandbox project
    const { data: profiles } = await adminSupabase.from("profiles").select("id");
    if (profiles && profiles.length > 0) {
      const profileLinks = profiles.map((p) => ({
        profile_id: p.id,
        project_id: SANDBOX_PROJECT_ID
      }));
      await adminSupabase.from("profile_projects").upsert(profileLinks, { onConflict: "profile_id,project_id" });
    }

    // 3. Clear existing sandbox data for clean idempotent seeding
    await Promise.all([
      adminSupabase.from("financial_transactions").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("project_accounts").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("tasks").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("daily_traffic_and_costs").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("traffic_clicks").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("unified_orders").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("unified_customers").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("discovered_pages").delete().eq("project_id", SANDBOX_PROJECT_ID),
      adminSupabase.from("funnels").delete().eq("project_id", SANDBOX_PROJECT_ID)
    ]);

    // 4. Seed Discovered Pages / Landings
    const pagesToSeed = [
      { path: "/", title: "Головний (Sandbox)", source: "direct_register" },
      { path: "/intensive", title: "Інтенсив (Тест)", source: "direct_register" },
      { path: "/web", title: "Вебінар (Тест)", source: "direct_register" },
      { path: "/vsl", title: "VSL Офер", source: "direct_register" },
      { path: "/tripwire", title: "Трипваєр 990₴", source: "direct_register" },
      { path: "/diagnostics", title: "Анкета / Діагностика", source: "direct_register" },
      { path: "/checkout", title: "Оплата Курсу", source: "direct_register" },
      { path: "/thank-you", title: "Дякуємо (Thank You)", source: "direct_register" }
    ];

    await adminSupabase.from("discovered_pages").insert(
      pagesToSeed.map((p) => ({
        project_id: SANDBOX_PROJECT_ID,
        path: p.path,
        title: p.title,
        source: p.source,
        last_seen_at: new Date().toISOString()
      }))
    );

    // 5. Seed Funnels
    const funnelsToSeed = [
      {
        id: "f0000000-0000-4000-8000-000000000001",
        project_id: SANDBOX_PROJECT_ID,
        name: "Інтенсив «Прорив у продажах 2026»",
        start_date: "2026-08-01",
        end_date: "2026-08-25",
        planned_revenue: 350000,
        planned_spend: 75000,
        stages: [
          "Реєстрація на інтенсив",
          "Участь в інтенсиві (День 1-3)",
          "Домашні завдання",
          "Анкета / Офер",
          "Оплата (Заявка)"
        ],
        landing_slugs: ["/intensive", "/checkout", "/diagnostics"],
        campaign_ids: ["INTENSIVE_UA_SCALE", "INTENSIVE_RETARGETING"],
        description: "[Type: Інтенсив][Stages: Реєстрація на інтенсив,Участь в інтенсиві (День 1-3),Домашні завдання,Анкета / Офер,Оплата (Заявка)] Головний запуск серпня з фокусом на тверді результати учнів."
      },
      {
        id: "f0000000-0000-4000-8000-000000000002",
        project_id: SANDBOX_PROJECT_ID,
        name: "Автовебінарна воронка 24/7",
        start_date: "2026-07-15",
        end_date: null,
        planned_revenue: 200000,
        planned_spend: 45000,
        stages: [
          "Підписка в бот",
          "Реєстрація на автовеб",
          "Перегляд ефіру",
          "Анкета діагностики",
          "Оплата (Заявка)"
        ],
        landing_slugs: ["/web", "/checkout"],
        campaign_ids: ["AUTOWEB_COLD_UA", "AUTOWEB_LOOKALIKE"],
        description: "[Type: Автовеб][Stages: Підписка в бот,Реєстрація на автовеб,Перегляд ефіру,Анкета діагностики,Оплата (Заявка)] Постійно діюча автоворонка на холодну аудиторію."
      },
      {
        id: "f0000000-0000-4000-8000-000000000003",
        project_id: SANDBOX_PROJECT_ID,
        name: "Швидкий VSL + Трипваєр",
        start_date: "2026-07-20",
        end_date: "2026-08-10",
        planned_revenue: 120000,
        planned_spend: 28000,
        stages: [
          "Перехід на VSL",
          "Перегляд відео",
          "Клік по кнопці оферу",
          "Оплата трипваєру",
          "Допродаж основного курсу"
        ],
        landing_slugs: ["/vsl", "/tripwire", "/checkout"],
        campaign_ids: ["VSL_TRAFFIC_TG", "TRIPWIRE_OFFER_UA"],
        description: "[Type: VSL][Stages: Перехід на VSL,Перегляд відео,Клік по кнопці оферу,Оплата трипваєру,Допродаж основного курсу] Коротке відео з офером недорогого продукту та апселом."
      }
    ];

    await adminSupabase.from("funnels").insert(funnelsToSeed);

    // 6. Seed Project Accounts
    const accountsToSeed = [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        project_id: SANDBOX_PROJECT_ID,
        name: "ФОП Рахунок (ПриватБанк)",
        currency: "UAH",
        starting_balance: 50000
      },
      {
        id: "a0000000-0000-4000-8000-000000000002",
        project_id: SANDBOX_PROJECT_ID,
        name: "WayForPay Інтернет-Еквайринг",
        currency: "UAH",
        starting_balance: 120000
      },
      {
        id: "a0000000-0000-4000-8000-000000000003",
        project_id: SANDBOX_PROJECT_ID,
        name: "Payoneer USD Business",
        currency: "USD",
        starting_balance: 3500
      },
      {
        id: "a0000000-0000-4000-8000-000000000004",
        project_id: SANDBOX_PROJECT_ID,
        name: "Готівкова каса",
        currency: "UAH",
        starting_balance: 15000
      }
    ];

    await adminSupabase.from("project_accounts").insert(accountsToSeed);

    // 7. Seed 30 Days of Daily Ad Traffic & Costs (Meta Ads Simulation)
    const dailyCosts = [];
    const campaignsConfig = [
      { name: "INTENSIVE_UA_SCALE", id: "camp_intens_01", minSpend: 60, maxSpend: 130, minClicks: 120, maxClicks: 260 },
      { name: "INTENSIVE_RETARGETING", id: "camp_intens_02", minSpend: 25, maxSpend: 55, minClicks: 40, maxClicks: 100 },
      { name: "AUTOWEB_COLD_UA", id: "camp_auto_01", minSpend: 40, maxSpend: 85, minClicks: 80, maxClicks: 170 },
      { name: "AUTOWEB_LOOKALIKE", id: "camp_auto_02", minSpend: 30, maxSpend: 65, minClicks: 60, maxClicks: 130 },
      { name: "VSL_TRAFFIC_TG", id: "camp_vsl_01", minSpend: 20, maxSpend: 45, minClicks: 45, maxClicks: 110 },
      { name: "TRIPWIRE_OFFER_UA", id: "camp_tw_01", minSpend: 15, maxSpend: 35, minClicks: 30, maxClicks: 80 }
    ];

    const today = new Date();
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split("T")[0];

      for (const camp of campaignsConfig) {
        const spendUsd = Math.round((Math.random() * (camp.maxSpend - camp.minSpend) + camp.minSpend) * 10) / 10;
        const clicks = Math.floor(Math.random() * (camp.maxClicks - camp.minClicks) + camp.minClicks);
        const impressions = clicks * Math.floor(Math.random() * 15 + 18);
        const spendUah = Math.round(spendUsd * 41.5);

        dailyCosts.push({
          project_id: SANDBOX_PROJECT_ID,
          date: dateStr,
          utm_source: "facebook",
          campaign_id: camp.id,
          campaign_name: camp.name,
          clicks,
          impressions,
          spend: spendUah,
          spend_usd: spendUsd,
          spend_uah: spendUah
        });
      }
    }

    await adminSupabase.from("daily_traffic_and_costs").insert(dailyCosts);

    // 8. Seed Customers & Unified Orders
    interface SampleJourneyTouch {
      status: string;
      path: string;
      date: string;
      amount?: number;
      currency?: string;
      offer?: string;
      quiz?: {
        difficulties?: string;
        budget?: string;
        readiness?: string;
        goals?: string;
      };
    }

    interface SampleUser {
      name: string;
      phone: string;
      email: string;
      telegram: string;
      instagram?: string;
      visitorUuid: string;
      campaign: string;
      journey: SampleJourneyTouch[];
    }

    const sampleUsers: SampleUser[] = [
      {
        name: "Олена Коваленко",
        phone: "+380501234567",
        email: "olena.kovalenko@gmail.com",
        telegram: "@olena_koval",
        instagram: "olena_koval",
        visitorUuid: "00000000-0000-4000-8000-000000000101",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-02T10:15:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-02T10:18:00Z" },
          {
            status: "Анкета заповнена",
            path: "/diagnostics",
            amount: 0,
            date: "2026-08-05T14:20:00Z",
            quiz: {
              difficulties: "Не вистачає стабільного потоку лідів, хаос у продажах",
              budget: "50,000 - 100,000 грн",
              readiness: "Готова стартувати вже цього тижня",
              goals: "Вийти на $5,000/місяць"
            }
          },
          { status: "Прийнято в роботу", path: "/checkout", amount: 24000, date: "2026-08-06T11:00:00Z" },
          { status: "closed_won", path: "/checkout", amount: 24000, currency: "UAH", offer: "Тариф VIP", date: "2026-08-07T16:30:00Z" }
        ]
      },
      {
        name: "Максим Шевченко",
        phone: "+380672345678",
        email: "maks.sheva@gmail.com",
        telegram: "@maks_shevch",
        instagram: "maks_business",
        visitorUuid: "00000000-0000-4000-8000-000000000102",
        campaign: "AUTOWEB_COLD_UA",
        journey: [
          { status: "Клик", path: "/web", date: "2026-08-03T18:45:00Z" },
          { status: "Реєстрація на автовеб", path: "/web", date: "2026-08-03T18:50:00Z" },
          { status: "Купив(-ла) Трипвайер", path: "/tripwire", amount: 990, currency: "UAH", offer: "Експрес-Гайд", date: "2026-08-03T20:10:00Z" },
          { status: "closed_won", path: "/checkout", amount: 18000, currency: "UAH", offer: "Тариф Стандарт", date: "2026-08-10T12:00:00Z" }
        ]
      },
      {
        name: "Ірина Бондаренко",
        phone: "+380933456789",
        email: "irina.bondar@ukr.net",
        telegram: "@irina_bond",
        instagram: "irina_beauty",
        visitorUuid: "00000000-0000-4000-8000-000000000103",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-04T09:00:00Z" },
          {
            status: "Анкета заповнена",
            path: "/diagnostics",
            date: "2026-08-05T15:30:00Z",
            quiz: {
              difficulties: "Не розумію як налаштувати рекламу, боюсь злити бюджет",
              budget: "20,000 - 40,000 грн",
              readiness: "Потрібна консультація продюсера",
              goals: "Зробити перший запуск"
            }
          },
          { status: "Переговори", path: "/diagnostics", amount: 18000, date: "2026-08-08T10:00:00Z" }
        ]
      },
      {
        name: "Дмитро Мельник",
        phone: "+380504567890",
        email: "dmitro.melnik@gmail.com",
        telegram: "@dmitro_m",
        instagram: "dmitro_m",
        visitorUuid: "00000000-0000-4000-8000-000000000104",
        campaign: "VSL_TRAFFIC_TG",
        journey: [
          { status: "Клик", path: "/vsl", date: "2026-08-01T14:10:00Z" },
          { status: "Купив(-ла) Трипвайер", path: "/tripwire", amount: 490, currency: "UAH", offer: "Тестовий Доступ", date: "2026-08-01T14:30:00Z" }
        ]
      },
      {
        name: "Анастасія Кравченко",
        phone: "+380675678901",
        email: "anastasia.kravch@gmail.com",
        telegram: "@anastasia_kr",
        instagram: "anastasia_kr",
        visitorUuid: "00000000-0000-4000-8000-000000000105",
        campaign: "INTENSIVE_RETARGETING",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-06T11:20:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-06T11:25:00Z" },
          { status: "Думає", path: "/checkout", amount: 24000, date: "2026-08-12T14:00:00Z" }
        ]
      },
      {
        name: "Богдан Ткаченко",
        phone: "+380936789012",
        email: "bogdan.tkach@gmail.com",
        telegram: "@bogdan_tkach",
        instagram: "bogdan_tkach",
        visitorUuid: "00000000-0000-4000-8000-000000000106",
        campaign: "AUTOWEB_LOOKALIKE",
        journey: [
          { status: "Клик", path: "/web", date: "2026-08-07T19:00:00Z" },
          { status: "closed_won", path: "/checkout", amount: 450, currency: "USD", offer: "Full Mentorship ($450)", date: "2026-08-09T17:00:00Z" }
        ]
      },
      {
        name: "Юлія Мороз",
        phone: "+380507890123",
        email: "yulia.moroz@icloud.com",
        telegram: "@yulia_moroz",
        instagram: "yulia_m",
        visitorUuid: "00000000-0000-4000-8000-000000000107",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-08T08:30:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-08T08:35:00Z" },
          { status: "closed_lost", path: "/intensive", amount: 0, date: "2026-08-11T13:00:00Z" }
        ]
      },
      {
        name: "Олександр Савченко",
        phone: "+380678901234",
        email: "alex.savch@gmail.com",
        telegram: "@alex_savch",
        instagram: "alex_savch",
        visitorUuid: "00000000-0000-4000-8000-000000000108",
        campaign: "AUTOWEB_COLD_UA",
        journey: [
          { status: "Клик", path: "/web", date: "2026-08-09T20:00:00Z" },
          { status: "В обробці", path: "/web", amount: 18000, date: "2026-08-10T09:30:00Z" }
        ]
      },
      {
        name: "Вікторія Лисенко",
        phone: "+380939012345",
        email: "viktoria.lysenko@gmail.com",
        telegram: "@viktoria_lys",
        instagram: "viktoria_lys",
        visitorUuid: "00000000-0000-4000-8000-000000000109",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-10T12:00:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-10T12:05:00Z" },
          { status: "closed_won", path: "/checkout", amount: 32000, currency: "UAH", offer: "Тариф Преміум 1-on-1", date: "2026-08-14T15:00:00Z" }
        ]
      },
      {
        name: "Сергій Поліщук",
        phone: "+380500123456",
        email: "serhiy.polischuk@gmail.com",
        telegram: "@serhiy_pol",
        visitorUuid: "00000000-0000-4000-8000-000000000110",
        campaign: "TRIPWIRE_OFFER_UA",
        journey: [
          { status: "Клик", path: "/tripwire", date: "2026-08-11T16:00:00Z" },
          { status: "Купив(-ла) Трипвайер", path: "/tripwire", amount: 990, currency: "UAH", offer: "Стартовий набір", date: "2026-08-11T16:20:00Z" },
          { status: "Думає", path: "/checkout", amount: 18000, date: "2026-08-15T11:00:00Z" }
        ]
      },
      {
        name: "Тарас Гриценко",
        phone: "+380631238899",
        email: "taras.g@gmail.com",
        telegram: "@taras_grit",
        visitorUuid: "00000000-0000-4000-8000-000000000111",
        campaign: "VSL_TRAFFIC_TG",
        journey: [
          { status: "Клик", path: "/vsl", date: "2026-08-03T11:00:00Z" },
          { status: "Купив(-ла) Трипвайер", path: "/tripwire", amount: 990, currency: "UAH", offer: "VSL Книга", date: "2026-08-03T11:20:00Z" },
          { status: "closed_won", path: "/checkout", amount: 28000, currency: "UAH", offer: "Тариф VIP Pro", date: "2026-08-08T14:30:00Z" }
        ]
      },
      {
        name: "Наталія Ковальчук",
        phone: "+380974445566",
        email: "natalka.k@ukr.net",
        telegram: "@natalka_k",
        visitorUuid: "00000000-0000-4000-8000-000000000112",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-05T09:15:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-05T09:20:00Z" },
          {
            status: "Анкета заповнена",
            path: "/diagnostics",
            date: "2026-08-07T16:00:00Z",
            quiz: {
              difficulties: "Хочу запустити власну агенцію, не знаю з чого почати юридично",
              budget: "30,000 - 50,000 грн",
              readiness: "Готова до старту",
              goals: "Вийти на $3,000 стабільного доходу"
            }
          },
          { status: "Прийнято в роботу", path: "/diagnostics", amount: 18000, date: "2026-08-09T10:00:00Z" }
        ]
      },
      {
        name: "Артем Дорошенко",
        phone: "+380509988776",
        email: "artem.dorosh@gmail.com",
        telegram: "@artem_dorosh",
        visitorUuid: "00000000-0000-4000-8000-000000000113",
        campaign: "AUTOWEB_COLD_UA",
        journey: [
          { status: "Клик", path: "/web", date: "2026-08-06T20:30:00Z" },
          { status: "Реєстрація на автовеб", path: "/web", date: "2026-08-06T20:35:00Z" },
          { status: "closed_won", path: "/checkout", amount: 600, currency: "USD", offer: "Full Mentorship ($600)", date: "2026-08-09T18:00:00Z" }
        ]
      },
      {
        name: "Марина Василенко",
        phone: "+380683332211",
        email: "maryna.v@gmail.com",
        telegram: "@maryna_v",
        visitorUuid: "00000000-0000-4000-8000-000000000114",
        campaign: "INTENSIVE_RETARGETING",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-07T12:00:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-07T12:05:00Z" },
          {
            status: "Анкета заповнена",
            path: "/diagnostics",
            date: "2026-08-08T11:30:00Z",
            quiz: {
              difficulties: "Немає команди, роблю все сама, вигоряю",
              budget: "40,000 - 80,000 грн",
              readiness: "Потрібна допомога з наймом та делегуванням",
              goals: "Звільнити свій час та подвоїти прибуток"
            }
          },
          { status: "Переговори", path: "/checkout", amount: 24000, date: "2026-08-11T15:00:00Z" }
        ]
      },
      {
        name: "Ярослав Романенко",
        phone: "+380956667788",
        email: "yaroslav.r@gmail.com",
        telegram: "@yaro_rom",
        visitorUuid: "00000000-0000-4000-8000-000000000115",
        campaign: "TRIPWIRE_OFFER_UA",
        journey: [
          { status: "Клик", path: "/tripwire", date: "2026-08-08T15:00:00Z" },
          { status: "Купив(-ла) Трипвайер", path: "/tripwire", amount: 490, currency: "UAH", offer: "Експрес-Доступ", date: "2026-08-08T15:25:00Z" }
        ]
      },
      {
        name: "Христина Остапчук",
        phone: "+380671112233",
        email: "khrystyna.o@gmail.com",
        telegram: "@khrystyna_o",
        visitorUuid: "00000000-0000-4000-8000-000000000116",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-09T14:00:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-09T14:05:00Z" },
          { status: "Думає", path: "/checkout", amount: 18000, date: "2026-08-13T16:00:00Z" }
        ]
      },
      {
        name: "Денис Сидоренко",
        phone: "+380504443322",
        email: "denys.sydor@gmail.com",
        telegram: "@denys_sydor",
        visitorUuid: "00000000-0000-4000-8000-000000000117",
        campaign: "AUTOWEB_COLD_UA",
        journey: [
          { status: "Клик", path: "/web", date: "2026-08-10T19:00:00Z" },
          { status: "Реєстрація на автовеб", path: "/web", date: "2026-08-10T19:05:00Z" },
          { status: "closed_lost", path: "/web", amount: 0, date: "2026-08-12T11:00:00Z" }
        ]
      },
      {
        name: "Андрій Кузьменко",
        phone: "+380679990011",
        email: "andriy.kuzma@gmail.com",
        telegram: "@andriy_kuzma",
        visitorUuid: "00000000-0000-4000-8000-000000000118",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-11T10:00:00Z" },
          { status: "Реєстрація на інтенсив", path: "/intensive", date: "2026-08-11T10:05:00Z" },
          { status: "closed_won", path: "/checkout", amount: 24000, currency: "UAH", offer: "Тариф VIP", date: "2026-08-15T12:00:00Z" }
        ]
      },
      {
        name: "Катерина Білоус",
        phone: "+380501114455",
        email: "kateryna.bilous@gmail.com",
        telegram: "@katya_bilous",
        visitorUuid: "00000000-0000-4000-8000-000000000119",
        campaign: "INTENSIVE_UA_SCALE",
        journey: [
          { status: "Клик", path: "/intensive", date: "2026-08-12T13:00:00Z" },
          {
            status: "Анкета заповнена",
            path: "/diagnostics",
            date: "2026-08-13T17:00:00Z",
            quiz: {
              difficulties: "Шукаю сильного ментора для виходу на міжнародний ринок",
              budget: "100,000+ грн",
              readiness: "Готова оплачувати індивідуальну роботу",
              goals: "Масштабування до $15,000/місяць"
            }
          },
          { status: "Прийнято в роботу", path: "/checkout", amount: 35000, date: "2026-08-14T11:00:00Z" }
        ]
      }
    ];

    // Insert Customers & Orders
    for (const u of sampleUsers) {
      const { data: customer, error: custErr } = await adminSupabase
        .from("unified_customers")
        .insert({
          project_id: SANDBOX_PROJECT_ID,
          name: u.name,
          phone: u.phone,
          email: u.email,
          telegram: u.telegram
        })
        .select()
        .single();

      if (custErr || !customer) {
        console.error("Customer insert error:", custErr);
        continue;
      }

      for (const touch of u.journey) {
        await adminSupabase.from("unified_orders").insert({
          project_id: SANDBOX_PROJECT_ID,
          customer_id: customer.id,
          order_id: `ord_${Math.random().toString(36).substring(2, 9)}`,
          amount: touch.amount || 0,
          status: touch.status,
          campaign_id: u.campaign,
          utm_source: "facebook",
          utm_medium: "cpc",
          utm_campaign: u.campaign,
          created_at: touch.date,
          metadata: {
            currency: touch.currency || "UAH",
            target_sheet: "Sandbox Липень 2026",
            offer_title: touch.offer || "Заявка",
            page_path: touch.path,
            visitor_uuid: u.visitorUuid,
            raw_payload: touch.quiz ? { ...touch.quiz, utms: { utm_campaign: u.campaign, utm_source: "facebook" } } : undefined
          }
        });

        // Insert click event
        await adminSupabase.from("traffic_clicks").insert({
          project_id: SANDBOX_PROJECT_ID,
          visitor_uuid: u.visitorUuid,
          page_path: touch.path,
          utm_source: "facebook",
          utm_medium: "cpc",
          utm_campaign: u.campaign,
          created_at: touch.date
        });
      }
    }

    // 9. Seed Financial Transactions
    const txToSeed = [
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        account_id: "a0000000-0000-4000-8000-000000000002",
        date: "2026-08-07",
        type: "income",
        category: "Оплата за курси",
        description: "Оплата VIP тарифу (Олена Коваленко)",
        currency: "UAH",
        amount: 24000,
        exchange_rate: 0.024,
        amount_usd: 576.0
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000002",
        account_id: "a0000000-0000-4000-8000-000000000002",
        date: "2026-08-10",
        type: "income",
        category: "Оплата за курси",
        description: "Оплата Стандарт тарифу (Максим Шевченко)",
        currency: "UAH",
        amount: 18000,
        exchange_rate: 0.024,
        amount_usd: 432.0
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000002",
        account_id: "a0000000-0000-4000-8000-000000000003",
        date: "2026-08-09",
        type: "income",
        category: "Оплата за курси",
        description: "Payoneer USD курс (Богдан Ткаченко)",
        currency: "USD",
        amount: 450,
        exchange_rate: 1.0,
        amount_usd: 450.0
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        account_id: "a0000000-0000-4000-8000-000000000002",
        date: "2026-08-14",
        type: "income",
        category: "Оплата за курси",
        description: "Оплата Преміум 1-on-1 (Вікторія Лисенко)",
        currency: "UAH",
        amount: 32000,
        exchange_rate: 0.024,
        amount_usd: 768.0
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        account_id: "a0000000-0000-4000-8000-000000000001",
        date: "2026-08-05",
        type: "expense",
        category: "Реклама Meta Ads",
        description: "Поповнення рекламного кабінету Meta Ads",
        currency: "UAH",
        amount: 35000,
        exchange_rate: 0.024,
        amount_usd: 840.0
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        account_id: "a0000000-0000-4000-8000-000000000001",
        date: "2026-08-10",
        type: "expense",
        category: "Підрядники / Сервіси",
        description: "Оплата відеомонтажеру за промо-ролики",
        currency: "UAH",
        amount: 12000,
        exchange_rate: 0.024,
        amount_usd: 288.0
      }
    ];

    await adminSupabase.from("financial_transactions").insert(txToSeed);

    // 10. Seed Tasks & Milestones
    const tasksToSeed = [
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        title: "Запуск таргетованої реклами на Інтенсив",
        description: "Підготувати креативи та запустити масштабну кампанію в Meta Ads",
        due_date: "2026-08-01",
        status: "DONE"
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        title: "Проведення Дня 1 Інтенсиву",
        description: "Прямий ефір на платформі, відправка корисних матеріалів у бот",
        due_date: "2026-08-15",
        status: "DONE"
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        title: "Відкриття вікна продажів та розсилка оферу",
        description: "Відкрити кошик оплат та надіслати анкету зі спецпропозицією",
        due_date: "2026-08-18",
        status: "IN_PROGRESS"
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        title: "Продзвон гарячих анкет діагностики",
        description: "Менеджери відділу продажів зв'язуються з лідами, які заповнили анкети",
        due_date: "2026-08-20",
        status: "TODO"
      },
      {
        project_id: SANDBOX_PROJECT_ID,
        funnel_id: "f0000000-0000-4000-8000-000000000001",
        title: "Закриття вікна продажів та підбиття фінансових підсумків",
        description: "Фіксація виручки, розрахунок ROI та виплата партнерських часток",
        due_date: "2026-08-25",
        status: "TODO"
      }
    ];

    await adminSupabase.from("tasks").insert(tasksToSeed);

    // 11. Trigger synchronous rebuild of CRM Leads Cache via DSU
    await rebuildProjectCache(SANDBOX_PROJECT_ID, SANDBOX_PROJECT_SLUG);

    return {
      success: true,
      message: "Тестовий проект Sandbox успішно згенеровано з повним набором даних (воронки, кліки, ліди, анкетні дані, фінанси, задачі)."
    };
  } catch (err: any) {
    console.error("Error seeding Sandbox project:", err);
    return { error: err.message || "Failed to seed Sandbox project" };
  }
}
