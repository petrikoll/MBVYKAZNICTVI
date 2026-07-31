import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GOAL_STATUS,
  goalStatusLabel,
  isGoalCompleted,
  isGoalTerminal,
  normalizeGoalStatus
} from '../src/lib/goalStatus.js';

test('staré boolean hodnoty cíle zůstávají zpětně kompatibilní', () => {
  assert.equal(normalizeGoalStatus({ isCompleted: true }), GOAL_STATUS.COMPLETED);
  assert.equal(normalizeGoalStatus({ isCompleted: 'ano' }), GOAL_STATUS.COMPLETED);
  assert.equal(normalizeGoalStatus({ isCompleted: false }), GOAL_STATUS.OPEN);
});

test('částečně splněný a nesplněný cíl jsou uzavřené, ale nepočítají se jako splněné', () => {
  const partialGoal = { goalStatus: GOAL_STATUS.PARTIALLY_COMPLETED };
  const failedGoal = { goalStatus: GOAL_STATUS.NOT_COMPLETED };

  assert.equal(isGoalTerminal(partialGoal), true);
  assert.equal(isGoalTerminal(failedGoal), true);
  assert.equal(isGoalCompleted(partialGoal), false);
  assert.equal(isGoalCompleted(failedGoal), false);
});

test('pouze plně splněný cíl se počítá jako splněný', () => {
  const completedGoal = { goalStatus: GOAL_STATUS.COMPLETED };

  assert.equal(isGoalTerminal(completedGoal), true);
  assert.equal(isGoalCompleted(completedGoal), true);
  assert.equal(goalStatusLabel(completedGoal), 'Splněný');
  assert.equal(goalStatusLabel(GOAL_STATUS.PARTIALLY_COMPLETED), 'Částečně splněný');
  assert.equal(goalStatusLabel(GOAL_STATUS.NOT_COMPLETED), 'Nesplněný');
});
