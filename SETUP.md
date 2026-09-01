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
2. Нажмите "+", вставьте содержимое [google-ads-script/sync-campaigns.js](google-ads-script/sync-campaigns.js) (если уже настраивали раньше — замените код целиком, это обновлённая версия: добавились Impression Share и дневной бюджет).
3. Замените `SHEET_ID` на ID из шага 1.
4. Нажмите "Authorize" — скрипт запросит доступ к вашему аккаунту Google Ads (это его собственная авторизация, отдельного API-доступа не нужно).
5. Запустите один раз вручную ("Preview" → "Run"), проверьте, что строки появились в `ads_daily` (заголовок вкладки обновится сам, добавятся колонки `searchImpressionShare`, `searchBudgetLostIS`, `searchRankLostIS`, `dailyBudget`).
6. Настройте расписание: в списке скриптов → "Frequency" → например ежедневно в 06:00.
7. Impression Share есть только у Search-кампаний — у Pmax/Display/Demand Gen эти поля будут пустыми, дашборд покажет "—", это нормально.

## 2b. Детализация: группы объявлений, ключи, объявления, поисковые запросы

1. В том же аккаунте Google Ads → **Bulk Actions → Scripts** → **"+"** для ещё одного, отдельного скрипта.
2. Вставьте содержимое [google-ads-script/sync-hierarchy.js](google-ads-script/sync-hierarchy.js), замените `SHEET_ID`.
3. **Preview → Run**, авторизуйте. Скрипт сам создаст 4 вкладки: `ad_groups_daily`, `keywords_daily`, `ad_creatives_daily`, `search_terms_daily`.
4. Настройте расписание, например ежедневно в 06:15 (после основного скрипта).
5. Скользящее окно — 240 дней: старые строки удаляются автоматически при каждом запуске, размер таблицы не растёт бесконечно.

## 2c. Устройства и география

1. В том же аккаунте Google Ads → **Bulk Actions → Scripts** → **"+"** для ещё одного, отдельного скрипта.
2. Вставьте содержимое [google-ads-script/sync-segments.js](google-ads-script/sync-segments.js) (если уже настраивали раньше — замените код целиком, добавился отчёт по посадочным страницам), замените `SHEET_ID`.
3. **Preview → Run**, авторизуйте. Скрипт создаст вкладки `device_daily`, `geo_daily` и `landing_pages_daily`.
4. Настройте расписание, например ежедневно в 06:30.
5. Гео определяется по числовому ID страны из Google Ads — в скрипте зашита таблица соответствий для основных стран из кампаний Sellvia (US/CAN/UK/AUS/SG и т.д.). Если в дашборде увидите `Unknown (id)` — допишите этот ID в `COUNTRY_NAMES` внутри скрипта.

## 2d. SEO — органика из Google Search Console

