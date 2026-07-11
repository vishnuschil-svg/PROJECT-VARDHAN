export const CaptureValidator = {
  validateCaptureFields(fields = {}) {
    const errors = [];
    const warnings = [];
    ["chitName", "chitValue", "memberCount", "duration"].forEach((field) => {
      const value = fields[field]?.value ?? fields[field];
      const confidence = fields[field]?.confidence ?? 1;
      if (!value) errors.push(`${field} is required before confirmation.`);
      if (confidence < 0.6) warnings.push(`${field} has low confidence and requires owner confirmation.`);
    });
    return { isValid: errors.length === 0, errors, warnings };
  },
};
