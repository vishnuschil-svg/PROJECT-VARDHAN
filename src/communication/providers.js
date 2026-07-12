function unavailable(name){return{name,isConfigured(){return false},async send(){throw new Error(`${name} provider is not configured. No message was sent.`)}}}
export const WhatsAppBusinessProvider=unavailable("Meta WhatsApp Business Platform");export const SmsProvider=unavailable("SMS Gateway");export const EmailProvider=unavailable("Email Provider");export const PushProvider=unavailable("Push Notification Provider");
export const COMMUNICATION_PROVIDERS={WHATSAPP:WhatsAppBusinessProvider,SMS:SmsProvider,EMAIL:EmailProvider,PUSH:PushProvider};
