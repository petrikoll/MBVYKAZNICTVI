import React from 'react';
import { Activity, AlertTriangle, Archive, ArrowLeft, Brain, ClipboardCopy, Download, FileSpreadsheet, FileText, HardDriveDownload, Loader2, Network, ShieldCheck, Target, Users } from 'lucide-react';

import { HelpIcon, Panel, SelectField } from '../components/ui.jsx';
import { HELP } from '../config/helpCatalog.js';
import { REPORTING_PERIODS, WORKERS } from '../config/projectConfig.js';
import { backupProgressText, isBackupStatusActive } from '../lib/backupStatus.js';

const formatEvidenceDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${Number(match[3])}. ${Number(match[2])}. ${match[1]}` : String(value || '');
};

const ProgressRow = ({ item }) => {
  const hasTarget = Number(item.target) > 0;
  const percent = hasTarget ? Math.min(100, Math.round((Number(item.current || 0) / item.target) * 100)) : 0;
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  const evidenceLabel = item.evidenceLabel || 'Započtené osoby';
  const tooltipId = `goal-evidence-${item.key}`;
  const helpByGoal = {
    'security-short': HELP.dashboardShortSecurity,
    'services-short': HELP.dashboardShortServices,
    'parenting-short': HELP.dashboardShortParenting,
    'inclusion-short': HELP.dashboardInclusion
  };
  return (
    <div
      className="group relative rounded-lg border border-slate-200 bg-white p-3 outline-none transition hover:z-30 hover:border-indigo-300 focus:z-30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-800">{item.label}<HelpIcon help={helpByGoal[item.key] || null} /></div>
        <div className="shrink-0 text-sm font-bold text-slate-900">{item.current}{hasTarget ? ' / ' + item.target : ''}</div>
      </div>
      {item.note && <div className="mt-1 text-xs text-slate-500">{item.note}</div>}
      {hasTarget && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: percent + '%' }} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-indigo-700">
        <Users className="h-3.5 w-3.5" />
        Najeďte pro kontrolní detail
      </div>
      <div
        id={tooltipId}
        role="tooltip"
        className="invisible absolute left-0 top-full z-50 mt-2 w-[min(36rem,calc(100vw-2rem))] translate-y-1 rounded-xl border border-indigo-200 bg-white p-3 text-left opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus:visible group-focus:translate-y-0 group-focus:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <strong className="text-xs text-slate-900">{evidenceLabel}</strong>
          <span className="text-xs font-bold text-indigo-700">{evidence.length}</span>
        </div>
        {evidence.length === 0 ? (
          <p className="text-xs text-slate-500">Pro tento cíl zatím není započtena žádná položka.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {evidence.map((entry, index) => (
              <li key={entry.key || `${item.key}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div className="font-bold text-slate-900">{entry.clientName || 'Bez přiřazeného klienta'}</div>
                <div className="mt-0.5 text-slate-700">
                  {[formatEvidenceDate(entry.date), entry.performance].filter(Boolean).join(' · ') || 'Zdrojový výkon neuveden'}
                </div>
                {entry.area && <div className="mt-0.5 text-slate-500">Oblast: {entry.area}</div>}
                {entry.detail && <div className="mt-0.5 text-slate-500">{entry.detail}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const IndicatorCard = ({ item }) => {
  const percent = Math.min(100, Math.round((Number(item.current || 0) / item.target) * 100));
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase text-indigo-700">Indikátor {item.code}</div>
          <div className="mt-1 flex items-center gap-1 text-base font-bold text-slate-900">{item.label}<HelpIcon help={item.key === '600000' ? HELP.dashboard600 : HELP.dashboard670} /></div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{item.current} / {item.target}</div>
          <div className="text-xs font-semibold text-slate-500">{percent} %</div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: percent + '%' }} />
      </div>
    </div>
  );
};

const formatHours = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0 h';
  return `${number.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} h`;
};

