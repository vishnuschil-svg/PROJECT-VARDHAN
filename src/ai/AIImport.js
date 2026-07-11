import { createAssistantResponse } from "./AIContext.js";

export function createOCRPlaceholder() {
  return createAssistantResponse({
    id: "future-ocr-import",
    type: "OCR_IMPORT",
    title: "OCR import placeholder",
    message: "Document OCR is reserved for a future provider; no external AI service is connected.",
    action: { label: "Open documents", route: "/chits/documents" },
    confidence: 0.5,
    severity: "info",
  });
}

export function createVoiceCommandPlaceholder() {
  return createAssistantResponse({
    id: "future-voice-command",
    type: "VOICE_COMMAND",
    title: "Voice command placeholder",
    message: "Voice command processing is reserved for a future provider; no external AI service is connected.",
    action: { label: "Open dashboard", route: "/dashboard" },
    confidence: 0.5,
    severity: "info",
  });
}
