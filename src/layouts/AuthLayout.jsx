import { Link, Outlet } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import "./AuthLayout.css";

const CONTENT = {
  "en-IN": {
    title: "Every business you run, one ledger you can trust.",
    body: "Chit funds, schools, hostels and insurance workflows — reconciled the moment you log in.",
    ledgerLabel: "Platform truth",
    rows: [
      ["Available application", "MITRA NIDHI"],
      ["Roadmap products", "Clearly marked"],
      ["Data posture", "Tenant-isolated"],
    ],
    foot: "© Vardhan Solutions · Built for Indian businesses",
  },
  "te-IN": {
    title: "మీరు నడిపే ప్రతి వ్యాపారం, ఒకే నమ్మకమైన లెడ్జర్.",
    body: "చిట్ నిధులు, పాఠశాలలు, హాస్టళ్లు — లాగిన్ అయిన వెంటనే స్పష్టంగా.",
    ledgerLabel: "ప్లాట్‌ఫామ్ నిజం",
    rows: [
      ["అందుబాటులో ఉన్న యాప్", "MITRA NIDHI"],
      ["రోడ్‌మ్యాప్ ఉత్పత్తులు", "స్పష్టంగా గుర్తు"],
      ["డేటా భద్రత", "Tenant-isolated"],
    ],
    foot: "© Vardhan Solutions",
  },
};

function AuthLayout() {
  const { locale } = useLocale();
  const activeLocale = locale === "te-IN" ? "te-IN" : "en-IN";
  const copy = CONTENT[activeLocale];

  return (
    <main className="v-auth-screen">
      <section className="v-auth-left" aria-label="Vardhan brand panel">
        <Link className="v-brand v-brand-on-dark" to="/">
          <span className="v-brand-mark v-brand-mark-on-dark">V</span>
          <span className="v-brand-text">
            <b>Vardhan</b>
            <span>ERP PLATFORM</span>
          </span>
        </Link>

        <div className="v-auth-left-mid">
          <h1>{copy.title}</h1>
          <p className="v-auth-sub">{copy.body}</p>

          <div className="v-auth-ledger">
            <div className="v-auth-ledger-lbl">{copy.ledgerLabel}</div>
            {copy.rows.map(([k, v]) => (
              <div className="v-auth-ledger-row" key={k}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="v-auth-left-foot">{copy.foot}</p>
      </section>

      <section className="v-auth-right">
        <Outlet context={{ locale: activeLocale }} />
      </section>
    </main>
  );
}

export default AuthLayout;
