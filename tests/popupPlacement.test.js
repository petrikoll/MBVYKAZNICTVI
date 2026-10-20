import test from 'node:test';
import assert from 'node:assert/strict';
import { popupPlacement } from '../src/lib/popupPlacement.js';

test('a right-column detail stays within the viewport and opens upward near its bottom', () => {
  const result = popupPlacement({ left: 530, top: 380, bottom: 425 }, { width: 1009, height: 768 }, { panelHeight: 347 });
  assert.equal(result.left, 421);
  assert.ok(result.top + 347 <= 768 - 12);
  assert.ok(result.top < 380);
});

test('popups fit phone, tablet and low windows, including triggers on their edges', () => {
  for (const width of [320, 390, 768, 1024, 1366]) {
    for (const height of [180, 360, 500, 768, 844]) {
      for (const top of [0, Math.floor(height / 2), height - 24]) {
        for (const maxWidth of [280, 576, 672]) {
          const result = popupPlacement({ left: width - 20, top, bottom: top + 24 }, { width, height }, { maxWidth, panelHeight: 347 });
          assert.ok(result.left >= 12);
          assert.ok(result.left + result.width <= width - 12);
          assert.ok(result.top >= 12);
          assert.ok(result.top + Math.min(347, result.maxHeight) <= height - 12);
        }
      }
    }
  }
});
