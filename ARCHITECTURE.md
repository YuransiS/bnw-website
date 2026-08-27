# ARCHITECTURE.md (Жива карта проекту & CRM Blueprints)

## 1. Текущий статус проекта и стек
* **Стек:** Next.js (App Router), Supabase (Database, Auth, RLS), Vercel (Deployment).
* **UI-компоненты:** Tailwind CSS, Lucide Icons. Чистый, премиальный монохромный SaaS-минимализм (Slate/Zinc) с полной поддержкой светлой/темной темы.
* **Система ролей B&W CRM:**
  - **Фаундер (`founder`):** Просмотр консолидированных показателей холдинга, сравнение ячеек, просмотр глобального рейтинга продюсеров, логов анти-саботажа, а также полный доступ ко всем проектам, сводной аналитике и панели управления правами сотрудников.
  - **Керівник ячейки (`cell_leader`):** Управление отдельным бизнес-подразделением (ячейкой). Видит проекты и продюсеров исключительно своей ячейки, а также логи анти-саботажа по ним.
  - **Операционный продюсер (`producer`):** Полный доступ (аналитика, графики, воронка, лиды, задачи, воронки) исключительно к закрепленным за ним проектам.
  - **Розробник (`developer`):** Полный доступ к панели администрирования, системным логам, настройкам CRM, диагностике и impersonation-инструментам.
  - **Очікує схвалення (`pending`):** Экран ожидания одобрения администратором.

---

## 2. Файловая структура и компоненты
* `src/app/admin/login/page.tsx` — Экран входа в CRM с поддержкой переключения Вход / Регистрация.
* `src/app/admin/pending/page.tsx` — Защищенный экран ожидания одобрения для новозарегистрированных пользователей с ролью `pending`.
* `src/app/admin/(dashboard)/page.tsx` — Центральный серверный роутер CRM. Выполняет автоматические редиректы в зависимости от роли пользователя (на `/admin/founder`, `/admin/cell/[cellId]`, или на первый доступный `/admin/project/[projectId]`).
* `src/app/admin/(dashboard)/founder/page.tsx` — Панель управления фаундеров (верхнеуровневый обзор всех ячеек, рейтинг продюсеров, аудит дедлайнов).
* `src/app/admin/(dashboard)/cell/[cellId]/page.tsx` — Панель руководителя ячейки (метрики подразделения, рейтинг продюсеров ячейки, проекты и аудит дедлайнов).
* `src/app/admin/(dashboard)/project/[projectId]/page.tsx` — Внутренняя панель проекта для ведения аналитики и воронок (монтирует LeadsDashboard).
* `src/app/admin/(dashboard)/layout.tsx` — Защищенный макет панели управления, проверяющий авторизацию и монтирующий Sidebar.
* `src/app/admin/(dashboard)/Sidebar.tsx` — Интерактивный сайдбар. Группирует проекты по ячейкам для Суперменов/Фаундеров/Руководителей ячеек. Позволяет имперсонировать любую роль для тестов.
* `src/app/admin/(dashboard)/settings/page.tsx` — Страница настроек доступов для Суперменов (управление сотрудниками, ролями и закреплением ячеек).
* `src/app/admin/LeadsDashboard.tsx` — Главный интерфейс CRM для проектов экспертов. Поддерживает вкладки:
  1. **Кабінет Партнера** (только Експерт) — упрощенный финансовый кабинет с расчетом партнерской доли и дорожной картой проекта.
  2. **Воронки** (Супермен, Фаундер, Руководитель ячейки, Продюсер, Маркетолог) — управление маркетинговыми воронками с привязкой UTM-кампаний и лендингов, расчет сквозного ROI воронки.
  3. **Сквозна аналітика** (Супермен, Продюсер, Маркетолог) — тренды, воронка конверсии, UTM-анализ.
  4. **Канбан дошка** — интерактивное управление этапами сделок с помощью HTML5 Drag and Drop API.
  5. **База лідів** — таблица контактов с дедупликацией Disjoint Set Union (DSU) на сервере, отображением полной истории касаний в виде визуальной хронологической дорожки (таймлайна), интерактивной полосой динамических бейджей статусов с количеством лидов, умным фильтром по лендингам (с отображением распределения лидов по посадочным страницам проекта, мульти-лендингам 2+ и прямым обращениям), фильтром по количеству торканий (touchCountFilter), быстрой фильтрацией «За останню добу» и постраничной серверной пагинацией для максимального быстродействия.
  6. **📋 Анкети** — інтерактивна панель (Master-Detail) для детального перегляду відповідей на анкетні форми та опросники. Якщо для проекту ще не обрано жодного анкетного лендінгу, вкладка відображається у вигляді акуратної кнопки «+ Анкети» та відкриває запрошення на первинне налаштування. Налаштування зберігаються безпосередньо в базі даних (`public.projects.survey_landing_paths`). В інтерфейсі вилучено всю технічну інформацію (visitor_uuid, quiz_result, raw_payload) і залишено виключно чисті поля: ім'я, контакти (телефон, Telegram, Instagram, Email), зрозумілі запитання/відповіді та UTM-мітки.
  7. **🐞 Повідомити про помилку** & **💡 Запропонувати покращення** — спеціалізований модуль зворотного зв'язку (`FeedbackTab.tsx`) з перемиканням типів, вибором розділу CRM, пріоритету, авто-збором технічного контексту, захистом чернеток у `localStorage`, персональною історією статусів (`pending`, `in_progress`, `resolved`, `rejected`) та панеллю управління для розробників/адміністраторів.
  8. **Платіжні кнопки** — генератор безопасных WayForPay платежных ссылок.
  * *Дополнительно:* Интегрирована пульсирующая кнопка ошибок валют и модальное окно для распределения транзакций с отсутствующей валютой (USD, UAH, EUR), а также динамическое скрытие нулевых валютных полей (с возвратом к "0 ₴" по умолчанию).
