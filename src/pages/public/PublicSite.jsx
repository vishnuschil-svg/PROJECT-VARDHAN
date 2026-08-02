import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ModuleIcon from "../../components/public/ModuleIcon";
import {
  LANDING_FEATURES,
  LANDING_MODULES,
  MODULE_ICON_TINTS,
  PUBLIC_PRODUCTS,
} from "../../config/publicSiteContent";
import "./PublicSite.css";

const pathMap = {
  "/": "home",
  "/vardhan-os": "os",
  "/features": "features",
  "/how-it-works": "how",
  "/pricing": "pricing",
  "/demo": "demo",
  "/trial": "trial",
  "/videos": "videos",
  "/tutorials": "tutorials",
  "/documentation": "docs",
  "/blogs": "blogs",
  "/customer-stories": "stories",
  "/security": "security",
  "/contact": "contact",
};

function BrandMark({ to = "/" }) {
  return (
    <Link className="public-brand" to={to}>
      <span className="public-brand-mark" aria-hidden="true">
        V
      </span>
      <span className="public-brand-text">
        <b>Vardhan</b>
        <span>ERP PLATFORM</span>
      </span>
    </Link>
  );
}

function PublicNav({ menuOpen, onToggle, onClose }) {
  return (
    <header className="public-header">
      <nav className="public-nav" aria-label="Primary">
        <BrandMark />
        <div className={`public-nav-links${menuOpen ? " open" : ""}`}>
          <Link to="/products/mitra-nidhi-chiti-pro" onClick={onClose}>
            Products
          </Link>
          <Link to={{ pathname: "/", hash: "modules" }} onClick={onClose}>
            Industries
          </Link>
          <Link to="/pricing" onClick={onClose}>
            Pricing
          </Link>
          <Link to="/contact" onClick={onClose}>
            Support
          </Link>
        </div>
        <div className="public-nav-cta">
          <Link className="public-signin" to="/login" onClick={onClose}>
            Sign in
          </Link>
          <Link className="public-btn public-btn-primary" to="/trial" onClick={onClose}>
            Start free
          </Link>
          <button
            type="button"
            className="public-menu-btn"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={onToggle}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer" id="footer">
      <div className="public-foot-top">
        <div className="public-foot-brand">
          <BrandMark />
          <p>Every kind of business, one operating system. Built for Indian teams.</p>
        </div>
        <div className="public-foot-col">
          <h5>Product</h5>
          <Link to="/products/mitra-nidhi-chiti-pro">Chit Management</Link>
          <Link to="/products/school-erp">School ERP</Link>
          <Link to="/products/college-erp">College ERP</Link>
          <Link to="/products/private-hostels-erp">Hostel ERP</Link>
          <Link to="/vardhan-os">Partner OS</Link>
        </div>
        <div className="public-foot-col">
          <h5>Company</h5>
          <Link to="/vardhan-os">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/security">Security</Link>
        </div>
        <div className="public-foot-col">
          <h5>Resources</h5>
          <Link to="/documentation">Documentation</Link>
          <Link to="/tutorials">Tutorials</Link>
          <Link to="/features">Features</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div className="public-foot-col">
          <h5>Legal</h5>
          <Link to="/security">Privacy</Link>
          <Link to="/contact">Terms</Link>
        </div>
      </div>
      <div className="public-foot-bottom">
        <p>© {new Date().getFullYear()} Vardhan Solutions. All rights reserved.</p>
      </div>
    </footer>
  );
}

