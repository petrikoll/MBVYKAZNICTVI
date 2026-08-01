import React from 'react';
import {
  BarChart3,
  CalendarDays,
  Clock3,
  FilterX,
  ListFilter,
  Phone,
  Target,
  Users
} from 'lucide-react';

import { SelectField } from '../components/ui.jsx';
import {
  buildAnalyticsRows,
  buildAnalyticsSummary,
  buildClientSupportDistribution,
  filterAnalyticsRows,
  groupAnalyticsByDimension,
  groupAnalyticsByMonth
} from '../lib/reportingAnalytics.js';

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

const formatHours = (minutes) => `${(Number(minutes || 0) / 60).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} h`;
const formatMetric = (value, metric) => metric === 'hours'
  ? `${Number(value || 0).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} h`
  : Number(value || 0).toLocaleString('cs-CZ');
const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[3])}. ${Number(match[2])}. ${match[1]}` : value || 'Neuvedeno';
};
const formatMonth = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  return match ? `${Number(match[2])}/${match[1].slice(2)}` : value;
};
const contactLabel = { field: 'Terénní', ambulatory: 'Ambulantní', telephone: 'Telefonická' };
const goalLinkLabel = { linked: 'Cíl individuálního plánu', 'one-time': 'Jednorázová zakázka', none: 'Bez vazby na cíl' };

const MetricCard = ({ icon: Icon, label, value, detail, tone = 'blue' }) => {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800'
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</div>
        <Icon className="h-4 w-4 shrink-0" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {detail && <div className="mt-1 text-xs opacity-80">{detail}</div>}
    </div>
  );
};

const EmptyChart = ({ text = 'Pro zvolené filtry nejsou dostupná data.' }) => (
  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">{text}</div>
);

const HorizontalBars = ({ rows, metric, selectedLabel = '', onSelect, emptyText }) => {
  if (!rows.length) return <EmptyChart text={emptyText} />;
  const visibleRows = rows.slice(0, 10);
  const maximum = Math.max(...visibleRows.map((item) => item.value), 1);
  const interactive = typeof onSelect === 'function';
  return (
    <div className="space-y-2">
      {visibleRows.map((item, index) => {
        const selected = selectedLabel === item.label;
        const BarContainer = interactive ? 'button' : 'div';
        return (
          <BarContainer
            key={item.label}
            {...(interactive ? { type: 'button', onClick: () => onSelect(selected ? 'all' : item.label) } : {})}
            className={`block w-full rounded-lg border px-3 py-2 text-left transition ${selected ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : interactive ? 'border-transparent hover:border-slate-200 hover:bg-slate-50' : 'border-transparent'}`}
            title={`${item.label}: ${formatMetric(item.value, metric)}`}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-slate-700">{item.label}</span>
              <span className="shrink-0 font-bold text-slate-900">{formatMetric(item.value, metric)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (item.value / maximum) * 100)}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
            </div>
          </BarContainer>
        );
      })}
    </div>
  );
};

const MonthlyChart = ({ data, metric, selectedMonth, onSelectMonth }) => {
  if (!data.months.length) return <EmptyChart />;
  const maximum = Math.max(...data.months.map((item) => item.total), 1);
  const colorByType = Object.fromEntries(data.types.map((type, index) => [type, CHART_COLORS[index % CHART_COLORS.length]]));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
        {data.types.map((type) => (
          <span key={type} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorByType[type] }} />{type}
          </span>
        ))}
      </div>
      <div className="relative h-56 overflow-x-auto border-b border-l border-slate-200 pl-2 pt-4">
        <div className="flex h-48 min-w-max items-end gap-2 pr-3">
          {data.months.map((item) => {
            const selected = selectedMonth === item.month;
            return (
              <button
                key={item.month}
                type="button"
                onClick={() => onSelectMonth(selected ? 'all' : item.month)}
                className={`group flex h-full w-12 shrink-0 flex-col items-center justify-end rounded-t px-1 focus:outline-none focus:ring-2 focus:ring-blue-300 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                title={`${formatMonth(item.month)}: ${formatMetric(item.total, metric)}`}
              >
                <span className="mb-1 text-[10px] font-bold text-slate-700 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">{formatMetric(item.total, metric)}</span>
                <span className="flex w-7 flex-col-reverse overflow-hidden rounded-t" style={{ height: `${Math.max(4, (item.total / maximum) * 150)}px` }}>
                  {data.types.map((type) => {
                    const value = Number(item.segments[type] || 0);
                    if (!value) return null;
                    return <span key={type} style={{ height: `${(value / item.total) * 100}%`, backgroundColor: colorByType[type] }} />;
                  })}
                </span>
                <span className={`mt-1 text-[10px] ${selected ? 'font-bold text-blue-700' : 'text-slate-500'}`}>{formatMonth(item.month)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Kliknutím na měsíc omezíte souhrn, časovou osu a zdrojovou tabulku.</p>
    </div>
  );
};