* `src/app/admin/LeadsDashboard/tabs/FeedbackTab.tsx` — Модуль отправки отчетов об ошибках и предложений по улучшению CRM с историей и панелью администрирования.
* `src/app/admin/actions.ts` — Server Actions для выборки объединенной аналитики (`getUnifiedCRMData` с 6-уровневым интеллектальным маппингом кампаний Meta Ads, параллельной чанковой агрегацией без лимитов 1000 записей для масштабирования на миллионы лидов, серверной фильтрацией, DSU-схлопыванием, UTM-деревом, пагинацией и Data Health Check аномалиями), создания лидов вручную, обновления статусов в канбане, `updateOrderCurrencyAction` для фиксации валют транзакций в БД, а также `traceVisitorUuidAction` для сквозного хронологического поиска по visitor_uuid/телефону.

* `src/app/admin/(dashboard)/settings/actions.ts` — Server Actions для создания, удаления сотрудников и управления связями в `profile_projects`.
* `src/app/auth/callback/route.ts` — API роут для обмена временного OAuth-кода на сессию Supabase.
* `src/app/api/crm/leads/route.ts` — HTTP QUERY-эндпоинт (RFC 10008) для фильтрации и поиска лидов с поддержкой резервного POST-туннелирования (`X-HTTP-Method-Override`). Выполняет SQL-агрегацию на стороне СУБД.
* `src/app/api/crm/rebuild-cache/route.ts` — API роут-приемник Upstash QStash для гарантированного асинхронного ребилда кэша в облаке Vercel с проверкой подписей вебхуков.
* `src/app/api/v1/landings/register/route.ts` — HTTP POST API-шлюз для автоматической регистрации лендингов, веб-страниц и поддерживаемых URL-параметров (`?p`, `?o`, `?utm_*`) с внешних сайтов холдинга (`SvitlanaTapes`, `victoria-mc`, `economica` и др.).
* `src/app/api/v1/landings/route.ts` — HTTP GET API-эндпоинт для динамического получения реестра лендингов и параметров проекта.
* `src/lib/projectLandings.ts` — Сервисный модуль с функцией `getProjectLandings` для подгрузки динамического реестра страниц из БД с безопасным fallback к статической конфигурации.
* `src/lib/bnwLandingTracker.ts` — Клиентский SDK-модуль для мгновенной интеграции авто-регистрации страниц и URL-параметров на внешних сайтах.
* `src/lib/sendpulse/service.ts` — SendPulse REST API клиент с автоматическим кешированием Bearer-токенов, получением ботов (Telegram/Instagram), управлением переменными (`setVariable`) и выгрузкой активных подписчиков.
* `src/app/api/v1/integrations/sendpulse/webhook/route.ts` — Высокопроизводительный Webhook-приемник событий из чат-ботов SendPulse (`bot_started`, `lesson_1`, `lesson_2`, `completed`, `offer_clicked`) с автоматическим созданием профилей в CRM для новых подписчиков, генерацией сквозного `bw_cid`, обратной записью `bw_cid` в SendPulse и точной изоляцией по `funnel_id`.
* `src/app/admin/LeadsDashboard/tabs/FunnelsTab.tsx` — Модуль сквозных воронок с поддержкой типов «Клуб / Підписка», адаптацией под органические запуски без платного трафика, конструктором вебхуков шагов и интерактивной панелью «Підписники бота & Сквозний маппінг (bw_cid)» с поиском, фильтрами и кнопкой синхронизации 1-в-1 с автоматической генерацией `bw_cid` для 100% подписчиков.
* `src/components/ui/ParabolicProgressBar.tsx` — Универсальный нелинейный прогрессбар и оверлей загрузки (`useParabolicProgress`, `ParabolicProgressBar`, `ParabolicLoadingOverlay`). Реализует ниспадающую параболическую кривую замедления ($p(t) = \text{max} \cdot (1 - (1 - t/T)^2)$): быстрый старт на начальном этапе с плавным асимптотическим замедлением к 94-98% во время ожидания ответа, мгновенным сглаженным переходом на 100% при завершении и аккуратным скрытием. Используется во всех экранах загрузки дашборда, переключении вкладок и подгрузке данных.

