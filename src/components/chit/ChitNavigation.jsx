import { NavLink, useLocation } from "react-router-dom";
import { Bot, ClipboardList, FileBarChart, GraduationCap, HandCoins, Headphones, Home, MoreHorizontal, Plus, ReceiptText, Scale, Settings, Target, Users, WalletCards } from "lucide-react";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import "./ChitNavigation.css";

export const CHIT_WORKFLOW_NAV = [
  { label: "Home", icon: Home, path: "/chits", exact: true },
  { label: "Chit Groups", icon: ClipboardList, path: "/chits/groups", related: [{ label: "Batches", path: "/chits/batches" }, { label: "Import documents", path: "/chits/documents" }] },
  { label: "Members", icon: Users, path: "/chits/members" },
  { label: "Collections", icon: WalletCards, path: "/chits/collections" },
  { label: "Auctions and Lift", icon: Target, path: "/chits/auctions", related: [{ label: "Lucky draw", path: "/chits/lucky-draw" }] },
  { label: "Pending and Follow-up", icon: HandCoins, path: "/chits/collections/pending", related: [{ label: "Reminders", path: "/chits/notifications" }] },
  { label: "Receipts and Ledger", icon: ReceiptText, path: "/chits/receipts", related: [{ label: "Member ledger", path: "/chits/member-ledger" }] },
  { label: "Finance and Profit", icon: Scale, path: "/chits/finance", related: [{ label: "Payouts", path: "/chits/payouts" }, { label: "Dividends", path: "/chits/dividends" }] },
  { label: "Reports", icon: FileBarChart, path: "/chits/reports" },
  { label: "AI Assistant", icon: Bot, path: "/chits/ai" },
  { label: "Academy", icon: GraduationCap, path: "/chits/academy" },
  { label: "Support", icon: Headphones, path: "/chits/support" },
  { label: "Settings", icon: Settings, path: "/chits/settings" },
];

const MOBILE_NAV = [
  { label: "Home", icon: Home, path: "/chits", exact: true },
  { label: "Collect", icon: WalletCards, path: "/chits/collections" },
  { label: "Create", icon: Plus, path: "/chits/ai-chit" },
  { label: "AI", icon: Bot, path: "/chits/ai" },
  { label: "More", icon: MoreHorizontal, path: "/chits/settings" },
];

function ChitNavigation() {
  const location = useLocation();
  return <>
    <nav className="chit-navigation" aria-label="MITRA NIDHI workflow">
      <div className="chit-nav-header"><div><span>VARDHAN OS</span><h3>{CHIT_PRODUCT_NAME}</h3></div></div>
      <div className="chit-menu">{CHIT_WORKFLOW_NAV.map((item) => {
        const Icon = item.icon; const active = isWorkflowActive(item, location.pathname);
        return <div className="chit-menu-group" key={item.label}>
          <NavLink to={item.path} end={item.exact} className={`chit-menu-item ${active ? "active" : ""}`}><span className="chit-menu-icon"><Icon size={18}/></span><span className="chit-menu-label">{item.label}</span></NavLink>
          {active && item.related?.length > 0 && <div className="chit-related-links">{item.related.map((child) => <NavLink key={child.path} to={child.path}>{child.label}</NavLink>)}</div>}
        </div>;
      })}</div>
      <div className="chit-nav-footer"><p>Workspace-aware · Tenant isolated</p></div>
    </nav>
    <nav className="chit-bottom-navigation" aria-label="Mobile chit navigation">{MOBILE_NAV.map((item) => { const Icon=item.icon; return <NavLink key={item.path} to={item.path} end={item.exact}><Icon size={19}/><span>{item.label}</span></NavLink>; })}</nav>
  </>;
}
function isWorkflowActive(item, pathname) { return item.exact ? pathname === item.path : pathname === item.path || item.related?.some((child) => pathname.startsWith(child.path)); }
export default ChitNavigation;
