# ARCHITECTURE.md

## 1. Текущий статус проекта и стек
* **Стек:** Next.js (App Router), Supabase (Database & Auth), Vercel (Deployment).
* **UI-компоненты:** Tailwind CSS, Framer Motion, Radix UI. Чистый монохромный SaaS-минимализм.
* **Интеграция уведомлений:** Telegram Bot API (асинхронная отправка лидов в топики супергруппы).

## 2. Карта путей (Файловая структура и компоненты)
* `src/app/actions/leads.ts` — Server Action для валидации, проверки дубликатов и добавления лидов в базу данных Supabase, а также вызова службы уведомлений.
* `src/lib/notifications.ts` — Служба отправки уведомлений в Telegram Bot API и обновления CRM Dashboard.
* `src/providers/modal-provider.tsx` — Клиентский провайдер модальных окон для отправки заявок.
* `src/app/admin/LeadsDashboard.tsx` — Панель администрирования для просмотра и фильтрации лидов.

## 3. Схема данных (Supabase)
### Таблица `leads`
* `id` (uuid, primary key)
* `created_at` (timestamp with time zone)
* `name` (text, required)
* `phone` (text, required)
* `telegram` (text, nullable)
* `instagram` (text, nullable)
* `button_id` (text)
* `visitor_id` (text)
* `status` (text, default 'new')

## 4. Логику интеграций
* **Supabase Client:** Серверная и клиентская инициализация через `@/utils/supabase/server`.
* **Telegram Notification:** Использует `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_THREAD_ID` из переменных окружения для отправки HTML-сообщений.