---

## 3. Схема данных (Supabase PostgreSQL)

### Таблица `public.bot_funnel_events`
Фіксація проходження вех і мікроконверсій всередині чат-ботів (SendPulse / Telegram / Instagram) з точною ізоляцією за воронками.
* `id` (UUID, primary key)
* `project_id` (UUID references `public.projects(id) ON DELETE CASCADE`)
* `funnel_id` (UUID references `public.funnels(id) ON DELETE SET NULL`) — Пряма прив'язка події до конкретної воронки
* `customer_id` (UUID references `public.unified_customers(id) ON DELETE SET NULL`)
* `order_id` (UUID references `public.unified_orders(id) ON DELETE SET NULL`)
* `bw_cid` (TEXT) — Насквозний ідентифікатор клієнта (наприклад, `bw_02e252b9c1a94f35`)
* `telegram_id` (BIGINT) — Унікальний Telegram ID підписника
* `bot_id` (TEXT) — ID бота в SendPulse
* `step` (TEXT) — Назва вехи (`bot_started`, `lesson_1`, `lesson_2`, `completed`, `offer_clicked`)
* `payload` (JSONB) — Повні змінні контакту, теги та метадані
* `created_at` (TIMESTAMPTZ)

### Таблица `public.discovered_pages`
Динамический реестр страниц, лендингов и веб-роутов проектов холдинга, автоматически обновляемый через Discovery Protocol и конфигурации.
* `id` (UUID, primary key)
* `project_id` (UUID references `public.projects(id) ON DELETE CASCADE`)
* `path` (TEXT) - Нормализованный относительный путь (`/mini-course/ai`, `/diagnostic`)
* `title` (TEXT) - Отображаемая метка страницы ("Міні-курс AI", "Головна")
* `source` (VARCHAR) - Источник регистрации (`'config'`, `'external'`, `'traffic_auto_detect'`)
* `last_seen_at` (TIMESTAMPTZ) - Время последней активности/валидации
* `created_at` (TIMESTAMPTZ) - Время регистрации роута

