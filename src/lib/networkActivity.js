function isTeamMeetingRecord(record = {}) {
  return [record.payload?.type, record.payload?.networkType, record.type, record.title]
    .map((value) => String(value || '').trim().toLocaleLowerCase('cs'))
    .some((activityType) => activityType === 'porada' || activityType.endsWith('- porada'));
}

export { isTeamMeetingRecord };
