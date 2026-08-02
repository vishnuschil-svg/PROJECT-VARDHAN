import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

function AccessShell({ eyebrow, title, description, children, footer }) {
  return (
    <main className="v-auth-screen access-shell">
      <section className="v-auth-left" aria-label="Vardhan brand panel">
        <Link className="v-brand v-brand-on-dark" to="/">
          <span className="v-brand-mark v-brand-mark-on-dark">V</span>
          <span className="v-brand-text">
            <b>Vardhan</b>
            <span>ERP PLATFORM</span>
          </span>
        </Link>
        <div className="v-auth-left-mid">
          <h1>Run your business with clarity and control.</h1>
          <p className="v-auth-sub">
            One secure workspace for MITRA NIDHI CHITI PRO and every approved Vardhan application.
          </p>
          <div className="v-auth-ledger">
            <div className="v-auth-ledger-lbl">Trust</div>
            <div className="v-auth-ledger-row">
              <span className="k">
                <ShieldCheck size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Tenant isolation
              </span>
              <span className="v">Built-in</span>
            </div>
            <div className="v-auth-ledger-row">
              <span className="k">
                <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Explainable math
              </span>
              <span className="v">Visible</span>
            </div>
            <div className="v-auth-ledger-row">
              <span className="k">
                <LockKeyhole size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Role-aware access
              </span>
              <span className="v">Enforced</span>
            </div>
          </div>
        </div>
        <p className="v-auth-left-foot">Vardhan Solutions · Smart Software. Simple Management.</p>
      </section>

      <section className="v-auth-right">
        <div className="access-card">
          <header>
            <span className="access-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
          {footer && <footer className="access-footer">{footer}</footer>}
        </div>
      </section>
    </main>
  );
}

export default AccessShell;
