export const PROJECT_PERIOD = {
  startYear: 2026,
  startMonth: 7,
  endYear: 2028,
  endMonth: 6,
};

export const DEFAULT_SETTINGS = {
  projectName: "Podpora sociální práce v Moravském Berouně II.",
  registrationNumber: "CZ.03.02.01/00/25_106/0006125",
  employeeName: "Mgr. Radka Vysloužilová, DiS.",
  positionName: "Odborný garant",
  budgetCode: "1.1.3.1",
  contractType: "DPP",
  monthlyHours: 32,
  vacationWeeks: 5,
};

const periodNumber = ({ year, month }) => Number(year) * 100 + Number(month);

export const getContractTerms = (period) => {
  const value = periodNumber(period);

  if (value >= 202607 && value <= 202608) {
    return { contractType: "DPP", monthlyHours: 24 };
  }
  if (value >= 202609 && value <= 202709) {
    return { contractType: "DPP", monthlyHours: 32 };
  }
  if (value >= 202710 && value <= 202712) {
    return { contractType: "DPČ", monthlyHours: 32 };
  }
  if (value >= 202801 && value <= 202806) {
    return { contractType: "DPP", monthlyHours: 32 };
  }

  return { contractType: "DPP", monthlyHours: 32 };
};

export const DEFAULT_ACTIVITIES = [
  {
    desc: "Odborné metodické vedení pracovníků projektu, sjednocování pracovních postupů a kontrola kvality poskytované podpory v souladu s cíli projektu, metodikou práce s cílovou skupinou a pravidly OPZ+.",
    hours: 0,
  },
  {
    desc: "Poskytování odborných konzultací pracovníkům projektu u složitých nebo rizikových klientských situací, zejména při volbě vhodného postupu, vymezení hranic podpory a návaznosti na odborné služby.",
    hours: 0,
  },
];

export const getAvailableMonths = () => {
  const months = [];
  let year = PROJECT_PERIOD.startYear;
  let month = PROJECT_PERIOD.startMonth;
  while (year < PROJECT_PERIOD.endYear || (year === PROJECT_PERIOD.endYear && month <= PROJECT_PERIOD.endMonth)) {
    months.push({ year, month, key: `${year}-${String(month).padStart(2, "0")}` });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return months;
};
