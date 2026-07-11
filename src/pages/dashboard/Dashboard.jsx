import { useMemo, useRef, useState } from "react";
import {
  Banknote,
  Coins,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardHero from "../../components/dashboard/DashboardHero";
import BusinessHealthCard from "../../components/dashboard/BusinessHealthCard";
import AIInsights from "../../components/dashboard/AIInsights";
import NotificationCenter from "../../components/dashboard/NotificationCenter";
import ActivityTimeline from "../../components/dashboard/ActivityTimeline";
import KPIGrid from "../../components/dashboard/KPIGrid";
import ImportWizard from "../../components/import/ImportWizard";
import AIChitPlanDesigner from "../../components/ai/AIChitPlanDesigner";
import SmartChitCapture from "../../components/ai/SmartChitCapture";
import VardhanAIAssistant from "../../components/ai/VardhanAIAssistant";
import ReportsDashboard from "../../components/reports/ReportsDashboard";
import FinanceSummaryWidget from "../../components/dashboard/FinanceSummaryWidget";
import ChitLifecycleWidget from "../../components/dashboard/ChitLifecycleWidget";
import TrialRunChecklist from "../../components/dashboard/TrialRunChecklist";
import WelcomeSection from "../../components/dashboard/WelcomeSection";
import MyBusinessWorkspace from "../../components/dashboard/MyBusinessWorkspace";
import BusinessHealthDashboard from "../../components/dashboard/BusinessHealthDashboard";
import QuickStats from "../../components/dashboard/QuickStats";
import ModuleGrid from "../../components/dashboard/ModuleGrid";
import RecentActivity from "../../components/dashboard/RecentActivity";
import NotificationsPanel from "../../components/dashboard/NotificationsPanel";
import LicenseStatus from "../../components/dashboard/LicenseStatus";
import SupportCard from "../../components/dashboard/SupportCard";
import SystemStatus from "../../components/dashboard/SystemStatus";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import {
  BUSINESS_HEALTH_ICON_KEYS,
  getBusinessHealthDashboardModel,
} from "../../services/businessHealthService";
import { getAIInsights } from "../../services/aiInsightsService";
import {
  getNotificationCenter,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import { getActivityTimeline } from "../../services/activityService";
import {
  exportEnterpriseReport,
  getReportsDashboardModel,
} from "../../services/reportsService";
import { getSecurityLicenseDashboardModel } from "../../services/securityService";
import { getFinanceDashboardSummary } from "../../services/financeService";
import { getChitLifecycleDashboardModel } from "../../services/chitLifecycleService";
import {
  exportTrialRunReport,
  getTrialRunChecklist,
  reconcileTrialRun,
  resetTrialData,
  resumeTrialRun,
  startTrialRun,
} from "../../services/trialRunService";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import "../../components/dashboard/Dashboard.css";

const KPI_ICONS = {
  [BUSINESS_HEALTH_ICON_KEYS.ACTIVE_CHITS]: WalletCards,
  [BUSINESS_HEALTH_ICON_KEYS.MEMBERS]: Users,
  [BUSINESS_HEALTH_ICON_KEYS.TODAY_COLLECTION]: ReceiptText,
  [BUSINESS_HEALTH_ICON_KEYS.MONTHLY_COLLECTION]: Banknote,
  [BUSINESS_HEALTH_ICON_KEYS.PENDING]: TrendingUp,
  [BUSINESS_HEALTH_ICON_KEYS.PROFIT]: Coins,
};

function Dashboard() {
  const navigate = useNavigate();
  const {
    activeTenantContext: authTenantContext,
    activeWorkspace: authWorkspace,
    company,
    modules,
    permissions,
    profile,
    role,
    user,
  } = useAuth();
  const {
    activeWorkspace,
    activeWorkspaceContext,
    workspaceHealth,
    workspaces,
    switchWorkspace,
  } = useWorkspace();
  const activeTenantContext = activeWorkspaceContext || authTenantContext;
  const [searchValue, setSearchValue] = useState("");
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isTrialRunOpen, setIsTrialRunOpen] = useState(false);
  const [smartCaptureIntent, setSmartCaptureIntent] = useState("image");
  const [trialRunVersion, setTrialRunVersion] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const smartCaptureRef = useRef(null);
  const dashboardModel = useMemo(
    () => getBusinessHealthDashboardModel(activeTenantContext),
    [activeTenantContext]
  );
  const aiInsights = useMemo(
    () => getAIInsights(activeTenantContext),
    [activeTenantContext]
  );
  const notificationCenter = useMemo(
    () => getNotificationCenter(activeTenantContext),
    [activeTenantContext, notificationVersion]
  );
  const activities = useMemo(
    () => getActivityTimeline(activeTenantContext),
    [activeTenantContext]
  );
  const reportsModel = useMemo(
    () => getReportsDashboardModel(activeTenantContext),
    [activeTenantContext]
  );
  const financeSummary = useMemo(
    () => getFinanceDashboardSummary(activeTenantContext),
    [activeTenantContext]
  );
  const chitLifecycleModel = useMemo(
    () => getChitLifecycleDashboardModel(activeTenantContext),
    [activeTenantContext]
  );
  const trialRunModel = useMemo(
    () => getTrialRunChecklist(activeTenantContext),
    [activeTenantContext, trialRunVersion]
  );
  const securityLicenseModel = useMemo(
    () => getSecurityLicenseDashboardModel({
      user,
      profile,
      role,
      permissions,
      modules,
      workspace: activeWorkspace,
    }),
    [activeWorkspace, modules, permissions, profile, role, user]
  );
  const kpiItems = dashboardModel.kpis.map((item) => ({
    ...item,
    icon: KPI_ICONS[item.iconKey],
  }));
  const refreshNotifications = () => setNotificationVersion((current) => current + 1);
  const openNotification = (notification) => {
    markNotificationRead(notification.id);
    refreshNotifications();
    setIsNotificationCenterOpen(false);
    navigate(notification.actionRoute);
  };
  const markVisibleNotificationsRead = () => {
    markAllNotificationsRead(notificationCenter.notifications);
    refreshNotifications();
  };
  const openReports = (route = "/chits/reports") => navigate(route || "/chits/reports");
  const exportReport = (reportId, format, filters) => {
    const exportPayload = exportEnterpriseReport(reportId, format, filters, activeTenantContext);

    if (exportPayload.format === "Print") {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (printWindow) {
        printWindow.document.write(exportPayload.content);
        printWindow.document.close();
        printWindow.print();
      }
      return;
    }

    const blob = new Blob([exportPayload.content], { type: exportPayload.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportPayload.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };
  const refreshTrialRun = () => setTrialRunVersion((current) => current + 1);
  const runTrialAction = (action) => {
    action(activeTenantContext);
    refreshTrialRun();
  };
  const exportTrialReport = () => {
    const exportPayload = exportTrialRunReport(trialRunModel);
    const blob = new Blob([exportPayload.content], { type: exportPayload.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportPayload.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };
  const openSmartCapture = (intent = "image") => {
    setSmartCaptureIntent(intent);
    window.setTimeout(() => {
      smartCaptureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <DashboardLayout>
      <div className="dashboard-page royal-dashboard-page">
        <section className="royal-dashboard-shell" aria-label="Royal enterprise dashboard redesign">
          <DashboardHeader
            workspace={activeWorkspace}
            workspaceHealth={workspaceHealth}
            workspaces={workspaces}
            onWorkspaceSwitch={switchWorkspace}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchClear={() => setSearchValue("")}
            unreadCount={notificationCenter.unreadCount}
            onNotificationsClick={() => setIsNotificationCenterOpen(true)}
            onSettingsClick={() => navigate("/chits/settings")}
          />
          <NotificationCenter
            isOpen={isNotificationCenterOpen}
            notifications={notificationCenter.notifications}
            unreadCount={notificationCenter.unreadCount}
            onClose={() => setIsNotificationCenterOpen(false)}
            onMarkAllRead={markVisibleNotificationsRead}
            onNotificationAction={openNotification}
          />
          <DashboardHero
            productName={CHIT_PRODUCT_NAME}
            companyName={activeWorkspace?.businessName || company?.company_name || "Vardhan ERP"}
            workspaceLabel={activeWorkspace?.module || authWorkspace?.label || "Chit business workspace"}
            onOpenWorkspace={() => navigate("/chits")}
            onAddCollection={() => navigate("/chits/collections")}
            onReceiptAction={() => navigate("/chits/receipts")}
            onSmartImport={() => setIsImportWizardOpen(true)}
            onSmartCapture={openSmartCapture}
            onStartTrialRun={() => setIsTrialRunOpen(true)}
          />
          <ImportWizard
            isOpen={isImportWizardOpen}
            onClose={() => setIsImportWizardOpen(false)}
          />
          <TrialRunChecklist
            model={trialRunModel}
            isOpen={isTrialRunOpen}
            onClose={() => setIsTrialRunOpen(false)}
            onStepOpen={(route) => navigate(route)}
            onStart={() => runTrialAction(startTrialRun)}
            onResume={() => runTrialAction(resumeTrialRun)}
            onReset={() => runTrialAction(resetTrialData)}
            onReconcile={() => runTrialAction(reconcileTrialRun)}
            onExport={exportTrialReport}
          />
          <BusinessHealthCard
            score={dashboardModel.health.score}
            tone={dashboardModel.health.status.toLowerCase()}
            title={`${dashboardModel.health.status} business health`}
            summary={dashboardModel.health.aiSuggestion}
            signals={dashboardModel.signals}
          />
          <ChitLifecycleWidget model={chitLifecycleModel} />
          <AIInsights
            insights={aiInsights}
            onInsightAction={(route) => navigate(route)}
          />
          <div className="vardhan-ai-workbench">
            <VardhanAIAssistant
              activeTenantContext={activeTenantContext}
              onOpenImport={() => setIsImportWizardOpen(true)}
            />
            <AIChitPlanDesigner activeTenantContext={activeTenantContext} />
            <div ref={smartCaptureRef}>
              <SmartChitCapture
                activeTenantContext={activeTenantContext}
                intent={smartCaptureIntent}
              />
            </div>
          </div>
          <ActivityTimeline
            activities={activities}
            onActivityOpen={(route) => navigate(route)}
          />
          <ReportsDashboard
            model={reportsModel}
            onOpenReports={openReports}
            onExport={exportReport}
          />
          <FinanceSummaryWidget
            model={financeSummary}
            onOpenFinance={() => navigate("/chits/finance")}
          />
          <KPIGrid items={kpiItems} />
        </section>

        <div className="royal-dashboard-continuity">
          <p className="royal-dashboard-continuity-title">Existing workspace</p>
          <WelcomeSection />
          <MyBusinessWorkspace />
          <BusinessHealthDashboard />
          <QuickStats />

          <div className="dashboard-grid">
            <div className="dashboard-main">
              <ModuleGrid />
              <RecentActivity />
            </div>

            <div className="dashboard-side">
              <LicenseStatus model={securityLicenseModel} />
              <NotificationsPanel />
              <SystemStatus />
              <SupportCard />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