### Поля сквозной аналитики и атрибуции (`traffic_clicks` & `unified_orders`)
* `bw_cid` (TEXT) — Насквозной идентификатор клиента (`bw_...`), связывающий клик на сайте, регистрацию, чат-бота SendPulse и финальный эквайринг (WayForPay).
* `offer_id` (TEXT) — Идентификатор конкретного оффера (`?o=...` или `?offer=...`)
* `promo_id` (TEXT) — Идентификатор промокода / скидочного пакета (`?p=...` или `?promo=...`)
* `query_params` (JSONB) — Полный набор параметров URL для сквозного отслеживания
* **Сквозная атрибуция первого касания (First-Touch Lead Stitching):** Триггер БД `trg_inherit_customer_utm` автоматически переносит исходные рекламные UTM-метки (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_id`) с первичной регистрации лида на любые последующие платежные транзакции клиента (WayForPay, Monobank, боты), исключая попадание оплат в "Прямой/Органический трафик".
* **Составные индексы:** `bot_funnel_events_proj_step_idx`, `bot_funnel_events_bw_cid_idx`, `bot_funnel_events_tg_id_idx`, `idx_traffic_clicks_proj_visitor`, `idx_traffic_clicks_proj_offer`, `idx_unified_orders_proj_offer`, `idx_unified_orders_proj_promo`, `daily_traffic_and_costs_full_unique_idx` для высокой скорости работы и защиты от дублей при синхронизации Meta Ads.
* **Enterprise RPC `get_customer_journey_scoped`:** Функция СУБД для изолированного по проекту объединения и выборки всех кликов и заказов лида.



### Таблица `public.profiles`
* `id` (UUID, primary key references `auth.users`)
* `email` (TEXT)
* `role` (TEXT, по умолчанию `'pending'`, варианты: `'founder'`, `'cell_leader'`, `'producer'`, `'developer'`, `'pending'`)

### Таблица `public.cells`
Определяет организационную структуру (ячейки).
* `id` (UUID, primary key)
* `name` (TEXT) - Название ячейки (например, "Ячейка Альфа")
* `cell_leader_id` (UUID references `public.profiles(id)`) - Керівник ячейки
* `created_at` (TIMESTAMP)

### Таблица `public.funnels`
Маркетинговые воронки проектов для сквозной аналитики.
* `id` (UUID, primary key)
* `project_id` (UUID references `public.projects(id) ON DELETE CASCADE`)
* `name` (TEXT) - Название воронки
* `start_date` (DATE) - Дата старта
* `end_date` (DATE, nullable) - Дата завершения воронки
* `campaign_ids` (TEXT[]) - UTM Campaign ID, привязанные к воронке
* `landing_slugs` (TEXT[]) - Лендинги, привязанные к воронке
* `bot_username` (TEXT, nullable) - Конкретный привязанный Telegram/Instagram бот SendPulse
* `bot_steps` (JSONB, default '[]') - Кастомные шаги и вебхуки воронки с авто-транслитерацией
* `planned_revenue` (NUMERIC, default 0) - Плановый доход воронки
* `planned_spend` (NUMERIC, default 0) - Плановые затраты воронки
* `stages` (JSONB, default '[]') - Массив кастомных этапов воронки
* `description` (TEXT) - Описание воронки
* `created_at` (TIMESTAMP)

### Таблица `public.projects` (Интеграционные поля)
* `sendpulse_client_id` (TEXT, nullable) - SendPulse Client ID проекта
* `sendpulse_client_secret` (TEXT, nullable) - SendPulse Secret Key проекта
* `meta_ad_account_id` (TEXT, nullable) - Привязанный Meta Ad Account ID проекта

### Таблица `public.tasks`
Дедлайны и вехи (milestones) для продюсеров и экспертов.
* `id` (UUID, primary key)
* `project_id` (UUID references `public.projects(id) ON DELETE CASCADE`)
* `title` (TEXT) - Название задачи
* `description` (TEXT)
* `status` (TEXT, 'pending' | 'completed')
* `due_date` (DATE) - Срок выполнения
* `created_at` (TIMESTAMP)

### Таблица `public.task_logs`
Анти-саботаж журнал изменения сроков задач.
* `id` (UUID, primary key)
* `task_id` (UUID references `public.tasks(id) ON DELETE CASCADE`)
* `old_due_date` (DATE)
* `new_due_date` (DATE)
* `postponement_reason` (TEXT) - Причина переноса срока (обязательное поле)
* `changed_by` (UUID references `public.profiles(id)`)
* `created_at` (TIMESTAMP)

### Добавленные поля в таблицу `public.projects`
* `cell_id` (UUID references `public.cells(id)`) - Привязка проекта к ячейке
* `expert_share_percentage` (NUMERIC) - Процент эксперта (для финансовой доли)
* `marketer_share_percentage` (NUMERIC) - Процент маркетолога
* `survey_landing_paths` (TEXT[]) - Настраиваемый список путей/URL лендингов, которые считаются анкетами (опросниками) проекта.

### Таблица `public.profile_projects`
Таблица связей (junction table) для распределения доступов сотрудников к проектам.
* `profile_id` (UUID references `public.profiles(id) ON DELETE CASCADE`)
* `project_id` (UUID references `public.projects(id) ON DELETE CASCADE`)

### Автоматический триггер `on_auth_user_created`
При любой регистрации пользователя в Supabase Auth автоматически создается профиль со статусом `pending`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'pending')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Сводные RPC функции
* `public.get_project_aggregated_kpi(p_project_id, p_start_date, p_end_date)` — **Основная высокопроизводительная аналитическая процедура.** Выполняет полную дедупликацию, агрегацию выручки (курсы, трипваеры, подписки), расходов Meta Ads, OPEX и расчет ROI/CPL/Conversion Rate на стороне PostgreSQL за 10-30 мс, полностью устраняя необходимость выкачки тысяч строк в оперативную память Node.js.
* `public.fn_is_status_paid(p_status)` — Каноническая функция проверки оплаченности статуса заказа (Single Source of Truth), синхронизированная между PostgreSQL и `statusMapper.ts`.
* `public.fn_convert_to_uah(p_amount, p_currency, p_date)` / `public.fn_convert_to_usd(...)` — Канонический валютный шлюз для динамической конвертации сумм по историческим курсам НБУ из таблицы `exchange_rates`.
* `public.fn_classify_order_type(p_metadata, p_amount, p_currency)` — Единая функция классификации заказов (`course`, `tripwire`, `subscription`, `lead`).
* `public.get_projects_summary()` — Возвращает таблицу агрегированных метрик по всем активным проектам холдинга (`is_active = true`), включая выручку (USD, UAH, EUR), расходы, лиды и CPL. Использует функцию `public.fn_is_status_paid` и применяет SQL-дедупликацию `DISTINCT ON (project_id, order_id)`.
* `public.get_superman_summary()` — Консолидированная сводка фаундера по проектам с единой валютной нормализацией и корректным учетом всех типов продуктов.
* `public.get_producers_leaderboard()` — Рейтинг операционных продюсеров с расчетом совокупной выручки, окупаемости и ROI по всем закрепленным проектам.
* `public.swap_crm_leads_cache(p_project_id)` — Функция атомарного свопа кэша из staging-таблицы в рабочую crm_leads_cache без zero-data downtime.
* `public.get_crm_metrics(...)` — Функция бэкенд-агрегации сквозных финансовых показателей проектов на уровне БД с использованием static placeholders (EXECUTE ... USING).
* `public.get_traffic_clicks_summary(...)` — Функция БД-свертки уникальных кликов по UTM-меткам.
* `public.get_utm_leads_summary(...)` — Функция БД-свертки уникальных лидов по UTM-меткам для построения UTM-дерева без перегрузки RAM Node.js.

### Автоматическая очистка тестовых записей (pg_cron)
* **Функция `public.clean_up_test_records()`**: Удаляет тестовые записи из таблиц `unified_orders`, `unified_customers`, а также из всех raw-таблиц проектов (`victoria_leads`, `valeria_leads`, `svitlana_leads`, `clean_klinom_leads`, `viktoria_chernysh_leads` и `sergiy_leads`) по расширенному набору масок (`test`, `tests`, `тест`, `qa`, `q&a`, `gemini`, `antigravity`, `user`, телефон `1234567`). В конце выполнения автоматически сбрасывает кэш проектов, выставляя `is_dirty = true` в `crm_cache_dirty_queue`.
* **Supabase pg_cron Job**: Задача `nightly-crm-test-cleanup` запускается ежедневно в `01:00 UTC` (3:00 / 4:00 AM по Киеву) для полной очистки тестового мусора из базы.

---

## 4. Логика сквозной аналитики и слияния лидов (DSU)
* **Disjoint Set Union (DSU):** Клиентская CRM на лету группирует отдельные заявки, клики и транзакции, разделяющие одинаковый номер телефона, Telegram, Email или `visitor_uuid`, формируя единый профиль клиента. Для исключения ложных объединений по пустым/шаблонным полям внедрены фильтр-заглушки: игнорируются шаблонные телефоны (состоящие из одинаковых цифр или простых последовательностей типа `1234567`, а также `380000000000`), общие Telegram никнеймы (`test`, `tg`, `none`, `na`, `user` и др.) и общие Email шаблоны (`test@test.com`, `no-reply@...`, `noreply@...`).
* **Строгая агрегация транзакций:** Клиентская DSU-агрегация группирует транзакции по уникальной связке `order_id` + `project_id`.
  * **Дедупликация транзакций без `order_id`:** Для транзакций, у которых отсутствует `order_id` (использующих UUID строки), применяется дедупликация по времени и сумме. Если у одного клиента обнаруживается несколько транзакций без `order_id` для одного и того же проекта с одинаковой суммой, созданных в пределах **30 минут**, они схлопываются в одну транзакцию (с приоритетом успешного статуса оплаты).
* **Сквозная сводка холдинга:** Супермен видит общую окупаемость по экспертам, где расходы подтягиваются из `daily_traffic_and_costs`, а выручка и лиды из `unified_orders` и `unified_customers`.
  * **Meta Spend Sync уникальность:** Таблица `daily_traffic_and_costs` хранит колонки `ad_id` and `adset_id` со статусом `NOT NULL DEFAULT ''`. Уникальный индекс `unique_daily_spend` построен по колонкам `(project_id, date, utm_source, campaign_id, ad_id)`. Импорт рекламных расходов использует метод `.upsert()` с явным указанием `onConflict: "project_id,date,utm_source,campaign_id,ad_id"`, предотвращая дублирование записей и сбои БД при повторном запуске крона.
  * **Ad Spend Mappings:** Таблица `ad_spend_mappings` связывает рекламные аккаунты Meta (`act_...`) со слагами проектов (`victoria`, `svitlana`, `sofia`, `sergiy`, `viktoria_chernysh`, `clean_klinom`).

---

## 5. Нормализация и маппинг статусов
* **Децентрализация маппинга статусов:** Логика маппинга перенесена из БД (триггер `fn_sync_lead_to_unified()` теперь сохраняет статус "как есть") на уровень Next.js.
* **Маппер статусов (`src/lib/statusMapper.ts`):** Общий конфигурационный хелпер на бэкенде Next.js (в API шлюза аналитики `victoria-mc` и CRM `bnw-website`) приводит любые текстовые статусы от платежных систем (WayForPay, Approved, Declined) или ручных таблиц к трем системным статусам: `closed_won`, `declined` или `pending`.
* **Ієрархія Тегів (Tag Hierarchy Engine):** Автоматическая генерация 3 уровней тегов для лидов (Уровень 1: Жизненный цикл — `Зареєструвався`, `Залишив заявку`, `Кинув кошик` для реальных платных попыток, `Клієнт`; Уровень 2: Точки контакта — лендинги; Уровень 3: Продукты). Статус «Кинув кошик» выставляется только при наличии реального намерения оплатить платный продукт (`amount > 0` / payment intent) без завершения оплаты (`!hasPayment`).
* **Сквозное логирование производительности:** На панели QA Debug отображаются показатели `clientRequestMs` (сетевая задержка «круг/сеть» между клиентом и Server Action) и `cacheRebuildMs` (время синхронной генерации кэша в бэкенде на первом холодном запросе).

---

## 6. Протокол Auto-Discovery & Healthcheck («Пинг-Понг»)
* **Двусторонний обмен данными между CRM и сателлитами:**
  1. **Pull (CRM -> Сателлиты):** Периодический крон `GET /api/cron/ping-projects` или Server Action `pingAllProjectsAction()` опрашивает сателлитные сайты по адресу `/api/v1/discovery`. Получает актуальную структуру страниц (`path`, `label`, `type`, `parameters`) и синхронизирует их в таблицу `project_landings`. Если сайт не отвечает 3 раза подряд (`missed_pings >= 3`), его статус переводится в `unresponsive` / деактивируется.
  2. **Push (Сателлиты -> CRM):** При деплое или изменении структуры сателлиты отправляют `POST /api/v1/projects/heartbeat` в CRM, восстанавливая статус `is_active = true` и обновляя каталог страниц.
* **Стандартный хелпер для сателлитов:** `src/lib/bnwSatelliteDiscovery.ts` предоставляет функцию `createDiscoveryHandler()` для быстрого подключения эндпоинта `/api/v1/discovery` в Next.js App Router.
* **Интерфейс реестра в CRM:** Вкладка `LandingsRegistryTab.tsx` отображает список всех проектов, задержку отклика, индикаторы здоровья (🟢 Live / 🔴 Offline), список обнаруженных страниц с типами и кнопками перехода в 1 клик, а также кнопку ручного пинга всех сайтов холдинга.

---

## 7. Управление проектами и интеграция рекламных кабинетов Meta (Facebook API)
* **Каталог активных официальных проектов:**
  - `svitlana`: **Світлана Тейп** (Ad Account: `act_1363085972126749` — Тейпування 1)
  - `anastasia_sych`: **Анастасія Сич** (Ad Account: `act_643114835286850` — Фітнес-тренерка Анастасія Сич)
  - `nesoniaa`: **Nesoniaa** (Ad Account: `act_1062492249359185` — Nedesign)
  - `victoria`: **Вікторія Візуал** (Ad Account: `act_338278609686728` — 338278609686728)
  - `clean_klinom`: **clean.klinom** (Ad Account: `act_955118766915652` — SW LAB)
  - `sergiy`: **Сергій Чернявський** (Ad Account: `act_1451088823442765` — Sergiy.Chernyavskyy.Business)
  - `viktoria_chernysh`: **Вікторія Черниш** (Ad Account: `act_964399519877110` — Вікторія Ч)
  - `sofia`: **Софія (Economica / Sofifinsight)** (Ad Account: `act_181400377513509` — Matviyko)
  - `bw_main`: **B&W Main** (Мастер-проект агентства)
  - `sandbox`: **🧪 Sandbox (Тестовий Проект)**
* **Архивные неактивные проекты (`is_active = false`):**
  - `valeria` (Valeria — закрыт)
  - `vova_win` (Vova.win — закрыт)
* **Модальное окно управления проектом (`ProjectSettingsModal.tsx`):** Доступно ролям `founder`, `developer`, `superman`, `admin`. Позволяет редактировать официальное название, ответственного лидера ячейки, базовую валюту, статус активности (`is_active`) и долю эксперта.
* **Мульти-токен архитектура Meta Graph API:**
  - Функции `getAllActiveMetaTokens()`, `getMetaAdAccountsAction()`, `getMetaAccountCampaignsAction()`, `getTrafficAnalyticsData()` и крон `/api/cron/sync-spend` поддерживают одновременную работу с несколькими токенами доступа (например, токен Business Manager фаундера + токен таргетолога).
  - Система автоматически агрегирует список доступных рекламных аккаунтов со всех подключенных Business Manager и бесшовно выполняет запросы к кампаниям через соответствующий рабочий токен.
  - Функция `bindProjectAdAccountAction()` сохраняет маппинг в таблицу `ad_spend_mappings`.

---

## 8. Модуль розробницького пісочниці (Developer Sandbox & Test Data Simulator)
* **ID Проекту:** `e0000000-0000-4000-8000-000000000001`
* **Slug:** `sandbox`
* **Назва:** `🧪 Sandbox (Тестовий Проект)`
* **Призначення:** Повноцінна імітація реального проекту інфобізнесу для безпечного тестування, відлагодження нових функцій, перевірки DSU-кластеризації, лідів, анкетних відповідей, воронок та фінансового обліку.
* **Server Action:** `seedSandboxProjectAction()` у `src/app/admin/sandboxActions.ts`.
* **Склад тестового датасету:**
  1. **Лендінги:** 8 зареєстрованих веб-сторінок (`/`, `/intensive`, `/web`, `/vsl`, `/tripwire`, `/diagnostics`, `/checkout`, `/thank-you`) у `discovered_pages` та `DEFAULT_PROJECT_LANDINGS`.
  2. **Воронки:** 3 активні та завершені воронки (`Інтенсив`, `Автовеб`, `VSL`) з плановими та фактичними показниками доходу і витрат.
  3. **Рекламні витрати (Meta Ads):** 30 днів щоденних витрат ($ і ₴), кліків та показів по 6 маркетинговим кампаніям у `daily_traffic_and_costs`.
  4. **Клієнти та Замовлення:** 20+ реалістичних клієнтів з багатоканальними точками дотику (UTM facebook/instagram/telegram, кліки, реєстрації, трипваєри, заповнені анкети діагностики з `raw_payload`, замовлення в різних статусах від «Новий» до «Купив курс» з валютами UAH/USD).
  5. **Фінансові рахунки та проводки:** 4 розрахункові рахунки (ПриватБанк ФОП, WayForPay, Payoneer USD, Готівкова каса) та транзакції доходів/витрат.
  6. **Задачі та дедлайни:** 5 вех анти-саботажу зі статусами `DONE`, `IN_PROGRESS`, `TODO`.
  7. **Синхронізація кэшу:** Автоматичний синхронний перезапуск `rebuildProjectCache(projectId, 'sandbox')` з формуванням `crm_leads_cache`.

---

## 9. Архітектура навігації та CRM модулів (UX Overhaul)
* **Постійна навігація (Загальна аналітика):** Кнопка `📊 Загальна аналітика` доступна для всіх авторизованих ролей (`admin`, `superman`, `founder`, `developer`, `cell_leader`, `producer`), що забезпечує 1-клік повернення до зведеного огляду проекту.
* **Вкладка «Лендінги» (`LandingsRegistryTab.tsx`):** Строго фільтрується за поточним активним проектом (`activeSlug`), відображає розширені картки лендінгів з підтримуваними параметрами (`?p`, `?o`, `?utm_*`), прямим копіюванням посилань та вбудованим модальним вікном Live Preview (`iframe`).
* **Єдина консолідована база «Ліди» (`LeadsTab.tsx`):** Об'єднаний хаб контактів із DSU-дедуплікацією, фільтром за воронками (`sourceFilter`), індикатором заповнених анкет (`📋 Анкета`) та мульти-торканнями.
---

## 10. Канонічні серверні процедури PostgreSQL (RPC Layer)
* **`public.fn_is_status_paid(status TEXT) RETURNS BOOLEAN`:** Єдина канонічна функція перевірки оплати замовлення. Суворо фільтрує помилкові збіги (`Передано у ВП`, `⏳ Перехід до оплати`, `Клик на форму оплати`, `Не оплачено`) та повертає `TRUE` для `Approved`, `paid`, `closed_won`, `Купив курс`, `Купив(-ла) Трипвайер` тощо.
* **`public.fn_convert_to_uah(amount NUMERIC, currency TEXT, target_date DATE) RETURNS NUMERIC`:** Конвертує будь-яку суму в UAH за офіційним курсом НБУ на дату замовлення (або найближчу відому дату).
* **`public.fn_convert_to_usd(amount NUMERIC, currency TEXT, target_date DATE) RETURNS NUMERIC`:** Конвертує будь-яку суму в USD за офіційним курсом НБУ на дату замовлення.
* **`public.fn_classify_order_type(metadata JSONB, amount NUMERIC, currency TEXT) RETURNS TEXT`:** Автоматично класифікує замовлення на `'tripwire'` або `'course'` на основі структури метаданих, шляху сторінки, тарифу та суми.
* **`public.get_project_aggregated_kpi(p_project_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ) RETURNS JSONB`:** Розраховує консолідовані KPI проекту (виручка UAH/USD, витрати на рекламу, операційні витрати, чистий прибуток, ROI, CPL, CR) менш ніж за 30 мс на рівні БД.
* **`public.get_funnel_analytics_aggregated(p_funnel_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ) RETURNS JSONB`:** Розраховує конверсії по кроках воронки (Кліки -> Реєстрації -> Анкети -> Оплати), дохід, витрати та ROI по всій базі даних без завантаження лидів у пам'ять Node.js.

---

## 13. Чиста аналітика Meta Ads (Pure Meta Insights) та модель 100% звірки даних
* **Вкладка «Трафік» (Pure Meta Ads API):**
  - Працює виключно з даними рекламного кабінету Meta Ads (`daily_traffic_and_costs`) без змішування з внутрішніми замовленнями CRM чи штучними UTM-маппінгами.
  - Показники вкладки: Бюджет ($), Кліки, Покази, CTR %, CPM, CPC, Ліди Meta (`meta_leads`), Ціна ліда Meta (`cpl`), Продажі за пікселем Meta (`meta_purchases`), Вартість конверсій Meta (`meta_purchase_value_usd`), ROAS (`meta_purchase_value_usd / spend`).
  - Виключено фантомні кампанії `custom_...` та `organic_direct` з рекламного дашборду.
* **Розширена таксономія дій Meta (Action Types Parser):**
  - **Ліди:** `offsite_conversion.fb_pixel_lead`, `onsite_web_lead`, `lead`, `onsite_conversion.lead_grouped`, `offsite_lead_add_20_s_calls`, `onsite_conversion.messaging_conversation_started_7d`, `onsite_conversion.total_messaging_connection`, а також кастомні конверсії `offsite_conversion.custom.*`.
  - **Покупки:** `offsite_conversion.fb_pixel_purchase`, `onsite_web_purchase`, `omni_purchase`, `purchase`, `onsite_web_app_purchase`, `web_in_store_purchase`, `web_app_in_store_purchase`, `offsite_purchase_add_20_s_calls`.
  - **Конверсійна вартість:** Автоматичний розрахунок з `action_values` з конвертацією в USD за актуальними курсами НБУ.
* **Синхронізація ручного та автоматичного імпорту:**
  - Обидва контури (`/api/cron/sync-spend` та `syncProjectAdSpendNowAction`) запитують повний набір полів (`campaign_id, campaign_name, adset_id, ad_id, spend, impressions, clicks, actions, action_values, date_start`), виключаючи затирання конверсій пікселя нулями при ручному оновленні.
* **100% узгодженість фінансових контурів:**
  - Всі 6 бізнес-екранів (`FounderDashboard`, `CellDashboard`, `AnalyticsTab`, `FunnelsTab`, `FinanceDashboard`, `FinanceExpertTab`) синхронізовані через канонічний PostgreSQL RPC `get_project_aggregated_kpi` та єдиний механізм дедуплікації замовлень `DISTINCT ON (project_id, COALESCE(order_id, id::text))`.

---

## 14. Глобальна фільтрація періодів, ізоляція проектів розробника та інтерактивні тренди
* **Глобальний фільтр дат за замовчуванням («Поточний місяць»):**
  - На головній сторінці фаундерів (`/admin/founder`), в дашбордах осередків (`/admin/cell/[cellId]`) та проектній аналітиці встановлено період за замовчуванням — **«Поточний місяць»** (з 1-го числа до кінця місяця).
  - Підтримуються пресети: `Сьогодні`, `Поточний місяць` (Default), `30 днів`, `Весь час`, `Кастомний діапазон` з інтерактивним перерахунком через Server Action `getFounderDashboardDataAction`.
* **Ізоляція тестових та системних проектів (`sandbox` та `bw_main`):**
  - Проекти `🧪 Sandbox` та `B&W Main` виключені з загальних списків та зведених звітів фаундерів, лідерів осередків, продюсерів та менеджерів з продажу.
  - Проекти відображаються виключно для ролей із технічним доступом (`developer`, `admin`, `superman`).
* **Відновлення структури осередків та продюсерів:**
  - `Анастасія Сич` закріплена за ячейкою `Уткин Дмитрий` (`4944b399-429f-423e-a4ab-e24b49c71d32`).
  - `Вікторія Черниш` коректно пов'язана з лідером ячейки в `profile_projects`.
* **Фільтрація воронок на графіку тренду заявок (`AnalyticsTab`):**
  - Додано випадаючий список вибору воронки над графіком *«Тренд реєстрацій заявок»*.
  - Автоматичне приховування пустих/нульових граничних інтервалів (`effectiveTrendData`).
* **Розширений парсер подій Meta Pixel (Консультації та Заявки):**
  - У `getTrafficAnalyticsData` додано обробку подій `Schedule`, `Contact`, `Submit Application`, `custom.consultation`, `custom.anketa`, `custom.diagnostika`, `InitiateCheckout`, `CompleteRegistration` тощо.

---

## 15. Уніфікована аналітика продюсерів та повна ізоляція Sandbox
* **Повна ізоляція Sandbox у зведених KPI:**
  - У `getFounderDashboardDataAction` загальні показники холдингу (`totalRevenueUah`, `totalSpendUah`, `totalProfitUah`, `globalRoi`) розраховуються суворо за комерційними проектами холдингу, виключаючи тестовий `sandbox` та службовий `bw_main`.
  - Тестові проекти доступні для тестування виключно в ізольованому блоці "Інші проекти" внизу екрана, не спотворюючи фінансові звіти керівництва.
* **Швидка уніфікована сторінка Продюсера (`/admin/producer/[producerId]`):**
  - Замінено важкий монолітний виклик `getUnifiedCRMData("all")` на паралельні швидкі RPC `get_project_aggregated_kpi` (завантаження < 50 мс).
  - Впроваджено єдиний фільтр періодів з вибором за замовчуванням «Поточний місяць» (`this_month`), а також підтримкою пресетів `Сьогодні`, `7 днів`, `30 днів`, `Минулий місяць`, `2026 рік`, `Весь час` та `Кастомно`.
  - Інтегровано мультивалютний перемикач (`₴ UAH / $ USD / € EUR`), що забезпечує 100% узгоджений розрахунок доходу, витрат, прибутку, CPL та ROI в єдиній обраній валюті без крос-валютного змішування.

---

## 16. Повне виключення Email з алгоритмів дедуплікації та зшивання лідів
* **Відмова від Email як критерію ідентифікації:**
  - Оскільки холдинг не збирає та не використовує email як первинний ідентифікатор клієнта (воронки та боти оперують виключно `Name`, `Phone`, `Telegram`, `Instagram`), дедуплікацію за `email` повністю вилучено з усіх рівнів системи.
* **Рівень бази даних (PostgreSQL):**
  - Оновлено тригерні та RPC-функції (`fn_sync_lead_to_unified`, `register_lead_via_api`), виключено перевірку `email = v_email`.
  - Пошук та зв'язування `unified_customers` здійснюється виключно за валідним номером телефону (`phone`) або юзернеймом (`telegram` / `instagram`).
* **Рівень додатка (DSU Clustering Cache):**
  - У `src/lib/crmCache.ts` повністю видалено `emailMap` та операції `dsu.union` за email.
  - Усунено будь-які ризики помилкового схлопування клієнтів через сервісні та плацехолдерні адреси.


