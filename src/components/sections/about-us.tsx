"use client";

import { motion } from "framer-motion";

export const AboutUs = () => {
  return (
    <section id="team" className="py-24 md:py-32 bg-void relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row gap-8 justify-between items-start md:items-end">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6">
              Практики, а не теоретики
            </h2>
            <p className="text-xl text-text-secondary font-mono">
              [Ми не вчимо вас робити запуски. Ми робимо їх за вас]
            </p>
          </div>
          <p className="text-text-secondary max-w-sm">
            Руками збираємо воронки, ллємо трафік та будуємо систему.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="relative w-full aspect-[4/3] md:aspect-video lg:aspect-square bg-surface1 border border-hairline overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-secondary bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay z-10 pointer-events-none" />
            <div className="w-full h-full flex items-center justify-center bg-surface2">
              [ФОТО_ВІКТОРА_ТА_ДМИТРА_HIGH_CONTRAST_BW.WEBP]
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <p className="text-lg text-text-secondary leading-relaxed mb-8">
                Ми як чорне та біле — абсолютні протилежності, які закривають 100% циклу. Тверда системність Віктора та емоційні продажі Дмитра стали фундаментом для створення B&W Prod.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-hairline pt-8">
              <div>
                <h3 className="font-bold text-xl mb-2 text-white">Віктор</h3>
                <div className="font-mono text-xs text-text-secondary mb-4">[СИСТЕМИ ТА АНАЛІТИКА]</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Співзасновник. Відповідає за "тверде": цифри, метрики, архітектуру запусків та окупність. Керував запусками з обертом до $100 000. Будує продуктові лінійки та інфраструктуру, де все піддається оцифруванню, логіці та суворій аналітиці.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2 text-white">Дмитро</h3>
                <div className="font-mono text-xs text-text-secondary mb-4">[СЕНСИ ТА ПРОДАЖІ]</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Співзасновник. Відповідає за "м'яке": прогріви, дожими, продажі та розпаковку експертності. Особисто закривав угоди на $25 000 за тиждень та згенерував +80 000 підписників органікою. Знає, як конвертувати лояльність аудиторії в реальні гроші.
                </p>
              </div>
            </div>

            <div className="border-t border-hairline pt-8">
              <h3 className="font-bold text-xl mb-2 text-white">Команда реалізації</h3>
              <div className="font-mono text-xs text-text-secondary mb-4">[БЕК-ОФІС]</div>
              <p className="text-sm text-text-secondary leading-relaxed">
                За нами стоїть штат профільних спеціалістів — від техліда і дизайнера до таргетолога та відділу продажів. Ми розробляємо стратегію, а наша команда своїми руками верстає сайти, збирає ботів та дотискає лідів. Ви отримуєте повноцінний production-відділ під ключ.
              </p>
            </div>
          </div>
        </div>

        {/* Anti-bullshit values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-hairline pt-16">
          <div className="p-6 bg-surface1 border border-hairline">
            <h4 className="font-mono text-xs text-text-secondary mb-4 uppercase tracking-widest">Принцип 01</h4>
            <h3 className="text-lg font-bold mb-3 text-white">Цифри замість інтуїції</h3>
            <p className="text-sm text-text-secondary">Ми не масштабуємо те, що "здається класним". Кожне рішення у проєкті спирається на наскрізну аналітику, конверсії та вартість цільової дії.</p>
          </div>
          <div className="p-6 bg-surface1 border border-hairline">
            <h4 className="font-mono text-xs text-text-secondary mb-4 uppercase tracking-widest">Принцип 02</h4>
            <h3 className="text-lg font-bold mb-3 text-white">Гра вдовгу (Win-Win)</h3>
            <p className="text-sm text-text-secondary">Ми не робимо одноразові "випалені" запуски, щоб зірвати куш і зникнути. Наша ціль — побудувати вам інфраструктуру, яка стабільно приноситиме гроші роками.</p>
          </div>
          <div className="p-6 bg-surface1 border border-hairline">
            <h4 className="font-mono text-xs text-text-secondary mb-4 uppercase tracking-widest">Принцип 03</h4>
            <h3 className="text-lg font-bold mb-3 text-white">Партнерство в контенті</h3>
            <p className="text-sm text-text-secondary">Ми знімаємо з вас проблему «що сьогодні знімати, щоб купили». Ми готуємо сценарні плани, допомагаємо з упаковкою смислів та підказуємо робочі формати.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
