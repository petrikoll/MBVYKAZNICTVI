const normalizeDate = (value) => {
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? '' : date.toISOString().slice(0, 10);
  }

  const source = String(value || '').trim();
  let match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    const iso = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
  }

  match = source.match(/^(\d{1,2})[./]\s*(\d{1,2})[./]\s*(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const iso = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
};

function isDateWithinConfiguredPeriod(dateValue, period) {
  const date = normalizeDate(dateValue);
  if (!date) return false;
  if (!period || period.value === 'all') return true;

  const start = normalizeDate(period.start);
  const end = normalizeDate(period.end);
  if (!start || !end) return false;
  return date >= start && date <= end;
}

function isDateWithinReportingPeriod(dateValue, period, {
  projectStartDate = '',
  projectEndDate = '',
  referenceDate = ''
} = {}) {
  const date = normalizeDate(dateValue);
  if (!date) return false;

  const periodIsAll = !period || period.value === 'all';
  const start = normalizeDate(periodIsAll ? projectStartDate : period.start);
  const end = normalizeDate(periodIsAll ? projectEndDate : period.end);
  const reference = normalizeDate(referenceDate);

  if (start && date < start) return false;
  if (end && date > end) return false;
  if (reference && date > reference) return false;
  return true;
}

export {
  isDateWithinConfiguredPeriod,
  isDateWithinReportingPeriod,
  normalizeDate
};
