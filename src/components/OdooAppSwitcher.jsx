import React from 'react';

export default function OdooAppSwitcher({ onSelectApp }) {
  const apps = [
    { id: 'academics', label: 'Academics', icon: '🎓', color: '#4A90E2' },
    { id: 'sis', label: 'Students (SIS)', icon: '👨‍🎓', color: '#50E3C2' },
    { id: 'fees', label: 'Fee Accounting', icon: '💰', color: '#F5A623' },
    { id: 'attendance', label: 'Attendance', icon: '📅', color: '#B8E986' },
    { id: 'exams', label: 'Exams & Grades', icon: '📝', color: '#BD10E0' },
    { id: 'transport', label: 'Fleet Transport', icon: '🚌', color: '#9013FE' },
    { id: 'payroll', label: 'HR & Payroll', icon: '👥', color: '#4A4A4A' },
    { id: 'library', label: 'Library Engine', icon: '📚', color: '#D0021B' },
    { id: 'portal', label: 'Settings', icon: '⚙️', color: '#7ED321' },
  ];

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 48px)', 
      backgroundColor: '#2C2C2C', 
      padding: '60px 40px', 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
        gap: '35px', 
        maxWidth: '800px', 
        width: '100%' 
      }}>
        {apps.map(app => (
          <div 
            key={app.id}
            onClick={() => onSelectApp(app.id)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          >
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '16px', 
              backgroundColor: app.color, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '36px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
            }}>
              {app.icon}
            </div>
            <span style={{ color: '#FFF', marginTop: '12px', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
              {app.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
