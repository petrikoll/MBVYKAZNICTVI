function hoursToMinutes(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim();
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (minutes < 0 || minutes > 59) return 0;
    return hours * 60 + minutes;
  }
  const number = Number(text.replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number * 60);
}

const isPositiveHoursValue = (value) => hoursToMinutes(value) > 0;

export { hoursToMinutes, isPositiveHoursValue };
