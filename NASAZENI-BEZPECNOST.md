# Bezpečné serverové integrace

Aplikace už neposílá adresu Apps Scriptu ani bezpečnostní token do prohlížeče. Přístup zajišťuje serverová cesta `/api/google-sheets`.

## Jednorázové nastavení

1. Vytvořte náhodný tajný řetězec dlouhý alespoň 32 znaků.
2. V projektu Google Apps Script otevřete **Nastavení projektu > Vlastnosti skriptu**.
3. Přidejte vlastnost `CLIENTS_API_TOKEN` a jako hodnotu vložte tajný řetězec.
4. Nasaďte novou verzi Apps Scriptu.
5. Na Renderu nastavte neveřejné proměnné:
   - `BASIC_AUTH_USER` - přihlašovací jméno aplikace,
   - `BASIC_AUTH_PASSWORD` - silné heslo aplikace,
   - `GOOGLE_APPS_SCRIPT_URL` - URL nasazeného Apps Scriptu,
   - `GOOGLE_APPS_SCRIPT_TOKEN` - stejný tajný řetězec jako ve vlastnostech Apps Scriptu,
   - `GEMINI_API_KEY` - placený Gemini API klíč,
   - `GEMINI_MODEL` - doporučeně `gemini-2.5-flash`,
   - `GEMINI_FALLBACK_MODEL` - nepovinný záložní model.
6. Nasaďte novou verzi aplikace.
7. Po ověření lze z Renderu odstranit staré proměnné `VITE_CLIENTS_API_URL` a `VITE_CLIENTS_API_TOKEN`.

Server bez `BASIC_AUTH_PASSWORD` odmítne nastartovat. Apps Script bez správně nastaveného `CLIENTS_API_TOKEN` odmítne všechny požadavky.

## Gemini a anonymizace

Prohlížeč už nevolá Gemini přímo a nedostává API klíč. Všechny požadavky vedou přes chráněnou serverovou cestu `/api/gemini`, která:

- používá API klíč pouze na serveru a neposílá ho v URL,
- nepovoluje ukládání odpovědi do mezipaměti,
- znovu anonymizuje celý prompt těsně před odesláním,
- odstraňuje známé identifikátory klienta a zapojených osob, e-mail, telefon, rodné číslo a označené identifikační řádky,
- neposílá seznam citlivých výrazů do Gemini.

Po ověření nasazení nastavte nový klíč jako `GEMINI_API_KEY`, starý klíč používaný pod názvem `VITE_GEMINI_API_KEY` v Google AI Studio zrušte nebo otočte a starou proměnnou z Renderu odstraňte. Dočasná serverová kompatibilita se starým názvem nezpůsobí vložení klíče do prohlížečového balíku, ale nový název jasně vyjadřuje, že jde pouze o serverové tajemství.

Sdílené Basic Auth přihlášení zůstává jako přechodný kompromis. Všichni uživatelé proto mají stejná oprávnění; heslo musí být dlouhé, unikátní, pravidelně měněné a předané jen pracovníkům, kteří smějí vidět celou evidenci.

## Lokální vývoj

Do místního souboru `.env` použijte stejné názvy `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_TOKEN` a `GEMINI_API_KEY`. Soubor `.env` se neukládá na GitHub.
