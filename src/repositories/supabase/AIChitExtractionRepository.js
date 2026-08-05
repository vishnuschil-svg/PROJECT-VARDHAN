import { getSupabaseClient } from "../../lib/supabase/SupabaseClient.js";
import { resolveAIChitWorkspaceScope, isUuid } from "./AIChitWorkspaceScope.js";

export const AIChitExtractionRepository = Object.freeze({
  async saveDraft(draft, activeTenantContext, { status = "PENDING_REVIEW", extractionId = "" } = {}) {
    const client = requireClient();
    const userId = await requireUserId(client, "save");
    const scope = await resolveAIChitWorkspaceScope({
      client,
      activeTenantContext,
      userId,
      requireWrite: true,
    });

    const source = draft?.extractionMetadata?.sourceDocument || {};
    const persistedId = isUuid(extractionId)
      ? extractionId
      : isUuid(source.documentId)
        ? source.documentId
        : undefined;
    const payload = {
      ...(persistedId ? { id: persistedId } : {}),
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      workspace_id: scope.workspace_id,
      created_by: userId,
      status,
      file_name: source.originalFileName || source.name || null,
      file_mime_type: source.mimeType || source.type || null,
      file_size: Number(source.fileSize ?? source.size ?? 0),
      provider: source.provider || draft?.extractionMetadata?.provider || "manual",
      provider_metadata: {
        documentType: source.documentType || null,
        languageDetected: source.languageDetected || "UNKNOWN",
        warnings: Array.isArray(source.warnings) ? source.warnings : [],
      },
      parsed_draft: draft,
      confidence_score: Number(draft?.confidence?.overall || source.confidenceScore || 0),
      updated_at: new Date().toISOString(),
    };

    const query = persistedId
      ? client.from("ai_chit_extractions").upsert(payload, { onConflict: "id" })
      : client.from("ai_chit_extractions").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw persistenceError("Draft save failed", error);
    return data;
  },

  async getDraft(extractionId, activeTenantContext) {
    if (!isUuid(extractionId)) return null;
    const client = requireClient();
    const userId = await requireUserId(client, "load");
    const scope = await resolveAIChitWorkspaceScope({
      client,
      activeTenantContext,
      userId,
      requireWrite: false,
    });
    const { data, error } = await client
      .from("ai_chit_extractions")
      .select("*")
      .eq("id", extractionId)
      .eq("tenant_id", scope.tenant_id)
      .eq("data_scope", scope.data_scope)
      .eq("workspace_id", scope.workspace_id)
      .eq("created_by", userId)
      .eq("status", "PENDING_REVIEW")
      .maybeSingle();
    if (error) throw persistenceError("Draft load failed", error);
    return data || null;
  },

  async deleteDraft(extractionId, activeTenantContext) {
    if (!isUuid(extractionId)) throw new Error("A valid draft ID is required for deletion.");
    const client = requireClient();
    const userId = await requireUserId(client, "delete");
    const scope = await resolveAIChitWorkspaceScope({
      client,
      activeTenantContext,
      userId,
      requireWrite: true,
    });
    const { data, error } = await client.rpc("delete_pending_ai_chit_draft", {
      p_extraction_id: extractionId,
      p_workspace_id: scope.workspace_id,
    });
    if (error) throw persistenceError("Draft deletion failed", error);
    if (data !== true) throw new Error("The pending draft was not found in this workspace.");
    return { id: extractionId, deleted: true };
  },

  async commitDraft(extractionId, draft) {
    if (!isUuid(extractionId)) {
      throw new Error("Save the verified draft before creating the chit group.");
    }
    const client = requireClient();
    const { data, error } = await client.rpc("commit_ai_chit_draft", {
      p_extraction_id: extractionId,
      p_draft: draft,
    });
    if (error) throw persistenceError("Atomic chit creation failed", error);
    if (!data?.group?.id) throw new Error("Atomic chit creation returned no group record.");
    return data;
  },
});

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured for production persistence.");
  return client;
}

async function requireUserId(client, action) {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error(`Your session expired. Sign in again before attempting to ${action} the draft.`);
  }
  return data.user.id;
}

function persistenceError(prefix, error) {
  const message = error?.message || "Unknown database error.";
  const recovery = error?.code === "42501"
    ? "Confirm that your account has write access to this workspace."
    : "Retry once; if the error continues, contact support without re-creating the group.";
  const wrapped = new Error(`${prefix}: ${message} ${recovery}`);
  wrapped.code = error?.code || "PERSISTENCE_FAILED";
  return wrapped;
}

export default AIChitExtractionRepository;
