const GOAL_STATUS = Object.freeze({
  OPEN: 'open',
  COMPLETED: 'completed',
  PARTIALLY_COMPLETED: 'partially_completed',
  NOT_COMPLETED: 'not_completed'
});

const GOAL_STATUS_OPTIONS = [
  { value: GOAL_STATUS.OPEN, label: 'Otevřený' },
  { value: GOAL_STATUS.COMPLETED, label: 'Splněný' },
  { value: GOAL_STATUS.PARTIALLY_COMPLETED, label: 'Částečně splněný' },
  { value: GOAL_STATUS.NOT_COMPLETED, label: 'Nesplněný' }
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function normalizeGoalStatus(goal = {}) {
  const rawStatus = normalizeText(goal.goalStatus || goal.status || goal.completionStatus);
  if ([GOAL_STATUS.OPEN, 'otevreny', 'otevren'].includes(rawStatus)) return GOAL_STATUS.OPEN;
  if ([GOAL_STATUS.COMPLETED, 'splneny', 'splnen', 'splneno'].includes(rawStatus)) return GOAL_STATUS.COMPLETED;
  if ([GOAL_STATUS.PARTIALLY_COMPLETED, 'partial', 'partially_completed', 'castecne_splneny', 'castecne_splnen'].includes(rawStatus)) {
    return GOAL_STATUS.PARTIALLY_COMPLETED;
  }
  if ([GOAL_STATUS.NOT_COMPLETED, 'failed', 'nesplneny', 'nesplnen', 'nesplneno'].includes(rawStatus)) {
    return GOAL_STATUS.NOT_COMPLETED;
  }

  const completedValue = normalizeText(goal.isCompleted);
  if (goal.isCompleted === true || ['true', '1', 'ano', 'splnen', 'splneno'].includes(completedValue)) {
    return GOAL_STATUS.COMPLETED;
  }
  return GOAL_STATUS.OPEN;
}

function isGoalCompleted(goal = {}) {
  return normalizeGoalStatus(goal) === GOAL_STATUS.COMPLETED;
}

function isGoalTerminal(goal = {}) {
  return normalizeGoalStatus(goal) !== GOAL_STATUS.OPEN;
}

function goalStatusLabel(goalOrStatus = {}) {
  const status = typeof goalOrStatus === 'string'
    ? normalizeGoalStatus({ goalStatus: goalOrStatus })
    : normalizeGoalStatus(goalOrStatus);
  return GOAL_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Otevřený';
}

export {
  GOAL_STATUS,
  GOAL_STATUS_OPTIONS,
  goalStatusLabel,
  isGoalCompleted,
  isGoalTerminal,
  normalizeGoalStatus
};
