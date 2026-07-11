export const REPORT_EXPORT_FORMATS = [
  { id: "PDF", label: "PDF", status: "ready" },
  { id: "Excel", label: "Excel", status: "ready" },
  { id: "CSV", label: "CSV", status: "ready" },
  { id: "Print", label: "Print", status: "ready" },
  { id: "Email", label: "Email", status: "future" },
  { id: "WhatsApp", label: "WhatsApp", status: "future" },
];

export function buildReportExport(report, format) {
  const normalizedFormat = String(format || "CSV");
  const fileName = `${report.id}-${new Date().toISOString().slice(0, 10)}`;
  const rows = report.rows || [];
  const columns = report.columns || [];

  if (normalizedFormat === "CSV") {
    return {
      format: normalizedFormat,
      fileName: `${fileName}.csv`,
      mimeType: "text/csv",
      content: toDelimited(rows, columns, ","),
    };
  }

  if (normalizedFormat === "Excel") {
    return {
      format: normalizedFormat,
      fileName: `${fileName}.xls`,
      mimeType: "application/vnd.ms-excel",
      content: toHtmlTable(report),
    };
  }

  if (normalizedFormat === "Print" || normalizedFormat === "PDF") {
    return {
      format: normalizedFormat,
      fileName: `${fileName}.html`,
      mimeType: "text/html",
      content: toHtmlTable(report),
    };
  }

  return {
    format: normalizedFormat,
    fileName: `${fileName}.json`,
    mimeType: "application/json",
    content: JSON.stringify(report, null, 2),
    status: "future",
  };
}

function toDelimited(rows, columns, separator) {
  const header = columns.join(separator);
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(row[column], separator)).join(separator)
  );

  return [header, ...body].join("\n");
}

function toHtmlTable(report) {
  const columns = report.columns || [];
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = (report.rows || [])
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title></head><body><h1>${escapeHtml(report.title)}</h1><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function escapeCell(value, separator) {
  const text = String(value ?? "");
  return text.includes(separator) || text.includes("\"") || text.includes("\n")
    ? `"${text.replace(/"/g, "\"\"")}"`
    : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
