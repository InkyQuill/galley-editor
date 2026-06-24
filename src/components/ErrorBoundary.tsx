"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '20px',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
        }}>
          <h2 style={{ marginTop: 0, color: '#dc2626' }}>Something went wrong</h2>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
              Error Details
            </summary>
            <pre style={{
              backgroundColor: '#fee2e2',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
            }}>
              <strong>Error:</strong> {this.state.error?.toString()}
              {this.state.errorInfo && (
                <>
                  {'\n\n'}
                  <strong>Component Stack:</strong>
                  {'\n'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
          <button
            onClick={() => {
              this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
              });
            }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

