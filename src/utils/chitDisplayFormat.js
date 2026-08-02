/** Shared Chit display formatters — real values only, never invent zeros as placeholders. */

const MONTHS = Object.freeze([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]);

export function formatINR(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `₹${numeric.toLocaleString("en-IN")}`;
}

export function formatChitDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatTenureProgress(group = {}) {
  const total = Number(group.total_months || group.totalMonths || 0);
  if (!total) return "—";
  const current = Number(
    group.current_month ||
      group.currentMonth ||
      group.closed_months ||
      group.closedMonths ||
      0
  );
  const safeCurrent = Math.max(0, Math.min(total, current || 0));
  // If no progress tracked, show Month 0 / N only when start exists; else —
  if (!group.start_date && !group.startDate && safeCurrent === 0) {
    return `Month 0 / ${total}`;
  }
  return `Month ${safeCurrent || 1} / ${total}`;
}

export function displayChitName(group = {}) {
  const name = String(group.chit_name || group.chitName || "").trim();
  const code = String(group.chit_code || group.chitCode || "").trim();
  if (!name) return "Unnamed Chit";
  // Never display code as name
  if (code && name.toUpperCase() === code.toUpperCase()) return "Unnamed Chit";
  return name;
}

export function displayChitCode(group = {}) {
  const code = String(group.chit_code || group.chitCode || "").trim();
  return code || "—";
}

export function statusBadgeVariant(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "success";
  if (normalized === "upcoming" || normalized === "review" || normalized === "draft") return "warning";
  if (normalized === "closed" || normalized === "completed") return "default";
  if (normalized === "archived") return "default";
  return "default";
}
