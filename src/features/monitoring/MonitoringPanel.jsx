import React from 'react';
import { ClipboardCheck, Download, Loader2, Save, Users } from 'lucide-react';

import { CheckboxField, Panel, SelectField } from '../../components/ui.jsx';
import {
  MANDATORY_MONITORING_ITEMS,
  buildMandatoryMonitoringOverview,
  buildMandatoryMonitoringXlsx,
  effectiveClientMonitoring,
  normalizeMandatoryMonitoring
} from '../../lib/mandatoryMonitoring.js';

const clientLabel = (client = {}) => client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim() || client.id;

function MonitoringPanel({ clients = [], monitoringRecords = [], workRecords = [], period = null, onSave, isSaving = false, onOpenClient }) {
  const sortedClients = React.useMemo(
    () => [...clients].sort((left, right) => clientLabel(left).localeCompare(clientLabel(right), 'cs')),
    [clients]
  );
  const [selectedClientId, setSelectedClientId] = React.useState(() => sortedClients[0]?.id || '');
  const [draft, setDraft] = React.useState(() => normalizeMandatoryMonitoring());
  const [romEstimateDraft, setRomEstimateDraft] = React.useState('0');
  const [notice, setNotice] = React.useState(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const selectedClient = sortedClients.find((client) => client.id === selectedClientId) || null;
  const aggregateRecord = monitoringRecords.find((record) => record.clientId === '__aggregate__') || null;
  const periodKey = period?.value || 'all';
  const romEstimate = Math.max(0, Math.floor(Number(aggregateRecord?.payload?.romEstimateByPeriod?.[periodKey]) || 0));
  const effective = React.useMemo(
    () => effectiveClientMonitoring({ client: selectedClient, monitoringRecords, workRecords }),
    [monitoringRecords, selectedClient, workRecords]
  );
  const overview = React.useMemo(
    () => buildMandatoryMonitoringOverview({ clients, monitoringRecords, workRecords, period, romEstimate }),
    [clients, monitoringRecords, period, romEstimate, workRecords]
  );

  React.useEffect(() => {
    if (!selectedClientId && sortedClients[0]?.id) setSelectedClientId(sortedClients[0].id);
  }, [selectedClientId, sortedClients]);

  React.useEffect(() => {
    setDraft(normalizeMandatoryMonitoring(effective));
    setNotice(null);
  }, [effective.record?.id, effective.record?.updatedAt, selectedClientId]);

  React.useEffect(() => {
    setRomEstimateDraft(String(romEstimate));
  }, [periodKey, romEstimate]);

  const updateEntry = (key, patch) => {
    setDraft((previous) => ({
      ...previous,
      entries: { ...previous.entries, [key]: { ...previous.entries[key], ...patch } }
    }));
    setNotice(null);
  };

  const handleSave = async () => {
    if (!selectedClient || !onSave) return;
    const incomplete = MANDATORY_MONITORING_ITEMS
      .filter((item) => !item.automatic)
      .filter((item) => {
        const entry = draft.entries[item.key];
        return entry?.achieved && (!entry.date || !String(entry.evidence || '').trim());
      });
    if (incomplete.length) {
      setNotice({ tone: 'error', text: 'U splněné položky doplňte datum i stručné doložení.' });
      return;
    }

    const saved = await onSave({
      id: effective.record?.id || '',
      clientId: selectedClient.id,
      clientName: clientLabel(selectedClient),
      payload: normalizeMandatoryMonitoring(draft)
    });
    setNotice(saved
      ? { tone: 'success', text: 'Monitoring byl uložen.' }
      : { tone: 'error', text: 'Monitoring se nepodařilo uložit.' });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotice(null);
    try {
      const result = await buildMandatoryMonitoringXlsx({ clients, monitoringRecords, workRecords, period, romEstimate });
      const blob = new Blob([result.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monitoring-${period?.value || 'projekt'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice({ tone: 'success', text: `Export obsahuje ${result.personRows} započtených řádků.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || 'Export monitoringu se nepodařilo vytvořit.' });
    } finally {
      setIsExporting(false);
    }
  };

  const automaticPlan = effective.entries.individualPlan;
  const handleSaveRomEstimate = async () => {
    if (!onSave) return;
    const generalCount = overview.summary.find((item) => item.key === 'lifestyleChange')?.count || 0;
    const nextValue = Math.max(0, Math.floor(Number(romEstimateDraft) || 0));
    if (nextValue > generalCount) {
      setNotice({ tone: 'error', text: 'Kvalifikovaný odhad nemůže být vyšší než počet osob s pozitivní změnou.' });
      return;
    }
    const saved = await onSave({
      id: aggregateRecord?.id || '',
      clientId: '__aggregate__',
      clientName: 'Souhrn monitoringu',
      payload: {
        romEstimateByPeriod: {
          ...(aggregateRecord?.payload?.romEstimateByPeriod || {}),
          [periodKey]: nextValue
        }
      }
    });
    setNotice(saved
      ? { tone: 'success', text: 'Kvalifikovaný odhad byl uložen pouze jako souhrnný počet.' }
      : { tone: 'error', text: 'Kvalifikovaný odhad se nepodařilo uložit.' });
  };

  return (
    <Panel
      title="Monitoring"
      icon={ClipboardCheck}
      action={
        <button type="button" onClick={handleExport} disabled={isExporting || !clients.length} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Připravuji XLSX…' : 'Stáhnout monitoring XLSX'}
        </button>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {overview.summary.map((item) => (
          <div key={item.key} className="rounded-lg border border-blue-200 bg-white px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">{item.group}</div>
            <div className="mt-1 text-xs font-semibold leading-snug text-slate-700">{item.label}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-900"><Users className="h-4 w-4 text-blue-600" />{item.count}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <label className="min-w-60 flex-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
          Kvalifikovaný odhad počtu Romů · souhrn za období
          <input aria-label="Kvalifikovaný odhad počtu Romů" type="number" min="0" max={overview.summary.find((item) => item.key === 'lifestyleChange')?.count || 0} value={romEstimateDraft} onChange={(event) => setRomEstimateDraft(event.target.value)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </label>
        <button type="button" onClick={handleSaveRomEstimate} disabled={isSaving} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50">Uložit souhrnný odhad</button>
        <p className="w-full text-xs text-amber-800">Odhad se neukládá ke konkrétním klientům.</p>
      </div>

      <details className="mt-3 rounded-xl border border-slate-300 bg-white p-3" open>
        <summary className="cursor-pointer text-sm font-bold text-slate-900">Evidence za osobu</summary>
        <div className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <SelectField label="Klient" value={selectedClientId} onChange={setSelectedClientId} options={sortedClients.map((client) => ({ value: client.id, label: clientLabel(client) }))} />
            </div>
            {selectedClient && onOpenClient && (
              <button type="button" onClick={() => onOpenClient(selectedClient.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Otevřít klienta</button>
            )}
          </div>

          {selectedClient ? (
            <div className="mt-3 space-y-2">
              {MANDATORY_MONITORING_ITEMS.map((item) => {
                if (item.automatic) {
                  return (
                    <div key={item.key} className={`rounded-lg border px-3 py-2 ${automaticPlan.achieved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.group} · automaticky</div>
                          <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                        </div>
                        <strong className={automaticPlan.achieved ? 'text-emerald-700' : 'text-slate-500'}>{automaticPlan.achieved ? `Splněno ${automaticPlan.date}` : 'Bez uloženého plánu'}</strong>
                      </div>
                    </div>
                  );
                }
                const entry = draft.entries[item.key];
                return (
                  <div key={item.key} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-[minmax(250px,1fr)_160px_minmax(280px,1.4fr)] md:items-end">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.group}</div>
                      <CheckboxField label={item.label} checked={entry.achieved} onChange={(checked) => updateEntry(item.key, { achieved: checked })} compact />
                    </div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Datum dosažení
                      <input aria-label={`${item.label} – datum dosažení`} type="date" value={entry.date} onChange={(event) => updateEntry(item.key, { date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Stručné doložení
                      <input aria-label={`${item.label} – stručné doložení`} type="text" value={entry.evidence} onChange={(event) => updateEntry(item.key, { evidence: event.target.value })} placeholder="Např. vyhodnocený cíl nebo výsledek podpory" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal" />
                    </label>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-end gap-3">
                {notice && <div className={`mr-auto text-sm font-semibold ${notice.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{notice.text}</div>}
                <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Ukládám…' : 'Uložit monitoring'}
                </button>
              </div>
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">V evidenci není žádný klient.</p>}
        </div>
      </details>
    </Panel>
  );
}

export default MonitoringPanel;
