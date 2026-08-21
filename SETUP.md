# Настройка PPC-дашборда (бесплатно, шаг за шагом)

Дашборд уже работает на демо-данных (`cd web && npm run dev`). Ниже — как подключить реальные Google Ads + GA4 данные и задеплоить.

## 1. Google Sheet — база данных

1. Создайте новую таблицу на [sheets.google.com](https://sheets.google.com), назовите "PPC Dashboard DB".
2. Создайте три вкладки с такими заголовками в первой строке (регистр важен, это ключи в коде):
   - `ads_daily`: `date | campaign | impressions | clicks | cost | conversions`
   - `ga4_daily`: `date | campaign | bounceRate | pagesPerSession | avgSessionDurationSec`
   - `qualified_leads`: `date | campaign | qualifiedLeads`
3. Скопируйте `SHEET_ID` из URL таблицы (строка между `/d/` и `/edit`).
4. **Качественные заявки вносятся вручную** в `qualified_leads` — по одной строке на дату+кампанию. Названия кампаний в этой вкладке должны совпадать с названиями в Google Ads (регистр и пробелы не важны — код их нормализует).

## 2. Синхронизация Google Ads (без developer token)

1. Зайдите в нужный аккаунт Google Ads → **Tools & Settings → Bulk Actions → Scripts**.
2. Нажмите "+", вставьте содержимое [google-ads-script/sync-campaigns.js](google-ads-script/sync-campaigns.js).
3. Замените `SHEET_ID` на ID из шага 1.
4. Нажмите "Authorize" — скрипт запросит доступ к вашему аккаунту Google Ads (это его собственная авторизация, отдельного API-доступа не нужно).
5. Запустите один раз вручную ("Preview" → "Run"), проверьте, что строки появились в `ads_daily`.
6. Настройте расписание: в списке скриптов → "Frequency" → например ежедневно в 06:00.

## 2b. Детализация: группы объявлений, ключи, объявления, поисковые запросы

1. В том же аккаунте Google Ads → **Bulk Actions → Scripts** → **"+"** для ещё одного, отдельного скрипта.
2. Вставьте содержимое [google-ads-script/sync-hierarchy.js](google-ads-script/sync-hierarchy.js), замените `SHEET_ID`.
3. **Preview → Run**, авторизуйте. Скрипт сам создаст 4 вкладки: `ad_groups_daily`, `keywords_daily`, `ad_creatives_daily`, `search_terms_daily`.
4. Настройте расписание, например ежедневно в 06:15 (после основного скрипта).
5. Скользящее окно — 30 дней: старые строки удаляются автоматически при каждом запуске, размер таблицы не растёт бесконечно.

## 3. Синхронизация GA4

1. Зайдите на [script.google.com](https://script.google.com) → **New project**.
2. Вставьте содержимое [apps-script/sync-ga4.gs](apps-script/sync-ga4.gs) в `Code.gs`.
3. Слева откройте "Project Settings" → "Show appsscript.json" и замените его содержимым [apps-script/appsscript.json](apps-script/appsscript.json).
4. В `Code.gs` замените `SHEET_ID` и `GA4_PROPERTY_ID` (числовой ID свойства GA4, Admin → Property Settings).
5. Запустите функцию `syncGa4` вручную — Google запросит авторизацию (доступ к Sheets и к Google Analytics вашего аккаунта). Если аккаунт, под которым создаёте скрипт, не имеет доступа к нужному свойству GA4 — добавьте его как Viewer в GA4 (Admin → Property Access Management).
6. Проверьте, что строки появились в `ga4_daily`.
7. Добавьте time-driven trigger (значок часов слева → Add Trigger) на `syncGa4`, ежедневно.

## 4. Сервис-аккаунт для веб-дашборда (только чтение Sheet)

Next.js-приложение работает без интерактивного логина, поэтому ему нужен отдельный сервис-аккаунт:

1. [console.cloud.google.com](https://console.cloud.google.com) → создайте новый проект (бесплатно).
2. **APIs & Services → Library** → включите "Google Sheets API".
3. **APIs & Services → Credentials → Create Credentials → Service Account**. Имя любое, роли не нужны.
4. Откройте созданный сервис-аккаунт → **Keys → Add Key → Create new key → JSON**. Скачается файл ключа.
5. Откройте Google Sheet из шага 1 → **Share** → вставьте email сервис-аккаунта (вида `xxx@xxx.iam.gserviceaccount.com`) с доступом **Viewer**.

## 5. Локальный запуск с реальными данными

В `web/.env.local` (скопируйте из `.env.local.example`):

```
SHEET_ID=<ID таблицы>
GOOGLE_SERVICE_ACCOUNT_JSON=<всё содержимое скачанного JSON-ключа, в одну строку>
```

```bash
cd web
npm run dev
```

Жёлтый бейдж "Демо-данные" на Overview исчезнет — значит, данные читаются из Sheet.

## 6. Деплой на Vercel (бесплатно)

1. Залейте проект в GitHub-репозиторий.
2. На [vercel.com](https://vercel.com) → **Add New → Project** → выберите репозиторий, **Root Directory: `web`**.
3. В Environment Variables добавьте `SHEET_ID` и `GOOGLE_SERVICE_ACCOUNT_JSON` (то же, что в `.env.local`).
4. Deploy.

## Что дальше можно добавить

- Другие каналы (FB, Pinterest) — по той же схеме: ещё одна вкладка в Sheet + свой синк-скрипт.
- Форма ручного ввода качественных заявок прямо в веб-интерфейсе (сейчас — редактирование напрямую в Google Sheet, это самый простой и бесплатный вариант).
- AI Alerts (текстовые инсайты по аномалиям) — потребует платного вызова LLM API, в этой версии сознательно не включено.
