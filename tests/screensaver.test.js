import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('spořič při spuštění tři sekundy oznamuje načítání dat', async () => {
  const source = await readFile(new URL('../src/components/IdleFlyScreensaver.jsx', import.meta.url), 'utf8');

  assert.match(source, /const STARTUP_DISPLAY_MS = 3 \* 1000;/);
  assert.match(source, /const \[active, setActive\] = React\.useState\(true\);/);
  assert.match(source, /Načítám data…/);
  assert.match(source, /setStartup\(false\)/);
});
