import { TemplateEngine } from "../domain/chit/services/TemplateEngine.js";
import { TemplateValidator } from "../domain/chit/validators/TemplateValidator.js";
import { ChitTemplateRepository } from "../repositories/ChitTemplateRepository.js";

export function listChitTemplates(activeTenantContext) {
  return ChitTemplateRepository.list(activeTenantContext);
}

export function saveChitTemplate(template, activeTenantContext) {
  const built = TemplateEngine.buildTemplate(template);
  const validation = TemplateValidator.validate(built);
  if (!validation.isValid) {
    return { success: false, template: built, validation, message: validation.errors[0] };
  }
  return { success: true, template: ChitTemplateRepository.save(built, activeTenantContext), validation };
}

export function createTemplateVersion(template, patch, activeTenantContext) {
  return ChitTemplateRepository.save(TemplateEngine.versionTemplate(template, patch), activeTenantContext);
}
