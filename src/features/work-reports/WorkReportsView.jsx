import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Settings2, Umbrella } from 'lucide-react';

import templateBase64 from '../../assets/SABLONA_Pracovni_vykaz_OPZ.xlsx?base64';
import { DEFAULT_ACTIVITIES, DEFAULT_SETTINGS, getAvailableMonths, getContractTerms } from './projectDefaults.js';
import { balanceHours, distributeHours, getHoursStatus, getWorkingDays, roundActivityHours, roundHours, safeFilenamePart } from './reportUtils.mjs';
import { getVacationOverview } from './vacationUtils.mjs';
import { buildWorkReportWorkbook } from './workbookExport.mjs';
import { getAutomaticWorkReportActivity } from './autoActivity.mjs';

const STORAGE_KEY = 'projectReporting.workReports.v1';
const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

const currentPeriod = () => {
  const periods = getAvailableMonths();
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return periods.find((item) => item.key === key) || periods[0];
};

const readDraft = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
};

const decodeBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const formatHours = (value) => `${Number(value || 0).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} h`;

function WorkReportsView({ records = [] }) {
  const restored = useMemo(readDraft, []);
  const initialPeriod = restored?.period || currentPeriod();
  const initialTerms = getContractTerms(initialPeriod);
  const [period, setPeriod] = useState(initialPeriod);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...(restored?.settings || {}), ...initialTerms });
  const [activities, setActivities] = useState(() => distributeHours(
    (restored?.activities?.length ? restored.activities.slice(0, 2) : DEFAULT_ACTIVITIES).map((item) => ({ ...item })),
    initialTerms.monthlyHours,
  ));
  const [vacationByPeriod, setVacationByPeriod] = useState(restored?.vacationByPeriod || {});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  const periods = useMemo(getAvailableMonths, []);
  const vacation = useMemo(() => getVacationOverview({
    period,
    vacationByPeriod,
    vacationWeeks: settings.vacationWeeks,
  }), [period, settings.vacationWeeks, vacationByPeriod]);
  const automaticActivity = useMemo(() => getAutomaticWorkReportActivity({
    records,
    period,
    employeeName: settings.employeeName,
  }), [period, records, settings.employeeName]);
  const workTargetHours = Math.max(0, roundHours(settings.monthlyHours - vacation.currentMonthVacation));
  const basicActivityTarget = Math.max(0, roundHours(workTargetHours - (automaticActivity?.hours || 0)));
  const reportActivities = useMemo(
    () => automaticActivity ? [...activities.slice(0, 2), automaticActivity] : activities.slice(0, 2),
    [activities, automaticActivity],
  );
  const status = useMemo(() => getHoursStatus(reportActivities, workTargetHours), [reportActivities, workTargetHours]);
  const workingDays = getWorkingDays(period.month, period.year);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, settings, activities: activities.slice(0, 2), vacationByPeriod }));
  }, [period, settings, activities, vacationByPeriod]);

  useEffect(() => {
    setActivities((previous) => distributeHours(previous.slice(0, 2), basicActivityTarget));
  }, [basicActivityTarget, automaticActivity?.desc]);

  const selectPeriod = (key) => {
    const nextPeriod = periods.find((item) => item.key === key);
    if (!nextPeriod) return;
    const terms = getContractTerms(nextPeriod);
    const vacationHours = Math.max(0, Number(vacationByPeriod[nextPeriod.key]) || 0);
    setPeriod(nextPeriod);
    setSettings((previous) => ({ ...previous, ...terms }));
    setActivities((previous) => distributeHours(previous.slice(0, 2), Math.max(0, terms.monthlyHours - vacationHours)));
    setMessage(null);
  };

  const updateVacation = (value) => {
    const requested = Math.max(0, Number(value) || 0);
    const maximum = Math.min(settings.monthlyHours, vacation.availableForCurrentMonth);
    const nextValue = Math.min(requested, maximum);
    setVacationByPeriod((previous) => ({ ...previous, [period.key]: nextValue }));
    setActivities((previous) => distributeHours(previous.slice(0, 2), Math.max(0, settings.monthlyHours - nextValue - (automaticActivity?.hours || 0))));
    setMessage(null);
  };

  const resetActivities = () => {
    setActivities(distributeHours(DEFAULT_ACTIVITIES.map((item) => ({ ...item })), basicActivityTarget));
    setMessage({ tone: 'success', text: 'Výchozí dvě činnosti byly obnoveny.' });
  };

  const exportWorkbook = async () => {
    setMessage(null);
    const missing = ['projectName', 'registrationNumber', 'employeeName', 'positionName', 'budgetCode']
      .some((key) => !String(settings[key] || '').trim());
    if (missing) {
      setSettingsOpen(true);
      setMessage({ tone: 'error', text: 'Doplňte všechny údaje projektu a pracovníka.' });
      return;
    }
    if (reportActivities.some((activity) => !String(activity.desc || '').trim())) {
      setMessage({ tone: 'error', text: 'Každá činnost musí mít vyplněný popis.' });
      return;
    }
    if (!status.isBalanced) {
      setMessage({ tone: 'error', text: `Součet činností musí být přesně ${formatHours(workTargetHours)}.` });
      return;
    }

    setExporting(true);
    try {
      const workbook = await buildWorkReportWorkbook({
        templateBuffer: decodeBase64(templateBase64),
        period,
        settings,
        activities: reportActivities,
        workingDays,
        workedHours: status.actual,
        vacationHours: vacation.currentMonthVacation,
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Pracovni_vykaz_${safeFilenamePart(settings.employeeName)}_${period.year}_${String(period.month).padStart(2, '0')}.xlsx`;
      downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
      setMessage({ tone: 'success', text: 'Pracovní výkaz byl vygenerován a stažen.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error?.message || 'Generování výkazu se nezdařilo.' });
    } finally {
      setExporting(false);
    }
  };

  const fieldClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
  const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500';

  return (
    <div className="space-y-4">
      {message && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-slate-500 bg-slate-300 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className={labelClass} htmlFor="work-report-period">Vykazované období</label>
            <select id="work-report-period" className={fieldClass} value={period.key} onChange={(event) => selectPeriod(event.target.value)}>
              {periods.map((item) => <option key={item.key} value={item.key}>{MONTH_NAMES[item.month - 1]} {item.year}</option>)}
            </select>
          </div>
          <div className="min-w-[210px] flex-[2] rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2">
            <div className="text-sm font-bold text-slate-900">{settings.employeeName}</div>
            <div className="text-xs text-slate-600">{settings.positionName} · {settings.contractType} · {formatHours(settings.monthlyHours)} / měsíc</div>
          </div>
          <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Settings2 className="h-4 w-4" /> Údaje výkazu
          </button>
        </div>

        {settingsOpen && (
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['projectName', 'Název projektu'],
              ['registrationNumber', 'Registrační číslo'],
              ['employeeName', 'Pracovník'],
              ['positionName', 'Pozice'],
              ['budgetCode', 'Kód rozpočtu'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input className={fieldClass} value={settings[key]} onChange={(event) => setSettings((previous) => ({ ...previous, [key]: event.target.value }))} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)]">
        <section className="rounded-2xl border border-slate-500 bg-slate-300 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Činnosti Garanta projektu</h3>
              <p className="text-xs text-slate-500">Pracovní fond po odečtení dovolené: {formatHours(workTargetHours)} · hodiny po 0,5 h{automaticActivity ? ` · automaticky načteno ${formatHours(automaticActivity.hours)}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={resetActivities} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Obnovit</button>
              <button type="button" onClick={() => setActivities((previous) => balanceHours(previous.slice(0, 2), basicActivityTarget))} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"><CheckCircle2 className="h-3.5 w-3.5" /> Dorovnat</button>
            </div>
          </div>
          <div className="space-y-2">
            {reportActivities.map((activity, index) => (
              <div key={activity.automatic ? `automatic-${period.key}` : index} className={`grid gap-2 rounded-xl border p-3 md:grid-cols-[32px_minmax(0,1fr)_105px] ${activity.automatic ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black ${activity.automatic ? 'text-amber-700' : 'text-indigo-700'}`}>{String(index + 1).padStart(2, '0')}</div>
                <textarea rows="2" readOnly={activity.automatic} aria-label={`Popis činnosti ${index + 1}`} className="min-h-[58px] w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 read-only:bg-amber-50/50" value={activity.desc} onChange={(event) => setActivities((previous) => previous.map((item, row) => row === index ? { ...item, desc: event.target.value } : item))} />
                <div>
                  <label className={labelClass}>{activity.automatic ? 'Načtené hodiny' : 'Hodiny'}</label>
                  <input type="number" readOnly={activity.automatic} min="0" step="0.5" className={`${fieldClass} read-only:bg-amber-50`} value={activity.hours} onChange={(event) => setActivities((previous) => previous.map((item, row) => row === index ? { ...item, hours: Math.max(0, Number(event.target.value) || 0) } : item))} onBlur={() => setActivities((previous) => previous.map((item, row) => row === index ? { ...item, hours: roundActivityHours(item.hours) } : item))} />
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${status.isBalanced ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            Zadáno {formatHours(status.actual)} z {formatHours(status.target)} {status.isBalanced ? '· součet sedí' : `· rozdíl ${formatHours(Math.abs(status.difference))}`}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-500 bg-slate-300 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><Umbrella className="h-5 w-5 text-sky-700" /><h3 className="font-bold text-slate-900">Dovolená</h3></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-3"><span className="text-slate-500">Roční nárok</span><strong className="mt-1 block text-lg text-slate-900">{formatHours(vacation.projectedEntitlement)}</strong></div>
              <div className="rounded-lg bg-white p-3"><span className="text-slate-500">Zbývá vč. převodu</span><strong className="mt-1 block text-lg text-slate-900">{formatHours(vacation.remainingIncludingCarryover)}</strong></div>
            </div>
            <label className={`${labelClass} mt-3`} htmlFor="work-report-vacation">Dovolená v tomto výkazu</label>
            <div className="flex items-center gap-2"><input id="work-report-vacation" type="number" min="0" max={Math.min(settings.monthlyHours, vacation.availableForCurrentMonth)} step="1" className={fieldClass} value={vacation.currentMonthVacation} onChange={(event) => updateVacation(event.target.value)} /><span className="text-sm font-semibold text-slate-600">hodin</span></div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">Nárok podle fondu do tohoto měsíce: {formatHours(vacation.accruedEntitlement)}. Podmínka 80 hodin je {vacation.eligibilityReached ? 'splněna' : 'zatím nesplněna'}.</p>
          </section>

          <section className="rounded-2xl border border-slate-500 bg-slate-300 p-4 shadow-sm">
            <div className="flex items-center gap-3"><FileSpreadsheet className="h-6 w-6 text-emerald-700" /><h3 className="font-bold text-slate-900">Hotový pracovní výkaz</h3></div>
            <button type="button" onClick={exportWorkbook} disabled={exporting || !status.isBalanced} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {exporting ? <CalendarDays className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />} {exporting ? 'Generuji…' : 'Stáhnout XLSX'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default WorkReportsView;
