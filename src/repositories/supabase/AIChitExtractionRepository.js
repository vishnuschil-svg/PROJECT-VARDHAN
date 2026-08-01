import { getSupabaseClient } from "../../lib/supabase/SupabaseClient.js";
import { requireTenantScope } from "../../lib/supabase/SupabaseRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AIChitExtractionRepository = Object.freeze({
  async saveDraft(draft, activeTenantContext, { status = "PENDING_REVIEW" } = {}) {
    const client = requireClient();
    const scope = requireTenantScope(activeTenantContext);
    const workspaceId = activeTenantContext?.workspace_id;
    if (!workspaceId) throw new Error("A business workspace is required to save the extraction draft.");

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user?.id) {
      throw new Error("Your session expired. Sign in again before saving the draft.");
    }

    const source = draft?.extractionMetadata?.sourceDocument || {};
    const documentId = UUID_PATTERN.test(source.documentId || "") ? source.documentId : undefined;
    const payload = {
      ...(documentId ? { id: documentId } : {}),
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      workspace_id: workspaceId,
      created_by: userData.user.id,
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

    const query = documentId
      ? client.from("ai_chit_extractions").upsert(payload, { onConflict: "id" })
      : client.from("ai_chit_extractions").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw persistenceError("Draft save failed", error);
    return data;
  },

  async commitDraft(extractionId, draft) {
    if (!UUID_PATTERN.test(extractionId || "")) {
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
