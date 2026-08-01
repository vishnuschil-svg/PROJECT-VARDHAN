import { AcademyRepository } from "../repositories/AcademyRepository.js";

export const ACADEMY_CATALOG = [
  {
    id: "organizer-start",
    title: "Organizer quick start",
    roles: ["CUSTOMER_OWNER", "PLATFORM_OWNER"],
    erp: "MITRA_NIDHI_CHITI_PRO",
    feature: "ONBOARDING",
    duration: 2,
    shortExplanation: "Set up your first business workspace and understand the daily workflow.",
    writtenGuide: "Choose or import a chit, confirm rules, add members, then begin collections.",
    quickVideo: { status: "metadata_only", durationSeconds: 120, url: "" },
    fullTutorial: { status: "metadata_only", url: "" },
    voice: { status: "provider_required", scriptKey: "academy.organizer_start" },
    faq: ["How do I create my first chit?", "Can I import an old plan?"],
    walkthrough: [
      { id: "wt-groups-nav", text: "Open Chit Groups", target: "/chits/groups" },
      { id: "wt-create-group", text: "Create or import", target: "/chits/groups?create=1" },
      { id: "wt-review-rules", text: "Review rules", target: null },
      { id: "wt-add-members", text: "Add members", target: "/chits/members" },
    ],
    version: "1.0",
  },
  {
    id: "collections",
    title: "Record a collection safely",
    roles: ["CUSTOMER_OWNER", "ADMIN", "STAFF"],
    erp: "MITRA_NIDHI_CHITI_PRO",
    feature: "COLLECTIONS",
    duration: 4,
    shortExplanation: "Resolve the exact payable and prevent duplicate receipts.",
    writtenGuide: "Select member and group, verify payable evidence, enter payment details, confirm, and review the receipt.",
    quickVideo: { status: "metadata_only", durationSeconds: 120, url: "" },
    fullTutorial: { status: "metadata_only", url: "" },
    voice: { status: "provider_required", scriptKey: "academy.collections" },
    faq: ["Why was a duplicate blocked?", "How does partial payment work?"],
    walkthrough: [
      { id: "wt-search-member", text: "Search member", target: "/chits/collections" },
      { id: "wt-review-payable", text: "Review payable", target: null },
      { id: "wt-enter-payment", text: "Enter payment", target: null },
      { id: "wt-confirm-receipt", text: "Confirm receipt", target: "/chits/receipts" },
    ],
    version: "1.0",
  },
  {
    id: "subscriber",
    title: "Member two-minute tour",
    roles: ["SUBSCRIBER", "MEMBER"],
    erp: "MITRA_NIDHI_CHITI_PRO",
    feature: "MEMBER_PORTAL",
    duration: 2,
    shortExplanation: "View chit status, receipts, ledger and support.",
    writtenGuide: "Review your current chit, download receipts, check the ledger and use Support for questions.",
    quickVideo: { status: "metadata_only", durationSeconds: 120, url: "" },
    fullTutorial: { status: "metadata_only", url: "" },
    voice: { status: "provider_required", scriptKey: "academy.member_tour" },
    faq: ["Where is my receipt?", "How do I contact support?"],
    walkthrough: [
      { id: "wt-open-profile", text: "Open profile", target: "/chits/members" },
      { id: "wt-view-chit", text: "View chit", target: null },
      { id: "wt-download-receipt", text: "Download receipt", target: "/chits/receipts" },
      { id: "wt-open-ledger", text: "Open ledger", target: "/chits/member-ledger" },
    ],
    version: "1.0",
  },
];

export function getLearningPath({ role = "STAFF", query = "", context } = {}) {
  const progress = AcademyRepository.list(context);
  const normalized = String(role).toUpperCase();
  return ACADEMY_CATALOG
    .filter((item) => item.roles.includes(normalized) || normalized === "PLATFORM_OWNER")
    .filter((item) => !query || `${item.title} ${item.feature}`.toLowerCase().includes(query.toLowerCase()))
    .map((item) => ({
      ...item,
      progress: progress.find((row) => row.courseId === item.id) || { status: "Not Started", completedSteps: [] },
    }));
}

export function updateLearningProgress(course, patch, context) {
  return AcademyRepository.save(
    {
      courseId: course.id,
      version: course.version,
      status: patch.status || "In Progress",
      completedSteps: patch.completedSteps || [],
      lastStep: patch.lastStep || 0,
      updatedAt: new Date().toISOString(),
    },
    context
  );
}
