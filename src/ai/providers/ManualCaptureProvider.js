export const ManualCaptureProvider = {
  name: "MANUAL_CAPTURE_PROVIDER",
  mode: "MANUAL_CAPTURE",
  extract() {
    return {
      mode: "MANUAL_CAPTURE",
      message: "Manual Capture Mode - AI/OCR provider is not connected. Upload is preserved for reference; enter or paste extracted values and verify every field.",
      fields: {},
      confidence: "UNKNOWN",
    };
  },
};
