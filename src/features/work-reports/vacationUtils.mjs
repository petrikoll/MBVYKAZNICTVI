import { getAvailableMonths, getContractTerms } from "./projectDefaults.js";

export const VACATION_WEEK_HOURS = 20;
export const VACATION_ELIGIBILITY_HOURS = 80;

export const calculateVacationEntitlement = (hours, vacationWeeks = 5) => {
  const eligibleHours = Math.max(0, Number(hours) || 0);
  const weeks = Math.max(0, Number(vacationWeeks) || 0);
  if (eligibleHours < VACATION_ELIGIBILITY_HOURS || weeks <= 0) return 0;

  const completedWeeks = Math.floor(eligibleHours / VACATION_WEEK_HOURS);
  return Math.ceil((completedWeeks / 52) * VACATION_WEEK_HOURS * weeks);
};

export const getPlannedHoursForYear = (year, throughMonth = 12) =>
  getAvailableMonths()
    .filter((period) => period.year === Number(year) && period.month <= Number(throughMonth))
    .reduce((sum, period) => sum + getContractTerms(period).monthlyHours, 0);

export const getVacationOverview = ({ period, vacationByPeriod = {}, vacationWeeks = 5 }) => {
  const projectYears = [...new Set(getAvailableMonths().map((item) => item.year))];
  const annualPlannedHours = getPlannedHoursForYear(period.year);
  const plannedHoursThroughMonth = getPlannedHoursForYear(period.year, period.month);
  const projectedEntitlement = calculateVacationEntitlement(annualPlannedHours, vacationWeeks);
  const accruedEntitlement = calculateVacationEntitlement(plannedHoursThroughMonth, vacationWeeks);

  const usedInYear = Object.entries(vacationByPeriod).reduce((sum, [key, hours]) => (
    key.startsWith(`${period.year}-`) ? sum + (Number(hours) || 0) : sum
  ), 0);
  const usedBeforeCurrent = Object.entries(vacationByPeriod).reduce((sum, [key, hours]) => (
    key !== period.key && Number(key.slice(0, 4)) <= period.year ? sum + (Number(hours) || 0) : sum
  ), 0);
  const totalProjectedThroughYear = projectYears
    .filter((year) => year <= period.year)
    .reduce((sum, year) => sum + calculateVacationEntitlement(getPlannedHoursForYear(year), vacationWeeks), 0);
  const availableForCurrentMonth = Math.max(0, totalProjectedThroughYear - usedBeforeCurrent);
  const currentMonthVacation = Math.max(0, Number(vacationByPeriod[period.key]) || 0);

  return {
    annualPlannedHours,
    plannedHoursThroughMonth,
    projectedEntitlement,
    accruedEntitlement,
    usedInYear,
    currentMonthVacation,
    remainingIncludingCarryover: Math.max(0, totalProjectedThroughYear - usedBeforeCurrent - currentMonthVacation),
    availableForCurrentMonth,
    eligibilityReached: plannedHoursThroughMonth >= VACATION_ELIGIBILITY_HOURS,
  };
};
