const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const reportRouter = require('./routes/reportRouter');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/reports', reportRouter);

// Ruta de prueba para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('API del Template de Reportes Semanales (PM) funcionando correctamente.');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});