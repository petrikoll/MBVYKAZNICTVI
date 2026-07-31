import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('manifest obsahuje instalační údaje a obě požadované velikosti ikon', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));

  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.prefer_related_applications, false);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  await Promise.all(manifest.icons.map((icon) => access(new URL(`../public${icon.src}`, import.meta.url))));
});

test('service worker neukládá citlivá API do mezipaměti', async () => {
  const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/);
  assert.match(serviceWorker, /isPrivateApi/);
});

test('instalační událost se zachytí ještě před prvním renderem aplikace', async () => {
  const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const renderPosition = mainSource.indexOf('createRoot(');
  const promptPosition = mainSource.indexOf("window.addEventListener('beforeinstallprompt'");

  assert.ok(promptPosition >= 0);
  assert.ok(promptPosition < renderPosition);
  assert.match(mainSource, /window\.__MB_INSTALL_PROMPT__ = event/);
});

test('instalační tlačítko zůstane viditelné i před zpřístupněním výzvy Chrome', async () => {
  const appSource = await readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

  assert.match(appSource, /\{!isAppInstalled && \(\s*<button/);
  assert.match(appSource, /Nainstalovat stránku jako aplikaci/);
  assert.match(appSource, /alespoň 30 sekund otevřenou/);
});
