const MAX_DISMISSED_GOAL_ALERT_SIGNATURES = 20;

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildGoalAlertSignature(alerts = {}) {
  const normalizeItems = (items, state) => (Array.isArray(items) ? items : [])
    .map((item) => [
      state,
      String(item?.clientId || ''),
      String(item?.deadline || ''),
      String(item?.goalLabel || '')
    ].join('|'))
    .sort();
  const source = [
    ...normalizeItems(alerts.approaching, 'approaching'),
    ...normalizeItems(alerts.overdue, 'overdue')
  ].join('\n');
  return source ? `${Number(alerts.total || 0)}-${hashText(source)}` : '';
}

function rememberDismissedGoalAlertSignature(signatures = [], signature = '') {
  if (!signature) return Array.isArray(signatures) ? signatures : [];
  return [...new Set([...(Array.isArray(signatures) ? signatures : []), signature])]
    .slice(-MAX_DISMISSED_GOAL_ALERT_SIGNATURES);
}

export {
  buildGoalAlertSignature,
  rememberDismissedGoalAlertSignature
};
