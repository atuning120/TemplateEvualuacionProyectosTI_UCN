import { useEffect, useMemo, useRef, useState } from 'react';
import './StatusDropdown.css';

const StatusDropdown = ({
  name,
  value,
  options,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0],
    [options, value],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div className="status-dropdown" ref={rootRef}>
      <button
        type="button"
        className="status-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Estado general del proyecto"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="status-dropdown-content">
          <span className={`status-dot ${selectedOption.color}`} aria-hidden="true" />
          <span>{selectedOption.label}</span>
        </span>
        <span className="status-dropdown-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div
          className="status-dropdown-menu"
          role="listbox"
          aria-label="Selecciona estado general"
          data-name={name}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`status-dropdown-option ${option.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <span className={`status-dot ${option.color}`} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
