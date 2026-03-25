import { useEffect } from 'react';
import './NotificationModal.css';

const NotificationModal = ({ type = 'success', message = '', duration = 3000, onClose }) => {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (typeof onClose === 'function') {
        onClose();
      }
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [duration, message, onClose]);

  if (!message) {
    return null;
  }

  const isError = type === 'error';

  return (
    <div className="notification-modal-container" aria-live="polite" aria-atomic="true">
      <div className={`notification-modal ${isError ? 'error' : 'success'}`} role="status">
        <p>{message}</p>
        <button
          type="button"
          className="notification-close-btn"
          aria-label="Cerrar notificacion"
          onClick={onClose}
        >
          x
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
