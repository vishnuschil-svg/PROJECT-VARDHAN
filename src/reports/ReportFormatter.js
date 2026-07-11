export function formatReportCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function formatReportDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

export function formatReportValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value !== "number") return value;

  const moneyKeys = ["amount", "cash", "bank", "income", "expense", "balance", "pending", "collection", "profit", "dividend", "lift", "outstanding", "target", "value", "commission"];
  return moneyKeys.some((item) => String(key).toLowerCase().includes(item))
    ? formatReportCurrency(value)
    : Number(value || 0).toLocaleString("en-IN");
}

export function toReportTitle(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
