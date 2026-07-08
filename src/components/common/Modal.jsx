import "./Modal.css";

function Modal({ isOpen, title, children, onClose, footer, size = "medium" }) {
  if (!isOpen) return null;

  const titleId = title
    ? `modal-title-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : "Dialog"}
        aria-labelledby={titleId}
      >
        {title && (
          <div className="modal-header">
            <h2 id={titleId}>{title}</h2>
            <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
