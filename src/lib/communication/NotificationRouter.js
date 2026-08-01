import { createEmailProvider } from "./EmailProvider.js";
import { createSMSProvider } from "./SMSProvider.js";

/**
 * Notification Router
 * Routes notifications to appropriate providers based on recipient preferences
 */
export class NotificationRouter {
  constructor(options = {}) {
    this.emailProvider = options.emailProvider || null;
    this.smsProvider = options.smsProvider || null;
    this.defaultChannel = options.defaultChannel || 'email';
    this.notificationLog = [];
  }

  /**
   * Configure email provider
   */
  configureEmailProvider(type, config) {
    this.emailProvider = createEmailProvider(type, config);
  }

  /**
   * Configure SMS provider
   */
  configureSMSProvider(type, config) {
    this.smsProvider = createSMSProvider(type, config);
  }

  /**
   * Send a notification
   */
  async sendNotification({ recipient, channels, subject, message, html, attachments = [] }) {
    const results = [];
    const effectiveChannels = channels || [this.defaultChannel];

    for (const channel of effectiveChannels) {
      try {
        const result = await this.sendToChannel({
          channel,
          recipient,
          subject,
          message,
          html,
          attachments,
        });
        results.push({ channel, success: true, result });
      } catch (error) {
        results.push({ channel, success: false, error: error.message });
      }
    }

    this.logNotification({
      recipient,
      channels: effectiveChannels,
      subject,
      results,
    });

    return results;
  }

  /**
   * Send to specific channel
   */
  async sendToChannel({ channel, recipient, subject, message, html, attachments }) {
    switch (channel.toLowerCase()) {
      case 'email':
        return await this.sendEmail({
          to: recipient.email,
          subject,
          html,
          text: message,
          attachments,
        });
      case 'sms':
        return await this.sendSMS({
          to: recipient.phone,
          message,
        });
      case 'both':
        const emailResult = await this.sendEmail({
          to: recipient.email,
          subject,
          html,
          text: message,
          attachments,
        });
        const smsResult = await this.sendSMS({
          to: recipient.phone,
          message,
        });
        return { email: emailResult, sms: smsResult };
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, html, text, attachments }) {
    if (!this.emailProvider) {
      throw new Error("Email provider is not configured");
    }

    if (!this.emailProvider.isEnabled()) {
      throw new Error("Email provider is not enabled");
    }

    return await this.emailProvider.sendEmail({
      to,
      subject,
      html,
      text,
      attachments,
    });
  }

