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

## 4. Архитектура фонового кэширования (Vercel-Safe Async Rebuild через Upstash QStash)

### Проблема (Как сейчас):
Если кэш помечен как «грязный» (`is_dirty === true`), Server Action запускает асинхронный ребилд кэша (`rebuildProjectCache`) без `await` в фоновом режиме. На Vercel Serverless это приводит к заморозке (freeze) лямбда-контейнера сразу после завершения HTTP-ответа клиенту. Фоновый процесс аварийно завершается, кэш остается неконсистентным, а флаг `is_dirty` уже сброшен в `false`.

### Решение (Очередь задач QStash + Shadow Swap):
1. **Триггер (Next.js Server Action):** При запросе данных, если `is_dirty === true`, Next.js отправляет легкий неблокирующий HTTP-запрос (публикацию сообщения) в брокер Upstash QStash. Клиент сразу же получает старый (но стабильный) кэш из таблицы `crm_leads_cache` за $<100\text{мс}$.
2. **Гарантированная доставка (QStash):** QStash принимает задачу и сразу возвращает HTTP 202 (Accepted). Затем он асинхронно вызывает защищенный роут на Vercel (`POST /api/crm/rebuild-cache`) с лимитом времени выполнения до 5 минут (тариф Pro).
3. **Бесшовное обновление (Shadow Swap):** 
   * Роут `/api/crm/rebuild-cache` выполняет выгрузку скелета контактов, строит DSU-граф в памяти лямбда-функции Next.js.
   * Все сгруппированные строки кэша записываются во временную таблицу `crm_leads_cache_staging`.
   * В конце работы воркер вызывает RPC-функцию в PostgreSQL, которая внутри одной атомарной транзакции очищает боевой кэш проекта и переливает данные из staging-таблицы (время блокировки — микросекунды):
     ```sql
     BEGIN;
       DELETE FROM public.crm_leads_cache WHERE project_id = p_project_id;
       INSERT INTO public.crm_leads_cache SELECT * FROM public.crm_leads_cache_staging WHERE project_id = p_project_id;
       DELETE FROM public.crm_leads_cache_staging WHERE project_id = p_project_id;
     COMMIT;
     ```

---

## 5. Интеграция метода QUERY (RFC 10008) для фильтрации и поиска

### Проблема:
При фильтрации лидов по множеству параметров (диапазоны дат, массивы UTM-меток, статусы, строки поиска) традиционный HTTP GET-запрос страдает от:
1. Огромных, трудночитаемых URL-строк, которые неудобно парсить на бэкенде.
2. Сложностей сериализации сложных объектов.
3. Ограничений на размер GET-запроса у шлюзов.
Использование `POST` решает проблему тела запроса, но нарушает стандарты REST (POST не является безопасным/идемпотентным по умолчанию и ломает стандартное кэширование на сетевых прокси-серверах).

### Решение:
Внедрение HTTP-метода `QUERY` на эндпоинте `/api/crm/leads`. 
* **Безопасность/Идемпотентность:** Метод `QUERY` является безопасным (не модифицирует состояние сервера) и идемпотентным.
* **Тело запроса (Body Payload):** Позволяет передавать структурированные JSON-параметры фильтрации в теле запроса.
* **Кэширование на Edge-уровне:** Вся аналитика за прошедшие даты легко кэшируется на Edge-серверах (Vercel Data Cache) по хэшу тела запроса.

#### Пример роутера Next.js (с поддержкой туннелирования):
```typescript
// src/app/api/crm/leads/route.ts
import { NextResponse } from 'next/server';
import { getSessionAndAccess } from '@/app/admin/actions';
import { createAdminClient } from '@/utils/supabase/server';

// Единая точка обработки бизнес-логики запроса
async function handleQueryLogic(request: Request) {
  try {
    const body = await request.json();
    const { projectId, filters, pagination } = body;

    // 1. Проверка сессии и доступов к проекту через хелпер
    // await checkProjectAccess(projectId);

    const adminSupabase = createAdminClient();
    
    // 2. Построение SQL-запроса по кэш-таблице crm_leads_cache с учетом фильтров
    // 3. Выборка агрегированных сумм (выручка, расходы, ROI) на уровне СУБД (без выгрузки сырых строк)
    
    return NextResponse.json({
      data: leads,
      meta: {
        totalCount,
        aggregations: totalMetrics
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Стандартная обработка метода QUERY (RFC 10008)
export async function QUERY(request: Request) {
  return handleQueryLogic(request);
}

// Запасной вариант (Туннелирование через POST) для консервативных сетевых узлов / WAF
export async function POST(request: Request) {
  const isTunnelledQuery = request.headers.get('X-HTTP-Method-Override') === 'QUERY';
  
  if (isTunnelledQuery) {
    return handleQueryLogic(request);
  }
  
  // Здесь при необходимости может быть стандартная логика создания (POST) ресурса
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
```