function HandArrow() {
  return (
    <svg viewBox="0 0 130 80" fill="none" aria-hidden="true">
      <path
        d="M110 8 C 70 8, 40 30, 22 62"
        stroke="#7A1F3D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M22 62 L 30 50 M22 62 L 36 66"
        stroke="#7A1F3D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeLanding() {
  return (
    <>
      <section className="public-hero">
        <h1>
          All your business on <span className="public-mark">one platform.</span>
        </h1>
        <p className="public-hero-price">
          A modular multi-industry Business OS — start with{" "}
          <b>MITRA NIDHI CHITI PRO</b>, then grow into the applications your
          business needs.
        </p>
        <div className="public-hero-ctas">
          <Link className="public-btn public-btn-primary" to="/trial">
            Start now — it&apos;s free
          </Link>
          <Link className="public-btn public-btn-gray" to="/demo">
            Meet an advisor
          </Link>
        </div>
        <div className="public-handnote">
          <HandArrow />
          <span className="public-handnote-txt">
            MITRA NIDHI is available today —
            <br />
            other apps follow the <b>verified roadmap</b>
          </span>
        </div>
      </section>

      <div className="public-icon-strip" id="apps">
        <div className="public-icon-row">
          {LANDING_MODULES.map((mod, i) => (
            <Link className="public-icon-item" key={mod.id} to={mod.href}>
              <ModuleIcon name={mod.icon} tint={MODULE_ICON_TINTS[i % MODULE_ICON_TINTS.length]} />
              <span>{mod.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <section className="public-section">
        <div className="public-quote-card">
          <blockquote>&ldquo;If you simplify everything, you can do anything.&rdquo;</blockquote>
          <div className="public-quote-who">
            — the design principle behind every VARDHAN application
          </div>
        </div>
      </section>

      <section className="public-section public-modules" id="modules">
        <div className="public-section-head">
          <span className="public-eyebrow">A closer look</span>
          <h2>Each module, built for how that business runs</h2>
        </div>
        <div className="public-mod-list">
          {LANDING_MODULES.map((mod, i) => {
            const product = mod.productSlug ? PUBLIC_PRODUCTS[mod.productSlug] : null;
            const status = product?.status || "Platform layer";
            return (
              <div className="public-mod-row" key={mod.id}>
                <ModuleIcon
                  name={mod.icon}
                  tint={MODULE_ICON_TINTS[i % MODULE_ICON_TINTS.length]}
                  size={56}
                  className="public-mod-icon"
                />
                <div>
                  <h3>
                    {mod.title}
                    <small className="public-mod-status">{status}</small>
                  </h3>
                  <p>{mod.description}</p>
                </div>
                <Link className="public-mod-cta" to={mod.href}>
                  Explore →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="public-section" id="features">
        <div className="public-section-head center">
          <span className="public-eyebrow">Enterprise software, done right</span>
          <h2>The parts every business shares</h2>
        </div>
        <div className="public-feat-grid">
          {LANDING_FEATURES.map((feat) => (
            <div className="public-feat-item" key={feat.title}>
              <h4>
                <span className="public-dot" aria-hidden="true" />
                {feat.title}
              </h4>
              <p>{feat.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section">
        <div className="public-proof">
          <div className="public-proof-big">One Business OS. Clear product truth.</div>
          <div className="public-proof-sub">
            Available applications are marked Available. Roadmap products stay clearly marked until
            released — no fabricated customer counts or sample demos as evidence.
          </div>
        </div>
      </section>

      <section className="public-section public-cta-wrap">
        <div className="public-cta-band">
          <span className="public-eyebrow public-eyebrow-on-dark">Get started</span>
          <h2>Unleash your growth potential.</h2>
          <p>Set up MITRA NIDHI CHITI PRO today — then expand as more applications ship.</p>
          <div className="public-hero-ctas">
            <Link className="public-btn public-btn-on-dark" to="/trial">
              Start now — it&apos;s free
            </Link>
          </div>
          <p className="public-cta-note">Verified organizer access required · No fabricated claims</p>
        </div>
      </section>
    </>
  );
}

function FeatureList({ items }) {
  return (
    <div className="public-feature-list">
      {items.map((item) => (
        <div key={item}>
          <span className="public-dot" aria-hidden="true" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ProductGrid() {
  return (
    <section className="public-section">
      <div className="public-section-head">
        <span className="public-eyebrow">Product roadmap</span>
        <h2>One design system across every business application</h2>
      </div>
      <div className="public-mod-list">
        {Object.entries(PUBLIC_PRODUCTS).map(([slug, product], i) => (
          <div className="public-mod-row" key={slug}>
            <ModuleIcon
              name={LANDING_MODULES.find((m) => m.productSlug === slug)?.icon || "partner"}
              tint={MODULE_ICON_TINTS[i % MODULE_ICON_TINTS.length]}
              size={56}
            />
            <div>
              <h3>
                {product.name}
                <small className="public-mod-status">{product.status}</small>
              </h3>
              <p>{product.audience}</p>
            </div>
            <Link className="public-mod-cta" to={`/products/${slug}`}>
              Explore →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function OsPage() {
  return (
    <section className="public-detail">
      <span className="public-eyebrow">Partner OS</span>
      <h1>One operating system for approved VARDHAN business applications.</h1>
      <p>
        Unified access, workspace isolation, subscriptions, support, learning, search and AI
        guidance — without hiding business evidence.
      </p>
      <FeatureList
        items={[
          "Business Command Center",
          "ERP application switcher",
          "Unified AI workspace",
          "Support and ticket resolution",
          "Business identity and communication",
          "VARDHAN Academy",
        ]}
      />
      <ProductGrid />
    </section>
  );
}

function ProductPage({ product }) {
  return (
    <section className="public-detail">
      <span className="public-eyebrow">VARDHAN business application</span>
      <div style={{ marginTop: 12 }}>
        <small className="public-mod-status">{product.status}</small>
      </div>
      <h1>{product.name}</h1>
      <h2>Built for {product.audience.toLowerCase()}.</h2>
      <p>{product.problem}</p>
      <FeatureList items={product.features} />
      {product.steps.length > 0 ? (
        <div className="public-steps">
          {product.steps.map((step, i) => (
            <div key={step}>
              <b>{i + 1}</b>
              <span>{step}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="public-truth">
          <p>
            This application is part of the locked roadmap. Workflows, pricing, screenshots and
            demonstrations are not presented as complete.
          </p>
        </div>
      )}
      <div className="public-hero-ctas">
        <Link
          className="public-btn public-btn-primary"
          to={product.status === "Available" ? "/trial" : "/contact"}
        >
          {product.status === "Available" ? "Start trial" : "Register interest"}
        </Link>
        <Link className="public-btn public-btn-gray" to="/demo">
          Book demo
        </Link>
      </div>
    </section>
  );
}

const content = {
  features: [
    "Platform features",
    "Clear dashboards, explainable calculations, AI-assisted workflows, support, identity, localization and learning.",
  ],
  how: [
    "How it works",
    "Choose an application, configure the business workspace, confirm business rules and begin connected operations.",
  ],
  pricing: [
    "Pricing",
    "Final public prices have not been approved. Contact VARDHAN SOFTWARE SOLUTIONS for a current proposal.",
  ],
  demo: [
    "Book a demo",
    "Submit your business requirements through the approved sales channel. Automated scheduling is not connected yet.",
  ],
  trial: [
    "Start a trial",
    "Trial activation requires verified organizer access and approved subscription configuration.",
  ],
  videos: [
    "Video library",
    "Video metadata is ready in VARDHAN Academy. Published videos are pending production approval.",
  ],
  tutorials: [
    "Tutorials",
    "Role-based written guides and walkthroughs are available inside VARDHAN Academy.",
  ],
  docs: [
    "Documentation",
    "Product documentation covers architecture, calculations, workflows, security and provider dependencies.",
  ],
  blogs: [
    "Blogs",
    "Editorial publishing is not configured. No fabricated articles or publication dates are shown.",
  ],
  stories: [
    "Customer stories",
    "Verified customer permissions and source material are required before stories are published.",
  ],
  security: [
    "Security",
    "Tenant isolation, role checks, audit history, masked sensitive fields and Supabase-ready RLS architecture are built into the platform.",
  ],
  contact: [
    "Contact VARDHAN",
    "Official contact information will be published after business identity approval.",
  ],
};

function ContentPage({ page }) {
  const [title, body] = content[page];
  return (
    <section className="public-detail">
      <span className="public-eyebrow">Vardhan</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {page === "security" && (
        <FeatureList
          items={[
            "Tenant and workspace isolation",
            "Role and permission checks",
            "Audit-ready actions",
            "Provider secrets excluded from frontend",
            "Safe errors and diagnostics",
          ]}
        />
      )}
      <div className="public-hero-ctas" style={{ marginTop: 28 }}>
        <Link className="public-btn public-btn-primary" to="/login">
          Open Vardhan
        </Link>
        <Link className="public-btn public-btn-gray" to="/trial">
          Start free
        </Link>
      </div>
    </section>
  );
}

export default function PublicSite() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const slug = location.pathname.split("/").filter(Boolean).at(-1);
  const product = PUBLIC_PRODUCTS[slug];
  const page = product ? "product" : pathMap[location.pathname] || "home";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace(/^#/, "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname, location.hash]);

  return (
    <div className="public-site">
      <PublicNav
        menuOpen={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        onClose={() => setMenuOpen(false)}
      />
      <main>
        {page === "home" && <HomeLanding />}
        {page === "os" && <OsPage />}
        {page === "product" && <ProductPage product={product} />}
        {[
          "features",
          "how",
          "pricing",
          "demo",
          "trial",
          "videos",
          "tutorials",
          "docs",
          "blogs",
          "stories",
          "security",
          "contact",
        ].includes(page) && <ContentPage page={page} />}
      </main>
      <PublicFooter />
    </div>
  );
}
