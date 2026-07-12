import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "./Modal.css";

function Modal({ isOpen, title, children, onClose, footer, size = "medium" }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKey = (event) => { if (event.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; previousFocusRef.current?.focus?.(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const titleId = title ? `modal-title-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <div ref={dialogRef} tabIndex={-1} className={`modal-content modal-${size}`} role="dialog" aria-modal="true" aria-label={title ? undefined : "Dialog"} aria-labelledby={titleId}>
      {title && <div className="modal-header"><h2 id={titleId}>{title}</h2><button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}><X size={20} aria-hidden="true" /></button></div>}
      <div className="modal-body">{children}</div>{footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}
export default Modal;
