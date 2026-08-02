export const PUBLIC_PRODUCTS = {
  "mitra-nidhi-chiti-pro": {
    name: "MITRA NIDHI CHITI PRO",
    status: "Available",
    accent: "violet",
    audience: "Chit organizers, staff and members",
    problem: "Disconnected ledgers, collections, auctions and receipts create avoidable risk.",
    features: [
      "Connected chit lifecycle",
      "Explainable calculations",
      "Collections and receipts",
      "Auctions, lift and payouts",
      "AI document reconstruction",
    ],
    steps: [
      "Create or import a chit",
      "Confirm rules and schedule",
      "Add members",
      "Collect and issue receipts",
      "Reconcile reports",
    ],
  },
  "school-erp": {
    name: "School ERP",
    status: "Roadmap — not released",
    accent: "blue",
    audience: "Schools and education administrators",
    problem: "School workflows need one clear, secure operating system.",
    features: [
      "Admissions architecture",
      "Student lifecycle architecture",
      "Fees architecture",
      "Staff operations architecture",
    ],
    steps: [],
  },
  "college-erp": {
    name: "College ERP",
    status: "Roadmap — not released",
    accent: "green",
    audience: "Colleges and higher-education teams",
    problem: "Academic and administrative workflows need connected records.",
    features: [
      "Department architecture",
      "Admissions architecture",
      "Examination architecture",
      "Student lifecycle architecture",
    ],
    steps: [],
  },
  "private-hostels-erp": {
    name: "Private Hostels ERP",
    status: "Roadmap — not released",
    accent: "teal",
    audience: "Private hostel owners and staff",
    problem: "Residents, rooms, fees and mess operations require consistent records.",
    features: [
      "Resident architecture",
      "Room architecture",
      "Fee architecture",
      "Mess operations architecture",
    ],
    steps: [],
  },
  "insurance-crm": {
    name: "Insurance CRM",
    status: "Roadmap — not released",
    accent: "orange",
    audience: "Insurance team leaders and agents",
    problem: "Leads, renewals and follow-ups need reliable ownership and visibility.",
    features: [
      "Lead architecture",
      "Agent workflow architecture",
      "Renewal architecture",
      "Follow-up architecture",
    ],
    steps: [],
  },
};

export const PUBLIC_NAV = [
  "Vardhan",
  "Products",
  "Features",
  "How It Works",
  "Pricing",
  "Videos",
  "Tutorials",
  "Documentation",
  "Blogs",
  "Security",
  "Contact",
];

/** Pastel icon square tints from the locked design system (rotate only these). */
export const MODULE_ICON_TINTS = [
  "#F6E3E9",
  "#E1F2E7",
  "#FBEED9",
  "#EBE3F0",
  "#F8E1E6",
  "#DEEAF5",
];

/**
 * Landing icon strip + module rows.
 * Product truth stays in PUBLIC_PRODUCTS; Partner OS maps to existing /vardhan-os copy.
 */
export const LANDING_MODULES = [
  {
    id: "chit",
    icon: "users",
    label: "Chit Mgmt",
    title: "Chit Management Pro",
    description:
      "Groups, auctions, member payouts and collections — connected ledger work for chit organizers.",
    href: "/products/mitra-nidhi-chiti-pro",
    productSlug: "mitra-nidhi-chiti-pro",
  },
  {
    id: "school",
    icon: "school",
    label: "School ERP",
    title: "School ERP",
    description:
      "Admissions, fees, student lifecycle and staff operations architecture for schools.",
    href: "/products/school-erp",
    productSlug: "school-erp",
  },
  {
    id: "college",
    icon: "college",
    label: "College ERP",
    title: "College ERP",
    description:
      "Departments, admissions, examinations and student records for higher-education teams.",
    href: "/products/college-erp",
    productSlug: "college-erp",
  },
  {
    id: "hostel",
    icon: "hostel",
    label: "Hostel ERP",
    title: "Private Hostel ERP",
    description:
      "Residents, rooms, fees and mess operations with consistent records for private hostels.",
    href: "/products/private-hostels-erp",
    productSlug: "private-hostels-erp",
  },
  {
    id: "partner",
    icon: "partner",
    label: "Partner OS",
    title: "Partner OS",
    description:
      "Vardhan — unified access, workspace isolation, subscriptions, support and AI guidance across approved applications.",
    href: "/vardhan-os",
    productSlug: null,
  },
  {
    id: "insurance",
    icon: "shield",
    label: "Insurance CRM",
    title: "Insurance CRM",
    description:
      "Leads, agent workflows, renewals and follow-ups with reliable ownership and visibility.",
    href: "/products/insurance-crm",
    productSlug: "insurance-crm",
  },
];

export const LANDING_FEATURES = [
  {
    title: "Billing & collections",
    body: "Invoices, dues and payment follow-ups stay connected to the real business record.",
  },
  {
    title: "WhatsApp-ready reminders",
    body: "Renewal and due-date messages where customers actually read them — when channels are configured.",
  },
  {
    title: "Role-based access",
    body: "Front desk, accountant and owner each see exactly what their job needs.",
  },
  {
    title: "Audit trail",
    body: "Edits are timestamped and attributed — useful the day someone asks who changed this.",
  },
  {
    title: "Explainable calculations",
    body: "Chit math and business rules stay visible so teams can trust the numbers.",
  },
  {
    title: "Tenant isolation",
    body: "Workspace boundaries, role checks and audit-ready actions are built into the platform.",
  },
];
