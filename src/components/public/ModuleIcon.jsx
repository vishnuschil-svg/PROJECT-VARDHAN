const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.74" />
    </svg>
  );
}

function IconSchool() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
    </svg>
  );
}

function IconCollege() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function IconHostel() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M3 12h18" />
    </svg>
  );
}

function IconPartner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M12 3 5 6v6c0 5 3.5 8.5 7 9 3.5-.5 7-4 7-9V6l-7-3z" />
      <path d="M9.5 12.5 11 14l3.5-3.5" />
    </svg>
  );
}

const ICONS = {
  users: IconUsers,
  school: IconSchool,
  college: IconCollege,
  hostel: IconHostel,
  partner: IconPartner,
  shield: IconShield,
};

export default function ModuleIcon({ name, tint, size = 52, className = "" }) {
  const Icon = ICONS[name] || IconPartner;
  return (
    <div
      className={`public-icon-sq ${className}`.trim()}
      style={{ background: tint, width: size, height: size }}
    >
      <Icon />
    </div>
  );
}
