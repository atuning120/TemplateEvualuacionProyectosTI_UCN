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

const SHEET_COLUMNS = {
  reportDate: 'Fecha reporte',
  sprintNumber: 'Sprint actual',
  projectStatus: 'Estado proyecto',
  weeklyMainProgress: 'Avances principales semana',
  weeklyMainBlockers: 'Problemas bloqueos principales',
  pmGeneralEvaluation: 'Evaluacion general PM',
  sprintGoal: 'Objetivo sprint',
  userStoriesTasks: 'Historias usuario tareas',
  sprintEstimatedProgress: 'Porcentaje avance estimado',
  sprintEstimatedRemaining: 'Porcentaje restante estimado',
  weeklySummary: 'Resumen semanal',
  pmDailyObservations: 'Observaciones diarias PM',
  burndownStatus: 'Estado burndown',
  burndownInterpretation: 'Interpretacion burndown',
  burndownChartLink: 'Enlace grafico burndown',
  risksAndBlockers: 'Riesgos y bloqueos',
  teamCommitmentLevel: 'Nivel compromiso equipo',
  communicationIssues: 'Problemas comunicacion',
  rolesCompliance: 'Cumplimiento roles',
  pmTeamObservations: 'Observaciones PM equipo',
  nextWeekKeyTasks: 'Tareas clave proxima semana',
  sprintPlanAdjustments: 'Ajustes plan sprint',
  requiredDecisions: 'Decisiones requeridas',
  professorAlerts: 'Alertas profesor',
  agileMethodologyCompliance: 'Cumplimiento metodologia agil',
  progressUpdateQuality: 'Calidad actualizacion avances',
  pmImprovementPoints: 'Puntos mejora PM',
  evidences: 'Evidencias',
  additionalDetails: 'Detalles adicionales',
  createdAt: 'Marca tiempo',
};

const LEGACY_COLUMNS = {
  reportDate: 'reportDate',
  sprintNumber: 'sprintNumber',
  projectStatus: 'projectStatus',
  weeklyMainProgress: 'weeklyMainProgress',
  weeklyMainBlockers: 'weeklyMainBlockers',
  pmGeneralEvaluation: 'pmGeneralEvaluation',
  sprintGoal: 'sprintGoal',
  userStoriesTasks: 'userStoriesTasks',
  sprintEstimatedProgress: 'sprintEstimatedProgress',
  sprintEstimatedRemaining: 'sprintEstimatedRemaining',
  weeklySummary: 'weeklySummary',
  pmDailyObservations: 'pmDailyObservations',
  burndownStatus: 'burndownStatus',
  burndownInterpretation: 'burndownInterpretation',
  burndownChartLink: 'burndownChartLink',
  risksAndBlockers: 'risksAndBlockers',
  teamCommitmentLevel: 'teamCommitmentLevel',
  communicationIssues: 'communicationIssues',
  rolesCompliance: 'rolesCompliance',
  pmTeamObservations: 'pmTeamObservations',
  nextWeekKeyTasks: 'nextWeekKeyTasks',
  sprintPlanAdjustments: 'sprintPlanAdjustments',
  requiredDecisions: 'requiredDecisions',
  professorAlerts: 'professorAlerts',
  agileMethodologyCompliance: 'agileMethodologyCompliance',
  progressUpdateQuality: 'progressUpdateQuality',
  pmImprovementPoints: 'pmImprovementPoints',
  evidences: 'evidences',
  additionalDetails: 'additionalDetails',
  createdAt: 'createdAt',
};

const REPORT_HEADERS = Object.values(SHEET_COLUMNS);
const headerOf = (field) => SHEET_COLUMNS[field] || field;
const legacyHeaderOf = (field) => LEGACY_COLUMNS[field] || field;

