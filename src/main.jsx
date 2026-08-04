import React from 'react';
import { createRoot } from 'react-dom/client';

import ProjectReportingApp from './app/ProjectReportingApp.jsx';
import { purgeSensitiveLocalStorage } from './lib/browserStoragePolicy.js';
import './styles.css';

// Sensitive project data remains only in memory while the application is open.
// Older persistent copies are removed before the first render.
purgeSensitiveLocalStorage();

// Chrome může událost vyvolat ještě před dokončením prvního renderu Reactu.
// Zachytíme ji proto hned při startu a obrazovka si ji následně převezme.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__MB_INSTALL_PROMPT__ = event;
});

window.addEventListener('appinstalled', () => {
  window.__MB_INSTALL_PROMPT__ = null;
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectReportingApp />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Registrace instalovatelné aplikace se nezdařila:', error);
    });
  });
}
