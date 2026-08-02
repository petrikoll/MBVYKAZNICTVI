import React from 'react';
import { ClipboardCheck, Download, Loader2, Users } from 'lucide-react';

import { Panel } from '../../components/ui.jsx';
import { buildMandatoryMonitoringOverview, buildMandatoryMonitoringXlsx } from '../../lib/mandatoryMonitoring.js';

function MonitoringPanel({ clients = [], workRecords = [], period = null }) {
  const [notice, setNotice] = React.useState(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const overview = React.useMemo(
    () => buildMandatoryMonitoringOverview({ clients, workRecords, period }),
    [clients, period, workRecords]
  );

  const handleExport = async () => {
    setIsExporting(true);
    setNotice(null);
    try {
      const result = await buildMandatoryMonitoringXlsx({ clients, workRecords, period });
      const blob = new Blob([result.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monitoring-${period?.value || 'projekt'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice({ tone: 'success', text: `Export obsahuje ${result.personRows} automaticky započtených řádků.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || 'Export monitoringu se nepodařilo vytvořit.' });
    } finally {
      setIsExporting(false);
    }
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
      {notice && <div className={`mt-3 text-sm font-semibold ${notice.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{notice.text}</div>}
    </Panel>
  );
}

export default MonitoringPanel;