const TimelineChart = ({ rows, onSelectRecord, selectedRecordKey }) => {
  const timelineRows = rows.filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!timelineRows.length) return <EmptyChart text="Pro časovou osu chybí datované výkony." />;
  const types = Array.from(new Set(timelineRows.map((row) => row.performanceType))).slice(0, 6);
  const normalizedRows = timelineRows.map((row) => ({ ...row, lane: types.includes(row.performanceType) ? row.performanceType : 'Ostatní' }));
  if (normalizedRows.some((row) => row.lane === 'Ostatní') && !types.includes('Ostatní')) types.push('Ostatní');
  const timestamps = normalizedRows.map((row) => Date.parse(`${row.date}T00:00:00Z`));
  const minimum = Math.min(...timestamps);
  const maximum = Math.max(...timestamps);
  const span = Math.max(maximum - minimum, 86400000);
  const chartWidth = Math.max(820, normalizedRows.length * 34);
  const left = 170;
  const right = 30;
  const chartHeight = 42 + types.length * 42;
  const xFor = (date) => left + ((Date.parse(`${date}T00:00:00Z`) - minimum) / span) * (chartWidth - left - right);
  const colorByType = Object.fromEntries(types.map((type, index) => [type, CHART_COLORS[index % CHART_COLORS.length]]));
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: `${chartWidth}px` }} className="block h-auto w-full" aria-label="Časová osa výkonů">
        {types.map((type, index) => {
          const y = 30 + index * 42;
          return (
            <g key={type}>
              <text x="10" y={y + 4} fontSize="11" fill="#475569">{type.length > 24 ? `${type.slice(0, 23)}…` : type}</text>
              <line x1={left} x2={chartWidth - right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            </g>
          );
        })}
        {normalizedRows.map((row) => {
          const laneIndex = types.indexOf(row.lane);
          const y = 30 + laneIndex * 42;
          const selected = selectedRecordKey === row.key;
          const radius = Math.max(5, Math.min(11, 4 + Math.sqrt(Number(row.durationMinutes || 0)) / 2.5));
          return (
            <g
              key={row.key}
              role="button"
              tabIndex="0"
              onClick={() => onSelectRecord(row.key)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectRecord(row.key); }}
              className="cursor-pointer outline-none"
            >
              <circle cx={xFor(row.date)} cy={y} r={selected ? radius + 3 : radius} fill={colorByType[row.lane]} stroke={selected ? '#0f172a' : '#ffffff'} strokeWidth={selected ? 3 : 2} opacity="0.9">
                <title>{`${formatDate(row.date)} · ${row.clientLabel} · ${row.performanceType} · ${formatHours(row.durationMinutes)}`}</title>
              </circle>
            </g>
          );
        })}
        <text x={left} y={chartHeight - 5} fontSize="10" fill="#64748b">{formatDate(timelineRows[0].date)}</text>
        <text x={chartWidth - right} y={chartHeight - 5} textAnchor="end" fontSize="10" fill="#64748b">{formatDate(timelineRows.at(-1).date)}</text>
      </svg>
    </div>
  );
};

