export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`vds-button vds-button--${variant} vds-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Please waitâ€¦" : children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  type = "button",
  ...props
}) {
  if (!label) {
    throw new Error("IconButton requires an accessible label.");
  }

  return (
    <button
      type={type}
      className={`vds-icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}