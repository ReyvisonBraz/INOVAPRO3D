import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black font-display uppercase tracking-tight text-white mb-3">
              Algo deu errado
            </h2>
            <p className="text-sm text-white/40 font-medium leading-relaxed mb-8">
              Um erro inesperado ocorreu ao carregar este componente. 
              Isso não afeta o restante da aplicação.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button 
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </Button>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <Home className="w-4 h-4" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-[10px] text-white/20 font-mono cursor-pointer hover:text-white/40 transition-colors">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-red-400/60 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
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
