import AdminNavigation from "./AdminNavigation";
import "./AdminLayout.css";

function AdminLayout({ children, title, subtitle, actions = null }) {
  return (
    <div className="admin-layout">
      <AdminNavigation />
      <main className="admin-main">
        {(title || actions) && (
          <div className="admin-header">
            <div className="admin-header-left">
              <h1 className="admin-title">{title}</h1>
              {subtitle && <p className="admin-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="admin-header-actions">{actions}</div>}
          </div>
        )}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
