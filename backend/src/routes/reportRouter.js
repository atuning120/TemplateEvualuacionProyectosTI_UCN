const express = require('express');
const router = express.Router();
const { saveReport } = require('../controllers/reportController');

// Endpoint para recibir un nuevo reporte desde el frontend
router.post('/', saveReport);

module.exports = router;