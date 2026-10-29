import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error no controlado en la interfaz:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center px-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-muted">error</span>
          <h1 className="text-lg font-semibold text-ink mt-3">Algo salió mal</h1>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Ocurrió un error inesperado. Tus datos siguen a salvo en la nube.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-5 h-11 px-5 rounded-2xl bg-ink text-canvas text-sm font-semibold active:scale-[0.98] transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
