import { useId } from "react";
import "./FormField.css";

function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required,
  disabled,
  options = [],
  rows = 4
}) {
  const controlId = `field-${useId().replaceAll(":", "")}`;
  const errorId = `${controlId}-error`;
  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={controlId}>
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}

      {type === "select" ? (
        <select
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`form-input form-select ${error ? "error" : ""}`}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`form-input form-textarea ${error ? "error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          rows={rows}
        />
      ) : type === "checkbox" ? (
        <div className="form-checkbox-wrapper">
          <input
            id={controlId}
            type="checkbox"
            checked={value}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>{label}</span>
        </div>
      ) : (
        <input
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          type={type}
          className={`form-input ${error ? "error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        />
      )}

      {error && <p className="form-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

export default FormField;
