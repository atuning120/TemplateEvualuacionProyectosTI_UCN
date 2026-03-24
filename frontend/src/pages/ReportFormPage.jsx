import { useMemo, useState } from 'react';
import SectionCard from '../components/SectionCard/SectionCard';
import './ReportFormPage.css';

const initialForm = {
  // Seccion 2
  projectStatus: 'en tiempo',
  weeklyMainProgress: '',
  weeklyMainBlockers: '',
  pmGeneralEvaluation: '',

  // Seccion 3
  sprintGoal: '',
  userStoriesTasks: '',
  sprintEstimatedProgress: '',
  sprintEstimatedRemaining: '',

  // Seccion 4
  weeklySummary: '',
  pmDailyObservations: '',

  // Seccion 5
  burndownStatus: 'correcto',
  burndownInterpretation: '',
  burndownChartLink: '',

  // Seccion 6
  risksAndBlockers: '',

  // Seccion 7
  teamCommitmentLevel: '',
  communicationIssues: '',
  rolesCompliance: '',
  pmTeamObservations: '',

  // Seccion 8
  nextWeekKeyTasks: '',
  sprintPlanAdjustments: '',
  requiredDecisions: '',

  // Seccion 9
  professorAlerts: '',

  // Seccion 10
  agileMethodologyCompliance: '',
  progressUpdateQuality: '',
  pmImprovementPoints: '',

  // Seccion 11
  evidences: '',
  additionalDetails: '',
};

const buildProjectCode = (sheetIndex) => `PRJ-${String(sheetIndex).padStart(3, '0')}`;

const createProject = (id, sheetIndex) => ({
  id,
  sheetIndex,
  projectName: `Proyecto ${sheetIndex}`,
  projectCode: buildProjectCode(sheetIndex),
  teamName: '',
  pmName: '',
});

