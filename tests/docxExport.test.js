import assert from 'node:assert/strict';
import test from 'node:test';
import AdmZip from 'adm-zip';

import { buildRecordDocx } from '../docxExport.js';

const documentXml = (buffer) => new AdmZip(buffer).readAsText('word/document.xml');

test('DOCX plánu obsahuje všechny odeslané sekce a nepoužije obecný prázdný nadpis', () => {
  const xml = documentXml(buildRecordDocx({
    filename: 'plan.docx',
    clientIdentification: 'Klient Testovací.',
    currentSituation: 'Aktuální situace klienta.',
    strengthsResources: 'Rodinná podpora.',
    barriers: 'Dopravní bariéra.',
    mainGoal: 'Stabilizovat bydlení.',
    subGoals: 'Vyřídit žádost.',
    plannedSteps: 'Kontaktovat obec.',
    otherServices: 'Dluhová poradna.',
    evaluationUpdates: 'Kontrola za měsíc.',
    planDate: '3. 9. 2026',
    workerSignature: 'Pracovník'
  }));

  assert.match(xml, /Individuální plán osobního rozvoje/);
  assert.match(xml, /Aktuální situace klienta/);
  assert.match(xml, /Stabilizovat bydlení/);
  assert.match(xml, /Kontaktovat obec/);
  assert.doesNotMatch(xml, />Záznam aktivity</);
});

test('strukturovaný DOCX opakuje hlavičku tabulky a široký export je na šířku', () => {
  const xml = documentXml(buildRecordDocx({
    title: 'Monitorovací export',
    orientation: 'landscape',
    blocks: [{
      type: 'table',
      headerRows: 1,
      rows: [
        ['Datum', 'KA', 'Entita', 'Klient', 'Název', 'Poznámka'],
        ['3. 9. 2026', 'KA1', 'Výkon', 'Klient', 'Konzultace', 'Text']
      ]
    }]
  }));

  assert.match(xml, /w:orient="landscape"/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.match(xml, /Monitorovací export/);
});
