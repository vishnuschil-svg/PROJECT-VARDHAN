import "./Button.css";

function Button({
  children,
  variant = "default",
  size = "medium",
  onClick,
  disabled = false,
  type = "button",
  icon = null,
  fullWidth = false,
  loading = false
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? "btn-full-width" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {loading ? "Loading..." : children}
    </button>
  );
}

export default Button;
