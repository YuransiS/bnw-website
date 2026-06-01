# ARCHITECTURE.md

## 1. Текущий статус проекта и стек
* **Стек:** Next.js (App Router), Supabase (Database & Auth), Vercel (Deployment).
* **UI-компоненты:** Tailwind CSS, Framer Motion, Radix UI. Чистый монохромный SaaS-минимализм.
* **Дизайн-стандарти Stitch (3D Layering & Volume):**
  - **Tonal Layering & Depth:** Побудова інтерфейсу у вигляді фізичних шарів. Портрети засновників накладаються один на одного з різними z-index та кутами повороту, підсвічуються смарагдовими Light Leaks на фоні.
  - **Glassmorphism:** Використання матових напівпрозорих карт (`backdrop-blur bg-black/70 border border-white/10 shadow-2xl`), що накладаються поверх силуетів на задньому плані, створюючи фізичне відчуття об'єму крізь скло.
  - **Асиметрія та контраст масштабів:** Поєднання великих Display-заголовків з мікро-лейблами та точковими Spring-анімаціями.
* **Стилизация (Раздельная архитектура):**
  - `src/styles/desktop.css` — Стили для ПК-версии (>= 768px/1024px: кастомные скроллбары, визуальные шумы, эффекты наведения).
  - `src/styles/mobile.css` — Стили для мобильной версии (< 768px: тач-оптимизации, скрытие скроллбаров).
  - `src/app/globals.css` — Центральная точка импорта Tailwind, переменных и shared-эффектов.
* **Интеграция уведомлений:** Telegram Bot API (асинхронная отправка лидов в топики супергруппы).
* **Поддержка NDA в кейсах:** Кейсы поддерживают флаг `isNda`. При его наличии имя скрывается под "Під NDA", ниша меняется на пользовательскую (например, "ніша — інвестиції"), ссылка на Instagram отключается, а вместо неё выводится иконка замка. Клик по аватару или замку вызывает стильное всплывающее окно (NDA Explanation Modal).

## 2. Карта путей (Файловая структура и компоненты)
* `src/components/desktop/` — Компоненты, спроектированные суто под ПК-версию (GSAP ScrollTrigger, Drag-to-Scroll свайпер).
* `src/components/mobile/` — Облегченные мобильные компоненты без тяжелых JS-анимаций, оптимизированные для быстрой загрузки.
* `src/components/` — Входные адаптивные точки компонентів (переключение Desktop/Mobile через CSS-контейнеры для SEO и гидрации).
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
