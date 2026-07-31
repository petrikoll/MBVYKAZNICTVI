import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClientCaseAiPrompt, buildClientCaseSummaryPrintHtml, filterClientCaseAiRecords } from '../src/lib/clientCaseSummary.js';

test('AI souhrn zakázky používá jen současný individuální plán a podporu KA1/KA2', () => {
  const records = [
    { id: 'plan', entityType: 'plans' },
    { id: 'support', entityType: 'consultations' },
    { id: 'entry', entityType: 'project_entry', isSynthetic: true },
    { id: 'debt', entityType: 'debt_cases' },
    { id: 'therapy', entityType: 'therapy_sessions' },
    { id: 'cv', entityType: 'cv_outputs' },
    { id: 'simulator', entityType: 'job_simulators' },
    { id: 'employment', entityType: 'employment_records' }
  ];

  assert.deepEqual(filterClientCaseAiRecords(records).map((record) => record.id), ['plan', 'support']);
});

test('prompt je ukotven v aktuálním projektu a nezmiňuje starší projektovou verzi', () => {
  const prompt = buildClientCaseAiPrompt('Aktuální podklady klienta.');

  assert.match(prompt, /Podpora sociální práce v Moravském Berouně II/);
  assert.doesNotMatch(prompt, /starší|jiné verze projektu/i);
  assert.match(prompt, /Aktuální podklady klienta/);
});

test('tiskový dokument souhrnu obsahuje hlavičku a bezpečně escapuje údaje klienta', () => {
  const html = buildClientCaseSummaryPrintHtml({
    clientName: 'Jan <Novák>',
    createdDate: '31. 7. 2026',
    summary: 'Výsledek: bydlení & dávky'
  });

  assert.match(html, /Souhrn zakázky klienta/);
  assert.match(html, /31\. 7\. 2026/);
  assert.match(html, /Jan &lt;Novák&gt;/);
  assert.match(html, /bydlení &amp; dávky/);
  assert.doesNotMatch(html, /Jan <Novák>/);
});