const PROJECTS_SHEET_TITLE = 'Proyectos';
const PROJECTS_SHEET_COLUMNS = {
  projectSheetIndex: 'Numero hoja proyecto',
  projectName: 'Nombre proyecto',
  projectCode: 'Codigo identificador',
  teamName: 'Equipo responsable',
  pmName: 'Project Manager',
};
const PROJECTS_SHEET_HEADERS = Object.values(PROJECTS_SHEET_COLUMNS);
const projectHeaderOf = (field) => PROJECTS_SHEET_COLUMNS[field] || field;
const RESERVED_PROJECT_NAME = PROJECTS_SHEET_TITLE.toLowerCase();
const PROJECTS_SHEET_MIN_COLUMNS = 26;

const createAuthClient = () => {
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
};

const getSpreadsheetIdFromEnv = () => extractSpreadsheetId(process.env.SPREADSHEET_ID);

const getSheetsMetadataWithTables = async (authClient, spreadsheetId) => {
  const response = await authClient.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    method: 'GET',
    params: {
      fields: 'sheets(properties(sheetId,title),tables(tableId,name,range))',
    },
  });

  return response.data;
};

const addMasterProjectsTable = async (authClient, spreadsheetId, projectsSheet) => {
  const response = await authClient.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    method: 'POST',
    data: {
      requests: [
        {
          addTable: {
            table: {
              range: {
                sheetId: projectsSheet.sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endRowIndex: Math.max(Number(projectsSheet.rowCount || 0), 2),
                endColumnIndex: PROJECTS_SHEET_HEADERS.length,
              },
              columnProperties: PROJECTS_SHEET_HEADERS.map((columnName, columnIndex) => ({
                columnIndex,
                columnName,
                columnType: 'TEXT',
              })),
            },
          },
        },
      ],
    },
  });

  return response.data;
};

const ensureProjectsSheetIsRealTable = async (projectsSheet) => {
  const authClient = createAuthClient();
  const spreadsheetId = getSpreadsheetIdFromEnv();
  const metadata = await getSheetsMetadataWithTables(authClient, spreadsheetId);
  const sheetMetadata = (metadata.sheets || []).find(
    (sheet) => sheet?.properties?.sheetId === projectsSheet.sheetId,
  );

  if (sheetMetadata?.tables?.length > 0) {
    return true;
  }

  await addMasterProjectsTable(authClient, spreadsheetId, projectsSheet);
  return true;
};

const loadSpreadsheetDoc = async () => {
  ensureEnv();
  const spreadsheetId = extractSpreadsheetId(process.env.SPREADSHEET_ID);
  const serviceAccountAuth = createAuthClient();
  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
};

const getSheetByProjectIndex = (doc, projectSheetIndex) => {
  const index = Number(projectSheetIndex);

  if (!Number.isInteger(index) || index < 1) {
    return null;
  }

  return doc.sheetsByIndex[index - 1] || null;
};

const isProjectsSheet = (sheet) =>
  toText(sheet?.title).trim().toLowerCase() === RESERVED_PROJECT_NAME;

const isReservedProjectName = (name) =>
  toText(name).trim().toLowerCase() === RESERVED_PROJECT_NAME;

const ensureProjectsSheetReady = async (doc) => {
  let projectsSheet = doc.sheetsByTitle[PROJECTS_SHEET_TITLE];

  if (!projectsSheet) {
    projectsSheet = await doc.addSheet({
      title: PROJECTS_SHEET_TITLE,
      gridProperties: {
        columnCount: PROJECTS_SHEET_MIN_COLUMNS,
      },
      headerValues: PROJECTS_SHEET_HEADERS,
    });
    await doc.loadInfo();
    projectsSheet = doc.sheetsByTitle[PROJECTS_SHEET_TITLE] || projectsSheet;
  }

  const hasHeaders = await hasHeaderRow(projectsSheet);

  if (!hasHeaders || projectsSheet.headerValues.join('||') !== PROJECTS_SHEET_HEADERS.join('||')) {
    if (projectsSheet.columnCount < PROJECTS_SHEET_MIN_COLUMNS) {
      await projectsSheet.updateProperties({
        gridProperties: {
          columnCount: PROJECTS_SHEET_MIN_COLUMNS,
        },
      });
    }

    await projectsSheet.setHeaderRow(PROJECTS_SHEET_HEADERS);
  }

  if (projectsSheet.columnCount < PROJECTS_SHEET_MIN_COLUMNS) {
    await projectsSheet.updateProperties({
      gridProperties: {
        columnCount: PROJECTS_SHEET_MIN_COLUMNS,
      },
    });
  }

  await compactProjectsRegistryRows(projectsSheet);

  try {
    await ensureProjectsSheetIsRealTable(projectsSheet);
  } catch (error) {
    // Fallback visual formatting if table API is unavailable in current environment.
    await applyProjectsSheetTableFormat(projectsSheet);
  }

  return projectsSheet;
};

