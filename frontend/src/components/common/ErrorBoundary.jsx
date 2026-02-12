import React from 'react';

/**
 * Error Boundary — catches unhandled errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 * 
 * Usage: <ErrorBoundary><YourComponent /></ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
                    <div className="bg-surface p-8 rounded-2xl border border-red-200 shadow-lg max-w-md w-full">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">error_outline</span>
                        </div>
                        <h2 className="text-lg font-black text-txt-primary uppercase tracking-tight mb-2">
                            Error Inesperado
                        </h2>
                        <p className="text-txt-dim text-xs font-bold mb-6 leading-relaxed">
                            Algo falló en esta sección. Podés intentar recargar o volver al inicio.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-accent text-void rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-colors"
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-surface-highlight text-txt-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-highlight/80 transition-colors"
                            >
                                Recargar Página
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-[9px] font-mono text-txt-dim cursor-pointer uppercase tracking-widest">
                                    Detalles Técnicos
                                </summary>
                                <pre className="mt-2 text-[10px] font-mono text-red-500 bg-red-50 p-3 rounded-lg overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
