import React from 'react';
import { createPortal } from 'react-dom';
import { popupPlacement } from '../lib/popupPlacement.js';

export function useAnchoredPopup({ maxWidth = 576, maxHeight = 384 } = {}) {
  const anchorRef = React.useRef(null);
  const popupRef = React.useRef(null);
  const closeTimer = React.useRef(null);
  const instance = React.useId();
  const [open, setOpen] = React.useState(false);
  const [style, setStyle] = React.useState({ visibility: 'hidden' });
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const show = () => {
    cancelClose();
    window.dispatchEvent(new window.CustomEvent('mb:open-popup', { detail: instance }));
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      if (!anchorRef.current?.contains(document.activeElement) && !popupRef.current?.contains(document.activeElement)) setOpen(false);
    }, 180);
  };

  React.useEffect(() => {
    const closeOther = (event) => { if (event.detail !== instance) setOpen(false); };
    window.addEventListener('mb:open-popup', closeOther);
    return () => { cancelClose(); window.removeEventListener('mb:open-popup', closeOther); };
  }, [instance]);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current || !popupRef.current) return undefined;
    const update = () => {
      const anchor = anchorRef.current;
      const panel = popupRef.current;
      if (!anchor || !panel) return;
      const visual = window.visualViewport;
      const x = visual?.offsetLeft || 0, y = visual?.offsetTop || 0;
      const width = visual?.width || window.innerWidth, height = visual?.height || window.innerHeight;
      const bounds = anchor.getBoundingClientRect();
      if (bounds.bottom < y || bounds.top > y + height) { setOpen(false); return; }
      panel.style.width = `${Math.max(0, Math.min(maxWidth, width - 24))}px`;
      panel.style.maxHeight = `${Math.max(0, Math.min(maxHeight, height - 24))}px`;
      const placement = popupPlacement(
        { left: bounds.left - x, top: bounds.top - y, bottom: bounds.bottom - y },
        { width, height },
        { maxWidth, maxHeight, panelHeight: panel.getBoundingClientRect().height }
      );
      const next = { ...placement, left: placement.left + x, top: placement.top + y, visibility: 'visible' };
      // Restore the fitted height even when the position has not changed after measuring.
      panel.style.maxHeight = `${placement.maxHeight}px`;
      setStyle((previous) => Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next);
    };
    const dismiss = (event) => {
      if (!anchorRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => { if (event.key === 'Escape') { cancelClose(); setOpen(false); } };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(anchorRef.current);
    observer?.observe(popupRef.current);
    return () => {
      cancelClose(); observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open, maxWidth, maxHeight]);

  return {
    open, style, anchorRef, popupRef, show, scheduleClose, cancelClose,
    triggerProps: {
      ref: anchorRef, onMouseEnter: show, onMouseLeave: scheduleClose,
      onFocus: (event) => { if (event.target === anchorRef.current) show(); },
      onBlur: scheduleClose, onClick: show,
      onKeyDown: (event) => { if (event.target === anchorRef.current && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); show(); } }
    }
  };
}

export function AnchoredPopup({ popup, id, className = '', children }) {
  return popup.open ? createPortal(
    <div id={id} ref={popup.popupRef} role="tooltip" style={popup.style}
      className={`fixed z-[180] overflow-y-auto overscroll-contain ${className}`}
      onMouseEnter={popup.cancelClose} onMouseLeave={popup.scheduleClose}
      onFocus={popup.cancelClose} onBlur={popup.scheduleClose}
      onClick={(event) => event.stopPropagation()}>
      {children}
    </div>, document.body
  ) : null;
}