const ProfessionalDevelopmentCard = ({ item }) => {
  const rows = [
    ['Počet hodin supervize individuální', item.individualSupervisionHours],
    ['Počet hodin supervize skupinové', item.groupSupervisionHours],
    ['Počet hodin vzdělávání 2026', item.education2026Hours],
    ['Počet hodin vzdělávání 2027', item.education2027Hours],
    ['Počet hodin vzdělávání 2028', item.education2028Hours],
    ['Počet hodin vzdělávání celkem', item.educationTotalHours],
    ['Počet hodin supervize celkem', item.supervisionTotalHours]
  ];
  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-bold text-slate-900">{item.worker}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 py-2 text-xs">
            <span className="text-slate-600">{label}</span>
            <strong className="shrink-0 text-right text-slate-900">{formatHours(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

function ReportingView({
  dashboardOverview,
  exportClientsIsEsfCsv,
  isEsfExportStatus,
  isEsfSupportedClientCount = 0,
  exportAllRecordsBackup,
  exportDetailedOutputsXlsx,
  isExportingDetailedOutputs = false,
  supportExportCount,
  dashboardFilters,
  setDashboardFilters,
  filteredRecords,
  handleGenerateZorTexts,
  isGeneratingZor = false,
  zorTexts,
  copyToClipboard,
  setCopied,
  copied,
  canManageBackups = false,
  backupStatus = null,
  isBackupActionRunning = false,
  handleStartFullBackup,
  handleInstallWeeklyBackup
}) {
  const [showDetailedOutputs, setShowDetailedOutputs] = React.useState(false);
  const overview = dashboardOverview || { indicators: [], longGoals: [], shortGoals: [], activityGoals: [], professionalDevelopmentStats: [], partnerMetrics: [], risks: [] };
  React.useEffect(() => {
    if (!showDetailedOutputs && (dashboardFilters.ka !== 'all' || dashboardFilters.worker !== 'all')) {
      setDashboardFilters((previous) => ({ ...previous, ka: 'all', worker: 'all' }));
    }
  }, [dashboardFilters.ka, dashboardFilters.worker, setDashboardFilters, showDetailedOutputs]);
  const backupBusy = isBackupActionRunning || isBackupStatusActive(backupStatus);
  const backupProgress = backupProgressText(backupStatus);
  const backupFinishedAt = backupStatus?.finishedAt
    ? new Date(backupStatus.finishedAt).toLocaleString('cs-CZ')
    : '';
  const educationFallbacks = isEsfExportStatus?.educationFallbacks || [];
  const missingEducationCount = educationFallbacks.filter((item) => item.kind === 'missing').length;
  const educationFallbackTitle = missingEducationCount === educationFallbacks.length
    ? 'Nevyplněné vzdělání'
    : missingEducationCount > 0
      ? 'Nevyplněné nebo nerozpoznané vzdělání'
      : 'Nerozpoznané vzdělání';

  const returnToDashboard = () => {
    setDashboardFilters((previous) => ({ ...previous, ka: 'all', worker: 'all' }));
    setShowDetailedOutputs(false);
  };

  if (showDetailedOutputs) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={returnToDashboard} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" /> Zpět na dashboard
            </button>
            <h1 className="text-xl font-bold text-slate-900">Podrobné výstupy</h1>
            <p className="mt-1 text-sm text-slate-600">Sestavy a podklady pro vykazování podle zvoleného období, aktivity a pracovníka.</p>
          </div>
        </div>

        <Panel
          title="Filtry a exporty"
          description="Nastavené filtry se použijí pro XLSX a stažení zápisů. Export IS ESF a texty ZOR používají zvolené monitorovací období."
          icon={FileSpreadsheet}
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportDetailedOutputsXlsx} disabled={!supportExportCount || isExportingDetailedOutputs} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                {isExportingDetailedOutputs ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {isExportingDetailedOutputs ? 'Připravuji XLSX…' : `Stáhnout sestavy XLSX (${supportExportCount || 0})`}
              </button>
              <button type="button" onClick={exportClientsIsEsfCsv} disabled={!isEsfSupportedClientCount || isEsfExportStatus?.state === 'loading'} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
                {isEsfExportStatus?.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {isEsfExportStatus?.state === 'loading' ? 'Kontroluji adresy…' : `Podporované osoby do IS ESF (${isEsfSupportedClientCount})`}
              </button><HelpIcon help={HELP.dashboardExport} />
              <button type="button" onClick={exportAllRecordsBackup} disabled={!supportExportCount} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <Archive className="h-4 w-4" /> Stáhnout zápisy ({supportExportCount || 0})
              </button>
              <button type="button" onClick={handleGenerateZorTexts} disabled={dashboardFilters.period === 'all' || isGeneratingZor} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
                {isGeneratingZor ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isGeneratingZor ? 'Připravuji texty…' : 'Vytvořit texty pro ZOR'}
              </button><HelpIcon help={HELP.dashboardZor} />
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField label="Vykazované období" help={HELP.dashboardPeriod} value={dashboardFilters.period} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, period: value }))} options={REPORTING_PERIODS.map((period) => ({ value: period.value, label: period.label }))} />
            <SelectField label="Klíčová aktivita" value={dashboardFilters.ka} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, ka: value }))} options={[{ value: 'all', label: 'Všechny KA' }, { value: 'KA1', label: 'KA1' }, { value: 'KA2', label: 'KA2' }]} />
            <SelectField label="Pracovník" value={dashboardFilters.worker} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, worker: value }))} options={[{ value: 'all', label: 'Všichni pracovníci' }].concat(WORKERS.map((worker) => ({ value: worker, label: worker })))} />
          </div>
          <div className="mt-3 text-xs text-slate-600">Aktivní filtr zahrnuje <strong>{filteredRecords.length}</strong> záznamů a <strong>{supportExportCount || 0}</strong> klientských výkonů.</div>

          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            isEsfExportStatus?.state === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : isEsfExportStatus?.state === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : isEsfExportStatus?.state === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            <div className="font-semibold">
              {!isEsfSupportedClientCount
                ? 'Ve zvoleném období není evidována žádná osoba s podporou KA1.'
                : (isEsfExportStatus?.message || 'Kontrola údajů a adres se spustí při stažení CSV.')}
            </div>
            {isEsfExportStatus?.addressFallbacks?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Osoby bez potvrzené úplné adresy ({isEsfExportStatus.addressFallbacks.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.addressFallbacks.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
            {isEsfExportStatus?.addressAdjustments?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Adresy upravené podle RÚIAN ({isEsfExportStatus.addressAdjustments.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.addressAdjustments.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
            {isEsfExportStatus?.educationFallbacks?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">{educationFallbackTitle} ({isEsfExportStatus.educationFallbacks.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.educationFallbacks.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
            {isEsfExportStatus?.dataIssues?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Údaje vyžadující doplnění ({isEsfExportStatus.dataIssues.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.dataIssues.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.issues.join(', ')}</li>)}</ul></details>}
          </div>
        </Panel>

        <Panel title="Základní sestavy XLSX" description="Jeden sešit obsahuje dva samostatné listy a lze jej dále rozšiřovat o další sestavy." icon={FileSpreadsheet}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><strong className="text-sm text-blue-900">Podrobné výkony</strong><p className="mt-1 text-xs text-blue-800">Jednotlivé výkony včetně času, klienta, pracovníka, oblasti, výsledku, dalšího kroku, cíle IP a textu zápisu.</p></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><strong className="text-sm text-emerald-900">Klienti a podpora</strong><p className="mt-1 text-xs text-emerald-800">Počet výkonů a hodin celkem, samostatně telefonická podpora a ostatní formy podpory.</p></div>
          </div>
        </Panel>

        {zorTexts && (
          <Panel title={'Texty pro ZOR (' + zorTexts.periodLabel + ')'} description="Pracovní návrhy popisu pokroku za sledované období." icon={FileText}>
            <div className="space-y-3">
              {Object.entries(zorTexts.texts).map(([ka, value]) => (
                <div key={ka} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3"><strong>{ka}</strong><button type="button" onClick={() => copyToClipboard(value, setCopied)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><ClipboardCopy className="h-4 w-4" />{copied ? 'Zkopírováno' : 'Kopírovat'}</button></div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Vykazované období dashboardu"
        description="Období ovlivňuje hodiny, výkony, cíle a indikátory zobrazené v přehledu."
        icon={Activity}
        action={
          <button type="button" onClick={() => setShowDetailedOutputs(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            <FileSpreadsheet className="h-4 w-4" /> Podrobné výstupy
          </button>
        }
      >
        <div className="max-w-md">
          <SelectField label="Vykazované období" help={HELP.dashboardPeriod} value={dashboardFilters.period} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, period: value }))} options={REPORTING_PERIODS.map((period) => ({ value: period.value, label: period.label }))} />
        </div>
        <div className="mt-3 text-xs text-slate-600">Dashboard zahrnuje <strong>{filteredRecords.length}</strong> záznamů.</div>
      </Panel>

      {canManageBackups && (
        <Panel
          title="Kompletní záloha Google Drive"
          description="Vytvoří ZIP s hlavním Google Sheetem, klientskými složkami a kontrolním manifestem. Uchovává se posledních 12 záloh."
          icon={HardDriveDownload}
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleStartFullBackup} disabled={backupBusy} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                {backupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                {backupBusy ? 'Záloha se připravuje…' : 'Vytvořit kompletní zálohu'}
              </button>
              {!backupStatus?.weeklyEnabled && (
                <button type="button" onClick={handleInstallWeeklyBackup} disabled={isBackupActionRunning} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                  <ShieldCheck className="h-4 w-4" /> Zapnout týdenní zálohy
                </button>
              )}
              {backupStatus?.downloadUrl && backupStatus?.state === 'success' && (
                <a href={backupStatus.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                  <Download className="h-4 w-4" /> Stáhnout poslední ZIP
                </a>
              )}
            </div>
          }
        >
          <div className={`rounded-lg border px-3 py-2 text-sm ${
            backupStatus?.state === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : backupStatus?.state === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            <div className="font-semibold">{backupStatus?.message || 'Záloha zatím nebyla vytvořena.'}</div>
            {backupProgress && <div className="mt-1 text-xs font-semibold">{backupProgress}</div>}
            <div className="mt-1 text-xs">
              Automaticky každou neděli ve 2:00: <strong>{backupStatus?.weeklyEnabled ? 'zapnuto' : 'vypnuto'}</strong>
              {backupFinishedAt ? ` · Poslední dokončení: ${backupFinishedAt}` : ''}
              {backupStatus?.fileCount ? ` · Souborů v záloze: ${backupStatus.fileCount}` : ''}
            </div>
            {backupStatus?.statusError && <div className="mt-1 text-xs text-red-700">{backupStatus.statusError}</div>}
          </div>
          <p className="mt-2 text-xs text-slate-500">ZIP je uložen v chráněné složce Zálohy na Google Disku. Pro ochranu při ztrátě účtu pravidelně stáhněte kopii také mimo tento Google účet.</p>
        </Panel>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">Vzdělávání a supervize podle pozic</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(overview.professionalDevelopmentStats || []).map((item) => (
            <ProfessionalDevelopmentCard key={item.key || item.worker} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">Hlavní indikátory</h2>
        <div className="grid gap-4 md:grid-cols-2">{overview.indicators.map((item) => <IndicatorCard key={item.key} item={item} />)}</div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">Cíle projektu</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-600" /><h3 className="flex items-center gap-1 text-sm font-bold text-slate-900">Dlouhodobá podpora – klienti 40+ hodin <HelpIcon help={HELP.dashboardLongGoals} /></h3></div>
            <div className="space-y-2">{overview.longGoals.map((item) => <ProgressRow key={item.key} item={item} />)}</div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-bold text-slate-900">Krátkodobá podpora – klienti pod 40 hodin</h3></div>
            <div className="space-y-2">{overview.shortGoals.map((item) => <ProgressRow key={item.key} item={item} />)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-300 bg-slate-100 p-4">
          <div className="mb-3 text-sm font-bold text-slate-900">Doplňkové cíle KA1 / KA2</div>
          <div className="grid gap-3 md:grid-cols-2">
            {overview.activityGoals.map((item) => <ProgressRow key={item.key} item={item} />)}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Network className="h-5 w-5 text-emerald-700" />
          <h2 className="flex items-center gap-1 text-base font-bold text-slate-900">Partnerská síť <HelpIcon help={HELP.dashboardPartners} /></h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.partnerMetrics.map((item) => (
            <div key={item.key} className="rounded-lg border border-emerald-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                <div className="text-2xl font-bold text-emerald-800">{item.current}</div>
              </div>
              <div className="mt-2 text-xs text-slate-500">{item.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-1 text-base font-bold text-slate-900">Kontrolní upozornění <HelpIcon help={HELP.dashboardRisks} /></h2>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-300 bg-white">
          {overview.risks.map((risk) => (
            <div key={risk.key} className="flex items-center gap-3 px-4 py-3">
              <AlertTriangle className={'h-4 w-4 shrink-0 ' + (risk.count > 0 ? 'text-amber-600' : 'text-emerald-600')} />
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-900">{risk.label}</div><div className="text-xs text-slate-500">{risk.detail}</div></div>
              <div className={'min-w-10 text-right text-lg font-bold ' + (risk.count > 0 ? 'text-amber-700' : 'text-emerald-700')}>{risk.count}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default ReportingView;
