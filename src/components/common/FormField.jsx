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
  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}

      {type === "select" ? (
        <select
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
            type="checkbox"
            checked={value}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>{label}</span>
        </div>
      ) : (
        <input
          type={type}
          className={`form-input ${error ? "error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        />
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export default FormField;