const applyProjectsSheetTableFormat = async (projectsSheet) => {
  await projectsSheet.updateProperties({
    gridProperties: {
      frozenRowCount: 1,
      columnCount: Math.max(projectsSheet.columnCount || 0, PROJECTS_SHEET_MIN_COLUMNS),
    },
  });

  await projectsSheet.loadCells('A1:E1');

  for (let col = 0; col < PROJECTS_SHEET_HEADERS.length; col += 1) {
    const cell = projectsSheet.getCell(0, col);
    cell.backgroundColor = { red: 0.15, green: 0.30, blue: 0.46 };
    cell.textFormat = {
      bold: true,
      foregroundColor: { red: 1, green: 1, blue: 1 },
    };
    cell.horizontalAlignment = 'CENTER';
    cell.verticalAlignment = 'MIDDLE';
  }

  await projectsSheet.saveUpdatedCells();

  try {
    await projectsSheet.setBasicFilter({
      startRowIndex: 0,
      startColumnIndex: 0,
      endColumnIndex: PROJECTS_SHEET_HEADERS.length,
    });
  } catch (error) {
    // If filter is already set, keep the current one.
  }
};

const getRowCellValue = (row, field) => {
  if (!row) {
    return '';
  }

  if (typeof row.get === 'function') {
    const spanishValue = toText(row.get(headerOf(field)));

    if (spanishValue) {
      return spanishValue;
    }

    return toText(row.get(legacyHeaderOf(field)));
  }

  return toText(row[headerOf(field)] || row[legacyHeaderOf(field)] || row[field]);
};

const isMissingHeaderRowError = (error) =>
  toText(error?.message).includes('No values in the header row') ||
  toText(error?.message).includes('Header values are not yet loaded');

const hasHeaderRow = async (sheet) => {
  try {
    await sheet.loadHeaderRow();
    return Array.isArray(sheet.headerValues) && sheet.headerValues.length > 0;
  } catch (error) {
    if (isMissingHeaderRowError(error)) {
      return false;
    }

    throw error;
  }
};

const ensureSheetReadyForRows = async (sheet) => {
  const hasHeaders = await hasHeaderRow(sheet);

  if (hasHeaders && Array.isArray(sheet.headerValues)) {
    const hasLegacyHeaders = sheet.headerValues.some((header) =>
      Object.values(LEGACY_COLUMNS).includes(header),
    );

    const hasProjectRegistryHeaders = sheet.headerValues.some((header) =>
      PROJECTS_SHEET_HEADERS.includes(header),
    );

    if (!hasLegacyHeaders && !hasProjectRegistryHeaders) {
      return;
    }
  }

  if (sheet.columnCount < REPORT_HEADERS.length) {
    await sheet.updateProperties({
      gridProperties: {
        columnCount: REPORT_HEADERS.length,
      },
    });
  }

  await sheet.setHeaderRow(REPORT_HEADERS);
};

const getRowsSafe = async (sheet) => {
  try {
    return await sheet.getRows();
  } catch (error) {
    if (!isMissingHeaderRowError(error)) {
      throw error;
    }

    await ensureSheetReadyForRows(sheet);
    return await sheet.getRows();
  }
};

