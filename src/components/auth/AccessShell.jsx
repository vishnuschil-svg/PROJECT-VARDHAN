import { CheckCircle2, Globe2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";

const LANGUAGES = [
  ["en-IN", "English"], ["te-IN", "Telugu"], ["hi-IN", "Hindi"],
  ["ta-IN", "Tamil"], ["kn-IN", "Kannada"], ["ml-IN", "Malayalam"],
];

function AccessShell({ eyebrow, title, description, children, footer }) {
  const { locale, setLocale } = useLocale();
  return (
    <main className="access-shell">
      <section className="access-story" aria-label="VARDHAN OS overview">
        <Link className="access-brand" to="/">
          <span className="access-brand-mark">V</span>
          <span><strong>VARDHAN OS</strong><small>AI-Powered Business Operating System</small></span>
        </Link>
        <div className="access-story-copy">
          <span className="access-kicker"><Sparkles size={16} /> Powerful inside. Simple outside.</span>
          <h1>Run your business with clarity, confidence and control.</h1>
          <p>One secure workspace for MITRA NIDHI CHITI PRO and every approved VARDHAN application.</p>
          <div className="access-trust-list">
            <span><ShieldCheck size={18} /> Tenant-isolated business data</span>
            <span><CheckCircle2 size={18} /> Explainable calculations and audit history</span>
            <span><LockKeyhole size={18} /> Role-aware access and protected sessions</span>
          </div>
        </div>
        <p className="access-company">VARDHAN SOFTWARE SOLUTIONS · Smart Software. Simple Management.</p>
      </section>
      <section className="access-panel">
        <div className="access-language"><Globe2 size={16} /><select aria-label="Language" value={locale} onChange={(event) => setLocale(event.target.value)}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="access-card">
          <header><span className="access-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></header>
          {children}
          {footer && <footer className="access-footer">{footer}</footer>}
        </div>
      </section>
    </main>
  );
}

export default AccessShell;
