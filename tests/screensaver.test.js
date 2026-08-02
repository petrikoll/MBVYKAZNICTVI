import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('spořič při spuštění čtyři sekundy oznamuje načítání dat', async () => {
  const source = await readFile(new URL('../src/components/IdleFlyScreensaver.jsx', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(source, /const STARTUP_DISPLAY_MS = 4 \* 1000;/);
  assert.match(source, /const \[active, setActive\] = React\.useState\(true\);/);
  assert.match(source, /Načítám data…/);
  assert.match(source, /setStartup\(false\)/);
  assert.match(source, /onLoad=\{beginStartupCountdown\}/);
  assert.match(source, /startupCurtain\.classList\.add\('startup-curtain--hidden'\)/);
  assert.match(html, /id="startup-curtain"/);
  assert.match(html, /rel="preload" as="image"[^>]+screensaver-moravsky-beroun\.webp/);
});
