import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./DashboardLayout.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  return (
    <div className="dashboard-layout">
      <a className="dashboard-skip-link" href="#dashboard-main">Skip to dashboard content</a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="dashboard-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <div className="dashboard-content">
        <Topbar onMenuToggle={() => setSidebarOpen((value) => !value)} />
        <main id="dashboard-main" className="dashboard-main-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
