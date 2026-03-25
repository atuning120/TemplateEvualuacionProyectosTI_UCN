import React, { useEffect, useMemo, useRef, useState } from 'react';

const CustomDropdown = ({
  members,
  selectedMemberId,
  onSelectMember,
  onAddMember,
  onMemberNameChange,
  onConfirmMember,
  onEditMember,
  onDeleteMember,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId],
  );

  const handleSelectMember = (memberId) => {
    onSelectMember(memberId);
  };

  const handleAddMember = () => {
    onAddMember();
    setIsOpen(true);
  };

  const handleNameChange = (memberId, value) => {
    onMemberNameChange(memberId, value);
  };

  const handleConfirm = (memberId) => {
    onConfirmMember(memberId);
  };

  const handleDelete = (memberId) => {
    onDeleteMember(memberId);
  };

  const handleEdit = (memberId) => {
    onEditMember(memberId);
  };

  const triggerLabel = selectedMember?.name?.trim()
    ? selectedMember.name
    : 'Selecciona integrante';

  return (
    <div className="team-members-editor" ref={rootRef}>
      <button
        type="button"
        className="team-dropdown-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{triggerLabel}</span>
        <span className="team-dropdown-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="team-dropdown-menu" role="listbox" aria-label="Integrantes del equipo">
          {members.length === 0 && (
            <p className="team-dropdown-empty">Sin integrantes. Usa "Anadir integrante".</p>
          )}

          {members.map((member) => (
            <div
              key={member.id}
              className={`team-dropdown-item ${member.id === selectedMemberId ? 'active' : ''} ${member.isNew ? 'new-item' : ''} ${member.isEditing ? 'editing-item' : 'readonly-item'}`}
              role="option"
              aria-selected={member.id === selectedMemberId}
            >
              {!member.isNew && (
                <button
                  type="button"
                  className="team-dropdown-select"
                  onClick={() => handleSelectMember(member.id)}
                >
                  {member.name?.trim() || 'Integrante sin nombre'}
                </button>
              )}

              {member.isEditing && (
                <input
                  type="text"
                  value={member.name}
                  onChange={(event) => handleNameChange(member.id, event.target.value)}
                  placeholder="Nombre"
                  aria-label="Editar nombre del integrante"
                />
              )}

              {member.isEditing ? (
                <button
                  type="button"
                  className="team-inline-icon-btn"
                  onClick={() => handleConfirm(member.id)}
                  title="Confirmar nombre"
                  aria-label="Confirmar nombre"
                >
                  ✓
                </button>
              ) : (
                <button
                  type="button"
                  className="team-inline-icon-btn"
                  onClick={() => handleEdit(member.id)}
                  title="Editar nombre"
                  aria-label="Editar nombre"
                >
                  ✎
                </button>
              )}

              <button
                type="button"
                className="team-inline-icon-btn danger"
                onClick={() => handleDelete(member.id)}
                title="Eliminar integrante"
                aria-label="Eliminar integrante"
              >
                🗑
              </button>
            </div>
          ))}

          <button type="button" className="team-dropdown-add" onClick={handleAddMember}>
            + Anadir integrante
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
