import { useContext } from "react";
import { CheckCircle2, Languages, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { useLocale } from "../contexts/LocaleContext";

const CONTENT = {
  "en-IN": {
    kicker: "Designed for financial clarity",
    title: "Your business, beautifully under control.",
    body: "A calm, secure operating system for collections, members, auctions, payouts and verified financial reporting.",
    points: ["Tenant-isolated business data", "Explainable calculations and immutable audit history", "Role-aware access across every workspace"],
    company: "VARDHAN SOFTWARE SOLUTIONS",
    theme: "Toggle dark mode",
  },
  "te-IN": {
    kicker: "ఆర్థిక స్పష్టత కోసం రూపొందించబడింది",
    title: "మీ వ్యాపారం, అందంగా మీ నియంత్రణలో.",
    body: "వసూళ్లు, సభ్యులు, వేలం, చెల్లింపులు మరియు ధృవీకరించిన ఆర్థిక నివేదికల కోసం ప్రశాంతమైన, సురక్షితమైన ఆపరేటింగ్ సిస్టమ్.",
    points: ["టెనెంట్-ఐసోలేటెడ్ వ్యాపార డేటా", "వివరించగల లెక్కలు మరియు మార్పులేని ఆడిట్ చరిత్ర", "ప్రతి వర్క్‌స్పేస్‌లో పాత్ర ఆధారిత యాక్సెస్"],
    company: "వర్ధన్ సాఫ్ట్‌వేర్ సొల్యూషన్స్",
    theme: "డార్క్ మోడ్ మార్చండి",
  },
};

function AuthLayout() {
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const activeLocale = locale === "te-IN" ? "te-IN" : "en-IN";
  const copy = CONTENT[activeLocale];

  return (
    <main className="premium-auth-layout">
      <div className="premium-auth-ambient" aria-hidden="true"><span /><span /><span /></div>
      <header className="premium-auth-toolbar">
        <Link className="premium-auth-brand" to="/"><span>V</span><strong>VARDHAN OS</strong></Link>
        <div className="premium-auth-controls">
          <div className="premium-language-control" role="group" aria-label="Language"><Languages size={16} /><button type="button" className={activeLocale === "en-IN" ? "active" : ""} onClick={() => setLocale("en-IN")}>EN</button><button type="button" className={activeLocale === "te-IN" ? "active" : ""} onClick={() => setLocale("te-IN")}>తె</button></div>
          <button className="premium-theme-toggle" type="button" onClick={toggleTheme} aria-label={copy.theme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </header>
      <section className="premium-auth-story" aria-label="VARDHAN OS security overview">
        <div className="premium-auth-story-inner">
          <span className="premium-auth-kicker"><Sparkles size={16} />{copy.kicker}</span>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
          <div className="premium-auth-trust-list">{copy.points.map((point) => <span key={point}><CheckCircle2 size={18} />{point}</span>)}</div>
          <div className="premium-auth-security"><ShieldCheck size={18} /><span><strong>VARDHAN SECURE ACCESS</strong><small>{copy.company}</small></span></div>
        </div>
      </section>
      <section className="premium-auth-form-panel"><Outlet context={{ locale: activeLocale }} /></section>
    </main>
  );
}

export default AuthLayout;
