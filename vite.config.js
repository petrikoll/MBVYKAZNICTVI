import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleDocxExportRequest } from './docxExport.js';

const docxExportPlugin = () => ({
  name: 'docx-export-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const pathname = String(request.url || '').split('?')[0];
      const isExport = pathname === '/api/export-record-docx' || pathname === '/api/export-plan-docx';
      if (request.method !== 'POST' || !isExport) {
        next();
        return;
      }
      void handleDocxExportRequest(request, response);
    });
  }
});

export default defineConfig({
  plugins: [react(), docxExportPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    watch: {
      ignored: ['**/.tmp-chrome-screens*/**', '**/navod-screenshoty*/**']
    }
  }
});
