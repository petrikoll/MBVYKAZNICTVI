import assert from 'node:assert/strict';
import test from 'node:test';

import { hoursToMinutes, isPositiveHoursValue } from '../src/lib/hours.js';

test('počet hodin přijímá desetinné číslo s čárkou i zápis hodiny:minuty', () => {
  assert.equal(hoursToMinutes('1,5'), 90);
  assert.equal(hoursToMinutes('1:30'), 90);
  assert.equal(hoursToMinutes(2), 120);
  assert.equal(isPositiveHoursValue('0,5'), true);
});

test('neplatný nebo nekladný počet hodin se odmítne', () => {
  ['abc', '', '0', '-2', '1:60'].forEach((value) => {
    assert.equal(hoursToMinutes(value), 0);
    assert.equal(isPositiveHoursValue(value), false);
  });
});
