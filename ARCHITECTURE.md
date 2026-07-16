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
  5. **База лідів** — таблица контактов с дедупликацией Disjoint Set Union (DSU) на сервере, отображением полной истории касаний в виде визуальной хронологической дорожки (таймлайна) при клике на любого клиента в списке, новым фильтром по количеству торканий (touchCountFilter), быстрой фильтрацией «За останню добу» и постраничной серверной пагинацией по 100 лидов для максимальной быстродействия и легкости сетевого payload.
  6. **📋 Анкети** — специализированная панель (Master-Detail) для детального просмотра ответов на анкеты и опросники по каждому лиду с поддержкой фильтрации по датам и быстрого выбора «За останню добу». Поля анкет извлекаются полностью динамически из `raw_payload` (JSONB) каждого лида с сопоставлением ключей (purpose, difficulties, readiness, subscription_duration, etc.) к удобным украинским меткам, поддерживая любые новые вопросы без изменения бэкенда. Для проекта Victoria отображаются только две разрешенные анкеты: "rozbir" и "VSL-форма".
  7. **Платіжні кнопки** — генератор безопасных WayForPay платежных ссылок.
  * *Дополнительно:* Интегрирована пульсирующая кнопка ошибок валют и модальное окно для распределения транзакций с отсутствующей валютой (USD, UAH, EUR), а также динамическое скрытие нулевых валютных полей (с возвратом к "0 ₴" по умолчанию).
* `src/app/admin/actions.ts` — Server Actions для выборки объединенной аналитики (`getUnifiedCRMData` с серверной фильтрацией, DSU-схлопыванием, UTM-деревом, пагинацией, замерами `performance.now()` и Data Health Check аномалиями), создания лидов вручную, обновления статусов в канбане, `updateOrderCurrencyAction` для фиксации валют транзакций в БД, а также `traceVisitorUuidAction` для сквозного хронологического поиска по visitor_uuid/телефону.
* `src/app/admin/(dashboard)/settings/actions.ts` — Server Actions для создания, удаления сотрудников и управления связями в `profile_projects`.
* `src/app/auth/callback/route.ts` — API роут для обмена временного OAuth-кода на сессию Supabase.
* `src/app/api/crm/leads/route.ts` — HTTP QUERY-эндпоинт (RFC 10008) для фильтрации и поиска лидов с поддержкой резервного POST-туннелирования (`X-HTTP-Method-Override`). Выполняет SQL-агрегацию на стороне СУБД.
* `src/app/api/crm/rebuild-cache/route.ts` — API роут-приемник Upstash QStash для гарантированного асинхронного ребилда кэша в облаке Vercel с проверкой подписей вебхуков.

---

## 3. Схема данных (Supabase PostgreSQL)

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
* `campaign_ids` (TEXT[]) - UTM Campaign ID, привязанные к воронке
* `landing_slugs` (TEXT[]) - Лендинги, привязанные к воронке
* `description` (TEXT)
* `created_at` (TIMESTAMP)

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
* `public.get_projects_summary()` — Возвращает таблицу агрегированных метрик по всем активным проектам холдинга (`is_active = true`), включая выручку (USD, UAH, EUR), расходы, лиды и CPL. Использует функцию `public.normalize_status` и применяет SQL-дедупликацию `DISTINCT ON (project_id, order_id)` для отсеивания дублей транзакций.
* `public.get_campaigns_summary()` — Возвращает таблицу ROI и окупаемости по рекламным кампаниям активных проектов холдинга. Исключает трипвайер-листы из выручки и применяет SQL-дедупликацию транзакций.
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

---

## 5. Нормализация и маппинг статусов
* **Децентрализация маппинга статусов:** Логика маппинга перенесена из БД (триггер `fn_sync_lead_to_unified()` теперь сохраняет статус "как есть") на уровень Next.js.
* **Маппер статусов (`src/lib/statusMapper.ts`):** Общий конфигурационный хелпер на бэкенде Next.js (в API шлюза аналитики `victoria-mc` и CRM `bnw-website`) приводит любые текстовые статусы от платежных систем (WayForPay, Approved, Declined) или ручных таблиц к трем системным статусам: `closed_won`, `declined` или `pending`.
* **Сквозное логирование производительности:** На панели QA Debug отображаются показатели `clientRequestMs` (сетевая задержка «круг/сеть» между клиентом и Server Action) и `cacheRebuildMs` (время синхронной генерации кэша в бэкенде на первом холодном запросе).
