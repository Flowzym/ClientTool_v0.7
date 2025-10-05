import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Etwas ist schiefgelaufen
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Die Anwendung ist auf einen Fehler gestoßen und konnte nicht korrekt geladen werden.
                </p>
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-700 font-medium mb-2">
                    Technische Details
                  </summary>
                  <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-40">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
                <div className="flex gap-2">
                  <Button onClick={this.reset} variant="primary" size="sm">
                    Erneut versuchen
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Daten zurücksetzen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
