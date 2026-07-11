import { getSupabaseClient, isSupabaseConfigured } from "./SupabaseClient.js";
import {
  SUPABASE_ERROR_MESSAGES,
  createErrorResponse,
  createSuccessResponse,
} from "./SupabaseErrorHandler.js";

export const SupabaseRealtime = {
  subscribe({ table, tenantScope, event = "*", callback } = {}) {
    if (!isSupabaseConfigured) {
      return createErrorResponse(null, SUPABASE_ERROR_MESSAGES.CONFIG_MISSING);
    }

    if (!tenantScope?.tenant_id || !tenantScope?.data_scope) {
      return createErrorResponse(null, SUPABASE_ERROR_MESSAGES.TENANT_REQUIRED);
    }

    const client = getSupabaseClient();
    const channel = client
      .channel(`${table}:${tenantScope.tenant_id}:${tenantScope.data_scope}`)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter: `tenant_id=eq.${tenantScope.tenant_id}`,
        },
        (payload) => {
          if (!payload.new || payload.new.data_scope === tenantScope.data_scope) {
            callback?.(payload);
          }
        }
      )
      .subscribe();

    return createSuccessResponse(channel, "Realtime subscription created.");
  },

  unsubscribe(subscription) {
    if (!subscription || !isSupabaseConfigured) {
      return createSuccessResponse(null, "No active subscription.");
    }

    getSupabaseClient().removeChannel(subscription);
    return createSuccessResponse(null, "Realtime subscription removed.");
  },
};
