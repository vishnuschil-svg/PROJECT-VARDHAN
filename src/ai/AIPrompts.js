export const AI_PROMPT_KEYS = {
  BUSINESS_INSIGHTS: "BUSINESS_INSIGHTS",
  COMMAND_ROUTING: "COMMAND_ROUTING",
  DATA_VALIDATION: "DATA_VALIDATION",
  DUPLICATE_DETECTION: "DUPLICATE_DETECTION",
  REPORT_SUGGESTIONS: "REPORT_SUGGESTIONS",
  NOTIFICATION_SUGGESTIONS: "NOTIFICATION_SUGGESTIONS",
  OCR_IMPORT: "OCR_IMPORT",
  VOICE_COMMAND: "VOICE_COMMAND",
};

export const AI_PROMPTS = {
  [AI_PROMPT_KEYS.BUSINESS_INSIGHTS]:
    "Review tenant-scoped ERP data and return concise business insight responses.",
  [AI_PROMPT_KEYS.COMMAND_ROUTING]:
    "Map the user command to an existing safe application action.",
  [AI_PROMPT_KEYS.DATA_VALIDATION]:
    "Validate business records for missing fields, invalid amounts, and operational risk.",
  [AI_PROMPT_KEYS.DUPLICATE_DETECTION]:
    "Detect probable duplicate member and business records using deterministic signals.",
  [AI_PROMPT_KEYS.REPORT_SUGGESTIONS]:
    "Suggest reports that help owners understand collections, pending risk, finance, and health.",
  [AI_PROMPT_KEYS.NOTIFICATION_SUGGESTIONS]:
    "Suggest useful notification topics without sending external messages.",
  [AI_PROMPT_KEYS.OCR_IMPORT]:
    "Placeholder prompt for future document OCR import and field extraction.",
  [AI_PROMPT_KEYS.VOICE_COMMAND]:
    "Placeholder prompt for future voice command transcription and routing.",
};
