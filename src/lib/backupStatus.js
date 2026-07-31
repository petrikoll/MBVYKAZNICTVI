export const ACTIVE_BACKUP_STATES = Object.freeze(['queued', 'running']);

export const isBackupStatusActive = (status) =>
  ACTIVE_BACKUP_STATES.includes(String(status?.state || ''));

export const backupProgressText = (status) => {
  if (!isBackupStatusActive(status)) return '';
  const processedFiles = Number(status?.processedFiles);
  if (!Number.isFinite(processedFiles) || processedFiles < 1) return '';
  return `Zpracováno souborů: ${Math.floor(processedFiles)}`;
};
