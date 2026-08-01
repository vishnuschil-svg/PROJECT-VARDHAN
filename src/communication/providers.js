import { getSupabaseClient } from "../lib/supabase/SupabaseClient.js";

const environment = import.meta.env || {};

export function createServerCommunicationProvider(channel, { apiBaseUrl = environment.VITE_PLATFORM_API_URL || "", fetchImpl = globalThis.fetch, getSession = defaultSession } = {}) {
  const normalizedBase = String(apiBaseUrl || "").replace(/\/$/, "");
  return Object.freeze({
    name: channel === "WHATSAPP" ? "Meta WhatsApp Cloud API" : channel === "SMS" ? "SMS Gateway" : channel === "EMAIL" ? "Email Service" : "Push Notification Provider",
    isConfigured() { return Boolean(normalizedBase && typeof fetchImpl === "function"); },
    async send(job) {
      if (!this.isConfigured()) throw new Error(`${this.name} provider is not configured. No message was sent.`);
      const session = await getSession();
      const workspaceId = job.workspaceId || job.workspace_id;
      if (!session?.access_token || !workspaceId) throw new Error("Authenticated session and workspace are required for provider delivery.");
      const response = await fetchImpl(`${normalizedBase}/v1/communications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, "X-Workspace-Id": workspaceId },
        body: JSON.stringify({ channel, recipient: job.to || job.recipient, body: job.body || "", subject: job.subject || "", templateId: job.templateId || null, dedupeKey: job.dedupeKey }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || `${this.name} delivery failed with ${response.status}.`);
      return result;
    },
  });
}

async function defaultSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  return (await client.auth.getSession()).data.session;
}

export const WhatsAppBusinessProvider = createServerCommunicationProvider("WHATSAPP");
export const SmsProvider = createServerCommunicationProvider("SMS");
export const EmailProvider = createServerCommunicationProvider("EMAIL");
export const PushProvider = createServerCommunicationProvider("PUSH");
export const COMMUNICATION_PROVIDERS = { WHATSAPP: WhatsAppBusinessProvider, SMS: SmsProvider, EMAIL: EmailProvider, PUSH: PushProvider };
