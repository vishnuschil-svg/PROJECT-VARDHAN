import { ScheduleValidator } from "./ScheduleValidator.js";
import { RuleSetValidator } from "./RuleSetValidator.js";

export const TemplateValidator = {
  validate(template = {}) {
    const ruleValidation = RuleSetValidator.validate(template.ruleSet || {});
    const scheduleValidation = ScheduleValidator.validate(template.schedule || [], template.ruleSet || {});
    const errors = [...ruleValidation.errors, ...scheduleValidation.errors.map((issue) => issue.message)];
    const warnings = [...ruleValidation.warnings, ...scheduleValidation.warnings.map((issue) => issue.message)];
    if (!template.name) errors.push("Template name is required.");
    return { isValid: errors.length === 0, errors, warnings };
  },
};
