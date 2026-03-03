import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#f5f5f7', padding: 32,
        }}>
          <div style={{
            background: 'rgba(234,67,53,.06)', border: '1px solid #ea4335',
            borderRadius: 12, padding: '24px 28px', maxWidth: 480, textAlign: 'center',
          }}>
            <div style={{ color: '#ea4335', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ color: '#5f6368', fontSize: 14, lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, background: '#6366f1',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
              fontSize: 14, fontFamily: 'inherit',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
