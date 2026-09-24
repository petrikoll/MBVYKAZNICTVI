import React from 'react';
import { Download, Loader2 } from 'lucide-react';

function LocalDiagnosticsControl({ recorder }) {
  const [state, setState] = React.useState(() => recorder.snapshot());
  const [downloading, setDownloading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  React.useEffect(() => recorder.subscribe(setState), [recorder]);

  const download = async () => {
    setDownloading(true);
    setMessage('');
    try {
      const snapshot = await recorder.exportSnapshot();
      const script = Array.from(document.scripts).find((item) => item.type === 'module' && item.src);
      snapshot.browser = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        appAsset: script ? new URL(script.src).pathname.split('/').pop() : ''
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `diagnostika-moravsky-beroun-${snapshot.exportedAt.replace(/[:.]/g, '-')}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(`Staženo ${snapshot.eventCount} událostí. Soubor můžete předat k analýze.`);
    } catch {
      setMessage('Soubor se nepodařilo stáhnout. Zkuste stažení znovu.');
    } finally { setDownloading(false); }
  };

  return (
    <div data-diagnostics-ignore className="flex flex-col items-end gap-1.5 text-right">
      <button type="button" onClick={download} disabled={downloading} className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-800 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Ztáhnout při chybě dat
      </button>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
        <input type="checkbox" checked={state.enabled} onChange={(event) => recorder.setEnabled(event.target.checked)} className="h-4 w-4 accent-red-600" />
        Ukládat kliknutí a hlášky v tomto prohlížeči
      </label>
      <p className="max-w-sm text-[11px] text-slate-600">Posledních 2 000 událostí za 7 dní. Bez obsahu formulářů. Nic se automaticky neodesílá.</p>
      {state.storageFailed && <p role="status" className="max-w-sm text-xs text-amber-800">Úložiště není dostupné. Záznam lze stáhnout do zavření této karty.</p>}
      {message && <p role="status" className="max-w-sm text-xs text-slate-700">{message}</p>}
    </div>
  );
}

export default LocalDiagnosticsControl;
