import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./ChitNavigation.css";
import { getChitMenu } from "./ChitNavigation.menu.js";

function ChitNavigation() {
  const [isOpen, setIsOpen] = useState(true);
  const { permissions, profile, role } = useAuth();
  const menu = getChitMenu({ permissions, profile, role });

  return (
    <nav className="chit-navigation" data-open={isOpen}>
      <div className="chit-nav-header">
        <h3>🏪 CHIT MANAGEMENT</h3>
        <button className="chit-nav-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "◀" : "▶"}
        </button>
      </div>

      <div className="chit-menu">
        {menu.map((item) => (
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
