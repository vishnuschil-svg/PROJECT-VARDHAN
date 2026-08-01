import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
} from "../repositories/chits/index.js";
import { createRepositoryProvider } from "../repositories/repositoryProvider.js";
import { resolveRepositoryBackend, REPOSITORY_BACKENDS } from "../config/repositoryBackend.js";

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

export async function listTenantGroupsPersistent(activeTenantContext) {
  if (resolveRepositoryBackend() === REPOSITORY_BACKENDS.LOCAL) {
    return listTenantGroups(activeTenantContext);
  }
  const result = await createRepositoryProvider().GroupsRepository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  if (!result.success) throw new Error(result.message || "Chit groups could not be loaded.");
  return result.data || [];
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

export async function saveTenantGroupPersistent(group, activeTenantContext) {
  if (resolveRepositoryBackend() === REPOSITORY_BACKENDS.LOCAL) {
    return saveTenantGroup(group, activeTenantContext);
  }
  const repository = createRepositoryProvider().GroupsRepository;
  const payload = toProductionGroup(group);
  const result = group.id
    ? await repository.update(group.id, payload, { activeTenantContext })
    : await repository.create(payload, { activeTenantContext });
  if (!result.success) throw new Error(result.message || "Chit group could not be saved.");
  return result.data;
}

export function updateTenantGroup(id, patch, activeTenantContext) {
  return ChitDataService.groups.update(id, patch, { activeTenantContext });
}

export async function updateTenantGroupPersistent(id, patch, activeTenantContext) {
  if (resolveRepositoryBackend() === REPOSITORY_BACKENDS.LOCAL) {
    return updateTenantGroup(id, patch, activeTenantContext);
  }
  const result = await createRepositoryProvider().GroupsRepository.update(
    id,
    toProductionGroup(patch),
    { activeTenantContext }
  );
  if (!result.success) throw new Error(result.message || "Chit group could not be updated.");
  return result.data;
}

function toProductionGroup(group = {}) {
  const allowed = [
    "chit_name", "chit_code", "chit_value", "monthly_amount", "total_members",
    "total_months", "start_date", "end_date", "next_auction_date", "status",
    "today_collections", "pending_collections", "outstanding_amount", "notes", "metadata",
  ];
  const payload = Object.fromEntries(
    allowed
      .filter((key) => group[key] !== undefined)
      .map((key) => [key, group[key]])
  );
  payload.metadata = {
    ...(group.metadata || {}),
    installment_pattern: group.installment_pattern || group.metadata?.installment_pattern,
    collection_frequency: group.collection_frequency || group.metadata?.collection_frequency,
    chit_mode: group.chit_mode || group.metadata?.chit_mode,
    commission: group.commission ?? group.metadata?.commission,
    fixed_after_lift: group.fixed_after_lift ?? group.metadata?.fixed_after_lift,
    schedule: group.schedule || group.metadata?.schedule,
  };
  return payload;
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
