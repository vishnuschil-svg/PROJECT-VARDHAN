import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./DashboardLayout.css";

function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <Topbar />
        <main className="dashboard-main-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
