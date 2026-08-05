import React, { useState } from 'react';
import OdooNavbar from './OdooNavbar';
import OdooAppSwitcher from './OdooAppSwitcher';

export default function OdooLayout({ children, activeApp, setActiveApp }) {
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleSelectApp = (appId) => {
    setActiveApp(appId);
    setShowSwitcher(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F6F6F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <OdooNavbar 
        activeApp={activeApp} 
        setActiveApp={setActiveApp} 
        toggleAppSwitcher={() => setShowSwitcher(!showSwitcher)} 
      />
      
      {showSwitcher ? (
        <OdooAppSwitcher onSelectApp={handleSelectApp} />
      ) : (
        <div style={{ padding: '0' }}>
          {children}
        </div>
      )}
    </div>
  );
}
