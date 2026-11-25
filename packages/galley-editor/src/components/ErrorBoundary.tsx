"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string | number;
  onError?: (error: Error, info: ErrorInfo) => void;
  labels?: Partial<{ heading: string; details: string; retry: string }>;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previousProps: Props) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    const { labels } = this.props;
    return (
      <div className="ge-error-boundary" style={{
        padding: '20px',
        border: '1px solid var(--ge-color-border, currentColor)',
        borderRadius: '8px',
        backgroundColor: 'var(--ge-color-bg, Canvas)',
        color: 'var(--ge-color-text, CanvasText)',
      }}>
        <h2>{labels?.heading ?? 'Something went wrong'}</h2>
        <details>
          <summary>{labels?.details ?? 'Error details'}</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.toString()}</pre>
        </details>
        <button type="button" onClick={() => this.setState({ error: null })}>
          {labels?.retry ?? 'Try again'}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
