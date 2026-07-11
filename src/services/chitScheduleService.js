import { ScheduleEngine } from "../domain/chit/services/ScheduleEngine.js";
import { ScheduleValidator } from "../domain/chit/validators/ScheduleValidator.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";

export function createLegacyScheduleForGroup(group, activeTenantContext) {
  const schedule = ScheduleEngine.fromLegacyGroup(group, {
    groupId: group.id,
    tenantId: activeTenantContext?.tenant_id,
    workspaceId: activeTenantContext?.workspace_id || activeTenantContext?.workspaceId || "",
  });
  return ChitScheduleRepository.saveMany(schedule, activeTenantContext);
}

export function saveScheduleRows(rows, activeTenantContext) {
  return ChitScheduleRepository.saveMany(rows, activeTenantContext);
}

export function validateSchedule(rows, ruleSet) {
  return ScheduleValidator.validate(rows, ruleSet);
}

export function getScheduleForGroup(groupId, activeTenantContext) {
  return ChitScheduleRepository.listByGroup(groupId, activeTenantContext);
}