const buildProjectRegistryRow = ({ projectSheetIndex, projectName, projectCode, teamName, pmName }) => ({
  [projectHeaderOf('projectSheetIndex')]: toText(projectSheetIndex),
  [projectHeaderOf('projectName')]: toText(projectName),
  [projectHeaderOf('projectCode')]: toText(projectCode),
  [projectHeaderOf('teamName')]: toText(teamName),
  [projectHeaderOf('pmName')]: toText(pmName),
});

const projectRegistryRowToValues = (rowData) => [
  toText(rowData[projectHeaderOf('projectSheetIndex')]),
  toText(rowData[projectHeaderOf('projectName')]),
  toText(rowData[projectHeaderOf('projectCode')]),
  toText(rowData[projectHeaderOf('teamName')]),
  toText(rowData[projectHeaderOf('pmName')]),
];

const writeProjectRegistryRowsAt = async (projectsSheet, startRowNumber, rowsData) => {
  if (!Array.isArray(rowsData) || rowsData.length === 0) {
    return;
  }

  const endRowNumber = startRowNumber + rowsData.length - 1;
  await projectsSheet.loadCells(`A${startRowNumber}:E${endRowNumber}`);

  rowsData.forEach((rowData, rowOffset) => {
    const rowValues = projectRegistryRowToValues(rowData);
    rowValues.forEach((value, colOffset) => {
      const cell = projectsSheet.getCell(startRowNumber - 1 + rowOffset, colOffset);
      cell.value = value;
    });
  });

  await projectsSheet.saveUpdatedCells();
};

const writeProjectRegistryRowAtRowNumber = async (projectsSheet, rowNumber, rowData) => {
  await writeProjectRegistryRowsAt(projectsSheet, rowNumber, [rowData]);
};

const getProjectRegistryRows = async (projectsSheet) => {
  await projectsSheet.loadHeaderRow();
  const rows = await projectsSheet.getRows();

  return rows.filter((row) =>
    PROJECTS_SHEET_HEADERS.some((header) => toText(row.get(header)).trim().length > 0),
  );
};

const compactProjectsRegistryRows = async (projectsSheet) => {
  const rows = await getProjectRegistryRows(projectsSheet);
  if (rows.length === 0) {
    return;
  }

  const sortedRows = [...rows].sort(
    (a, b) => Number(a.rowNumber || 0) - Number(b.rowNumber || 0),
  );

  const isAlreadyCompact = sortedRows.every(
    (row, index) => Number(row.rowNumber || 0) === index + 2,
  );

  if (isAlreadyCompact) {
    return;
  }

  const snapshot = sortedRows.map((row) =>
    buildProjectRegistryRow({
      projectSheetIndex: row.get(projectHeaderOf('projectSheetIndex')),
      projectName: row.get(projectHeaderOf('projectName')),
      projectCode: row.get(projectHeaderOf('projectCode')),
      teamName: row.get(projectHeaderOf('teamName')),
      pmName: row.get(projectHeaderOf('pmName')),
    }),
  );

  const rowsToDelete = [...sortedRows].sort(
    (a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0),
  );

  for (const row of rowsToDelete) {
    await row.delete();
  }

  await writeProjectRegistryRowsAt(projectsSheet, 2, snapshot);
};

const appendProjectRegistryRows = async (projectsSheet, rowsData) => {
  if (!Array.isArray(rowsData) || rowsData.length === 0) {
    return;
  }

  await compactProjectsRegistryRows(projectsSheet);
  const rows = await getProjectRegistryRows(projectsSheet);
  const maxRowNumber = rows.reduce(
    (max, row) => Math.max(max, Number(row.rowNumber || 1)),
    1,
  );

  await writeProjectRegistryRowsAt(projectsSheet, maxRowNumber + 1, rowsData);
};

