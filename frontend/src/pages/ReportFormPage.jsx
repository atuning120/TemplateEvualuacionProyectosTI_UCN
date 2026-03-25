import { useEffect, useMemo, useState } from 'react';
import SectionCard from '../components/SectionCard/SectionCard';
import CustomDropdown from '../components/CustomDropdown/CustomDropdown';
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

const toSafeText = (value) => (value === undefined || value === null ? '' : String(value));

const normalizeProject = (project) => ({
  ...project,
  projectName: toSafeText(project?.projectName),
  projectCode: toSafeText(project?.projectCode),
  teamName: toSafeText(project?.teamName),
  pmName: toSafeText(project?.pmName),
});

const parseTeamMembers = (teamName) =>
  toSafeText(teamName)
    .split(/\n|,|;/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: `${Date.now()}-${Math.random()}`,
      name,
      isNew: false,
      isEditing: false,
    }));

const serializeTeamMembers = (members) =>
  members
    .map((member) => toSafeText(member.name).trim())
    .filter(Boolean)
    .join(', ');

const ReportFormPage = () => {
  const [formData, setFormData] = useState(initialForm);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isEditingGeneralInfo, setIsEditingGeneralInfo] = useState(false);
  const [generalInfoDraft, setGeneralInfoDraft] = useState(null);
  const [generalInfoTouched, setGeneralInfoTouched] = useState(false);
  const [teamMembersDraft, setTeamMembersDraft] = useState([]);
  const [isEditingTeamMembers, setIsEditingTeamMembers] = useState(false);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');
  const [savingGeneralInfo, setSavingGeneralInfo] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const apiUrl = useMemo(() => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001/api/reports';
  }, []);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const confirmedTeamMembers = useMemo(
    () =>
      teamMembersDraft.filter(
        (member) => !member.isEditing && toSafeText(member.name).trim().length > 0,
      ),
    [teamMembersDraft],
  );

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);

      try {
        const response = await fetch(`${apiUrl}/projects`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar la lista de proyectos.');
        }

        const loadedProjects = Array.isArray(data.projects)
          ? data.projects.map((project) => normalizeProject(project))
          : [];

        setProjects(loadedProjects);
        setSelectedProjectId(loadedProjects[0]?.id ?? null);
      } catch (error) {
        setProjects([]);
        setSelectedProjectId(null);
        setFeedback({
          type: 'error',
          message: error.message || 'No se pudieron cargar los proyectos.',
        });
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [apiUrl]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectSelection = (event) => {
    if (isEditingGeneralInfo) {
      setIsEditingGeneralInfo(false);
      setGeneralInfoDraft(null);
      setGeneralInfoTouched(false);
      setTeamMembersDraft([]);
      setIsEditingTeamMembers(false);
      setSelectedTeamMemberId('');
    }

    setSelectedProjectId(Number(event.target.value));
  };

  const handleStartGeneralInfoEdit = () => {
    if (!selectedProject) {
      return;
    }

    setGeneralInfoDraft({
      projectName: toSafeText(selectedProject.projectName),
      projectCode: toSafeText(selectedProject.projectCode),
      teamName: toSafeText(selectedProject.teamName),
      pmName: toSafeText(selectedProject.pmName),
    });

    const members = parseTeamMembers(selectedProject.teamName);
    setTeamMembersDraft(members);
    setSelectedTeamMemberId(members[0]?.id || '');
    setIsEditingTeamMembers(false);
    setGeneralInfoTouched(false);
    setIsEditingGeneralInfo(true);
  };

  const handleCancelGeneralInfoEdit = () => {
    setIsEditingGeneralInfo(false);
    setGeneralInfoDraft(null);
    setGeneralInfoTouched(false);
    setTeamMembersDraft([]);
    setIsEditingTeamMembers(false);
    setSelectedTeamMemberId('');
  };

  const handleToggleTeamMembersEdit = (event) => {
    setIsEditingTeamMembers(event.target.checked);
  };

  const handleTeamMemberSelection = (memberIdOrEvent) => {
    const nextMemberId =
      typeof memberIdOrEvent === 'string'
        ? memberIdOrEvent
        : memberIdOrEvent?.target?.value || '';

    setSelectedTeamMemberId(nextMemberId);
  };

  const handleAddTeamMember = () => {
    const newMember = {
      id: `${Date.now()}-${Math.random()}`,
      name: '',
      isNew: true,
      isEditing: true,
    };

    setTeamMembersDraft((prev) => [...prev, newMember]);
    setSelectedTeamMemberId(newMember.id);
    setGeneralInfoTouched(true);
  };

  const handleSelectedTeamMemberNameChange = (memberIdOrEvent, nextValue) => {
    const memberId =
      typeof memberIdOrEvent === 'string'
        ? memberIdOrEvent
        : selectedTeamMemberId;
    const value =
      typeof memberIdOrEvent === 'string'
        ? nextValue
        : memberIdOrEvent?.target?.value || '';

    if (!memberId) {
      return;
    }

    setTeamMembersDraft((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, name: value } : member,
      ),
    );
    setGeneralInfoTouched(true);
  };

  const handleConfirmTeamMemberName = (memberId = selectedTeamMemberId) => {
    if (!memberId) {
      return;
    }

    const selectedMember = teamMembersDraft.find((member) => member.id === memberId);
    const trimmedName = toSafeText(selectedMember?.name).trim();

    if (!trimmedName) {
      setFeedback({
        type: 'error',
        message: 'Debes escribir un nombre de integrante para confirmar.',
      });
      return;
    }

    setTeamMembersDraft((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, name: trimmedName, isNew: false, isEditing: false }
          : member,
      ),
    );
    setSelectedTeamMemberId(memberId);
    setGeneralInfoTouched(true);
  };

  const handleEditTeamMemberName = (memberId) => {
    if (!memberId) {
      return;
    }

    setTeamMembersDraft((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, isEditing: true } : member,
      ),
    );
    setSelectedTeamMemberId(memberId);
  };

  const handleDeleteSelectedTeamMember = (memberId = selectedTeamMemberId) => {
    if (!memberId) {
      return;
    }

    setTeamMembersDraft((prev) => {
      const updatedMembers = prev.filter((member) => member.id !== memberId);
      setSelectedTeamMemberId(updatedMembers[0]?.id || '');
      return updatedMembers;
    });
    setGeneralInfoTouched(true);
  };

  const handleSaveGeneralInfoEdit = async () => {
    if (!selectedProject || !generalInfoDraft) {
      return;
    }

    if (savingGeneralInfo) {
      return;
    }

    const normalizedProjectName = toSafeText(generalInfoDraft.projectName).trim();
    if (normalizedProjectName.toLowerCase() === 'proyectos') {
      setFeedback({
        type: 'error',
        message: 'El nombre "Proyectos" esta reservado y no se puede usar para un proyecto.',
      });
      return;
    }

    const pendingMembers = teamMembersDraft.filter(
      (member) => member.isEditing || !toSafeText(member.name).trim(),
    );

    if (pendingMembers.length > 0) {
      setFeedback({
        type: 'error',
        message: 'Tienes integrantes sin confirmar. Usa el ticket para confirmar o elimina esos registros antes de guardar.',
      });
      return;
    }

    const payload = {
      projectName: normalizedProjectName,
      projectCode: toSafeText(generalInfoDraft.projectCode).trim(),
      teamName: serializeTeamMembers(confirmedTeamMembers),
      pmName: toSafeText(generalInfoDraft.pmName).trim(),
    };

    setSavingGeneralInfo(true);

    try {
      const response = await fetch(`${apiUrl}/projects/${selectedProject.sheetIndex}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data?.project) {
        throw new Error(data.message || 'No se pudo guardar la informacion general en Google Sheets.');
      }

      const updatedProject = normalizeProject({
        ...selectedProject,
        ...data.project,
      });

      setProjects((prev) =>
        prev.map((project) =>
          project.id === selectedProjectId ? updatedProject : project,
        ),
      );

      setSelectedProjectId(updatedProject.id);
      setIsEditingGeneralInfo(false);
      setGeneralInfoDraft(null);
      setGeneralInfoTouched(false);
      setTeamMembersDraft([]);
      setIsEditingTeamMembers(false);
      setSelectedTeamMemberId('');
      setFeedback({
        type: 'success',
        message: data.message || 'Informacion general del proyecto guardada correctamente.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo guardar la informacion general del proyecto.',
      });
    } finally {
      setSavingGeneralInfo(false);
    }
  };

  const handleCreateProject = async () => {
    if (creatingProject) {
      return;
    }

    setCreatingProject(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data?.project) {
        throw new Error(data.message || 'No se pudo crear la hoja del proyecto en Google Sheets.');
      }

      const createdProject = {
        id: data.project.id,
        sheetIndex: data.project.sheetIndex,
        projectName: data.project.projectName,
        projectCode: data.project.projectCode,
        teamName: '',
        pmName: '',
      };
      const normalizedCreatedProject = normalizeProject(createdProject);

      setProjects((prev) => {
        const alreadyExists = prev.some((project) => project.id === normalizedCreatedProject.id);

        if (alreadyExists) {
          return prev.map((project) => (project.id === normalizedCreatedProject.id ? normalizedCreatedProject : project));
        }

        return [...prev, normalizedCreatedProject];
      });
      setSelectedProjectId(normalizedCreatedProject.id);
      setGeneralInfoDraft({
        projectName: normalizedCreatedProject.projectName,
        projectCode: normalizedCreatedProject.projectCode,
        teamName: normalizedCreatedProject.teamName,
        pmName: normalizedCreatedProject.pmName,
      });
      setTeamMembersDraft([]);
      setIsEditingTeamMembers(true);
      setSelectedTeamMemberId('');
      setGeneralInfoTouched(false);
      setIsEditingGeneralInfo(true);
      setFeedback({
        type: 'success',
        message: `Proyecto creado. Nueva hoja: ${normalizedCreatedProject.projectName} (indice ${normalizedCreatedProject.sheetIndex}).`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo crear el proyecto.',
      });
    } finally {
      setCreatingProject(false);
    }
  };

  const handleProjectFieldChange = (event) => {
    const { name, value } = event.target;

    if (name === 'projectCode' || name === 'teamName') {
      return;
    }

    setGeneralInfoDraft((prev) => ({
      ...prev,
      [name]: value,
    }));
    setGeneralInfoTouched(true);
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
            <select
              value={selectedProjectId ?? ''}
              onChange={handleProjectSelection}
              disabled={loadingProjects || projects.length === 0}
            >
              {loadingProjects && <option value="">Cargando proyectos...</option>}
              {!loadingProjects && projects.length === 0 && <option value="">Sin proyectos</option>}
              {!loadingProjects && projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName} ({project.projectCode})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleCreateProject}
            disabled={creatingProject || loadingProjects}
          >
            {creatingProject ? 'Creando proyecto...' : 'Crear proyecto'}
          </button>
        </div>

        {selectedProject && (
          <p className="project-navbar-meta">
            Hoja destino: {selectedProject.sheetIndex} | Codigo: {selectedProject.projectCode}
          </p>
        )}
      </nav>

      <form className="report-form" onSubmit={handleSubmit}>
        {!loadingProjects && projects.length === 0 && (
          <p className="feedback">No hay proyectos en Google Sheets. Crea un proyecto para habilitar el formulario de reporte.</p>
        )}

        {projects.length > 0 && (
          <>
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
              onClick={isEditingGeneralInfo ? handleCancelGeneralInfoEdit : handleStartGeneralInfoEdit}
            >
              {isEditingGeneralInfo ? 'Ocultar edicion de informacion general' : 'Editar informacion general del proyecto'}
            </button>
          </div>
            </SectionCard>

            {isEditingGeneralInfo && selectedProject && generalInfoDraft && (
              <SectionCard number="1" title="Información General">
            <div className="field-grid general-info-grid">
              <label className="field general-info-project">
                <span>Nombre del proyecto</span>
                <input
                  type="text"
                  name="projectName"
                  value={generalInfoDraft.projectName}
                  onChange={handleProjectFieldChange}
                  required
                />
              </label>
              <label className="field general-info-code">
                <span>Codigo / Identificador (autogenerado)</span>
                <input
                  type="text"
                  name="projectCode"
                  value={generalInfoDraft.projectCode}
                  disabled
                  readOnly
                />
              </label>
              <label className="field general-info-team">
                <span>Integrantes del equipo responsable</span>
                {!isEditingTeamMembers ? (
                  <div className="team-members-text-list">
                    <p className="team-members-title">Integrantes del equipo:</p>
                    {confirmedTeamMembers.length === 0 ? (
                      <p>Este proyecto no tiene integrantes confirmados en el equipo.</p>
                    ) : (
                      <ul
                        className={`team-members-bullet-list ${confirmedTeamMembers.length > 3 ? 'scrollable' : ''}`}
                      >
                        {confirmedTeamMembers.map((member) => (
                          <li key={member.id}>{member.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <CustomDropdown
                    members={teamMembersDraft}
                    selectedMemberId={selectedTeamMemberId}
                    onSelectMember={handleTeamMemberSelection}
                    onAddMember={handleAddTeamMember}
                    onMemberNameChange={handleSelectedTeamMemberNameChange}
                    onConfirmMember={handleConfirmTeamMemberName}
                    onEditMember={handleEditTeamMemberName}
                    onDeleteMember={handleDeleteSelectedTeamMember}
                  />
                )}

                <label className="team-members-toggle">
                  <input
                    type="checkbox"
                    checked={isEditingTeamMembers}
                    onChange={handleToggleTeamMembersEdit}
                  />
                  Editar equipo
                </label>
              </label>
              <label className="field general-info-pm">
                <span>Project Manager (PM)</span>
                <input
                  type="text"
                  name="pmName"
                  value={generalInfoDraft.pmName}
                  onChange={handleProjectFieldChange}
                  required
                />
              </label>
            </div>

            <div className="general-info-actions">
              <button type="button" className="secondary-btn" onClick={handleCancelGeneralInfoEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleSaveGeneralInfoEdit}
                disabled={!generalInfoTouched || savingGeneralInfo}
              >
                {savingGeneralInfo ? 'Guardando...' : 'Guardar'}
              </button>
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

            <div className="submit-wrap">
              <button className="submit-btn" type="submit" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </>
        )}

        {feedback.message && (
          <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
        )}
      </form>
    </main>
  );
};

export default ReportFormPage;