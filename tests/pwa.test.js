import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('verzovane staticke soubory pouzivaji cache-first a dlouhou HTTP cache', async () => {
  const [serviceWorker, server] = await Promise.all([
    readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../server.js', import.meta.url), 'utf8')
  ]);

  assert.match(serviceWorker, /isVersionedAsset/);
  assert.match(serviceWorker, /caches\.match\(request\)/);
  assert.match(serviceWorker, /'video'/);
  assert.match(server, /max-age=31536000, immutable/);
  assert.match(server, /isRevalidatedFile/);
});

test('manifest obsahuje instalační údaje a obě požadované velikosti ikon', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));

  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.prefer_related_applications, false);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  await Promise.all(manifest.icons.map((icon) => access(new URL(`../public${icon.src}`, import.meta.url))));
});

test('chráněný manifest se načítá s přihlašovacími údaji', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"\s+crossorigin="use-credentials"\s*\/?>/);
});

test('service worker neukládá citlivá API do mezipaměti', async () => {
  const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/);
  assert.match(serviceWorker, /isPrivateApi/);
});

test('citlive API odpovedi zakazuji ulozeni v prohlizeci a sdilenych cache', async () => {
  const [googleProxy, geminiProxy, docxExport] = await Promise.all([
    readFile(new URL('../googleAppsScriptProxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../geminiProxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../docxExport.js', import.meta.url), 'utf8')
  ]);

  [googleProxy, geminiProxy, docxExport].forEach((source) => {
    assert.match(source, /Cache-Control['"]?:?\s*['"]no-store, private/);
  });
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
