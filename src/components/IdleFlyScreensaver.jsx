import React from 'react';
import screensaverImage from '../assets/screensaver-moravsky-beroun.webp';

const IDLE_DELAY_MS = 60 * 1000;
const EXIT_DURATION_MS = 520;

const formatClock = (date) => date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

function IdleFlyScreensaver() {
  const [active, setActive] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [clock, setClock] = React.useState(() => new Date());
  const idleTimerRef = React.useRef(null);
  const exitTimerRef = React.useRef(null);
  const lastResetRef = React.useRef(0);

  React.useEffect(() => {
    const armTimer = () => {
      window.clearTimeout(idleTimerRef.current);
      if (!active && document.visibilityState === 'visible') {
        idleTimerRef.current = window.setTimeout(() => {
          setClosing(false);
          setActive(true);
        }, IDLE_DELAY_MS);
      }
    };

    const registerActivity = () => {
      if (active) {
        if (closing) return;
        setClosing(true);
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = window.setTimeout(() => {
          setActive(false);
          setClosing(false);
        }, EXIT_DURATION_MS);
        return;
      }

      const now = Date.now();
      if (now - lastResetRef.current < 800) return;
      lastResetRef.current = now;
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
  }, [active, closing]);

  React.useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  React.useEffect(() => {
    if (!active) return undefined;
    setClock(new Date());
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(clockTimer);
  }, [active]);

  if (!active) return null;

  return (
    <div className={`idle-saver fixed inset-0 z-[250] overflow-hidden text-white${closing ? ' idle-saver--closing' : ''}`} role="dialog" aria-modal="true" aria-label="Spořič obrazovky">
      <img className="idle-saver-image absolute inset-0 h-full w-full object-cover" src={screensaverImage} alt="" aria-hidden="true" />
      <div className="idle-saver-shade absolute inset-0" aria-hidden="true" />
      <div className="idle-saver-clock absolute right-5 top-5 z-10 rounded-2xl border border-white/20 bg-slate-950/25 px-5 py-3 text-right shadow-xl backdrop-blur-md sm:right-8 sm:top-8">
        <div className="text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-4xl">{formatClock(clock)}</div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">Moravský Beroun</div>
      </div>
    </div>
  );
}

export { IDLE_DELAY_MS };
export default IdleFlyScreensaver;