const parseTeamMembers = (teamNameValue) =>
  toText(teamNameValue)
    .split(/\n|,|;/)
    .map((name) => name.trim())
    .filter(Boolean);

const mapSheetToProject = (sheet, index) => ({
  id: sheet.sheetId || index + 1,
  sheetIndex: index + 1,
  projectName: sheet.title || `Proyecto ${index + 1}`,
  projectCode: `PRJ-${String(index + 1).padStart(3, '0')}`,
});

const mapReportToSheetRow = (reportData) => ({
  [headerOf('reportDate')]: toText(reportData.reportDate),
  [headerOf('sprintNumber')]: toText(reportData.sprintNumber),

  // Seccion 2: Estado general
  [headerOf('projectStatus')]: toText(reportData.projectStatus),
  [headerOf('weeklyMainProgress')]: toText(reportData.weeklyMainProgress),
  [headerOf('weeklyMainBlockers')]: toText(reportData.weeklyMainBlockers),
  [headerOf('pmGeneralEvaluation')]: toText(reportData.pmGeneralEvaluation),

  // Seccion 3: Avance del sprint
  [headerOf('sprintGoal')]: toText(reportData.sprintGoal),
  [headerOf('userStoriesTasks')]: toText(reportData.userStoriesTasks),
  [headerOf('sprintEstimatedProgress')]: toText(reportData.sprintEstimatedProgress),
  [headerOf('sprintEstimatedRemaining')]: toText(reportData.sprintEstimatedRemaining),

  // Seccion 4: Seguimiento diario
  [headerOf('weeklySummary')]: toText(reportData.weeklySummary),
  [headerOf('pmDailyObservations')]: toText(reportData.pmDailyObservations),

  // Seccion 5: Burn down chart
  [headerOf('burndownStatus')]: toText(reportData.burndownStatus),
  [headerOf('burndownInterpretation')]: toText(reportData.burndownInterpretation),
  [headerOf('burndownChartLink')]: toText(reportData.burndownChartLink),

  // Seccion 6: Riesgos y bloqueos
  [headerOf('risksAndBlockers')]: toText(reportData.risksAndBlockers),

  // Seccion 7: Gestion del equipo
  [headerOf('teamCommitmentLevel')]: toText(reportData.teamCommitmentLevel),
  [headerOf('communicationIssues')]: toText(reportData.communicationIssues),
  [headerOf('rolesCompliance')]: toText(reportData.rolesCompliance),
  [headerOf('pmTeamObservations')]: toText(reportData.pmTeamObservations),

  // Seccion 8: Proximos pasos
  [headerOf('nextWeekKeyTasks')]: toText(reportData.nextWeekKeyTasks),
  [headerOf('sprintPlanAdjustments')]: toText(reportData.sprintPlanAdjustments),
  [headerOf('requiredDecisions')]: toText(reportData.requiredDecisions),

  // Seccion 9: Alertas para el profesor
  [headerOf('professorAlerts')]: toText(reportData.professorAlerts),

  // Seccion 10: Evaluacion del PM
  [headerOf('agileMethodologyCompliance')]: toText(reportData.agileMethodologyCompliance),
  [headerOf('progressUpdateQuality')]: toText(reportData.progressUpdateQuality),
  [headerOf('pmImprovementPoints')]: toText(reportData.pmImprovementPoints),

  // Seccion 11: Anexos
  [headerOf('evidences')]: toText(reportData.evidences),
  [headerOf('additionalDetails')]: toText(reportData.additionalDetails),

  [headerOf('createdAt')]: toText(reportData.createdAt) || new Date().toISOString(),
});

