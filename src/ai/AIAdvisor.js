import { createAssistantResponse } from "./AIContext.js";

export function generateBusinessInsights(context) {
  const health = context.source.health;
  const insights = context.source.insights || [];
  const responses = insights.slice(0, 4).map((insight) =>
    createAssistantResponse({
      id: `advisor-${insight.id}`,
      type: "BUSINESS_INSIGHT",
      title: insight.title,
      message: insight.message,
      action: { label: insight.actionLabel || "Open", route: insight.actionRoute || "/dashboard" },
      confidence: insight.priority === "critical" ? 0.9 : 0.82,
      severity: mapPriorityToSeverity(insight.priority),
    })
  );

  if (health) {
    responses.unshift(createAssistantResponse({
      id: "advisor-business-health",
      type: "BUSINESS_HEALTH",
      title: `${health.status} business health`,
      message: `${health.score}% score. ${health.aiSuggestion}`,
      action: { label: "Open dashboard", route: "/dashboard" },
      confidence: 0.87,
      severity: health.score < 70 ? "warning" : "success",
    }));
  }

  return responses;
}

export function getRecommendations(context) {
  return [
    ...generateBusinessInsights(context),
    createAssistantResponse({
      id: "recommendation-command-center",
      type: "RECOMMENDATION",
      title: "Use AI command routing",
      message: "Route owner commands like show pending, open collections, and generate receipt through the shared AI engine.",
      action: { label: "Open dashboard", route: "/dashboard" },
      confidence: 0.8,
      severity: "info",
    }),
  ];
}

export function predictBusinessHealth(context) {
  const health = context.source.health;

  if (!health) {
    return createAssistantResponse({
      id: "prediction-unavailable",
      type: "BUSINESS_HEALTH_PREDICTION",
      title: "Business health unavailable",
      message: "Business health prediction needs tenant chit data.",
      action: { label: "Open dashboard", route: "/dashboard" },
      confidence: 0.4,
      severity: "warning",
    });
  }

  return createAssistantResponse({
    id: "prediction-business-health",
    type: "BUSINESS_HEALTH_PREDICTION",
    title: `${health.status} outlook`,
    message: `Current signals predict a ${health.status.toLowerCase()} operating posture with ${health.collectionRate}% collection rate.`,
    action: { label: "Open reports", route: "/chits/reports" },
    confidence: 0.81,
    severity: health.score < 70 ? "warning" : "success",
  });
}

function mapPriorityToSeverity(priority) {
  if (priority === "critical") return "critical";
  if (priority === "high") return "warning";
  if (priority === "low") return "info";
  return "info";
}
