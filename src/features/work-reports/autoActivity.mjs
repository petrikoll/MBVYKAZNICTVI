import { roundActivityHours, roundHours } from './reportUtils.mjs';

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const employeeTokens = (name) => normalize(name)
  .split(' ')
  .filter((token) => token.length >= 5 && !['dis'].includes(token));

const recordPeople = (record) => {
  const payload = record?.payload || {};
  return [
    record?.worker,
    payload.worker,
    payload.workerName,
    ...(Array.isArray(payload.workers) ? payload.workers : []),
    ...(Array.isArray(payload.rtMembers) ? payload.rtMembers : []),
    payload.participants,
  ].filter(Boolean);
};

const includesEmployee = (record, employeeName) => {
  const expected = normalize(employeeName);
  const tokens = employeeTokens(employeeName);
  return recordPeople(record).some((person) => {
    const actual = normalize(person);
    return actual === expected || actual.includes(expected) || expected.includes(actual)
      || tokens.some((token) => actual.split(' ').includes(token));
  });
};

const dateParts = (value) => {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const czech = text.match(/^(\d{1,2})[./]\s*(\d{1,2})[./]\s*(\d{4})/);
  if (czech) return { year: Number(czech[3]), month: Number(czech[2]), day: Number(czech[1]) };
  return null;
};

const parseDecimalHours = (value) => {
  const number = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const timeMinutes = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const meetingHours = (payload) => {
  const start = timeMinutes(payload.startTime);
  const end = timeMinutes(payload.endTime);
  if (start !== null && end !== null) {
    const minutes = end >= start ? end - start : end + 1440 - start;
    if (minutes > 0) return minutes / 60;
  }
  if (Number(payload.durationMinutes) > 0) return Number(payload.durationMinutes) / 60;
  const duration = String(payload.duration || '').replace(',', '.');
  const hours = Number(duration.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:h|hod)/i)?.[1] || 0);
  const minutes = Number(duration.match(/([0-9]+)\s*min/i)?.[1] || 0);
  return hours + minutes / 60;
};

const formatDate = ({ day, month, year }) => `${String(day).padStart(2, '0')}. ${String(month).padStart(2, '0')}. ${year}`;
const formatHours = (value) => Number(value).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });

export const getAutomaticWorkReportActivity = ({ records = [], period, employeeName }) => {
  const entries = [];
  (Array.isArray(records) ? records : []).forEach((record) => {
    const payload = record?.payload || {};
    const date = dateParts(record?.activityDate || payload.date);
    if (!date || date.year !== Number(period?.year) || date.month !== Number(period?.month)) return;
    if (!includesEmployee(record, employeeName)) return;

    let label = '';
    let hours = 0;
    if (record.entityType === 'education_records') {
      label = 'vzdělávání';
      hours = parseDecimalHours(payload.hours);
    } else if (record.entityType === 'supervision_records') {
      label = 'supervize';
      hours = parseDecimalHours(payload.hours);
    } else if (record.entityType === 'network_activities' && normalize(payload.type || record.title).includes('porada')) {
      label = 'porada';
      hours = meetingHours(payload);
    }
    if (!label || hours <= 0) return;
    entries.push({ date, label, hours: Math.max(0.5, roundActivityHours(hours)) });
  });

  entries.sort((left, right) => left.date.day - right.date.day || left.label.localeCompare(right.label, 'cs'));
  if (!entries.length) return null;
  const totalHours = roundHours(entries.reduce((sum, entry) => sum + entry.hours, 0));
  const detail = entries.map((entry) => `${formatDate(entry.date)} – ${entry.label} (${formatHours(entry.hours)} h)`).join('; ');
  return {
    desc: `Porady, vzdělávání a supervize: ${detail}. Celkem ${formatHours(totalHours)} h.`,
    hours: totalHours,
    automatic: true,
    entries,
  };
};
