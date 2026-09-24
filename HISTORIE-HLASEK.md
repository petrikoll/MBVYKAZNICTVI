# Historie hlášek aplikace

## Místní diagnostika v prohlížeči

Na Dashboardu vpravo nad kartami vzdělávání je červené tlačítko **Ztáhnout při chybě dat**. Jedním kliknutím stáhne soubor JSON k předání na analýzu. Pod tlačítkem lze místní záznam zapnout nebo vypnout; ve výchozím stavu je zapnutý. Volba platí pro tento prohlížeč a synchronizuje se mezi jeho otevřenými kartami.

Záznam obsahuje čas, oblast aplikace, vybraného pracovníka, ID klienta, kliknutí na ovládací prvky, přechody mezi oblastmi, stav připojení a zobrazené hlášky. Nekopíruje hodnoty polí, klientské karty, texty zápisů, adresy odkazů ani těla síťových požadavků. Hláška může obsahovat jméno, pokud jej aplikace sama zobrazila; soubor předávejte pouze osobě, která problém řeší.

Posledních nejvýše 2 000 událostí za 7 dní je v místní databázi IndexedDB. Událost se nejprve zařadí do omezené paměti a zápisy probíhají asynchronně po dávkách, nejvýše jednou za pět sekund. Běžný zápis neprochází celou historii. Nedochází k odesílání na server, volání Google Sheets ani k opakovaným síťovým pokusům. Při náhlém ukončení prohlížeče může chybět posledních několik sekund; při běžném skrytí karty se čekající dávka odešle do místního úložiště.

Při nedostupném místním úložišti pokračuje omezený záznam v paměti karty a Dashboard upozorní, že soubor je nutné stáhnout před jejím zavřením. Chyba diagnostiky neblokuje práci s aplikací. Vypnutí záznamu ponechá starší události dostupné ke stažení. Údaje jsou svázané s prohlížečem a jeho profilem, nikoli s přihlášeným účtem; jiný počítač nemá tutéž historii. Starší verze před touto úpravou místní diagnostiku nemají.

## Dřívější serverová historie (vypnutá)

Od 24. 9. 2026 je automatická evidence hlášek vypnutá kvůli hlášenému zpomalování aplikace. Nová verze hlášky neukládá lokálně, neplánuje odesílání ani opakované pokusy. Server také zastavuje požadavky starších otevřených karet před voláním Apps Scriptu. Běžná zobrazená potvrzení a chyby zůstávají funkční. Dříve uložené řádky v listu `Hlaseni_aplikace` zůstávají zachované. Následující text popisuje nyní neaktivní funkci.

Po nasazení nové verze Apps Scriptu vznikne při první hlášce ve zdrojové tabulce list `Hlaseni_aplikace`. Každý řádek obsahuje čas zobrazení a přijetí včetně sekund, ID události, pracovníka vybraného v aplikaci, oblast aplikace, ID vybraného klienta, místo a typ hlášky a přesný zobrazený text. Jde o nově zobrazované hlášky; starší události nelze zpětně doplnit.

Zaznamenávají se plovoucí hlášky, hlášky u tlačítek, stav generování, potvrzení uložení KA1, upozornění na chybějící povinná pole KA1 a chyba spojení s evidencí. Neukládají se vyplněné formuláře ani texty zápisů. Jméno pracovníka je hodnota vybraná v horní liště, nikoli ověřená identita přihlášeného uživatele.

Při výpadku spojení čeká nejvýše 200 hlášek v prohlížeči maximálně 30 dní a aplikace se je pokouší znovu odeslat. Evidence hlášek nemění výsledek ukládání klientských dat. Při nedostupném místním úložišti se neodeslané hlášky po zavření karty ztratí.

Evidence hlášek používá samostatné nasazení projektu Google Apps Script `MB`. Na webovém serveru se nastaví `GOOGLE_APPS_SCRIPT_LOG_URL` a `GOOGLE_APPS_SCRIPT_LOG_TOKEN` podle tohoto nasazení. Běžné čtení a zápis klientských dat nadále používá vlastní spojení. List se vytvoří automaticky po prvním úspěšném odeslání hlášky.
