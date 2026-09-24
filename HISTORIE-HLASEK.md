# Historie hlášek aplikace

Po nasazení nové verze Apps Scriptu vznikne při první hlášce ve zdrojové tabulce list `Hlaseni_aplikace`. Každý řádek obsahuje čas zobrazení a přijetí včetně sekund, ID události, pracovníka vybraného v aplikaci, oblast aplikace, ID vybraného klienta, místo a typ hlášky a přesný zobrazený text. Jde o nově zobrazované hlášky; starší události nelze zpětně doplnit.

Zaznamenávají se plovoucí hlášky, hlášky u tlačítek, stav generování, potvrzení uložení KA1, upozornění na chybějící povinná pole KA1 a chyba spojení s evidencí. Neukládají se vyplněné formuláře ani texty zápisů. Jméno pracovníka je hodnota vybraná v horní liště, nikoli ověřená identita přihlášeného uživatele.

Při výpadku spojení čeká nejvýše 200 hlášek v prohlížeči maximálně 30 dní a aplikace se je pokouší znovu odeslat. Evidence hlášek nemění výsledek ukládání klientských dat. Při nedostupném místním úložišti se neodeslané hlášky po zavření karty ztratí.

Nasazení vyžaduje novou verzi projektu Google Apps Script `MB` a nové sestavení webové aplikace. Nejdříve nasaďte Apps Script, poté web. List se vytvoří automaticky po prvním úspěšném odeslání hlášky.
