import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
} from "../repositories/chits/index.js";

export const ChitDataService = {
  groups: GroupsRepository,
  members: MembersRepository,
  collections: CollectionsRepository,
  receipts: ReceiptsRepository,
  finance: FinanceRepository,
  auctions: AuctionRepository,
  reports: ReportsRepository,
};

export function getChitRepository(name) {
  return ChitDataService[name] || null;
}

export function listTenantGroups(activeTenantContext) {
  return ChitDataService.groups.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

export function listVisibleGroups(activeTenantContext, allowAllTenants = false) {
  if (allowAllTenants) {
    return ChitDataService.groups.list({
      allowAllTenants: true,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  }

  return listTenantGroups(activeTenantContext);
}

export function saveTenantGroup(group, activeTenantContext) {
  return ChitDataService.groups.upsert(group, { activeTenantContext });
}

export function updateTenantGroup(id, patch, activeTenantContext) {
  return ChitDataService.groups.update(id, patch, { activeTenantContext });
}

export function listTenantMembers(activeTenantContext) {
  return ChitDataService.members.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

export function listVisibleMembers(activeTenantContext, allowAllTenants = false) {
  if (allowAllTenants) {
    return ChitDataService.members.list({
      allowAllTenants: true,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  }

  return listTenantMembers(activeTenantContext);
}

export function saveTenantMember(member, activeTenantContext) {
  return ChitDataService.members.upsert(member, { activeTenantContext });
}
