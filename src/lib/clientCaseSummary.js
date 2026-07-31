const CLIENT_CASE_AI_ENTITY_TYPES = new Set(['plans', 'consultations']);

function filterClientCaseAiRecords(records = []) {
  return records.filter((record) =>
    record && !record.isSynthetic && CLIENT_CASE_AI_ENTITY_TYPES.has(record.entityType)
  );
}

function buildClientCaseAiPrompt(deterministicSummary) {
  return `
Vytvoř pracovní souhrn zakázky klienta pro interní evidenci projektu „Podpora sociální práce v Moravském Berouně II“.

Účel výstupu:
Souhrn má pomoci pracovníkovi rychle pochopit, jaká zakázka klienta je v projektu řešena, jaká podpora už proběhla, co je doložený výsledek a co má následovat dál. Nejde o zápis jednotlivého výkonu ani o hodnotící zprávu o osobnosti klienta.

Povinná pravidla:
1. Piš česky, věcně, stručně a srozumitelně pro sociální práci.
2. Použij pouze data v podkladech níže. Nic nedomýšlej, nedoplňuj nové služby, instituce, termíny, diagnózy, výsledky ani doporučení, pokud nejsou v podkladech.
3. Rozlišuj doložená fakta, průběh podpory a doporučený další postup. Pokud je doložen pouze průběh, nepopisuj ho jako dosaženou změnu.
4. Neopisuj mechanicky všechny záznamy. Vyber podstatné informace a sluč je do přehledného souhrnu.
5. Pokud některá část není v podkladech dostatečně doložená, napiš to věcně jako chybějící nebo neúplný údaj. Nevymýšlej obsah.
6. Nepřidávej sekci indikátorů, kontrolu evidence, strojová varování ani tabulky indikátorů.
7. Výstup vrať jako prostý text s nadpisy. Nepřidávej komentář k tomu, že jsi AI.

Doporučená struktura:
Souhrn zakázky klienta
1. Stručné vymezení zakázky klienta
2. Aktuální situace a hlavní potřeby
3. Individuální plán a cíle
4. Dosavadní podpora v projektu
5. Doložené výsledky nebo posun
6. Otevřené oblasti a rizika
7. Navazující doporučený postup

Podklady:
${String(deterministicSummary || '').trim()}
`.trim();
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function buildClientCaseSummaryPrintHtml({ clientName, summary, createdDate }) {
  const safeClientName = escapeHtml(clientName || 'Neuvedeno');
  const safeSummary = escapeHtml(summary || 'Souhrn není k dispozici.');
  const safeCreatedDate = escapeHtml(createdDate || '');

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>Souhrn zakázky klienta – ${safeClientName}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.55; }
      header { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #4f46e5; }
      h1 { margin: 0 0 8px; color: #312e81; font-size: 21pt; line-height: 1.2; }
      .meta { margin: 3px 0; color: #475569; }
      .meta strong { color: #1e293b; }
      .summary { white-space: pre-wrap; overflow-wrap: anywhere; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <header>
      <h1>Souhrn zakázky klienta</h1>
      <p class="meta"><strong>Klient:</strong> ${safeClientName}</p>
      <p class="meta"><strong>Datum vytvoření:</strong> ${safeCreatedDate}</p>
      <p class="meta">Projekt: Podpora sociální práce v Moravském Berouně II</p>
    </header>
    <main class="summary">${safeSummary}</main>
  </body>
</html>`;
}

export { buildClientCaseAiPrompt, buildClientCaseSummaryPrintHtml, filterClientCaseAiRecords };