  /**
   * Send SMS
   */
  async sendSMS({ to, message }) {
    if (!this.smsProvider) {
      throw new Error("SMS provider is not configured");
    }

    if (!this.smsProvider.isEnabled()) {
      throw new Error("SMS provider is not enabled");
    }

    return await this.smsProvider.sendSMS({ to, message });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications({ recipients, subject, message, html, attachments = [] }) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendNotification({
          recipient,
          subject,
          message,
          html,
          attachments,
        });
        results.push({ recipient: recipient.email || recipient.phone, success: true, result });
      } catch (error) {
        results.push({ recipient: recipient.email || recipient.phone, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send collection reminder
   */
  async sendCollectionReminder({ recipient, chitGroupName, dueDate, amount }) {
    const subject = `Collection Reminder - ${chitGroupName}`;
    const message = `Dear Member, This is a reminder that your collection of ${amount} for ${chitGroupName} is due on ${dueDate}. Please ensure timely payment.`;
    const html = `
      <h2>Collection Reminder</h2>
      <p>Dear Member,</p>
      <p>This is a reminder that your collection of <strong>${amount}</strong> for <strong>${chitGroupName}</strong> is due on <strong>${dueDate}</strong>.</p>
      <p>Please ensure timely payment to avoid any penalties.</p>
      <p>Thank you,<br>VARDHAN ERP Platform</p>
    `;

    return await this.sendNotification({
      recipient,
      channels: ['email', 'sms'],
      subject,
      message,
      html,
    });
  }

  /**
   * Send auction notification
   */
  async sendAuctionNotification({ recipient, chitGroupName, auctionDate, auctionAmount }) {
    const subject = `Auction Notification - ${chitGroupName}`;
    const message = `Dear Member, The auction for ${chitGroupName} is scheduled on ${auctionDate}. The auction amount is ${auctionAmount}. Please attend or participate as per rules.`;
    const html = `
      <h2>Auction Notification</h2>
      <p>Dear Member,</p>
      <p>The auction for <strong>${chitGroupName}</strong> is scheduled on <strong>${auctionDate}</strong>.</p>
      <p>Auction Amount: <strong>${auctionAmount}</strong></p>
      <p>Please attend or participate as per the chit fund rules.</p>
      <p>Thank you,<br>VARDHAN ERP Platform</p>
    `;

    return await this.sendNotification({
      recipient,
      channels: ['email'],
      subject,
      message,
      html,
    });
  }

  /**
   * Send lucky draw notification
   */
  async sendLuckyDrawNotification({ recipient, chitGroupName, prizeAmount, drawDate }) {
    const subject = `Lucky Draw Result - ${chitGroupName}`;
    const message = `Congratulations! You have won the lucky draw for ${chitGroupName} with prize amount ${prizeAmount}. The draw was held on ${drawDate}.`;
    const html = `
      <h2>Lucky Draw Result</h2>
      <p>Dear Member,</p>
      <p>Congratulations! You have won the lucky draw for <strong>${chitGroupName}</strong>.</p>
      <p>Prize Amount: <strong>${prizeAmount}</strong></p>
      <p>Draw Date: <strong>${drawDate}</strong></p>
      <p>Thank you for participating!</p>
      <p>Best regards,<br>VARDHAN ERP Platform</p>
    `;

    return await this.sendNotification({
      recipient,
      channels: ['email', 'sms'],
      subject,
      message,
      html,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation({ recipient, chitGroupName, amount, paymentDate, receiptNumber }) {
    const subject = `Payment Confirmation - ${chitGroupName}`;
    const message = `Your payment of ${amount} for ${chitGroupName} has been received on ${paymentDate}. Receipt Number: ${receiptNumber}. Thank you for your payment.`;
    const html = `
      <h2>Payment Confirmation</h2>
      <p>Dear Member,</p>
      <p>Your payment of <strong>${amount}</strong> for <strong>${chitGroupName}</strong> has been successfully received.</p>
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Amount: ${amount}</li>
        <li>Payment Date: ${paymentDate}</li>
        <li>Receipt Number: ${receiptNumber}</li>
      </ul>
      <p>Thank you for your timely payment.</p>
      <p>Best regards,<br>VARDHAN ERP Platform</p>
    `;

    return await this.sendNotification({
      recipient,
      channels: ['email'],
      subject,
      message,
      html,
    });
  }

  /**
   * Get notification log
   */
  getNotificationLog() {
    return this.notificationLog;
  }

  /**
   * Clear notification log
   */
  clearNotificationLog() {
    this.notificationLog = [];
  }

  /**
   * Log notification
   */
  logNotification(logEntry) {
    this.notificationLog.push({
      ...logEntry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get notification statistics
   */
  getNotificationStats() {
    const stats = {
      total: this.notificationLog.length,
      successful: 0,
      failed: 0,
      byChannel: {},
      byRecipient: {},
    };

    for (const log of this.notificationLog) {
      const successCount = log.results.filter(r => r.success).length;
      const failCount = log.results.filter(r => !r.success).length;

      stats.successful += successCount;
      stats.failed += failCount;

      for (const result of log.results) {
        stats.byChannel[result.channel] = (stats.byChannel[result.channel] || 0) + 1;
      }

      const recipient = log.recipient.email || log.recipient.phone;
      stats.byRecipient[recipient] = (stats.byRecipient[recipient] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Factory function to create notification router
 */
export function createNotificationRouter(options) {
  return new NotificationRouter(options);
}

/**
 * Singleton instance
 */
let notificationRouterInstance = null;

export function getNotificationRouter() {
  if (!notificationRouterInstance) {
    notificationRouterInstance = createNotificationRouter();
  }
  return notificationRouterInstance;
}
