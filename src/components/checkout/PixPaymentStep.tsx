import { ArrowRight, Copy, QrCode, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { describeDuration, formatClock } from "../../lib/duration";
import type { PaymentStatus } from "../../types/domain";
import { Button } from "../ui/Button";

export interface PixPaymentData {
  pixCode: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  /** Vencimento definido pelo servidor, em ISO 8601. */
  expiresAt?: string;
  paymentId?: string;
}

interface PixPaymentStepProps {
  payment: PixPaymentData | null;
  loading: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onCopy: () => void;
  onTrackOrder: () => void;
  /** Estado financeiro vindo do servidor em tempo real (webhook), não do QR local. */
  remoteStatus?: PaymentStatus | null;
  /** `true` quando a confirmação em tempo real está tentando se recuperar. */
  connectionUnstable?: boolean;
}

export function PixPaymentStep({
  payment,
  loading,
  onBack,
  onGenerate,
  onCopy,
  onTrackOrder,
  remoteStatus = null,
  connectionUnstable = false,
}: PixPaymentStepProps) {
  if (payment) {
    return (
      <PixPaymentPending
        payment={payment}
        loading={loading}
        onGenerate={onGenerate}
        onCopy={onCopy}
        onTrackOrder={onTrackOrder}
        remoteStatus={remoteStatus}
        connectionUnstable={connectionUnstable}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <SectionTitle label="Pagamento por Pix" />
        <div className="rounded-2xl border-2 border-primary bg-primary/10 p-6">
          <div className="mb-2 flex items-center gap-3">
            <QrCode className="h-6 w-6 text-primary" />
            <span className="text-lg font-black uppercase">Pix</span>
          </div>
          <p className="text-xs text-white/50">
            Aprovação rápida. Escaneie o QR Code ou copie o código no aplicativo do seu banco.
          </p>
        </div>
      </section>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          variant="outline"
          className="h-16 flex-1 rounded-2xl border-white/10 text-sm font-black uppercase tracking-widest"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button
          isShimmer
          size="lg"
          loading={loading}
          className="h-16 flex-[2] gap-4 rounded-2xl font-display text-lg font-black uppercase tracking-tight"
          onClick={onGenerate}
        >
          Gerar Pix <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Cobrança gerada e aguardando pagamento. O vencimento vem do servidor; a tela
 * apenas o apresenta e bloqueia as ações quando o prazo termina, para ninguém
 * pagar um código que o provedor já recusa.
 */
type BlockedReason = "expired" | "rejected" | "canceled";

const BLOCKED_COPY: Record<BlockedReason, { title: string; description: string }> = {
  expired: {
    title: "Este código Pix venceu",
    description: "Nenhuma cobrança foi feita. Gere um novo código para concluir o pedido.",
  },
  rejected: {
    title: "Este pagamento foi recusado",
    description: "Nenhum valor foi cobrado. Gere um novo código para tentar novamente.",
  },
  canceled: {
    title: "Este pagamento foi cancelado",
    description: "Gere um novo código Pix para concluir o pedido.",
  },
};

/** Traduz o status confirmado pelo webhook para o mesmo bloqueio visual do vencimento local. */
function blockedReasonFor(remoteStatus: PaymentStatus | null): BlockedReason | null {
  switch (remoteStatus) {
    case "EXPIRED":
      return "expired";
    case "REJECTED":
      return "rejected";
    case "CANCELED":
      return "canceled";
    default:
      return null;
  }
}

function PixPaymentPending({
  payment,
  loading,
  onGenerate,
  onCopy,
  onTrackOrder,
  remoteStatus,
  connectionUnstable,
}: {
  payment: PixPaymentData;
  loading: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  onTrackOrder: () => void;
  remoteStatus: PaymentStatus | null;
  connectionUnstable: boolean;
}) {
  const remainingMs = useTimeRemaining(payment.expiresAt);
  const localExpired = remainingMs !== null && remainingMs <= 0;
  // O relógio local decide primeiro; se o webhook confirmar antes disso
  // (relógio do provedor sempre manda), o bloqueio aparece na hora.
  const blockedReason = localExpired ? "expired" : blockedReasonFor(remoteStatus);

  return (
    <section className="space-y-6">
      <SectionTitle label="Pagamento Pix" />
      <div className="space-y-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        {blockedReason ? (
          <div className="space-y-4 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-white/70">
              {BLOCKED_COPY[blockedReason].title}
            </p>
            <p className="text-xs text-white/50">{BLOCKED_COPY[blockedReason].description}</p>
            <Button
              loading={loading}
              className="h-12 w-full gap-2 rounded-xl text-xs font-black uppercase tracking-widest"
              onClick={onGenerate}
            >
              <RefreshCw className="h-4 w-4" /> Gerar novo código Pix
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4">
              {payment.qrCodeBase64 && (
                <img
                  src={`data:image/png;base64,${payment.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="h-48 w-48 rounded-xl bg-white p-2"
                />
              )}
              <p className="text-center text-sm text-white/60">
                Escaneie o QR Code com o aplicativo do seu banco.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">
                Ou copie o código Pix:
              </p>
              <div className="max-h-24 overflow-y-auto break-all rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-xs text-white/60">
                {payment.pixCode}
              </div>
              <Button
                variant="outline"
                className="h-12 w-full gap-2 rounded-xl border-white/10 text-xs font-black uppercase tracking-widest"
                onClick={onCopy}
              >
                <Copy className="h-4 w-4" /> Copiar código Pix
              </Button>
            </div>

            {remainingMs !== null && <PixCountdown remainingMs={remainingMs} />}
            <PixWaitingIndicator connectionUnstable={connectionUnstable} />
          </>
        )}
      </div>
      <Button
        className="h-14 w-full rounded-2xl text-sm font-black uppercase tracking-widest"
        onClick={onTrackOrder}
      >
        Acompanhar pedido
      </Button>
    </section>
  );
}

/**
 * Confirma para a pessoa que a tela está escutando o pagamento, e avisa sem
 * alarmar quando a confirmação em tempo real está se recuperando — a compra
 * continua válida, só a atualização automática está momentaneamente lenta.
 */
function PixWaitingIndicator({ connectionUnstable }: { connectionUnstable: boolean }) {
  if (connectionUnstable) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-center text-xs text-amber-400/80"
      >
        <WifiOff className="h-3.5 w-3.5" /> Reconectando para confirmar o pagamento automaticamente…
      </p>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-center text-xs text-white/50"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Aguardando confirmação do pagamento…
    </p>
  );
}

function PixCountdown({ remainingMs }: { remainingMs: number }) {
  return (
    <p
      role="timer"
      // Anunciar a cada segundo tornaria a tela ilegível em leitor de tela; o
      // valor por extenso é lido quando a pessoa navega até o contador.
      aria-live="off"
      aria-label={`Código Pix válido por mais ${describeDuration(remainingMs)}`}
      className="text-center text-xs text-white/40"
    >
      Válido por mais <span className="font-mono text-white/70">{formatClock(remainingMs)}</span>
    </p>
  );
}

/**
 * Conta o tempo restante a partir do vencimento enviado pelo servidor. O relógio
 * do dispositivo afeta apenas a apresentação: quem recusa um Pix vencido é o
 * provedor, nunca esta tela.
 */
function useTimeRemaining(expiresAt?: string): number | null {
  const target = useMemo(() => {
    if (!expiresAt) return null;
    const parsed = new Date(expiresAt).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [expiresAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      // Temporizador encerrado no vencimento: sem tique perpétuo em segundo plano.
      if (current >= target) window.clearInterval(interval);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  return target === null ? null : Math.max(0, target - now);
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary sm:text-xs">
      <QrCode className="h-4 w-4" /> {label}
    </h3>
  );
}