const ReportFormPage = () => {
  const [formData, setFormData] = useState(initialForm);
  const [projects, setProjects] = useState([createProject(1, 1)]);
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [isEditingGeneralInfo, setIsEditingGeneralInfo] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const apiUrl = useMemo(() => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001/api/reports';
  }, []);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectSelection = (event) => {
    setSelectedProjectId(Number(event.target.value));
  };

  const handleCreateProject = () => {
    let nextProjectId = null;

    setProjects((prev) => {
      const lastProjectId = prev.reduce((maxId, project) => Math.max(maxId, project.id), 0);
      const lastSheetIndex = prev.reduce((maxIndex, project) => Math.max(maxIndex, project.sheetIndex), 0);

      const newProject = createProject(lastProjectId + 1, lastSheetIndex + 1);
      nextProjectId = newProject.id;

      return [...prev, newProject];
    });

    if (nextProjectId !== null) {
      setSelectedProjectId(nextProjectId);
      setIsEditingGeneralInfo(true);
    }
  };

  const handleProjectFieldChange = (event) => {
    const { name, value } = event.target;

    if (name === 'projectCode') {
      return;
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === selectedProjectId ? { ...project, [name]: value } : project,
      ),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedProject) {
      setFeedback({
        type: 'error',
        message: 'Debes seleccionar un proyecto antes de enviar el reporte.',
      });
      return;
    }

    if (!selectedProject.projectName || !selectedProject.teamName || !selectedProject.pmName) {
      setFeedback({
        type: 'error',
        message: 'Completa la informacion general del proyecto (nombre, equipo y PM) para continuar.',
      });
      return;
    }

    setSending(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          projectSheetIndex: selectedProject.sheetIndex,
          projectName: selectedProject.projectName,
          projectCode: selectedProject.projectCode,
          teamName: selectedProject.teamName,
          pmName: selectedProject.pmName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el reporte.');
      }

      setFeedback({
        type: 'success',
        message: `Reporte guardado correctamente en la hoja: ${data.sheetTitle || 'N/A'}`,
      });
      setFormData(initialForm);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Error inesperado al enviar el reporte.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page">
      <div className="bg-shape bg-shape-one" />
      <div className="bg-shape bg-shape-two" />

      <header className="header">
        <p className="eyebrow">Plantilla UCN</p>
        <h1>Reporte Semanal de Proyecto (PM)</h1>
        <p>
          Selecciona un proyecto desde la barra superior. Cada proyecto se guarda en su hoja
          correspondiente de Google Sheets.
        </p>
      </header>

      <nav className="project-navbar" aria-label="Seleccion de proyecto">
        <div className="project-navbar-main">
          <label className="field project-selector-field">
            <span>Proyecto activo</span>
            <select value={selectedProjectId} onChange={handleProjectSelection}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName} ({project.projectCode})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-btn" onClick={handleCreateProject}>
            Crear proyecto
          </button>
        </div>

        {selectedProject && (
          <p className="project-navbar-meta">
            Hoja destino: {selectedProject.sheetIndex} | Codigo: {selectedProject.projectCode}
          </p>
        )}
      </nav>

      <form className="report-form" onSubmit={handleSubmit}>
        <SectionCard number="0" title="Proyecto seleccionado">
          <div className="field-grid two-col">
            <label className="field">
              <span>Numero de hoja en Google Sheets</span>
              <input
                type="number"
                value={selectedProject?.sheetIndex ?? ''}
                disabled
                readOnly
              />
            </label>
            <label className="field">
              <span>Codigo / Identificador</span>
              <input type="text" value={selectedProject?.projectCode ?? ''} disabled readOnly />
            </label>
          </div>

          <div className="general-edit-wrap">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setIsEditingGeneralInfo((prev) => !prev)}
            >
              {isEditingGeneralInfo ? 'Ocultar edicion de informacion general' : 'Editar informacion general del proyecto'}
            </button>
          </div>
        </SectionCard>

        {isEditingGeneralInfo && selectedProject && (
          <SectionCard number="1" title="Información General">
            <div className="field-grid two-col">
              <label className="field">
                <span>Nombre del proyecto</span>
                <input
                  type="text"
                  name="projectName"
                  value={selectedProject.projectName}
                  onChange={handleProjectFieldChange}
                  required
                />
              </label>
              <label className="field">
                <span>Codigo / Identificador (autogenerado)</span>
                <input
                  type="text"
                  name="projectCode"
                  value={selectedProject.projectCode}
                  disabled
                  readOnly
                />
              </label>
              <label className="field">
                <span>Equipo responsable</span>
                <input
                  type="text"
                  name="teamName"
                  value={selectedProject.teamName}
                  onChange={handleProjectFieldChange}
                  required
                />
              </label>
              <label className="field">
                <span>Project Manager (PM)</span>
                <input
                  type="text"
                  name="pmName"
                  value={selectedProject.pmName}
                  onChange={handleProjectFieldChange}
                  required
                />
              </label>
            </div>
          </SectionCard>
        )}

        <SectionCard number="2" title="Estado General del Proyecto">
          <div className="field-grid">
            <label className="field">
              <span>Estado general del proyecto</span>
              <select name="projectStatus" value={formData.projectStatus} onChange={handleChange}>
                <option value="en tiempo">En tiempo</option>
                <option value="en riesgo">En riesgo</option>
              </select>
            </label>
            <label className="field">
              <span>Principales avances de la semana</span>
              <textarea name="weeklyMainProgress" value={formData.weeklyMainProgress} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Principales problemas o bloqueos</span>
              <textarea name="weeklyMainBlockers" value={formData.weeklyMainBlockers} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Evaluacion general del PM</span>
              <textarea name="pmGeneralEvaluation" value={formData.pmGeneralEvaluation} onChange={handleChange} rows="4" />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="3" title="Avance del Sprint">
          <div className="field-grid">
            <label className="field">
              <span>3.1 Objetivo del sprint</span>
              <textarea name="sprintGoal" value={formData.sprintGoal} onChange={handleChange} rows="3" />
            </label>
            <label className="field">
              <span>3.2 Historias de usuario / tareas</span>
              <textarea
                name="userStoriesTasks"
                value={formData.userStoriesTasks}
                onChange={handleChange}
                rows="5"
                placeholder="Puedes pegar una tabla corta en texto: ID | Descripcion | Responsable | Estado | %Completado | %Restante | Observaciones"
              />
            </label>
            <div className="field-grid two-col">
              <label className="field">
                <span>3.3 % avance total estimado</span>
                <input type="number" min="0" max="100" name="sprintEstimatedProgress" value={formData.sprintEstimatedProgress} onChange={handleChange} />
              </label>
              <label className="field">
                <span>3.3 % restante estimado</span>
                <input type="number" min="0" max="100" name="sprintEstimatedRemaining" value={formData.sprintEstimatedRemaining} onChange={handleChange} />
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard number="4" title="Seguimiento Diario (Daily Meetings)">
          <div className="field-grid">
            <label className="field">
              <span>Resumen de la semana</span>
              <textarea
                name="weeklySummary"
                value={formData.weeklySummary}
                onChange={handleChange}
                rows="5"
                placeholder="Puedes incluir: Dia | Que se hizo | Que se hara | Bloqueos | % restante tareas clave"
              />
            </label>
            <label className="field">
              <span>Observaciones del PM</span>
              <textarea name="pmDailyObservations" value={formData.pmDailyObservations} onChange={handleChange} rows="4" />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="5" title="Burn Down Chart">
          <div className="field-grid">
            <label className="field">
              <span>Estado del burn down</span>
              <select name="burndownStatus" value={formData.burndownStatus} onChange={handleChange}>
                <option value="correcto">Correcto</option>
                <option value="atrasado">Atrasado</option>
                <option value="adelantado">Adelantado</option>
              </select>
            </label>
            <label className="field">
              <span>Interpretacion</span>
              <textarea name="burndownInterpretation" value={formData.burndownInterpretation} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Grafico (URL de imagen/enlace)</span>
              <input type="url" name="burndownChartLink" value={formData.burndownChartLink} onChange={handleChange} placeholder="https://..." />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="6" title="Riesgos y Bloqueos">
          <label className="field">
            <span>Detalle de riesgos (ID, descripcion, impacto, probabilidad, mitigacion)</span>
            <textarea
              name="risksAndBlockers"
              value={formData.risksAndBlockers}
              onChange={handleChange}
              rows="6"
            />
          </label>
        </SectionCard>

        <SectionCard number="7" title="Gestion del Equipo">
          <div className="field-grid">
            <label className="field">
              <span>Nivel de compromiso del equipo</span>
              <input type="text" name="teamCommitmentLevel" value={formData.teamCommitmentLevel} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Problemas de comunicacion</span>
              <textarea name="communicationIssues" value={formData.communicationIssues} onChange={handleChange} rows="3" />
            </label>
            <label className="field">
              <span>Cumplimiento de roles</span>
              <textarea name="rolesCompliance" value={formData.rolesCompliance} onChange={handleChange} rows="3" />
            </label>
            <label className="field">
              <span>Observaciones del PM</span>
              <textarea name="pmTeamObservations" value={formData.pmTeamObservations} onChange={handleChange} rows="3" />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="8" title="Proximos Pasos">
          <div className="field-grid">
            <label className="field">
              <span>Tareas clave para la siguiente semana</span>
              <textarea name="nextWeekKeyTasks" value={formData.nextWeekKeyTasks} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Ajustes al plan del sprint</span>
              <textarea name="sprintPlanAdjustments" value={formData.sprintPlanAdjustments} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Decisiones requeridas</span>
              <textarea name="requiredDecisions" value={formData.requiredDecisions} onChange={handleChange} rows="4" />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="9" title="Alertas para el Profesor (Solo si aplica)">
          <label className="field">
            <span>Problemas criticos o desviaciones importantes</span>
            <textarea name="professorAlerts" value={formData.professorAlerts} onChange={handleChange} rows="5" />
          </label>
        </SectionCard>

        <SectionCard number="10" title="Evaluacion del PM">
          <div className="field-grid">
            <label className="field">
              <span>¿El equipo cumple la metodologia agil?</span>
              <textarea
                name="agileMethodologyCompliance"
                value={formData.agileMethodologyCompliance}
                onChange={handleChange}
                rows="3"
              />
            </label>
            <label className="field">
              <span>¿Se actualizan correctamente los avances?</span>
              <textarea name="progressUpdateQuality" value={formData.progressUpdateQuality} onChange={handleChange} rows="3" />
            </label>
            <label className="field">
              <span>¿Que mejoraria como PM?</span>
              <textarea name="pmImprovementPoints" value={formData.pmImprovementPoints} onChange={handleChange} rows="3" />
            </label>
          </div>
        </SectionCard>

        <SectionCard number="11" title="Anexos (Opcional)">
          <div className="field-grid">
            <label className="field">
              <span>Evidencias (capturas, enlaces, repositorios)</span>
              <textarea name="evidences" value={formData.evidences} onChange={handleChange} rows="4" />
            </label>
            <label className="field">
              <span>Detalles adicionales</span>
              <textarea name="additionalDetails" value={formData.additionalDetails} onChange={handleChange} rows="4" />
            </label>
          </div>
        </SectionCard>

        {feedback.message && (
          <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
        )}

        <div className="submit-wrap">
          <button className="submit-btn" type="submit" disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </main>
  );
};

export default ReportFormPage;