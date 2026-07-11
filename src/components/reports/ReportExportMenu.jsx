import { Download, Printer } from "lucide-react";

function ReportExportMenu({ formats, onExport }) {
  return (
    <div className="enterprise-report-export-menu">
      {(formats || []).map((format) => {
        const isFuture = format.status === "future";
        const Icon = format.id === "Print" ? Printer : Download;

        return (
          <button
            type="button"
            key={format.id}
            disabled={isFuture}
            onClick={() => onExport(format.id)}
            title={isFuture ? "Future channel" : `Export ${format.label}`}
          >
            <Icon size={15} />
            <span>{format.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ReportExportMenu;
