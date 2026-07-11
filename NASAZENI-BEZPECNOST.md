# Bezpečné propojení s Google Sheets

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
   - `GOOGLE_APPS_SCRIPT_TOKEN` - stejný tajný řetězec jako ve vlastnostech Apps Scriptu.
6. Nasaďte novou verzi aplikace.
7. Po ověření lze z Renderu odstranit staré proměnné `VITE_CLIENTS_API_URL` a `VITE_CLIENTS_API_TOKEN`.

Server bez `BASIC_AUTH_PASSWORD` odmítne nastartovat. Apps Script bez správně nastaveného `CLIENTS_API_TOKEN` odmítne všechny požadavky.

## Lokální vývoj

Do místního souboru `.env` použijte stejné názvy `GOOGLE_APPS_SCRIPT_URL` a `GOOGLE_APPS_SCRIPT_TOKEN`. Soubor `.env` se neukládá na GitHub.
