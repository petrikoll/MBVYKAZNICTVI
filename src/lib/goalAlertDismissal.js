const GOAL_ALERT_DISMISS_STORAGE_KEY = 'projectReporting.dismissedGoalAlertSignatures.v1';
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

function readDismissedGoalAlertSignatures(storage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(GOAL_ALERT_DISMISS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item).slice(-MAX_DISMISSED_GOAL_ALERT_SIGNATURES) : [];
  } catch {
    return [];
  }
}

function rememberDismissedGoalAlertSignature(signatures = [], signature = '') {
  if (!signature) return Array.isArray(signatures) ? signatures : [];
  return [...new Set([...(Array.isArray(signatures) ? signatures : []), signature])]
    .slice(-MAX_DISMISSED_GOAL_ALERT_SIGNATURES);
}

function storeDismissedGoalAlertSignatures(storage, signatures = []) {
  if (!storage) return;
  try {
    storage.setItem(GOAL_ALERT_DISMISS_STORAGE_KEY, JSON.stringify(signatures));
  } catch {
    // Nedostupné úložiště nesmí blokovat práci v aplikaci.
  }
}

export {
  GOAL_ALERT_DISMISS_STORAGE_KEY,
  buildGoalAlertSignature,
  readDismissedGoalAlertSignatures,
  rememberDismissedGoalAlertSignature,
  storeDismissedGoalAlertSignatures
};
