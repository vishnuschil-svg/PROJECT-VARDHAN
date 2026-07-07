import { useNavigate } from "react-router-dom";

const ERP_MODULES = [
  {
    id: "chits",
    name: "MITRA NIDHI CHITI PRO",
    shortName: "CHIT",
    description: "Professional chit group, member, collection and receipt management",
    status: "Active",
    path: "/chits",
  },
  {
    id: "school",
    name: "School ERP",
    shortName: "SCL",
    description: "Admissions, students, fees, staff and academic operations",
    status: "Coming Soon",
    path: "/products/school",
  },
  {
    id: "college",
    name: "College ERP",
    shortName: "CLG",
    description: "Higher education management platform",
    status: "Coming Soon",
    path: "/products/college",
  },
  {
    id: "finance",
    name: "Finance ERP",
    shortName: "FIN",
    description: "Finance, loans, collections and account tracking",
    status: "Coming Soon",
    path: "/products/finance",
  },
  {
    id: "hospital",
    name: "Hospital ERP",
    shortName: "HSP",
    description: "Patient, billing, staff and hospital operations",
    status: "Coming Soon",
    path: "/products/hospital",
  },
  {
    id: "apartment",
    name: "Apartment ERP",
    shortName: "APT",
    description: "Apartment maintenance, residents and facility management",
    status: "Coming Soon",
    path: "/products/apartment",
  },
  {
    id: "inventory",
    name: "Inventory ERP",
    shortName: "INV",
    description: "Stock, purchase, sales and warehouse management",
    status: "Coming Soon",
    path: "/products/inventory",
  },
  {
    id: "hr",
    name: "HR & Payroll",
    shortName: "HR",
    description: "Employees, attendance, payroll and HR operations",
    status: "Coming Soon",
    path: "/products/hr",
  },
  {
    id: "crm",
    name: "CRM",
    shortName: "CRM",
    description: "Leads, follow-ups, sales pipeline and customer management",
    status: "Coming Soon",
    path: "/products/crm",
  },
];

function ModuleGrid() {
  const navigate = useNavigate();

  return (
    <section className="module-grid-section">
      <div className="section-title-row">
        <div>
          <h2>ERP Product Suite</h2>
          <p>Manage all VARDHAN products from one secure workspace.</p>
        </div>
      </div>

      <div className="module-grid">
        {ERP_MODULES.map((module) => {
          const isActive = module.status === "Active";

          return (
            <div
              key={module.id}
              className={`card solid module-card ${isActive ? "interactive" : ""}`}
              onClick={() => {
                if (isActive) navigate(module.path);
              }}
              aria-disabled={!isActive}
            >
              <div className="module-header">
                <div className="module-icon">{module.shortName}</div>
                <div>
                  <h3 className="module-title">{module.name}</h3>
                  <p className="module-description">{module.description}</p>
                </div>
              </div>

              <div className="module-footer">
                <span className={`module-badge ${isActive ? "active" : "soon"}`}>
                  {module.status}
                </span>
                <button className="module-link" type="button" disabled={!isActive}>
                  {isActive ? "Open Module ->" : "Coming Soon"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ModuleGrid;
