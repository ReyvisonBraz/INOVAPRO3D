import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Send, CheckCircle2, MessageSquareWarning } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { reportError } from "../../services/errorReporting";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  protocol: string | null;
  reportOpen: boolean;
  note: string;
  sending: boolean;
  sent: boolean;
}

/** Erro de chunk lazy desatualizado (acontece após um novo deploy). */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError|error loading dynamically imported/i.test(
    `${error.name} ${error.message}`,
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    protocol: null,
    reportOpen: false,
    note: "",
    sending: false,
    sent: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);

    // Chunk desatualizado pós-deploy → recarrega uma vez (não é bug pra relatar).
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem("preload-reload-ts") || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem("preload-reload-ts", String(Date.now()));
        window.location.reload();
      }
      return;
    }

    // Relato automático: o sistema avisa onde foi e o que causou (Telegram + Firestore).
    void reportError(error, { where: "react" }).then((id) => {
      if (id) this.setState({ protocol: id });
    });
  }

  handleReset = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, protocol: null, reportOpen: false, note: "", sending: false, sent: false });
  };

  handleSendReport = async () => {
    if (this.state.sending || this.state.sent) return;
    this.setState({ sending: true });
    const id = await reportError(this.state.error, {
      where: "react:usuario",
      userNote: this.state.note.trim() || "(sem descrição)",
    });
    this.setState({ sending: false, sent: true, protocol: id ?? this.state.protocol });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const chunkError = isChunkLoadError(this.state.error);
      const { reportOpen, note, sending, sent, protocol } = this.state;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black font-display uppercase tracking-tight text-white mb-3">
              {chunkError ? "Nova versão disponível" : "Algo deu errado"}
            </h2>
            <p className="text-sm text-white/40 font-medium leading-relaxed mb-8">
              {chunkError
                ? "O site foi atualizado. Recarregue para carregar a versão mais recente."
                : "Tivemos um problema ao carregar esta parte. Nossa equipe já foi avisada automaticamente — você pode contar o que aconteceu para nos ajudar a corrigir mais rápido."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {chunkError ? "Atualizar agora" : "Tentar Novamente"}
              </Button>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <Home className="w-4 h-4" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>

            {/* Relatar problema — só faz sentido para erros reais, não para chunk */}
            {!chunkError && (
              <div className="mt-8">
                {sent ? (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.07] p-4 text-left">
                    <p className="flex items-center gap-2 text-sm font-bold text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> Relato enviado. Obrigado!
                    </p>
                    {protocol && (
                      <p className="mt-1 text-[11px] text-white/40 font-mono">Protocolo: {protocol}</p>
                    )}
                  </div>
                ) : reportOpen ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      O que você estava fazendo? (opcional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => this.setState({ note: e.target.value })}
                      rows={3}
                      placeholder="Ex: cliquei em finalizar pedido e a tela travou…"
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-primary/50 placeholder:text-white/25"
                    />
                    <Button onClick={this.handleSendReport} loading={sending} className="w-full gap-2 h-11">
                      <Send className="w-4 h-4" /> Enviar relato
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => this.setState({ reportOpen: true })}
                    className="inline-flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white transition-colors"
                  >
                    <MessageSquareWarning className="w-4 h-4" />
                    Reportar problema
                  </button>
                )}
              </div>
            )}

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
