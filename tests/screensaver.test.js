import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('spořič při spuštění pět sekund celoobrazovkově oznamuje načítání dat', async () => {
  const source = await readFile(new URL('../src/components/IdleFlyScreensaver.jsx', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');

  assert.match(source, /const STARTUP_DISPLAY_MS = 5 \* 1000;/);
  assert.match(source, /const \[active, setActive\] = React\.useState\(true\);/);
  assert.match(source, /Načítám data…/);
  assert.match(source, /setStartup\(false\)/);
  assert.match(source, /screensaver-moravsky-beroun-loop\.mp4/);
  assert.match(source, /autoPlay/);
  assert.match(source, /muted/);
  assert.match(source, /onCanPlay=\{beginStartupCountdown\}/);
  assert.match(source, /onError=\{\(\) => setVideoFailed\(true\)\}/);
  assert.match(source, /startupCurtain\.classList\.add\('startup-curtain--hidden'\)/);
  assert.match(html, /id="startup-curtain"/);
  assert.match(html, /width: 100vw;/);
  assert.match(html, /height: 100vh;/);
  assert.match(html, /object-fit: cover;/);
  assert.match(html, /rel="preload" as="image"[^>]+screensaver-moravsky-beroun-poster\.webp/);
  assert.match(server, /'\.mp4': 'video\/mp4'/);
});