const RecordDetail = ({ row }) => {
  if (!row) return null;
  const entries = [
    ['Datum', formatDate(row.date)],
    ['Klient', row.clientLabel],
    ['Výkon', row.performanceType],
    ['Oblast', row.supportArea || 'Neuvedeno'],
    ['Forma poskytování', contactLabel[row.contactKind]],
    ['Délka', formatHours(row.durationMinutes)],
    ['Pracovník', row.worker || 'Neuvedeno'],
    ['Vazba na cíl', row.goalLabel || goalLinkLabel[row.goalLinkKind]],
    ['Témata', row.topics],
    ['Výsledek', row.outcome || row.comment],
    ['Další kroky', row.nextSteps]
  ].filter(([, value]) => value);
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-sm text-blue-950">Kontrolní detail zdrojového výkonu</strong><span className="text-xs font-semibold text-blue-700">{formatDate(row.date)}</span></div>
      <dl className="grid gap-x-5 gap-y-2 text-xs md:grid-cols-2">
        {entries.map(([label, value]) => <div key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{value}</dd></div>)}
      </dl>
    </div>
  );
};

function ReportingAnalyticsView({ records = [], clients = [], onOpenClient }) {
  const [filters, setFilters] = React.useState({
    clientId: 'all', performanceType: 'all', supportArea: 'all', contactKind: 'all', goalLinkKind: 'all', smartFilter: 'all', month: 'all'
  });
  const [metric, setMetric] = React.useState('count');
  const [selectedRecordKey, setSelectedRecordKey] = React.useState('');

  const rows = React.useMemo(() => buildAnalyticsRows(records, clients), [clients, records]);
  const filteredRows = React.useMemo(() => filterAnalyticsRows(rows, filters), [filters, rows]);
  const selectedRecord = rows.find((row) => row.key === selectedRecordKey) || null;
  const summary = React.useMemo(() => buildAnalyticsSummary(filteredRows), [filteredRows]);

  const clientIdsWithRecords = React.useMemo(() => new Set(rows.flatMap((row) => row.clientIds)), [rows]);
  const clientOptions = React.useMemo(() => clients
    .filter((client) => clientIdsWithRecords.has(client.id))
    .slice()
    .sort((left, right) => String(left.fullName || '').localeCompare(String(right.fullName || ''), 'cs'))
    .map((client) => ({ value: client.id, label: client.fullName || client.id })), [clientIdsWithRecords, clients]);
  const performanceOptions = React.useMemo(() => Array.from(new Set(rows.map((row) => row.performanceType))).sort((a, b) => a.localeCompare(b, 'cs')), [rows]);
  const areaOptions = React.useMemo(() => Array.from(new Set(rows.map((row) => row.supportArea).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'cs')), [rows]);

  React.useEffect(() => {
    setFilters((previous) => ({
      ...previous,
      clientId: previous.clientId === 'all' || clientIdsWithRecords.has(previous.clientId) ? previous.clientId : 'all',
      performanceType: previous.performanceType === 'all' || performanceOptions.includes(previous.performanceType) ? previous.performanceType : 'all',
      supportArea: previous.supportArea === 'all' || areaOptions.includes(previous.supportArea) ? previous.supportArea : 'all',
      month: 'all'
    }));
    setSelectedRecordKey('');
  }, [areaOptions, clientIdsWithRecords, performanceOptions]);

  const chartRows = React.useMemo(() => filterAnalyticsRows(rows, { ...filters, month: 'all' }), [filters, rows]);
  const areaChartRows = React.useMemo(() => filterAnalyticsRows(rows, { ...filters, supportArea: 'all' }), [filters, rows]);
  const monthlyData = React.useMemo(() => groupAnalyticsByMonth(chartRows, metric), [chartRows, metric]);
  const areaData = React.useMemo(() => groupAnalyticsByDimension(areaChartRows, 'supportArea', metric), [areaChartRows, metric]);
  const typeData = React.useMemo(() => groupAnalyticsByDimension(filteredRows, 'performanceType', metric), [filteredRows, metric]);
  const distribution = React.useMemo(() => buildClientSupportDistribution(filteredRows), [filteredRows]);

  const selectedClient = clients.find((client) => client.id === filters.clientId) || null;
  const telephoneHours = Math.round((summary.telephoneMinutes / 60) * 100) / 100;
  const fieldHours = Math.round((summary.fieldMinutes / 60) * 100) / 100;
  const ambulatoryHours = Math.round((summary.ambulatoryMinutes / 60) * 100) / 100;
  const resetFilters = () => {
    setFilters({ clientId: 'all', performanceType: 'all', supportArea: 'all', contactKind: 'all', goalLinkKind: 'all', smartFilter: 'all', month: 'all' });
    setSelectedRecordKey('');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><ListFilter className="h-5 w-5 text-blue-700" />Analytické filtry</h2><p className="mt-1 text-xs text-slate-500">Navazují na období, KA a pracovníka zvolené výše.</p></div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FilterX className="h-4 w-4" />Zrušit analytické filtry</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SelectField label="Klient" value={filters.clientId} onChange={(value) => setFilters((prev) => ({ ...prev, clientId: value, month: 'all' }))} options={[{ value: 'all', label: 'Všichni klienti' }, ...clientOptions]} />
          <SelectField label="Typ podpory" value={filters.performanceType} onChange={(value) => setFilters((prev) => ({ ...prev, performanceType: value }))} options={[{ value: 'all', label: 'Všechny typy podpory' }, ...performanceOptions.map((value) => ({ value, label: value }))]} />
          <SelectField label="Oblast podpory" value={filters.supportArea} onChange={(value) => setFilters((prev) => ({ ...prev, supportArea: value }))} options={[{ value: 'all', label: 'Všechny oblasti' }, ...areaOptions.map((value) => ({ value, label: value }))]} />
          <SelectField label="Forma poskytování" value={filters.contactKind} onChange={(value) => setFilters((prev) => ({ ...prev, contactKind: value }))} options={[{ value: 'all', label: 'Všechny formy' }, ...Object.entries(contactLabel).map(([value, label]) => ({ value, label }))]} />
          <SelectField label="Vazba na cíl" value={filters.goalLinkKind} onChange={(value) => setFilters((prev) => ({ ...prev, goalLinkKind: value }))} options={[{ value: 'all', label: 'Všechny vazby' }, ...Object.entries(goalLinkLabel).map(([value, label]) => ({ value, label }))]} />
          <SelectField label="Chytrý kontrolní filtr" value={filters.smartFilter} onChange={(value) => setFilters((prev) => ({ ...prev, smartFilter: value }))} options={[
            { value: 'all', label: 'Bez kontrolního filtru' },
            { value: 'missing-area', label: 'Chybí oblast podpory' },
            { value: 'missing-outcome', label: 'Chybí výsledek / komentář' },
            { value: 'without-goal', label: 'Bez vazby na cíl' },
            { value: 'outreach-comment', label: 'Depistáž s komentářem' },
            { value: 'long-performance', label: 'Výkon alespoň 60 minut' }
          ]} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-600">Výběr obsahuje <strong>{filteredRows.length}</strong> výkonů pro <strong>{summary.uniqueClientCount}</strong> klientů.</div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1" aria-label="Metrika grafů">
            <button type="button" aria-pressed={metric === 'count'} onClick={() => setMetric('count')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${metric === 'count' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>Počet výkonů</button>
            <button type="button" aria-pressed={metric === 'hours'} onClick={() => setMetric('hours')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${metric === 'hours' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>Hodiny podpory</button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-slate-900">{selectedClient ? selectedClient.fullName : 'Souhrn za všechny klienty'}</h2><p className="text-xs text-slate-500">Údaje odpovídají všem aktivním filtrům včetně vybraného měsíce.</p></div>
          {selectedClient && onOpenClient && <button type="button" onClick={() => onOpenClient(selectedClient.id)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Otevřít list klienta</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={BarChart3} label="Výkony" value={summary.performanceCount} detail="počet zdrojových záznamů" />
          <MetricCard icon={Clock3} label="Podpora" value={`${summary.totalHours.toLocaleString('cs-CZ')} h`} detail={summary.totalHours >= 30 && summary.totalHours < 40 ? 'Klient se blíží hranici 40 hodin' : 'celkový doložený čas'} tone={summary.totalHours >= 30 && summary.totalHours < 40 ? 'amber' : 'emerald'} />
          <MetricCard icon={Phone} label="Telefonická" value={summary.telephoneCount} detail={`${telephoneHours.toLocaleString('cs-CZ')} h`} tone="violet" />
          <MetricCard icon={Users} label="Klienti" value={summary.uniqueClientCount} detail={selectedClient ? 'vybraný klient' : 'unikátní podpořené osoby'} tone="slate" />
          <MetricCard icon={CalendarDays} label="Poslední výkon" value={summary.latestDate ? formatDate(summary.latestDate) : '—'} detail="v aktuálním výběru" tone="amber" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Vývoj podpory po měsících</h3>
          <p className="mb-3 text-xs text-slate-500">Barvy rozlišují nejčastější typy podpory.</p>
          <MonthlyChart data={monthlyData} metric={metric} selectedMonth={filters.month} onSelectMonth={(month) => setFilters((prev) => ({ ...prev, month }))} />
        </div>
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Oblasti podpory</h3>
          <p className="mb-3 text-xs text-slate-500">Kliknutí na oblast nastaví nebo zruší filtr.</p>
          <HorizontalBars rows={areaData} metric={metric} selectedLabel={filters.supportArea} onSelect={(supportArea) => setFilters((prev) => ({ ...prev, supportArea }))} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-slate-900">Časová osa výkonů</h3>
        <p className="mb-3 text-xs text-slate-500">Velikost bodu odpovídá délce výkonu. Po najetí se zobrazí základní údaje, kliknutí otevře kontrolní detail.</p>
        <TimelineChart rows={filteredRows} selectedRecordKey={selectedRecordKey} onSelectRecord={setSelectedRecordKey} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Typy podpory</h3>
          <p className="mb-3 text-xs text-slate-500">Rozložení aktuálně vyfiltrovaných výkonů.</p>
          <HorizontalBars rows={typeData} metric={metric} selectedLabel={filters.performanceType} onSelect={(performanceType) => setFilters((prev) => ({ ...prev, performanceType }))} />
        </div>
        {filters.clientId === 'all' ? (
          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-slate-900">Klienti podle rozsahu podpory</h3>
            <p className="mb-3 text-xs text-slate-500">Počet klientů v hodinových pásmech při současných filtrech.</p>
            <HorizontalBars rows={distribution} metric="count" />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><Target className="h-4 w-4 text-indigo-600" />Kontrola klientského výběru</h3>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>Telefonická podpora</span><strong>{summary.telephoneCount} výkonů / {telephoneHours.toLocaleString('cs-CZ')} h</strong></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>Terénní podpora</span><strong>{summary.fieldCount} výkonů / {fieldHours.toLocaleString('cs-CZ')} h</strong></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>Ambulantní podpora</span><strong>{summary.ambulatoryCount} výkonů / {ambulatoryHours.toLocaleString('cs-CZ')} h</strong></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>Výkony bez výsledku</span><strong>{filteredRows.filter((row) => !row.hasOutcome).length}</strong></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>Výkony bez vazby na cíl</span><strong>{filteredRows.filter((row) => row.goalLinkKind === 'none').length}</strong></div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <RecordDetail row={selectedRecord} />
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-900">Zdrojové výkony</h3><p className="text-xs text-slate-500">Tabulka vždy odpovídá aktivním filtrům. Zobrazuje nejvýše 200 nejnovějších záznamů.</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{filteredRows.length}</span></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Datum</th><th className="px-3 py-2">Klient</th><th className="px-3 py-2">Typ podpory</th><th className="px-3 py-2">Oblast</th><th className="px-3 py-2">Pracovník</th><th className="px-3 py-2 text-right">Délka</th><th className="px-3 py-2 text-right">Kontrola</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200).map((row) => (
                  <tr key={row.key} className={selectedRecordKey === row.key ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(row.date)}</td><td className="max-w-[220px] truncate px-3 py-2 font-semibold text-slate-800" title={row.clientLabel}>{row.clientLabel}</td><td className="max-w-[260px] truncate px-3 py-2" title={row.performanceType}>{row.performanceType}</td><td className="max-w-[200px] truncate px-3 py-2" title={row.supportArea}>{row.supportArea || '—'}</td><td className="whitespace-nowrap px-3 py-2">{row.worker || '—'}</td><td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatHours(row.durationMinutes)}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => setSelectedRecordKey(selectedRecordKey === row.key ? '' : row.key)} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100">{selectedRecordKey === row.key ? 'Skrýt' : 'Detail'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredRows.length && <div className="p-6 text-center text-sm text-slate-500">Aktuálním filtrům neodpovídá žádný výkon.</div>}
        </div>
      </section>
    </div>
  );
}

export default ReportingAnalyticsView;
