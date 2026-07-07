import { Outlet } from "react-router-dom";
import "./AuthLayout.css";

function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <div className="auth-brand-card">
          <div className="auth-logo">V</div>

          <h1>VARDHAN ERP PLATFORM</h1>
          <p className="auth-tagline">Smart Software. Simple Management.</p>

          <div className="auth-enterprise-box">
            <h3>Enterprise-grade ERP Suite</h3>
            <p>
              Secure cloud platform for Chits, Schools, Colleges, Finance,
              Hospitals and Apartments.
            </p>
          </div>

          <ul className="auth-highlights">
            <li>Multi-customer data isolation</li>
            <li>Role-based secure access</li>
            <li>Audit logs and approval workflow</li>
            <li>Reports, receipts and notifications</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrapper">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
