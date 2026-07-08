import DashboardLayout from "../../components/layout/DashboardLayout";
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

function Dashboard() {
  return (
    <DashboardLayout>
      <div className="dashboard-page">
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
            <LicenseStatus />
            <NotificationsPanel />
            <SystemStatus />
            <SupportCard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
