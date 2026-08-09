function FieldShell({ id, label, required, helpText, error, children }) {
  return (
    <div className="vds-field">
      {label ? (
        <label className="vds-label" htmlFor={id}>
          {label}
          {required ? <span className="vds-required" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <span className="vds-error-text" id={`${id}-error`}>{error}</span> : null}
      {!error && helpText ? <span className="vds-help" id={`${id}-help`}>{helpText}</span> : null}
    </div>
  );
}

export function TextInput({
  id,
  label,
  required = false,
  helpText,
  error,
  className = "",
  ...props
}) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <input
        id={id}
        className={`vds-input ${className}`.trim()}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({
  id,
  label,
  required = false,
  helpText,
  error,
  className = "",
  children,
  ...props
}) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <select
        id={id}
        className={`vds-select ${className}`.trim()}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextArea({
  id,
  label,
  required = false,
  helpText,
  error,
  className = "",
  ...props
}) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <textarea
        id={id}
        className={`vds-textarea ${className}`.trim()}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function Checkbox({
  id,
  label,
  description,
  invalid = false,
  className = "",
  ...props
}) {
  return (
    <label className={`vds-checkbox ${invalid ? "vds-checkbox--invalid" : ""} ${className}`.trim()}>
      <input
        id={id}
        type="checkbox"
        className="vds-checkbox__input"
        aria-invalid={invalid || undefined}
        {...props}
      />
      <span>
        <span className="vds-checkbox__label">{label}</span>
        {description ? <span className="vds-checkbox__description">{description}</span> : null}
      </span>
    </label>
  );
}