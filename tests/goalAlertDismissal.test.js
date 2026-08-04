import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGoalAlertSignature,
  rememberDismissedGoalAlertSignature
} from '../src/lib/goalAlertDismissal.js';

const alerts = {
  total: 2,
  approaching: [{ clientId: 'client-1', deadline: '2026-08-03', goalLabel: 'Bydlení', daysUntil: 2 }],
  overdue: [{ clientId: 'client-2', deadline: '2026-07-30', goalLabel: 'Finance', daysOverdue: 2 }]
};

test('stejná sada upozornění má stabilní otisk bez ohledu na denní odpočet', () => {
  const changedCounters = {
    ...alerts,
    approaching: [{ ...alerts.approaching[0], daysUntil: 1 }],
    overdue: [{ ...alerts.overdue[0], daysOverdue: 3 }]
  };

  assert.equal(buildGoalAlertSignature(alerts), buildGoalAlertSignature(changedCounters));
});

test('nový termín nebo přesun po termínu vytvoří nový otisk', () => {
  const changedDeadline = {
    ...alerts,
    approaching: [{ ...alerts.approaching[0], deadline: '2026-08-04' }]
  };
  const becameOverdue = {
    total: 2,
    approaching: [],
    overdue: [...alerts.overdue, { ...alerts.approaching[0], daysOverdue: 1 }]
  };

  assert.notEqual(buildGoalAlertSignature(alerts), buildGoalAlertSignature(changedDeadline));
  assert.notEqual(buildGoalAlertSignature(alerts), buildGoalAlertSignature(becameOverdue));
});

test('zavřený otisk zůstane jen v otevřené relaci', () => {
  const signature = buildGoalAlertSignature(alerts);
  const signatures = rememberDismissedGoalAlertSignature([], signature);

  assert.deepEqual(signatures, [signature]);
});
