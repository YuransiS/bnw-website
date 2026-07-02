# Архитектурный план оптимизации бэкенда и БД (Enterprise-уровень)

Этот документ описывает, как решаются проблемы производительности больших объемов данных (аналитика, логи кликов, кэширование) по стандартам крупных систем (Sendpulse, HubSpot).

---

## 1. Атомарное обновление кэша (Безопасность и Отказоустойчивость)

### Проблема (Как сейчас):
При пересчете кэша запускается JS-цикл, который сначала удаляет все записи для проекта (`DELETE`), а затем порциями отправляет новые (`INSERT`).
* **Риск 1:** На время работы скрипта CRM пуста для пользователей.
* **Риск 2:** Если Vercel Serverless оборвет соединение посреди цикла, база останется наполовину пустой.

### Решение по уму (Атомарный Shadow Swap):
Вся работа переносится на уровень PostgreSQL в виде хранимой процедуры (RPC) с использованием механизма изоляции транзакций.

```sql
CREATE OR REPLACE FUNCTION public.rebuild_project_cache_atomic(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Открывается неявная транзакция PostgreSQL
    
    -- 1. Удаляем старый кэш для данного проекта внутри транзакции
    DELETE FROM public.crm_leads_cache 
    WHERE project_id = p_project_id;
    
    -- 2. Генерируем и вставляем новый кэш напрямую через SQL-запрос на сервере БД
    -- (Без выгрузки сырых строк в Node.js и отправки обратно пачками)
    INSERT INTO public.crm_leads_cache (
        project_id, primary_customer_id, customer_ids, order_ids, name, phone, telegram, email,
        status, page_path, page_url, touch_count, usd_paid, uah_paid, eur_paid, 
        usd_tripwire_paid, uah_tripwire_paid, eur_tripwire_paid, usd_attempted, uah_attempted, eur_attempted,
        usd_course_count, uah_course_count, eur_course_count, usd_tripwire_count, uah_tripwire_count, eur_tripwire_count,
        diagnostics_comment, manager_comment, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        target_sheet, is_unpaid_intent, visited_landings, history, is_multi_source, created_at,
        assigned_manager_id, visitor_uuid
    )
    SELECT 
        -- Реляционный сбор и группировка данных с помощью DSU-логики на уровне SQL
        -- ...
    FROM public.unified_orders o
    -- ...
    WHERE o.project_id = p_project_id;

    -- Если всё успешно, транзакция фиксируется автоматически (COMMIT)
    -- Если произошла ошибка, транзакция откатывается полностью (ROLLBACK), старый кэш остается на месте
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

* **Результат:** Время пересчета сокращается с секунд/минут до миллисекунд (за счет выполнения внутри БД), а операция становится абсолютно надежной: либо кэш обновлен на 100%, либо изменений нет вообще.

---

## 2. Агрегация данных на уровне СУБД (Снижение Payload и Нагрузки)

### Проблема (Как сейчас):
Для расчета общих сумм (выручка, расходы, ROI) на фронтенд/бэкенд выгружаются все записи (`filteredRows`).
* **Минус:** При 10,000 лидов передается ~15-20 МБ JSON-данных через сеть только ради того, чтобы сложить числа.

### Решение по уму (SQL Aggregation View / Function):
Node.js запрашивает от БД только результат вычислений с помощью агрегатных функций (`SUM`, `COUNT`, `FILTER`).

```sql
-- Пример SQL-запроса для получения метрик без выгрузки строк
SELECT 
    COUNT(id) as total_leads,
    SUM(usd_paid) FILTER (WHERE status = 'Купив курс') as usd_course_revenue,
    SUM(uah_paid) FILTER (WHERE status = 'Купив курс') as uah_course_revenue,
    SUM(eur_paid) FILTER (WHERE status = 'Купив курс') as eur_course_revenue,
    SUM(usd_tripwire_paid) FILTER (WHERE status = 'Купив(-ла) Трипвайер') as usd_tripwire_revenue,
    -- ...
    COUNT(id) FILTER (WHERE is_unpaid_intent = true) as unpaid_intents_count
FROM public.crm_leads_cache
WHERE project_id = :project_id AND created_at BETWEEN :start_date AND :end_date;
```

* **Результат:** Сетевой payload снижается до 1 КБ (один объект с суммами), нагрузка на ОЗУ сервера падает до нуля, скорость рендеринга мгновенная.

---

## 3. Серверная пагинация и группировка кликов (Traffic Click Limits)

### Проблема (Как сейчас):
Все клики (`traffic_clicks`) выгружаются в массив JS и фильтруются/группируются на бэкенде.
* **Минус:** Миллионы кликов моментально исчерпают память Node.js (Heap Out of Memory).

### Решение по уму (SQL Grouping & Indexing):
Для расчета сквозной аналитики нам не нужны сами клики, нужны только их количества. База данных группирует их на своей стороне.

```sql
-- Агрегированный трафик по UTM-кампаниям
SELECT 
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    COUNT(id) as clicks_count
FROM public.traffic_clicks
WHERE project_id = :project_id AND created_at BETWEEN :start_date AND :end_date
GROUP BY utm_source, utm_medium, utm_campaign, utm_content;
```

Для быстродействия добавляются составные B-Tree индексы:
```sql
CREATE INDEX IF NOT EXISTS idx_traffic_clicks_analytics 
ON public.traffic_clicks (project_id, created_at, utm_source, utm_campaign);
```

* **Результат:** БД моментально находит нужные суммы по индексам. В Node.js передается только сгруппированная UTM-карта.

---

## 4. Архитектура фонового кэширования (Vercel-Safe Async Rebuild)

### Проблема (Как сейчас):
Если кэш грязный, запускается асинхронный процесс обновления, который Vercel может убить после завершения HTTP-запроса.

### Решение по уму (Database Hook & Supabase pg_cron):
1. **Supabase Edge Functions / HTTP Trigger:**
   Next.js вызывает фоновую функцию Supabase (Edge Function) с флагом `waitUntil`, либо делает вызов внешней очереди задач (например, Upstash / QStash).
2. **PostgreSQL pg_net:**
   Next.js шлет запрос, СУБД делает быстрый ответ. Если кэш требует пересчета, триггер в БД делает неблокирующий фоновый вызов через расширение `pg_net` или запускает `pg_cron` джобу.
3. **Queue Pattern:**
   Запись помечается как `is_dirty = true` в очереди. Внешний cron-скрипт (каждые 1-5 минут) проверяет очередь и пересчитывает кэш изолированно, исключая задержки для пользователя при открытии страницы.
