import ExcelJS from "exceljs";

export const buildWorkReportWorkbook = async ({
  templateBuffer,
  period,
  settings,
  activities,
  workingDays,
  workedHours,
  vacationHours = 0,
}) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Šablona neobsahuje pracovní list.");

  const setCell = (address, value) => { worksheet.getCell(address).value = value; };
  const monthEnd = new Date(Date.UTC(period.year, period.month, 0));

  setCell("C7", settings.projectName);
  setCell("G7", workingDays * 8);
  setCell("C8", settings.registrationNumber);
  setCell("G8", 1);
  setCell("C9", settings.employeeName);
  const contractLabels = {
    DPP: "Dohoda o provedení práce",
    "DPČ": "Dohoda o pracovní činnosti",
  };
  setCell("G9", contractLabels[settings.contractType] || settings.contractType);
  setCell("C10", settings.positionName);
  setCell("C11", settings.budgetCode);
  setCell("G11", Number(settings.monthlyHours));
  setCell("C12", period.month);
  setCell("C13", period.year);
  setCell("G13", Number(settings.monthlyHours));

  for (let index = 0; index < 10; index += 1) {
    const row = 17 + index;
    setCell(`B${row}`, activities[index]?.desc || "");
    setCell(`G${row}`, activities[index] ? Number(activities[index].hours || 0) : "");
  }

  setCell("G28", workedHours);
  setCell("G29", workedHours);
  setCell("G32", vacationHours);
  setCell("D32", vacationHours);
  setCell("G34", 0);
  setCell("D34", 0);
  setCell("G36", 0);
  setCell("D36", 0);
  setCell("G38", 0);
  setCell("D38", 0);
  setCell("G40", Number(settings.monthlyHours));
  setCell("G41", workedHours + vacationHours);
  setCell("C44", monthEnd);
  setCell("C45", monthEnd);
  worksheet.getCell("C44").numFmt = "dd.mm.yyyy";
  worksheet.getCell("C45").numFmt = "dd.mm.yyyy";
  worksheet.pageSetup = {
    ...worksheet.pageSetup,
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    scale: undefined,
    horizontalCentered: true,
    printArea: "A1:G45",
  };
  worksheet.properties.pageSetUpPr = { fitToPage: true, autoPageBreaks: false };

  return workbook;
};
