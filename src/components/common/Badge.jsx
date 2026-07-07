import "./Badge.css";

function Badge({ label, variant = "default", size = "medium", icon = null }) {
  return (
    <span className={`badge badge-${variant} badge-${size}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      {label}
    </span>
  );
}

export default Badge;