const saveReport = async (req, res) => {
  try {
    const reportData = req.body;
    const doc = await loadSpreadsheetDoc();

    const projectSheetIndex = Number(reportData.projectSheetIndex);
    if (!Number.isInteger(projectSheetIndex) || projectSheetIndex < 1) {
      return res.status(400).json({
        success: false,
        message: 'El campo projectSheetIndex debe ser un numero entero mayor o igual a 1.',
      });
    }

    const sheet = getSheetByProjectIndex(doc, projectSheetIndex);
    if (!sheet || isProjectsSheet(sheet)) {
      return res.status(404).json({
        success: false,
        message: `No existe la hoja para projectSheetIndex=${projectSheetIndex}. Verifica cuantas hojas hay en el spreadsheet.`,
      });
    }

    await ensureSheetReadyForRows(sheet);

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

const createProjectSheet = async (req, res) => {
  try {
    const doc = await loadSpreadsheetDoc();
    const projectsSheet = await ensureProjectsSheetReady(doc);
    const projectSheets = doc.sheetsByIndex.filter((sheet) => !isProjectsSheet(sheet));
    const nextProjectNumber = projectSheets.length + 1;
    const defaultTitle = `Proyecto ${nextProjectNumber}`;
    const requestedName = toText(req.body?.projectName).trim();
    const title = requestedName || defaultTitle;

    if (isReservedProjectName(title)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre "Proyectos" esta reservado y no puede usarse para un proyecto.',
      });
    }

    const maybeCreatedSheet = await doc.addSheet({
      title,
      gridProperties: {
        columnCount: REPORT_HEADERS.length,
      },
      headerValues: REPORT_HEADERS,
    });

    // En algunas versiones de google-spreadsheet, addSheet puede no devolver
    // todas las propiedades esperadas inmediatamente. Recargamos info y resolvemos
    // la hoja creada por titulo como respaldo para evitar falsos 500.
    await doc.loadInfo();

    const createdSheet =
      maybeCreatedSheet ||
      doc.sheetsByTitle[title] ||
      doc.sheetsByIndex[doc.sheetCount - 1];

    if (!createdSheet) {
      throw new Error('La hoja fue creada pero no se pudo resolver su metadata.');
    }

    const sheetIndex = Number.isInteger(createdSheet.index)
      ? createdSheet.index + 1
      : doc.sheetsByIndex.findIndex((sheet) => sheet.sheetId === createdSheet.sheetId) + 1;

    const resolvedSheetIndex = sheetIndex > 0 ? sheetIndex : (Number(createdSheet.index) + 1 || 1);
    const projectCode = `PRJ-${String(resolvedSheetIndex).padStart(3, '0')}`;

    await appendProjectRegistryRows(projectsSheet, [
      buildProjectRegistryRow({
        projectSheetIndex: resolvedSheetIndex,
        projectName: title,
        projectCode,
        teamName: '',
        pmName: '',
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Hoja de proyecto creada correctamente.',
      project: {
        id: createdSheet.sheetId || Date.now(),
        sheetIndex: resolvedSheetIndex,
        projectName: title,
        projectCode,
      },
    });
  } catch (error) {
    console.error('Error al crear hoja de proyecto:', error);

    const maybePermissionError =
      error.message?.includes('The caller does not have permission') ||
      error.message?.includes('insufficient authentication scopes');

    res.status(500).json({
      success: false,
      message: maybePermissionError
        ? 'Error de permisos en Google Sheets. Comparte la hoja con el service account email y revisa scopes.'
        : 'Hubo un error al crear la hoja del proyecto',
      error: error.message,
    });
  }
};

const listProjectSheets = async (req, res) => {
  try {
    const doc = await loadSpreadsheetDoc();
    const projectsSheet = await ensureProjectsSheetReady(doc);
    await projectsSheet.loadHeaderRow();
    const registryRows = await projectsSheet.getRows();

    const groupedBySheetIndex = new Map();

    for (const row of registryRows) {
      const rawIndex = toText(row.get(projectHeaderOf('projectSheetIndex'))).trim();
      const sheetIndex = Number(rawIndex);

      if (!Number.isInteger(sheetIndex) || sheetIndex < 1) {
        continue;
      }

      if (!groupedBySheetIndex.has(sheetIndex)) {
        groupedBySheetIndex.set(sheetIndex, {
          projectName: '',
          projectCode: '',
          pmName: '',
          teamMembers: [],
        });
      }

      const project = groupedBySheetIndex.get(sheetIndex);
      const projectName = toText(row.get(projectHeaderOf('projectName'))).trim();
      const projectCode = toText(row.get(projectHeaderOf('projectCode'))).trim();
      const pmName = toText(row.get(projectHeaderOf('pmName'))).trim();
      const teamName = toText(row.get(projectHeaderOf('teamName'))).trim();

      if (projectName) {
        project.projectName = projectName;
      }
      if (projectCode) {
        project.projectCode = projectCode;
      }
      if (pmName) {
        project.pmName = pmName;
      }
      if (teamName) {
        project.teamMembers.push(teamName);
      }
    }

    const projects = [];
    for (const [sheetIndex, groupedProject] of [...groupedBySheetIndex.entries()].sort((a, b) => a[0] - b[0])) {
      const sheet = getSheetByProjectIndex(doc, sheetIndex);

      if (!sheet || isProjectsSheet(sheet)) {
        continue;
      }

      projects.push({
        id: sheet.sheetId || sheetIndex,
        sheetIndex,
        projectName: groupedProject.projectName || sheet.title || `Proyecto ${sheetIndex}`,
        projectCode: groupedProject.projectCode || `PRJ-${String(sheetIndex).padStart(3, '0')}`,
        teamName: groupedProject.teamMembers.join(', '),
        pmName: groupedProject.pmName,
      });
    }

    for (const sheet of doc.sheetsByIndex) {
      if (isProjectsSheet(sheet)) {
        continue;
      }

      await ensureSheetReadyForRows(sheet);

      const sheetIndex = Number(sheet.index) + 1;
      const alreadyIncluded = projects.some((project) => project.sheetIndex === sheetIndex);
      if (alreadyIncluded) {
        continue;
      }

      projects.push({
        id: sheet.sheetId || sheetIndex,
        sheetIndex,
        projectName: sheet.title || `Proyecto ${sheetIndex}`,
        projectCode: `PRJ-${String(sheetIndex).padStart(3, '0')}`,
        teamName: '',
        pmName: '',
      });
    }

    projects.sort((a, b) => a.sheetIndex - b.sheetIndex);

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error('Error al listar hojas de proyecto:', error);

    const maybePermissionError =
      error.message?.includes('The caller does not have permission') ||
      error.message?.includes('insufficient authentication scopes');

    res.status(500).json({
      success: false,
      message: maybePermissionError
        ? 'Error de permisos en Google Sheets. Comparte la hoja con el service account email y revisa scopes.'
        : 'Hubo un error al listar las hojas del proyecto',
      error: error.message,
    });
  }
};

const updateProjectGeneralInfo = async (req, res) => {
  try {
    const doc = await loadSpreadsheetDoc();
    const projectsSheet = await ensureProjectsSheetReady(doc);
    const projectSheetIndex = Number(req.params.projectSheetIndex);
    const sheet = getSheetByProjectIndex(doc, projectSheetIndex);

    if (!sheet || isProjectsSheet(sheet)) {
      return res.status(404).json({
        success: false,
        message: `No existe la hoja para projectSheetIndex=${projectSheetIndex}.`,
      });
    }

    await ensureSheetReadyForRows(sheet);

    const payload = {
      projectSheetIndex,
      projectName: toText(req.body?.projectName).trim(),
      projectCode: toText(req.body?.projectCode).trim(),
      teamName: toText(req.body?.teamName).trim(),
      pmName: toText(req.body?.pmName).trim(),
    };

    if (isReservedProjectName(payload.projectName)) {
      return res.status(400).json({
        success: false,
        message: 'El nombre "Proyectos" esta reservado y no puede usarse para un proyecto.',
      });
    }

    const normalizedTeamMembers = parseTeamMembers(payload.teamName);

    await projectsSheet.loadHeaderRow();
    const projectRows = await projectsSheet.getRows();
    const rowsForProject = projectRows.filter((row) =>
      Number(toText(row.get(projectHeaderOf('projectSheetIndex'))).trim()) === projectSheetIndex,
    );

    let workingRows = [...rowsForProject].sort(
      (a, b) => Number(a.rowNumber || 0) - Number(b.rowNumber || 0),
    );

    const targetRowCount = Math.max(normalizedTeamMembers.length, 1);

    if (workingRows.length < targetRowCount) {
      const missingRows = targetRowCount - workingRows.length;
      await appendProjectRegistryRows(
        projectsSheet,
        Array.from({ length: missingRows }).map(() =>
          buildProjectRegistryRow({
            projectSheetIndex,
            projectName: payload.projectName,
            projectCode: payload.projectCode,
            teamName: '',
            pmName: payload.pmName,
          }),
        ),
      );

      const refreshedRows = await getProjectRegistryRows(projectsSheet);
      workingRows = refreshedRows
        .filter((row) =>
          Number(toText(row.get(projectHeaderOf('projectSheetIndex'))).trim()) === projectSheetIndex,
        )
        .sort((a, b) => Number(a.rowNumber || 0) - Number(b.rowNumber || 0));
    }

    if (workingRows.length > targetRowCount) {
      const rowsToDelete = [...workingRows.slice(targetRowCount)].sort(
        (a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0),
      );

      for (const row of rowsToDelete) {
        await row.delete();
      }

      workingRows = workingRows.slice(0, targetRowCount);
    }

    if (normalizedTeamMembers.length > 0) {
      for (let index = 0; index < normalizedTeamMembers.length; index += 1) {
        const row = workingRows[index];
        const updatedRowData = buildProjectRegistryRow({
          projectSheetIndex,
          projectName: payload.projectName,
          projectCode: payload.projectCode,
          teamName: normalizedTeamMembers[index],
          pmName: payload.pmName,
        });

        await writeProjectRegistryRowAtRowNumber(
          projectsSheet,
          Number(row.rowNumber || 0),
          updatedRowData,
        );
      }
    } else {
      const row = workingRows[0];
      const updatedRowData = buildProjectRegistryRow({
        projectSheetIndex,
        projectName: payload.projectName,
        projectCode: payload.projectCode,
        teamName: '',
        pmName: payload.pmName,
      });

      await writeProjectRegistryRowAtRowNumber(
        projectsSheet,
        Number(row.rowNumber || 0),
        updatedRowData,
      );
    }

    if (payload.projectName && payload.projectName !== sheet.title) {
      await sheet.updateProperties({ title: payload.projectName });
      await doc.loadInfo();
    }

    return res.status(200).json({
      success: true,
      message: 'Informacion general del proyecto guardada en Google Sheets.',
      project: {
        id: sheet.sheetId || projectSheetIndex,
        sheetIndex: projectSheetIndex,
        projectName: payload.projectName || sheet.title,
        projectCode: payload.projectCode || `PRJ-${String(projectSheetIndex).padStart(3, '0')}`,
        teamName: payload.teamName,
        pmName: payload.pmName,
      },
    });
  } catch (error) {
    console.error('Error al actualizar informacion general del proyecto:', error);

    const maybePermissionError =
      error.message?.includes('The caller does not have permission') ||
      error.message?.includes('insufficient authentication scopes');

    return res.status(500).json({
      success: false,
      message: maybePermissionError
        ? 'Error de permisos en Google Sheets. Comparte la hoja con el service account email y revisa scopes.'
        : 'Hubo un error al actualizar la informacion general del proyecto',
      error: error.message,
    });
  }
};

module.exports = {
  saveReport,
  createProjectSheet,
  listProjectSheets,
  updateProjectGeneralInfo,
};