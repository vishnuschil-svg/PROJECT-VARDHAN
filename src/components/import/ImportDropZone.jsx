import { UploadCloud } from "lucide-react";

function ImportDropZone({ selectedFileName, onFileSelect }) {
  return (
    <label className="smart-import-dropzone" htmlFor="smart-import-file">
      <UploadCloud size={30} />
      <strong>{selectedFileName || "Upload Excel, CSV, JSON, PDF, or Image"}</strong>
      <span>CSV and JSON can be analyzed now. Excel, PDF, and OCR are provider-ready.</span>
      <input
        id="smart-import-file"
        type="file"
        accept=".csv,.json,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
        onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
      />
    </label>
  );
}

export default ImportDropZone;
