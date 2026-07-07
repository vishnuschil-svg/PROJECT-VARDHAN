import { useState } from "react";
import "./Tabs.css";

function Tabs({ tabs, defaultTab = 0, onChange = null }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (idx) => {
    setActiveTab(idx);
    onChange?.(idx, tabs[idx]);
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`tab-button ${activeTab === idx ? "active" : ""}`}
            onClick={() => handleTabChange(idx)}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
}

export default Tabs;
