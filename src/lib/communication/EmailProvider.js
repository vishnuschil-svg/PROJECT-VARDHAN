/**
 * Email Provider Interface
 * Abstract base class for email service providers
 */
export class EmailProvider {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled || false;
  }

  /**
   * Send an email
   */
  async sendEmail({ _to, _subject, _html, _text, _from, _attachments = [] }) {
    throw new Error("sendEmail must be implemented by subclass");
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail({ emails }) {
    const results = [];
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push({ success: true, to: email.to, result });
      } catch (error) {
        results.push({ success: false, to: email.to, error: error.message });
      }
    }
    return results;
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if provider is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

/**
 * Supabase Email Provider
 * Uses Supabase Auth email sending
 */
export class SupabaseEmailProvider extends EmailProvider {
  constructor(config = {}) {
    super(config);
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
  }

  async sendEmail({ _to, _subject, _html, _text, _from, _attachments = [] }) {
    if (!this.isEnabled()) {
      throw new Error("Supabase email provider is not enabled");
    }

    // Supabase Auth provides email sending through auth.admin API
    // This would typically be called from backend
    throw new Error("Supabase email sending requires backend implementation");
  }
}

/**
 * SendGrid Email Provider
 */
export class SendGridEmailProvider extends EmailProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail || config.from;
  }

  async sendEmail({ _to, _subject, _html, _text, _from, _attachments = [] }) {
    if (!this.isEnabled()) {
      throw new Error("SendGrid provider is not enabled");
    }

    if (!this.apiKey) {
      throw new Error("SendGrid API key is not configured");
    }

    // SendGrid API implementation
    // This would use the SendGrid API to send emails
    throw new Error("SendGrid API integration requires backend implementation");
  }
}

/**
 * SMTP Email Provider
 */
export class SMTPEmailProvider extends EmailProvider {
  constructor(config = {}) {
    super(config);
    this.host = config.host;
    this.port = config.port || 587;
    this.secure = config.secure || false;
    this.auth = config.auth || {};
  }

  async sendEmail({ _to, _subject, _html, _text, _from, _attachments = [] }) {
    if (!this.isEnabled()) {
      throw new Error("SMTP provider is not enabled");
    }

    if (!this.host) {
      throw new Error("SMTP host is not configured");
    }

    // SMTP implementation
    // This would use nodemailer or similar to send emails
    throw new Error("SMTP integration requires backend implementation");
  }
}

/**
 * Factory function to create email provider
 */
export function createEmailProvider(type, config) {
  switch (type.toLowerCase()) {
    case 'supabase':
      return new SupabaseEmailProvider(config);
    case 'sendgrid':
      return new SendGridEmailProvider(config);
    case 'smtp':
      return new SMTPEmailProvider(config);
    default:
      throw new Error(`Unknown email provider type: ${type}`);
  }
}
