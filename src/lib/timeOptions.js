function buildHalfHourTimeOptions(startHour = 7, endHour = 18) {
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const optionCount = Math.floor((endMinutes - startMinutes) / 30) + 1;

  return Array.from({ length: Math.max(0, optionCount) }, (_, index) => {
    const totalMinutes = startMinutes + index * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
}

const PROJECT_TIME_OPTIONS = buildHalfHourTimeOptions();

export {
  PROJECT_TIME_OPTIONS,
  buildHalfHourTimeOptions
};
