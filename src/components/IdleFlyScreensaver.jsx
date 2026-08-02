import React from 'react';
import screensaverPoster from '../assets/screensaver-moravsky-beroun-poster.webp';
import screensaverVideo from '../assets/screensaver-moravsky-beroun-loop.mp4';

const IDLE_DELAY_MS = 60 * 1000;
const STARTUP_DISPLAY_MS = 7 * 1000;
const EXIT_DURATION_MS = 520;

const formatClock = (date) => date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

function IdleFlyScreensaver() {
  const [active, setActive] = React.useState(true);
  const [startup, setStartup] = React.useState(true);
  const [closing, setClosing] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [clock, setClock] = React.useState(() => new Date());
  const idleTimerRef = React.useRef(null);
  const startupTimerRef = React.useRef(null);
  const curtainTimerRef = React.useRef(null);
  const exitTimerRef = React.useRef(null);
  const lastResetRef = React.useRef(0);

  const beginStartupCountdown = React.useCallback(() => {
    if (startupTimerRef.current !== null) return;

    const startupCurtain = document.getElementById('startup-curtain');
    if (startupCurtain) {
      startupCurtain.classList.add('startup-curtain--hidden');
      curtainTimerRef.current = window.setTimeout(() => startupCurtain.remove(), EXIT_DURATION_MS);
    }

    startupTimerRef.current = window.setTimeout(() => {
      setClosing(true);
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = window.setTimeout(() => {
        setActive(false);
        setClosing(false);
        setStartup(false);
      }, EXIT_DURATION_MS);
    }, STARTUP_DISPLAY_MS);
  }, []);

  React.useEffect(() => () => {
    window.clearTimeout(startupTimerRef.current);
    window.clearTimeout(curtainTimerRef.current);
  }, []);

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
        if (startup || closing) return;
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
  }, [active, closing, startup]);

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
      <div className="idle-saver-shade absolute inset-0" aria-hidden="true" />
      <div className="idle-saver-stage absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {videoFailed ? (
          <img className="idle-saver-image" src={screensaverPoster} alt="" onLoad={beginStartupCountdown} />
        ) : (
          <video
            className="idle-saver-image"
            src={screensaverVideo}
            poster={screensaverPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onCanPlay={beginStartupCountdown}
            onError={() => setVideoFailed(true)}
          />
        )}
      </div>
      <div className="idle-saver-clock absolute right-5 top-5 z-10 rounded-2xl border border-white/20 bg-slate-950/25 px-5 py-3 text-right shadow-xl backdrop-blur-md sm:right-8 sm:top-8">
        <div className="text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-4xl">{formatClock(clock)}</div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">Moravský Beroun</div>
      </div>
      {startup && (
        <div className="idle-saver-loading absolute inset-x-0 bottom-7 z-10 flex justify-center px-4 sm:bottom-10">
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/35 px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-xl backdrop-blur-md" role="status" aria-live="polite">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]" aria-hidden="true" />
            Načítám data…
          </div>
        </div>
      )}
    </div>
  );
}

export { IDLE_DELAY_MS, STARTUP_DISPLAY_MS };
export default IdleFlyScreensaver;
