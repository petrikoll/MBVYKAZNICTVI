export const MAX_ACTIVITY_ROWS = 10;
export const HOURS_TOLERANCE = 0.001;
export const ACTIVITY_HOURS_INCREMENT = 0.5;

export const roundHours = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const roundActivityHours = (value) =>
  roundHours(Math.round(Math.max(0, Number(value) || 0) / ACTIVITY_HOURS_INCREMENT) * ACTIVITY_HOURS_INCREMENT);

export const sumHours = (activities) =>
  roundHours(
    (Array.isArray(activities) ? activities : [])
      .slice(0, MAX_ACTIVITY_ROWS)
      .reduce((sum, activity) => sum + (Number(activity?.hours) || 0), 0),
  );

export const getHoursStatus = (activities, targetHours) => {
  const actual = sumHours(activities);
  const target = Math.max(0, roundHours(targetHours));
  const difference = roundHours(actual - target);
  return {
    actual,
    target,
    difference,
    isBalanced: Math.abs(difference) <= HOURS_TOLERANCE,
    missing: difference < -HOURS_TOLERANCE ? Math.abs(difference) : 0,
    exceeded: difference > HOURS_TOLERANCE ? difference : 0,
  };
};

export const distributeHours = (activities, targetHours) => {
  const rows = (Array.isArray(activities) ? activities : [])
    .slice(0, MAX_ACTIVITY_ROWS)
    .map((activity) => ({ ...activity, hours: 0 }));
  if (!rows.length) return rows;

  const target = Math.max(0, roundHours(targetHours));
  const preferredWeights = rows.length === 2 ? [0.58, 0.42] : [0.46, 0.32, 0.22];
  const weights = rows.map((_, index) => preferredWeights[index] ?? 1 / rows.length);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let allocated = 0;

  return rows.map((activity, index) => {
    const hours = index === rows.length - 1
      ? roundHours(target - allocated)
      : roundActivityHours((target * weights[index]) / weightTotal);
    allocated = roundHours(allocated + hours);
    return { ...activity, hours: Math.max(0, hours) };
  });
};

export const balanceHours = (activities, targetHours) => {
  const rows = (Array.isArray(activities) ? activities : [])
    .slice(0, MAX_ACTIVITY_ROWS)
    .map((activity) => ({ ...activity, hours: roundActivityHours(activity?.hours) }));
  if (!rows.length) return rows;

  const target = Math.max(0, roundHours(targetHours));
  let difference = roundHours(target - sumHours(rows));

  if (difference > 0) {
    rows[rows.length - 1].hours = roundHours(rows[rows.length - 1].hours + difference);
  } else if (difference < 0) {
    let remaining = Math.abs(difference);
    for (let index = rows.length - 1; index >= 0 && remaining > HOURS_TOLERANCE; index -= 1) {
      const reduction = Math.min(rows[index].hours, remaining);
      rows[index].hours = roundHours(rows[index].hours - reduction);
      remaining = roundHours(remaining - reduction);
    }
  }

  difference = roundHours(target - sumHours(rows));
  if (Math.abs(difference) > HOURS_TOLERANCE) {
    rows[rows.length - 1].hours = Math.max(0, roundHours(rows[rows.length - 1].hours + difference));
  }
  return rows;
};

export const getWorkingDays = (month, year) => {
  let days = 0;
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export const safeFilenamePart = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "vykaz";
