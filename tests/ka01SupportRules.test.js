import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getKa1SupportTypeOptions,
  isKa1SupportCombinationAllowed,
  KA1_SUPPORT_TYPE_OPTIONS
} from '../src/lib/ka01SupportRules.js';

test('ambulantní forma nenabízí terénní a kontaktní typy podpory', () => {
  const options = getKa1SupportTypeOptions('ambulantní');

  assert.doesNotMatch(options.join('|'), /Depistáž/);
  assert.doesNotMatch(options.join('|'), /Terénní sociální práce/);
  assert.doesNotMatch(options.join('|'), /Doprovod klienta/);
  assert.match(options.join('|'), /Základní sociální poradenství/);
  assert.match(options.join('|'), /Krizová intervence/);
});

test('ostatní formy zachovávají úplnou nabídku KA01', () => {
  assert.deepEqual(getKa1SupportTypeOptions('terénní'), KA1_SUPPORT_TYPE_OPTIONS);
  assert.deepEqual(getKa1SupportTypeOptions('Telefonní'), KA1_SUPPORT_TYPE_OPTIONS);
});

test('neplatnou kombinaci nelze potvrdit ani obejit starým stavem formuláře', () => {
  assert.equal(isKa1SupportCombinationAllowed('ambulantní', 'Doprovod klienta'), false);
  assert.equal(isKa1SupportCombinationAllowed('ambulantní', 'Odborné sociální poradenství'), true);
  assert.equal(isKa1SupportCombinationAllowed('terénní', 'Doprovod klienta'), true);
});
