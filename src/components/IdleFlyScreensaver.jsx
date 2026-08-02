import React from 'react';

const IDLE_DELAY_MS = 5 * 60 * 1000;
const MESSAGES = [
  'Bzzzz… výkazy si dávají krátkou pauzu.',
  'Kontroluji, jestli někde neuletěly hodiny.',
  'Nebojte, nic neukládám. Jen tu bzučím.',
  'Pohněte myší a letím zase pryč.'
];

const formatClock = (date) => date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

function IdleFlyScreensaver() {
  const [active, setActive] = React.useState(false);
  const [clock, setClock] = React.useState(() => new Date());
  const [messageIndex, setMessageIndex] = React.useState(0);
  const idleTimerRef = React.useRef(null);
  const lastResetRef = React.useRef(0);

  React.useEffect(() => {
    const armTimer = () => {
      window.clearTimeout(idleTimerRef.current);
      if (!active && document.visibilityState === 'visible') {
        idleTimerRef.current = window.setTimeout(() => setActive(true), IDLE_DELAY_MS);
      }
    };

    const registerActivity = () => {
      const now = Date.now();
      if (!active && now - lastResetRef.current < 800) return;
      lastResetRef.current = now;
      setActive(false);
      setMessageIndex(0);
      armTimer();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') registerActivity();
      else window.clearTimeout(idleTimerRef.current);
    };

    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    armTimer();

    return () => {
      window.clearTimeout(idleTimerRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active]);

  React.useEffect(() => {
    if (!active) return undefined;
    setClock(new Date());
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    const messageTimer = window.setInterval(() => setMessageIndex((value) => (value + 1) % MESSAGES.length), 4800);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(messageTimer);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="idle-fly-saver fixed inset-0 z-[250] flex items-center justify-center overflow-hidden bg-slate-950/90 px-6 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Spořič obrazovky">
      <div className="idle-fly-grid absolute inset-0" aria-hidden="true" />
      <div className="idle-fly-orbit" aria-hidden="true">
        <span className="idle-fly-emoji">🪰</span>
      </div>

      <div className="relative z-10 max-w-xl text-center">
        <div className="text-6xl font-black tabular-nums tracking-tight text-white drop-shadow-lg sm:text-7xl">{formatClock(clock)}</div>
        <div className="mx-auto mt-5 min-h-14 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-base font-semibold text-slate-100 shadow-2xl backdrop-blur-md sm:text-lg">
          {MESSAGES[messageIndex]}
        </div>
        <button type="button" className="mt-6 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-white/20" onClick={() => setActive(false)}>
          Odehnat mouchu a pokračovat
        </button>
      </div>
    </div>
  );
}

export { IDLE_DELAY_MS };
export default IdleFlyScreensaver;
