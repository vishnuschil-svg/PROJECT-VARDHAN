import { createAssistantResponse } from "./AIContext.js";

export function createReportSuggestions(context) {
  const health = context.source.health;
  const pendingRate = Number(health?.pendingRate || 0);
  const suggestions = [
    createAssistantResponse({
      id: "report-collection-summary",
      type: "REPORT_SUGGESTION",
      title: "Collection Summary Report",
      message: "Review paid, pending, partial, and receipt-linked collections.",
      action: { label: "Open reports", route: "/chits/reports" },
      confidence: 0.86,
      severity: "info",
    }),
    createAssistantResponse({
      id: "report-business-health",
      type: "REPORT_SUGGESTION",
      title: "Business Health Report",
      message: "Summarize health score, collection rate, cash flow, and profit trend.",
      action: { label: "Open reports", route: "/chits/reports" },
      confidence: 0.84,
      severity: "info",
    }),
  ];

  if (pendingRate >= 15) {
    suggestions.unshift(createAssistantResponse({
      id: "report-pending-risk",
      type: "REPORT_SUGGESTION",
      title: "Pending Risk Report",
      message: "Pending rate is elevated; generate a focused risk report for follow-up.",
      action: { label: "Open pending", route: "/chits/collections/pending" },
      confidence: 0.9,
      severity: "warning",
    }));
  }

  return suggestions;
}

export function createNotificationSuggestions(context) {
  const health = context.source.health;

  return [
    createAssistantResponse({
      id: "notification-health",
      type: "NOTIFICATION_SUGGESTION",
      title: "Business health notification",
      message: health
        ? `Notify owner when health score moves from ${health.status}.`
        : "Notify owner when business health data becomes available.",
      action: { label: "Open settings", route: "/chits/settings" },
      confidence: 0.78,
      severity: "info",
    }),
  ];
}
