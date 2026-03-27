import "./polyfills.js"; // This MUST be the first import so Buffer is available to all subsequent modules
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Front from "./front.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("💥 React crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <div style={{ background: '#1a0a2e', border: '1px solid #7c3aed', borderRadius: '16px', padding: '2rem', maxWidth: '700px', width: '100%' }}>
            <h2 style={{ color: '#f87171', marginBottom: '1rem', fontSize: '1.2rem' }}>💥 App crashed — here's the error:</h2>
            <pre style={{ color: '#fbbf24', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', lineHeight: '1.6' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', background: 'linear-gradient(to right, #7c3aed, #db2777)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Front />
    </ErrorBoundary>
  </React.StrictMode>
);