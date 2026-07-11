import { OrganizerPreference } from "../domain/chit/entities/OrganizerPreference.js";
import { AILearningMemory } from "../ai/AILearningMemory.js";
import { OrganizerPreferenceRepository } from "../repositories/OrganizerPreferenceRepository.js";

export function listOrganizerPreferences(activeTenantContext) {
  return OrganizerPreferenceRepository.list(activeTenantContext);
}

export function rememberOrganizerPreference(input, activeTenantContext) {
  return OrganizerPreferenceRepository.save(new OrganizerPreference(input).toJSON(), activeTenantContext);
}

export function suggestOrganizerPreferences(activeTenantContext) {
  return AILearningMemory.suggest(listOrganizerPreferences(activeTenantContext));
}
