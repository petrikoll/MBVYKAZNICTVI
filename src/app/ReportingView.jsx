import React from 'react';
import { Activity, AlertTriangle, Archive, ArrowLeft, ArrowRight, Brain, ClipboardCopy, Download, FileClock, FileSpreadsheet, FileText, HardDriveDownload, Loader2, Network, ShieldCheck, Target, Upload, Users, X } from 'lucide-react';

import { HelpIcon, Panel, SelectField } from '../components/ui.jsx';
import { HELP } from '../config/helpCatalog.js';
import { REPORTING_PERIODS, WORKERS } from '../config/projectConfig.js';
import { backupProgressText, isBackupStatusActive } from '../lib/backupStatus.js';
import ReportingAnalyticsView from './ReportingAnalyticsView.jsx';
import WorkReportsView from '../features/work-reports/WorkReportsView.jsx';

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

const ExportCard = ({ icon: Icon, title, format, description, children, tone = 'blue' }) => {
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900'
  };
  return (
    <div className={`flex h-full flex-col rounded-xl border p-4 ${toneClasses[tone] || toneClasses.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0" />
          <strong className="text-sm">{title}</strong>
        </div>
        <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{format}</span>
      </div>
      <p className="mt-2 flex-1 text-xs leading-5 opacity-80">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
};

const WorkflowStep = ({ number, title, format, description, children, state = 'idle' }) => {
  const stateClass = state === 'success'
    ? 'border-emerald-300 bg-emerald-50/60'
    : state === 'warning'
      ? 'border-amber-300 bg-amber-50/60'
      : state === 'error'
        ? 'border-red-300 bg-red-50/60'
        : 'border-slate-300 bg-white';
  return (
    <div className={`flex h-full min-w-0 flex-col rounded-xl border-2 p-4 ${stateClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-sm font-bold text-white">{number}</span>
          <strong className="text-sm text-slate-900">{title}</strong>
        </div>
        <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{format}</span>
      </div>
      <p className="mt-3 flex-1 text-xs leading-5 text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
};

function ReportingView({
  dashboardOverview,
  exportClientsIsEsfCsv,
  isEsfExportStatus,
  isEsfSupportedClientCount = 0,
  exportSupportsIsEsfCsv,
  isEsfSupportExportStatus,
  isEsfSupportExportCount = 0,
  isEsfPersonImport = null,
  importIsEsfPersonCsv,
  clearIsEsfPersonCsv,
  exportAllRecordsBackup,
  exportDetailedOutputsXlsx,
  isExportingDetailedOutputs = false,
  supportExportCount,
  analyticsRecords = [],
  workReportRecords = [],
  clients = [],
  onOpenClient,
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
  const [detailedSection, setDetailedSection] = React.useState('analytics');
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
  const personImportRows = isEsfPersonImport?.rows?.length || 0;
  const personImportProblems = (isEsfPersonImport?.unmatchedClients?.length || 0) + (isEsfPersonImport?.ambiguousClients?.length || 0);
  const personImportReady = personImportRows > 0
    && personImportProblems === 0
    && isEsfPersonImport?.matchedCount === isEsfPersonImport?.expectedCount;
  const hasSelectedMonitoringPeriod = dashboardFilters.period !== 'all';
  const personImportState = isEsfPersonImport?.error
    ? 'error'
    : personImportRows > 0
      ? personImportReady ? 'success' : 'warning'
      : 'idle';

  const returnToDashboard = () => {
    setDashboardFilters((previous) => ({ ...previous, ka: 'all', worker: 'all' }));
    setShowDetailedOutputs(false);
  };

  const reportingScopeFilters = (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField label="Vykazované období" help={HELP.dashboardPeriod} value={dashboardFilters.period} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, period: value }))} options={REPORTING_PERIODS.map((period) => ({ value: period.value, label: period.label }))} />
        <SelectField label="Klíčová aktivita" value={dashboardFilters.ka} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, ka: value }))} options={[{ value: 'all', label: 'Všechny KA' }, { value: 'KA1', label: 'KA1' }, { value: 'KA2', label: 'KA2' }]} />
        <SelectField label="Pracovník" value={dashboardFilters.worker} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, worker: value }))} options={[{ value: 'all', label: 'Všichni pracovníci' }].concat(WORKERS.map((worker) => ({ value: worker, label: worker })))} />
      </div>
      <div className="mt-3 text-xs text-slate-600">Aktivní filtr zahrnuje <strong>{filteredRecords.length}</strong> záznamů a <strong>{supportExportCount || 0}</strong> klientských výkonů.</div>
    </>
  );

  if (showDetailedOutputs) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={returnToDashboard} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" /> Zpět na dashboard
            </button>
            <h1 className="text-xl font-bold text-slate-900">Podrobné výstupy</h1>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-1.5 rounded-2xl border border-blue-300 bg-blue-100 p-1.5 shadow-sm sm:grid-cols-3" role="tablist" aria-label="Část podrobných výstupů">
          <button type="button" role="tab" aria-selected={detailedSection === 'analytics'} onClick={() => setDetailedSection('analytics')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${detailedSection === 'analytics' ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-800' : 'bg-white/70 text-slate-700 hover:bg-white hover:text-blue-800'}`}><Activity className="h-4 w-4" /> Analýzy a grafy</button>
          <button type="button" role="tab" aria-selected={detailedSection === 'reports'} onClick={() => setDetailedSection('reports')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${detailedSection === 'reports' ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-800' : 'bg-white/70 text-slate-700 hover:bg-white hover:text-blue-800'}`}><FileSpreadsheet className="h-4 w-4" /> Sestavy a exporty</button>
          <button type="button" role="tab" aria-selected={detailedSection === 'workReports'} onClick={() => setDetailedSection('workReports')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${detailedSection === 'workReports' ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-800' : 'bg-white/70 text-slate-700 hover:bg-white hover:text-blue-800'}`}><FileClock className="h-4 w-4" /> Výkazy práce</button>
        </div>

        {detailedSection !== 'workReports' && (
          <Panel
            title={detailedSection === 'analytics' ? 'Rozsah analýzy' : 'Rozsah sestav'}
            icon={detailedSection === 'analytics' ? Activity : FileSpreadsheet}
          >
            {reportingScopeFilters}
          </Panel>
        )}

        {detailedSection === 'workReports' ? (
          <WorkReportsView records={workReportRecords} />
        ) : detailedSection === 'analytics' ? (
          <ReportingAnalyticsView records={analyticsRecords} clients={clients} onOpenClient={onOpenClient} />
        ) : (
          <>
            <Panel title="Interní sestavy" icon={FileSpreadsheet}>
              <div className="grid gap-4 lg:grid-cols-2">
                <ExportCard icon={FileSpreadsheet} title="Podrobné sestavy výkonů" format="XLSX" description="Jeden sešit se dvěma listy: jednotlivé výkony a souhrn klientů s hodinami celkem, telefonicky a ostatními formami podpory.">
                  <button type="button" onClick={exportDetailedOutputsXlsx} disabled={!supportExportCount || isExportingDetailedOutputs} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {isExportingDetailedOutputs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isExportingDetailedOutputs ? 'Připravuji XLSX…' : `Stáhnout XLSX (${supportExportCount || 0} výkonů)`}
                  </button>
                </ExportCard>
                <ExportCard icon={Archive} title="Úplné texty zápisů" format="DOC" tone="slate" description="Všechny klientské zápisy odpovídající zvoleným filtrům.">
                  <button type="button" onClick={exportAllRecordsBackup} disabled={!supportExportCount} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                    <Download className="h-4 w-4" /> Stáhnout DOC ({supportExportCount || 0} zápisů)
                  </button>
                </ExportCard>
              </div>
            </Panel>

            <Panel title="Postup exportu do IS ESF" description="Postupujte zleva doprava. CSV podpor vznikne až z osob potvrzených nahraným seznamem z IS ESF." icon={Download}>
              <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
                <WorkflowStep number="1" title="Vyexportovat osoby" format="CSV · 32 sloupců" description="Vytvořte CSV osob z evidence aplikace a nahrajte je do IS ESF. Adresy se při exportu ověří proti RÚIAN." state={isEsfExportStatus?.state === 'success' ? 'success' : isEsfExportStatus?.state === 'error' ? 'error' : 'idle'}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={exportClientsIsEsfCsv} disabled={!isEsfSupportedClientCount || isEsfExportStatus?.state === 'loading'} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                      {isEsfExportStatus?.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {isEsfExportStatus?.state === 'loading' ? 'Kontroluji adresy…' : `Stáhnout osoby (${isEsfSupportedClientCount})`}
                    </button>
                    <HelpIcon help={HELP.dashboardExport} />
                  </div>
                </WorkflowStep>

                <div className="flex items-center justify-center text-indigo-400"><ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" /></div>

                <WorkflowStep number="2" title="Nahrát seznam z IS ESF" format="CSV z IS ESF" description="Po zpracování osob v IS ESF nahrajte jejich CSV export. Přijímá se úplný export osob i volba „Export pro záznamy do CSV“." state={personImportState}>
                  <input id="is-esf-person-csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { importIsEsfPersonCsv?.(event.target.files?.[0]); event.target.value = ''; }} />
                  <div className="flex items-center gap-2">
                    <label htmlFor="is-esf-person-csv" className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                      <Upload className="h-4 w-4" /> {personImportRows ? 'Nahrát jiné CSV' : 'Nahrát CSV z IS ESF'}
                    </label>
                    {personImportRows > 0 && <button type="button" onClick={clearIsEsfPersonCsv} title="Odebrat nahrané CSV" aria-label="Odebrat nahrané CSV" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
                    <HelpIcon help={HELP.dashboardSupportImport} />
                  </div>
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${personImportState === 'success' ? 'bg-emerald-100 text-emerald-800' : personImportState === 'warning' ? 'bg-amber-100 text-amber-800' : personImportState === 'error' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                    {isEsfPersonImport?.error
                      || (personImportRows > 0
                        ? `${isEsfPersonImport.fileName}: přiřazeno ${isEsfPersonImport.matchedCount} z ${isEsfPersonImport.expectedCount} osob.`
                        : 'Soubor se zpracuje pouze v tomto prohlížeči a nikam se neodesílá.')}
                  </div>
                  {personImportProblems > 0 && (
                    <details className="mt-2 text-xs text-amber-800">
                      <summary className="cursor-pointer font-semibold">Osoby vyžadující kontrolu ({personImportProblems})</summary>
                      <ul className="mt-1 space-y-1 pl-4">
                        {(isEsfPersonImport.unmatchedClients || []).map((client) => <li key={`missing-${client.id}`}>{client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim()}: nenalezena v CSV</li>)}
                        {(isEsfPersonImport.ambiguousClients || []).map((client) => <li key={`duplicate-${client.id}`}>{client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim()}: v CSV je vícekrát</li>)}
                      </ul>
                    </details>
                  )}
                </WorkflowStep>

                <div className="flex items-center justify-center text-indigo-400"><ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" /></div>

                <WorkflowStep number="3" title="Vytvořit podpory" format="CSV · 17 sloupců" description="Aplikace doplní k osobám z nahraného CSV souhrn výkonů KA1 ve specifikaci 7.1, zvlášť prezenčně a elektronicky. V MO1 je DatumOd dnem vstupu osoby do projektu a DatumDo 31. 12. 2026; v dalších MO odpovídají obě data začátku a konci období." state={isEsfSupportExportStatus?.state === 'success' ? 'success' : isEsfSupportExportStatus?.state === 'error' ? 'error' : personImportReady && hasSelectedMonitoringPeriod ? 'idle' : 'warning'}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={exportSupportsIsEsfCsv} disabled={!hasSelectedMonitoringPeriod || !personImportReady || !isEsfSupportExportCount || isEsfSupportExportStatus?.state === 'loading'} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                      {isEsfSupportExportStatus?.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {isEsfSupportExportStatus?.state === 'loading' ? 'Připravuji podpory…' : `Stáhnout podpory (${isEsfSupportExportCount})`}
                    </button>
                    <HelpIcon help={HELP.dashboardSupportExport} />
                  </div>
                  {!hasSelectedMonitoringPeriod
                    ? <p className="mt-3 text-xs font-semibold text-amber-700">Nejprve vyberte konkrétní monitorovací období.</p>
                    : !personImportReady && <p className="mt-3 text-xs font-semibold text-amber-700">Zpřístupní se po úspěšném nahrání a přiřazení osob v kroku 2.</p>}
                </WorkflowStep>
              </div>

              <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${isEsfExportStatus?.state === 'error' ? 'border-red-200 bg-red-50 text-red-800' : isEsfExportStatus?.state === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : isEsfExportStatus?.state === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <div className="font-semibold">{!isEsfSupportedClientCount ? 'Ve zvoleném období není evidována žádná osoba s podporou KA1.' : (isEsfExportStatus?.message || 'Kontrola údajů a adres se spustí při stažení CSV osob.')}</div>
                {isEsfExportStatus?.addressFallbacks?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Osoby bez potvrzené úplné adresy ({isEsfExportStatus.addressFallbacks.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.addressFallbacks.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
                {isEsfExportStatus?.addressAdjustments?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Adresy upravené podle RÚIAN ({isEsfExportStatus.addressAdjustments.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.addressAdjustments.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
                {isEsfExportStatus?.educationFallbacks?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">{educationFallbackTitle} ({isEsfExportStatus.educationFallbacks.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.educationFallbacks.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.reason}</li>)}</ul></details>}
                {isEsfExportStatus?.dataIssues?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Údaje vyžadující doplnění ({isEsfExportStatus.dataIssues.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfExportStatus.dataIssues.map((item) => <li key={`${item.clientId}-${item.clientName}`}>{item.clientName}: {item.issues.join(', ')}</li>)}</ul></details>}
              </div>
              <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${isEsfSupportExportStatus?.state === 'error' ? 'border-red-200 bg-red-50 text-red-800' : isEsfSupportExportStatus?.state === 'success' ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <div className="font-semibold">{isEsfSupportExportStatus?.message || 'Nejprve nahrajte CSV podpořených osob vyexportované z IS ESF.'}</div>
                {isEsfSupportExportStatus?.issues?.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Chyby bránící exportu ({isEsfSupportExportStatus.issues.length})</summary><ul className="mt-1 space-y-1 pl-4">{isEsfSupportExportStatus.issues.map((item, index) => <li key={`${item.recordId}-${index}`}>{item.clientName || 'Neurčená osoba'}: {item.message}</li>)}</ul></details>}
              </div>
            </Panel>

            <Panel title="Podklady pro ZOR" icon={FileText} action={<div className="flex items-center gap-1"><button type="button" onClick={handleGenerateZorTexts} disabled={dashboardFilters.period === 'all' || isGeneratingZor} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">{isGeneratingZor ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{isGeneratingZor ? 'Připravuji texty…' : 'Vytvořit texty ZOR'}</button><HelpIcon help={HELP.dashboardZor} /></div>}>
              {!zorTexts && <p className="text-sm text-slate-600">Vyberte konkrétní monitorovací období a vytvořte texty. Výsledek se zobrazí zde ke kontrole a kopírování.</p>}
              {zorTexts && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-800">Období: {zorTexts.periodLabel}</div>
                  {Object.entries(zorTexts.texts).map(([ka, value]) => (
                    <div key={ka} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3"><strong>{ka}</strong><button type="button" onClick={() => copyToClipboard(value, setCopied)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><ClipboardCopy className="h-4 w-4" />{copied ? 'Zkopírováno' : 'Kopírovat'}</button></div>
                      <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Vykazované období dashboardu"
        icon={Activity}
        compact
        action={
          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
            <div className="w-full sm:w-72 lg:w-96">
              <SelectField label="Vykazované období" help={HELP.dashboardPeriod} value={dashboardFilters.period} onChange={(value) => setDashboardFilters((prev) => ({ ...prev, period: value }))} options={REPORTING_PERIODS.map((period) => ({ value: period.value, label: period.label }))} />
            </div>
            <div className="pb-2 text-xs whitespace-nowrap text-slate-600"><strong>{filteredRecords.length}</strong> záznamů</div>
            <button type="button" onClick={() => setShowDetailedOutputs(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              <FileSpreadsheet className="h-4 w-4" /> Podrobné výstupy
            </button>
          </div>
        }
      />

      {canManageBackups && (
        <Panel
          title="Kompletní záloha Google Drive"
          icon={HardDriveDownload}
          compact
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
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm ${
            backupStatus?.state === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : backupStatus?.state === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            <div className="font-semibold">{backupStatus?.message || 'Záloha zatím nebyla vytvořena.'}</div>
            {backupProgress && <div className="text-xs font-semibold">{backupProgress}</div>}
            <div className="text-xs">
              Automaticky každou neděli ve 2:00: <strong>{backupStatus?.weeklyEnabled ? 'zapnuto' : 'vypnuto'}</strong>
              {backupFinishedAt ? ` · Poslední dokončení: ${backupFinishedAt}` : ''}
              {backupStatus?.fileCount ? ` · Souborů v záloze: ${backupStatus.fileCount}` : ''}
            </div>
            {backupStatus?.statusError && <div className="text-xs text-red-700">{backupStatus.statusError}</div>}
          </div>
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
