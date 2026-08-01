import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { handleDocxExportRequest } from './docxExport.js';
import { handleGoogleAppsScriptProxy } from './googleAppsScriptProxy.js';
import { handleGeminiProxy } from './geminiProxy.js';

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

const googleSheetsProxyPlugin = (proxyConfig) => ({
  name: 'google-sheets-proxy-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const pathname = String(request.url || '').split('?')[0];
      if (pathname !== '/api/google-sheets') {
        next();
        return;
      }
      void handleGoogleAppsScriptProxy(request, response, proxyConfig);
    });
  }
});

const inlineBinaryAssetsPlugin = () => ({
  name: 'inline-binary-assets',
  enforce: 'pre',
  async load(id) {
    const suffix = '.xlsx?base64';
    if (!id.endsWith(suffix)) return null;
    const filePath = id.slice(0, -'?base64'.length);
    const base64 = await readFile(filePath, 'base64');
    return `export default ${JSON.stringify(base64)};`;
  }
});

const geminiProxyPlugin = (proxyConfig) => ({
  name: 'gemini-proxy-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const pathname = String(request.url || '').split('?')[0];
      if (pathname !== '/api/gemini') {
        next();
        return;
      }
      void handleGeminiProxy(request, response, proxyConfig);
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      inlineBinaryAssetsPlugin(),
      react(),
      docxExportPlugin(),
      googleSheetsProxyPlugin({
        appsScriptUrl: env.GOOGLE_APPS_SCRIPT_URL || env.VITE_CLIENTS_API_URL,
        appsScriptToken: env.GOOGLE_APPS_SCRIPT_TOKEN || env.VITE_CLIENTS_API_TOKEN
      }),
      geminiProxyPlugin({
        apiKey: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY,
        defaultModel: env.GEMINI_MODEL || env.VITE_GEMINI_MODEL,
        fallbackModel: env.GEMINI_FALLBACK_MODEL || env.VITE_GEMINI_FALLBACK_MODEL
      })
    ],
    server: {
      host: '127.0.0.1',
      port: 5174,
      watch: {
        ignored: ['**/.tmp-chrome-screens*/**', '**/navod-screenshoty*/**']
      }
    }
  };
});
