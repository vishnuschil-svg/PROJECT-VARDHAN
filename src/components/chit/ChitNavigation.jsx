import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  Folder,
  Gift,
  Landmark,
  LayoutDashboard,
  Layers3,
  Scale,
  ReceiptText,
  Settings,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import "./ChitNavigation.css";

const CHIT_MENU = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/chits" },
  { label: "Chit Groups", icon: ClipboardList, path: "/chits/groups" },
  { label: "Batches", icon: Layers3, path: "/chits/batches" },
  { label: "Members", icon: Users, path: "/chits/members" },
  { label: "Member Ledger", icon: Landmark, path: "/chits/member-ledger" },
  { label: "Collections", icon: WalletCards, path: "/chits/collections" },
  { label: "Pending Collections", icon: ReceiptText, path: "/chits/collections/pending" },
  { label: "Auctions", icon: Target, path: "/chits/auctions" },
  { label: "Finance & Accounts", icon: Scale, path: "/chits/finance" },
  { label: "Lucky Draw", icon: Gift, path: "/chits/lucky-draw" },
  { label: "Payouts", icon: CreditCard, path: "/chits/payouts" },
  { label: "Dividends", icon: TrendingUp, path: "/chits/dividends" },
  { label: "Payment Receipts", icon: FileText, path: "/chits/receipts" },
  { label: "Reports", icon: FileBarChart, path: "/chits/reports" },
  { label: "Documents", icon: Folder, path: "/chits/documents" },
  { label: "Reminders", icon: Bell, path: "/chits/notifications" },
  { label: "Settings", icon: Settings, path: "/chits/settings" },
];

function ChitNavigation() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <nav className="chit-navigation" data-open={isOpen}>
      <div className="chit-nav-header">
        <h3>Chit Management ERP</h3>
        <button
          className="chit-nav-toggle"
          type="button"
          aria-label={isOpen ? "Collapse chit navigation" : "Expand chit navigation"}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "<" : ">"}
        </button>
      </div>

      <div className="chit-menu">
        {CHIT_MENU.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `chit-menu-item ${isActive ? "active" : ""}`}
              title={item.label}
            >
              <span className="chit-menu-icon">
                <Icon size={17} />
              </span>
              <span className="chit-menu-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="chit-nav-footer">
        <p>{CHIT_PRODUCT_NAME}</p>
      </div>
    </nav>
  );
}

export default ChitNavigation;