1. Зайдите на [search.google.com/search-console](https://search.google.com/search-console) под тем же Google-аккаунтом, под которым будете создавать Apps Script. Убедитесь, что у аккаунта есть доступ **Owner** или **Full user** к нужному свойству (сайту).
2. Откройте свойство → **Настройки → Информация о свойстве** и скопируйте точный идентификатор:
   - для свойства домена — вида `sc-domain:example.com`
   - для свойства по URL-префиксу — вида `https://example.com/` (со слэшем на конце)
3. На [script.google.com](https://script.google.com):
   - Если ведёте GSC-синк в том же проекте, что и GA4 (`sync-ga4.gs`) — просто добавьте новый файл (`+` → Script) и вставьте туда [apps-script/sync-gsc.gs](apps-script/sync-gsc.gs). Манифест `appsscript.json` уже обновлён (добавлен scope `webmasters.readonly`) — замените его содержимым [apps-script/appsscript.json](apps-script/appsscript.json), если ещё не обновляли.
   - Если делаете отдельный проект — создайте новый (**New project**), вставьте `sync-gsc.gs` в `Code.gs`, и замените манифест так же.
4. В `sync-gsc.gs` замените `GSC_SHEET_ID` и `GSC_SITE_URL` (значение из шага 2).
5. Запустите функцию `syncGsc` вручную — Google запросит переавторизацию (новый scope — доступ к Search Console). Если аккаунт не видит нужное свойство — добавьте его в Search Console (Settings → Users and permissions).
6. Проверьте, что строки появились в `gsc_query_daily`, `gsc_page_daily`, `gsc_country_daily` и `gsc_device_daily`.
7. Добавьте time-driven trigger на `syncGsc`, ежедневно (после `syncGa4`, например 06:45).
8. Данные в Search Console обычно "дозревают" 2-3 дня — это нормально, не баг.
9. Гео определяется по ISO-3166-1 alpha-3 коду страны (это трёхбуквенный код, не путать с двухбуквенными кодами в остальных частях дашборда) — в скрипте зашит полный справочник `GSC_COUNTRY_NAMES`. Если всё же увидите `Unknown (код)` — допишите код в эту таблицу внутри скрипта.
10. Скрипт также пишет вкладку `gsc_query_country_daily` (запросы в разрезе по стране — на ней работает фильтр по стране на странице SEO → Обзор). Это комбинированный отчёт (дата+запрос+страна), поэтому строк там заметно больше, чем в остальных вкладках — `gscRunReport` тянет их постранично (до 250k строк за синк), это нормально.

## 3. Синхронизация GA4 (кампании + группы объявлений)

1. Зайдите на [script.google.com](https://script.google.com) → **New project**.
2. Вставьте содержимое [apps-script/sync-ga4.gs](apps-script/sync-ga4.gs) в `Code.gs` (если уже настраивали раньше — просто замените старый код новым, это обновлённая версия с ещё одним отчётом).
3. Слева откройте "Project Settings" → "Show appsscript.json" и замените его содержимым [apps-script/appsscript.json](apps-script/appsscript.json).
4. В `Code.gs` замените `SHEET_ID` и `GA4_PROPERTY_ID` (числовой ID свойства GA4, Admin → Property Settings).
5. Запустите функцию `syncGa4` вручную — Google запросит авторизацию (доступ к Sheets и к Google Analytics вашего аккаунта). Если аккаунт, под которым создаёте скрипт, не имеет доступа к нужному свойству GA4 — добавьте его как Viewer в GA4 (Admin → Property Access Management).
6. Проверьте, что строки появились в `ga4_daily` и `ga4_ad_group_daily`.
7. Добавьте time-driven trigger (значок часов слева → Add Trigger) на `syncGa4`, ежедневно.
8. Этот же запуск создаёт ещё 2 вкладки для отчёта **Отчёты → Traffic**: `ga4_traffic_monthly` (пользователи по каналам помесячно) и `ga4_traffic_summary_monthly` (всего пользователей + bounce rate помесячно). В отличие от остальных вкладок, эти две **полностью перезаписываются** при каждом запуске (не дозаписываются) — так проще для маленького объёма данных.
9. Канал "AI" определяется по домену источника (chatgpt.com, perplexity.ai и т.п.) — список зашит в `GA4_AI_SOURCES` в скрипте, можно дополнять.

## 3b. Воронка сайта (ручной ввод из CRM)

Раздел **Отчёты → Воронка** не синхронизируется автоматически — заполняется вручную в Google Sheet, дашборд только читает и считает проценты конверсии сам.

1. В таблице создайте вкладку `funnel_monthly` с колонками: `month | users | clients`. По одной строке на месяц, `month` в формате `YYYY-MM` (например `2026-08`).
2. Создайте вкладку `funnel_leads_monthly` с колонками: `month | source | leads | qualifiedLeads`. По одной строке на месяц+источник. Источники: `Google CPC`, `Organic`, `Direct`, `Referral`, `AI`, `Other` — на каждый месяц нужна строка по каждому источнику (даже если там 0).
3. Дашборд сам считает CR1 (leads/users), CR2 (qualifiedLeads/leads), CR3 (clients/qualifiedLeads) — вручную проценты вводить не нужно.

**Отчёты → Google Ads** отдельной настройки не требует — данные те же, что и в `ads_daily`, просто показаны помесячно с выбором месяца.

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

## 7. LinkedIn Ads (авто-синк через Vercel Cron)

В отличие от Google Ads/GA4/GSC (авторизация "в один клик" через Apps Script), у LinkedIn нет бесплатного self-hosted способа — нужен настоящий OAuth 2.0. Синк живёт прямо в дашборде (Vercel Cron дёргает раз в день внутренний API-роут), и это первая часть дашборда, где сервис-аккаунту нужны **права на запись** в Sheet (до сих пор — только чтение).

**7.1 Выдать сервис-аккаунту право на запись**

Откройте Google Sheet → **Share** → найдите email сервис-аккаунта (тот же `xxx@xxx.iam.gserviceaccount.com` из шага 4) → поменяйте роль с **Viewer** на **Editor**.

**7.2 Получить Client ID / Client Secret**

В LinkedIn Developer App (developers.linkedin.com/apps → ваше приложение) → вкладка **Auth** → скопируйте **Client ID** и **Client Secret**.

**7.3 Получить refresh token (один раз, вручную)**

1. В том же письме об одобрении Advertising API была ссылка на **OAuth token generation tools** — откройте её и пройдите 3-legged OAuth под вашим LinkedIn-аккаунтом (тем, у кого есть доступ к Campaign Manager нужного рекламного аккаунта).
2. В ответе должен быть `refresh_token` (не только `access_token`) — если инструмент его не показывает, потребуется сделать разовый ручной обмен кода на токен (Postman-коллекция была в том же письме) с запросом на офлайн-доступ — напишите, если дойдёте до этого шага, разберём вместе.
3. Также запишите **Ad Account ID** — числовой ID вашего рекламного аккаунта в Campaign Manager (виден в URL страницы аккаунта).

**7.4 Переменные окружения**

В `web/.env.local` и в Vercel (Environment Variables) добавьте:

```
LINKEDIN_CLIENT_ID=<Client ID>
LINKEDIN_CLIENT_SECRET=<Client Secret>
LINKEDIN_REFRESH_TOKEN=<refresh token из шага 7.3>
LINKEDIN_AD_ACCOUNT_ID=<числовой ID рекламного аккаунта>
CRON_SECRET=<любая длинная случайная строка — секрет, защищающий /api/cron/sync-linkedin от посторонних запросов>
```

**7.5 Проверка**

После деплоя на Vercel с этими переменными можно вызвать синк вручную, не дожидаясь cron (07:00 UTC):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<ваш-домен>.vercel.app/api/cron/sync-linkedin
```

Ответ `{"ok":true,"ads":N,"creatives":N,"groups":N,"targeting":N,"audience":N}` — значит сработало. Синк сам создаёт 5 вкладок: `linkedin_ads_daily` (кампании), `linkedin_creatives_daily` (креативы), `linkedin_campaign_groups` (группы кампаний), `linkedin_targeting` (заданный таргетинг активных кампаний), `linkedin_audience` (фактический охват активных кампаний — должности/уровень/индустрия) — доп. настройки не требуется. Если `{"ok":false,"error":"..."}` — пришлите текст ошибки, разберём.

Раздел **LinkedIn Ads** появится в сайдбаре и покажет данные сразу после первого успешного запуска — клик по кампании открывает разбивку по креативам, фактический охват аудитории и заданный таргетинг, фильтр сверху — по Campaign Group.

## Что дальше можно добавить

- Другие каналы (FB, Pinterest) — по той же схеме: ещё одна вкладка в Sheet + свой синк-скрипт.
- Форма ручного ввода качественных заявок прямо в веб-интерфейсе (сейчас — редактирование напрямую в Google Sheet, это самый простой и бесплатный вариант).
- AI Alerts (текстовые инсайты по аномалиям) — потребует платного вызова LLM API, в этой версии сознательно не включено.
