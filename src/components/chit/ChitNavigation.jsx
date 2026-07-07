import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./ChitNavigation.css";

const CHIT_MENU = [
  { label: "Dashboard", icon: "📊", path: "/chits" },
  { label: "Chit Batches", icon: "👥", path: "/chits/groups" },
  { label: "Members", icon: "👤", path: "/chits/members" },
  { label: "Collections", icon: "💰", path: "/chits/collections" },
  { label: "Pending Collections", icon: "⏳", path: "/chits/collections/pending" },
  { label: "Auctions", icon: "🎯", path: "/chits/auctions" },
  { label: "Payouts", icon: "💳", path: "/chits/payouts" },
  { label: "Dividends", icon: "📈", path: "/chits/dividends" },
  { label: "Payment Receipts", icon: "📄", path: "/chits/receipts" },
  { label: "Reports", icon: "📋", path: "/chits/reports" },
  { label: "Documents", icon: "📁", path: "/chits/documents" },
  { label: "Reminders", icon: "🔔", path: "/chits/notifications" },
  { label: "Settings", icon: "⚙️", path: "/chits/settings" },
];

function ChitNavigation() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <nav className="chit-navigation" data-open={isOpen}>
      <div className="chit-nav-header">
        <h3>🏪 CHIT MANAGEMENT</h3>
        <button className="chit-nav-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "◀" : "▶"}
        </button>
      </div>

      <div className="chit-menu">
        {CHIT_MENU.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `chit-menu-item ${isActive ? "active" : ""}`}
            title={item.label}
          >
            <span className="chit-menu-icon">{item.icon}</span>
            <span className="chit-menu-label">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="chit-nav-footer">
        <p>VARDHAN CHIT MANAGEMENT</p>
      </div>
    </nav>
  );
}

export default ChitNavigation;