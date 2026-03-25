const express = require('express');
const router = express.Router();
const {
	saveReport,
	createProjectSheet,
	listProjectSheets,
	updateProjectGeneralInfo,
} = require('../controllers/reportController');

// Endpoint para recibir un nuevo reporte desde el frontend
router.get('/projects', listProjectSheets);
router.post('/', saveReport);
router.post('/projects', createProjectSheet);
router.patch('/projects/:projectSheetIndex', updateProjectGeneralInfo);

module.exports = router;