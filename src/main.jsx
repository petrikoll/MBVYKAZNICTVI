import React from 'react';
import { createRoot } from 'react-dom/client';

import ProjectReportingApp from './app/ProjectReportingApp.jsx';
import './styles.css';

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
