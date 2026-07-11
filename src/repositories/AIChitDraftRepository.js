import { GroupsRepository, getTenantScope } from "./chits";
import { WorkspaceRepository } from "./WorkspaceRepository.js";

const STORAGE_KEY = "vardhan.ai.chitDrafts.v1";

export const AIChitDraftRepository = {
  saveDraft(draft, activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    const scope = getTenantScope(context);
    const now = new Date().toISOString();
    const record = {
      ...draft,
      id: draft.id || `ai-chit-draft-${Date.now()}`,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      scope_key: scope.scope_key,
      status: "draft",
      created_at: draft.created_at || now,
      updated_at: now,
    };

    if (canUseLocalStorage()) {
      const existing = readDrafts();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([record, ...existing.filter((item) => item.id !== record.id)])
      );
    }

    return record;
  },

  createChitGroupFromDraft(draft, activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    const group = {
      id: draft.groupId || `group-${Date.now()}`,
      chit_name: draft.chitName || `AI Chit ${new Date().toISOString().slice(0, 10)}`,
      chit_code: draft.chitCode || `AI-${Date.now()}`,
      chit_value: Number(draft.chitValue || 0),
      monthly_amount: Number(draft.monthlyInstallment || 0),
      total_members: Number(draft.members || 0),
      total_months: Number(draft.duration || 0),
      auction_type: draft.auctionType || "Auction",
      commission_rate: Number(draft.commission || 0),
      status: "upcoming",
      source: "AI_CHIT_PLAN_DESIGNER",
      created_at: new Date().toISOString(),
    };

    return GroupsRepository.upsert(group, { activeTenantContext: context });
  },

  listDrafts(activeTenantContext) {
    const scope = getTenantScope(activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext());
    return readDrafts().filter((draft) => !scope.scope_key || draft.scope_key === scope.scope_key);
  },
};

function readDrafts() {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
