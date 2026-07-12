import { ERP_MODULES, CHIT_MANAGEMENT_ERP, hasModuleAccess, isPlatformOwner } from "../config/erpModules.js";
import { LicenseRepository } from "../repositories/LicenseRepository.js";
import { getBusinessHealthDashboardModel } from "./businessHealthService.js";
import { getActivityTimeline } from "./activityService.js";
import { getAIInsights } from "./aiInsightsService.js";
import { getNotificationCenter } from "./notificationService.js";
import { getFinanceDashboardSummary } from "./financeService.js";

export function getVardhanHomeModel({ tenantContext, workspace, workspaces = [], modules = {}, profile, role } = {}) {
  const health = getBusinessHealthDashboardModel(tenantContext);
  const finance = getFinanceDashboardSummary(tenantContext);
  const activities = getActivityTimeline(tenantContext);
  const insights = getAIInsights(tenantContext);
  const notifications = getNotificationCenter(tenantContext);
  const owner = isPlatformOwner(profile, role);
  const subscriptions = LicenseRepository.listTenantSubscriptions(workspace);
  const kpi = Object.fromEntries(health.kpis.map((item) => [item.label, item]));
  const applications = ERP_MODULES.map((app) => {
    const subscription = subscriptions.find((item) => item.productId === app.id) || null;
    const implemented = app.id === CHIT_MANAGEMENT_ERP;
    const permitted = owner || hasModuleAccess(app.id, modules, profile, role);
    return {
      ...app,
      implemented,
      permitted,
      subscription,
      state: implemented ? (permitted ? "Available" : "Restricted") : "Coming soon",
      launchable: implemented && permitted,
      summary: implemented ? `${kpi["Active Chits"]?.value || "0"} active groups · ${kpi.Members?.value || "0"} members` : "Product roadmap item — workflows are not yet released.",
    };
  });
  return {
    summary: [
      { label: "Active businesses", value: String(workspaces.filter((item) => String(item.status).toLowerCase() !== "inactive").length), route: "/admin/companies" },
      { label: "ERP subscriptions", value: String(applications.filter((item) => item.launchable).length), route: "/products/catalog" },
      { label: "Total users", value: String(workspaces.reduce((sum, item) => sum + Number(item.activeUsers || 0), 0)), route: "/admin/users" },
      { label: "Monthly collections", value: kpi["Monthly Collection"]?.value || "₹0", route: "/chits/collections" },
      { label: "Pending amount", value: kpi.Pending?.value || "₹0", route: "/chits/collections/pending" },
      { label: "Net profit", value: finance.metrics.find((item) => item.key === "netProfit")?.displayValue || "₹0", route: "/chits/finance" },
      { label: "Security alerts", value: String(notifications.notifications.filter((item) => item.priority === "critical").length), route: "/admin/audit-logs" },
      { label: "Open support tickets", value: "0", route: "/admin/support", helper: "No tenant ticket repository entries" },
    ],
    applications,
    activities: activities.slice(0, 6),
    insights: insights.slice(0, 3),
    health: health.health,
    unreadCount: notifications.unreadCount,
  };
}

export const VARDHAN_HOME_ACTIONS = [
  ["Create chit", "/chits/groups"], ["Import chit", "/chits/documents"],
  ["Add member", "/chits/members"], ["Record collection", "/chits/collections"],
  ["Generate receipt", "/chits/receipts"], ["Open reports", "/chits/reports"],
  ["Ask AI", "/chits/ai"], ["Raise support ticket", "/chits/support"],
];
