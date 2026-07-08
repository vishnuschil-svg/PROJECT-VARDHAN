import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
} from "../repositories/chits";
import { PHASE_ONE_CHIT_GROUPS, getTenantChitGroups } from "../config/chitPhaseOneData";
import { PHASE_TWO_CHIT_MEMBERS, getTenantMembers } from "../config/chitMemberData";

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
  seedTenantGroups(activeTenantContext);

  return ChitDataService.groups.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

export function listVisibleGroups(activeTenantContext, allowAllTenants = false) {
  if (allowAllTenants) {
    seedAllDefaultGroups();

    return ChitDataService.groups.list({
      allowAllTenants: true,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  }

  return listTenantGroups(activeTenantContext);
}

export function saveTenantGroup(group, activeTenantContext) {
  seedTenantGroups(activeTenantContext);
  return ChitDataService.groups.upsert(group, { activeTenantContext });
}

export function updateTenantGroup(id, patch, activeTenantContext) {
  seedTenantGroups(activeTenantContext);
  return ChitDataService.groups.update(id, patch, { activeTenantContext });
}

export function listTenantMembers(activeTenantContext) {
  seedTenantMembers(activeTenantContext);

  return ChitDataService.members.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

export function listVisibleMembers(activeTenantContext, allowAllTenants = false) {
  if (allowAllTenants) {
    seedAllDefaultMembers();

    return ChitDataService.members.list({
      allowAllTenants: true,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  }

  return listTenantMembers(activeTenantContext);
}

export function saveTenantMember(member, activeTenantContext) {
  seedTenantMembers(activeTenantContext);
  return ChitDataService.members.upsert(member, { activeTenantContext });
}

function seedTenantGroups(activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return;
  }

  const existing = ChitDataService.groups.list({
    activeTenantContext,
    pageSize: 1,
  }).data;

  if (existing.length > 0) {
    return;
  }

  getTenantChitGroups(PHASE_ONE_CHIT_GROUPS, activeTenantContext).forEach((group) => {
    ChitDataService.groups.create(group, { activeTenantContext });
  });
}

function seedAllDefaultGroups() {
  PHASE_ONE_CHIT_GROUPS.forEach((group) => {
    seedRecord(ChitDataService.groups, group);
  });
}

function seedTenantMembers(activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return;
  }

  const existing = ChitDataService.members.list({
    activeTenantContext,
    pageSize: 1,
  }).data;

  if (existing.length > 0) {
    return;
  }

  getTenantMembers(PHASE_TWO_CHIT_MEMBERS, activeTenantContext).forEach((member) => {
    ChitDataService.members.create(member, { activeTenantContext });
  });
}

function seedAllDefaultMembers() {
  PHASE_TWO_CHIT_MEMBERS.forEach((member) => {
    seedRecord(ChitDataService.members, member);
  });
}

function seedRecord(repository, record) {
  const activeTenantContext = {
    tenant_id: record.tenant_id,
    data_scope: record.data_scope,
  };

  if (!repository.getById(record.id, { activeTenantContext })) {
    repository.create(record, { activeTenantContext });
  }
}
