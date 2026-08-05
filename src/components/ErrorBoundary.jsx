import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VARDHAN ERP Safety Guard Captured an Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FFF5F5', border: '2px solid #7A1F3D', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ color: '#7A1F3D', margin: 0 }}>🛡️ Safe Guard Intercepted an Error</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>
            Isolated UI issue caught. System stability protected.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', backgroundColor: '#7A1F3D', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
