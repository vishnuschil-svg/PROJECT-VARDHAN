import React from 'react';

export default function OdooNavbar({ activeApp, _setActiveApp, toggleAppSwitcher }) {
  return (
    <header style={{ 
      height: '48px', 
      backgroundColor: '#7A1F3D', 
      color: '#FFFFFF', 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 16px', 
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleAppSwitcher}
          title="App Switcher"
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#F0B94A', 
            fontSize: '20px', 
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          ⣿
        </button>
        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#F0B94A', letterSpacing: '0.5px' }}>
          VARDHAN <span style={{ color: '#FFF', fontWeight: 'normal', fontSize: '14px' }}>SCHOOL OS</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
        <span style={{ fontSize: '14px', textTransform: 'capitalize', fontWeight: '500' }}>
          {activeApp.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px' }}>
        <span style={{ background: 'rgba(240, 185, 74, 0.2)', color: '#F0B94A', padding: '4px 10px', borderRadius: '12px', border: '1px solid #F0B94A' }}>
          🛡️ Enterprise Odoo Mode
        </span>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F0B94A', color: '#7A1F3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          SA
        </div>
      </div>
    </header>
  );
}
