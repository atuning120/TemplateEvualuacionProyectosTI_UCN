# TemplateEvualuacionProyectosTI_UCN

Este proyecto permite registrar reportes semanales de proyectos TI desde un formulario React y guardarlos en Google Sheets desde un backend con Express.

## Objetivo de la integracion

- El frontend envia el reporte al backend.
- El backend autentica con una cuenta de servicio de Google.
- Cada proyecto se guarda en una hoja distinta del mismo Spreadsheet:
	- Proyecto 1 -> Hoja 1
	- Proyecto 2 -> Hoja 2
	- Proyecto 3 -> Hoja 3
	- etc.

La hoja destino se define con el campo `projectSheetIndex` del formulario.

---

## 1. Configuracion en Google Cloud (credenciales)

### 1.1 Crear o usar un proyecto en Google Cloud

1. Abre Google Cloud Console.
2. Crea un proyecto o selecciona uno existente.

### 1.2 Habilitar APIs necesarias

Habilita al menos:

- Google Sheets API
- Google Drive API (recomendado para evitar problemas de acceso)

### 1.3 Crear cuenta de servicio

1. Ve a IAM y administracion -> Cuentas de servicio.
2. Crea una cuenta de servicio.
3. Crea una clave de tipo JSON y descargala.

Del JSON vas a necesitar:

- `client_email`
- `private_key`

### 1.4 Compartir el Spreadsheet con la cuenta de servicio

1. Abre tu Google Sheet.
2. Haz clic en Compartir.
3. Agrega el correo `client_email` de la cuenta de servicio.
4. Dale permiso de Editor.

Si no compartes la hoja con ese correo, el backend devolvera error de permisos.

---

## 2. Configuracion del Google Sheet

### 2.1 Crear hojas por proyecto

Debes tener suficientes hojas en el mismo Spreadsheet:

- Hoja 1 para proyecto 1
- Hoja 2 para proyecto 2
- Hoja 3 para proyecto 3
- etc.

### 2.2 Encabezados obligatorios (fila 1 de cada hoja)

Los encabezados deben existir y escribirse exactamente igual para que `addRow` funcione correctamente:

```text
projectSheetIndex,projectName,projectCode,teamName,pmName,reportDate,sprintNumber,projectStatus,weeklyMainProgress,weeklyMainBlockers,pmGeneralEvaluation,sprintGoal,userStoriesTasks,sprintEstimatedProgress,sprintEstimatedRemaining,weeklySummary,pmDailyObservations,burndownStatus,burndownInterpretation,burndownChartLink,risksAndBlockers,teamCommitmentLevel,communicationIssues,rolesCompliance,pmTeamObservations,nextWeekKeyTasks,sprintPlanAdjustments,requiredDecisions,professorAlerts,agileMethodologyCompliance,progressUpdateQuality,pmImprovementPoints,evidences,additionalDetails,createdAt
```

Repite esta misma fila de encabezados en todas las hojas (Hoja 1, Hoja 2, ...).

---

## 3. Variables de entorno (.env)

El backend lee variables desde el archivo `.env` en la raiz del repositorio.

### 3.1 Plantilla recomendada

```env
# ==========================================
# VARIABLES DEL BACKEND (Express)
# ==========================================
PORT=3001
SPREADSHEET_ID="TU_SPREADSHEET_ID_REAL"
GOOGLE_SERVICE_ACCOUNT_EMAIL="tu-cuenta-servicio@tu-proyecto.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"

# ==========================================
# VARIABLES DEL FRONTEND (Vite / React)
# ==========================================
VITE_API_URL="http://localhost:3001/api/reports"
```

### 3.2 Importante sobre GOOGLE_PRIVATE_KEY

La clave privada debe quedar en una sola linea en el `.env`, usando `\\n` para los saltos de linea.

Correcto:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

Incorrecto (multilinea real en `.env`):

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIE...
-----END PRIVATE KEY-----
"
```

---

## 4. Frontend y variable VITE_API_URL

El frontend ya tiene fallback a `http://localhost:3001/api/reports` si `VITE_API_URL` no existe.

Aun asi, para entornos formales se recomienda definir `VITE_API_URL` en un `.env` dentro de la carpeta `frontend`.

Ejemplo opcional en `frontend/.env`:

```env
VITE_API_URL="http://localhost:3001/api/reports"
```

---

## 5. Ejecucion local

### 5.1 Backend

```bash
cd backend
npm install
npm run dev
```

### 5.2 Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## 6. Verificacion rapida

1. Abre el formulario en frontend.
2. Ingresa `projectSheetIndex = 1`.
3. Completa campos y envia.
4. Revisa Hoja 1 del Spreadsheet.

Si usas `projectSheetIndex = 2`, el registro debe llegar a Hoja 2.

---

## 7. Errores comunes y solucion

### Error: Faltan variables de entorno

Revisa que existan en `.env`:

- `SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### Error de permisos (The caller does not have permission)

- Comparte el Spreadsheet con el correo de la cuenta de servicio.
- Verifica que tenga permiso de Editor.
- Verifica que la API de Google Sheets este habilitada.

### Error de hoja inexistente

Si envias `projectSheetIndex = N`, debe existir la hoja N en el Spreadsheet.

### No se ven datos en columnas correctas

Verifica que los encabezados de la fila 1 coincidan exactamente con los nombres definidos en el backend.
