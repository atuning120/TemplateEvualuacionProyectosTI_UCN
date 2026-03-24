const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const REQUIRED_ENV_VARS = [
  'SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
];

const ensureEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
};

const toText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
};

const extractSpreadsheetId = (spreadsheetEnvValue) => {
  const rawValue = toText(spreadsheetEnvValue).trim();

  if (!rawValue) {
    throw new Error('SPREADSHEET_ID esta vacio. Debes configurar una ID o URL valida de Google Sheets.');
  }

  // Caso 1: Ya viene la ID directa (sin URL)
  if (/^[a-zA-Z0-9-_]+$/.test(rawValue) && !rawValue.includes('/')) {
    return rawValue;
  }

  // Caso 2: Viene la URL completa de Google Sheets
  const urlMatch = rawValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  throw new Error('SPREADSHEET_ID no es valido. Usa la ID del documento o una URL de Google Sheets con formato /spreadsheets/d/<id>.');
};

const mapReportToSheetRow = (reportData) => ({
  projectSheetIndex: toText(reportData.projectSheetIndex),

  // Seccion 1: Informacion general
  projectName: toText(reportData.projectName),
  projectCode: toText(reportData.projectCode),
  teamName: toText(reportData.teamName),
  pmName: toText(reportData.pmName),
  reportDate: toText(reportData.reportDate),
  sprintNumber: toText(reportData.sprintNumber),

  // Seccion 2: Estado general
  projectStatus: toText(reportData.projectStatus),
  weeklyMainProgress: toText(reportData.weeklyMainProgress),
  weeklyMainBlockers: toText(reportData.weeklyMainBlockers),
  pmGeneralEvaluation: toText(reportData.pmGeneralEvaluation),

  // Seccion 3: Avance del sprint
  sprintGoal: toText(reportData.sprintGoal),
  userStoriesTasks: toText(reportData.userStoriesTasks),
  sprintEstimatedProgress: toText(reportData.sprintEstimatedProgress),
  sprintEstimatedRemaining: toText(reportData.sprintEstimatedRemaining),

  // Seccion 4: Seguimiento diario
  weeklySummary: toText(reportData.weeklySummary),
  pmDailyObservations: toText(reportData.pmDailyObservations),

  // Seccion 5: Burn down chart
  burndownStatus: toText(reportData.burndownStatus),
  burndownInterpretation: toText(reportData.burndownInterpretation),
  burndownChartLink: toText(reportData.burndownChartLink),

  // Seccion 6: Riesgos y bloqueos
  risksAndBlockers: toText(reportData.risksAndBlockers),

  // Seccion 7: Gestion del equipo
  teamCommitmentLevel: toText(reportData.teamCommitmentLevel),
  communicationIssues: toText(reportData.communicationIssues),
  rolesCompliance: toText(reportData.rolesCompliance),
  pmTeamObservations: toText(reportData.pmTeamObservations),

  // Seccion 8: Proximos pasos
  nextWeekKeyTasks: toText(reportData.nextWeekKeyTasks),
  sprintPlanAdjustments: toText(reportData.sprintPlanAdjustments),
  requiredDecisions: toText(reportData.requiredDecisions),

  // Seccion 9: Alertas para el profesor
  professorAlerts: toText(reportData.professorAlerts),

  // Seccion 10: Evaluacion del PM
  agileMethodologyCompliance: toText(reportData.agileMethodologyCompliance),
  progressUpdateQuality: toText(reportData.progressUpdateQuality),
  pmImprovementPoints: toText(reportData.pmImprovementPoints),

  // Seccion 11: Anexos
  evidences: toText(reportData.evidences),
  additionalDetails: toText(reportData.additionalDetails),

  createdAt: new Date().toISOString(),
});

const saveReport = async (req, res) => {
  try {
    const reportData = req.body;
    ensureEnv();
    const spreadsheetId = extractSpreadsheetId(process.env.SPREADSHEET_ID);

    const projectSheetIndex = Number(reportData.projectSheetIndex);
    if (!Number.isInteger(projectSheetIndex) || projectSheetIndex < 1) {
      return res.status(400).json({
        success: false,
        message: 'El campo projectSheetIndex debe ser un numero entero mayor o igual a 1.',
      });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[projectSheetIndex - 1];
    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: `No existe la hoja para projectSheetIndex=${projectSheetIndex}. Verifica cuantas hojas hay en el spreadsheet.`,
      });
    }

    const newRow = mapReportToSheetRow(reportData);
    await sheet.addRow(newRow);

    res.status(201).json({
      success: true,
      message: 'Reporte guardado exitosamente en Google Sheets',
      sheetTitle: sheet.title,
    });
  } catch (error) {
    console.error('Error al guardar el reporte:', error);

    const maybePermissionError =
      error.message?.includes('The caller does not have permission') ||
      error.message?.includes('insufficient authentication scopes');

    res.status(500).json({
      success: false,
      message: maybePermissionError
        ? 'Error de permisos en Google Sheets. Comparte la hoja con el service account email y revisa scopes.'
        : 'Hubo un error al procesar el reporte',
      error: error.message,
    });
  }
};

module.exports = {
  saveReport
};