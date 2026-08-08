import { ArrowRight, Copy, QrCode } from "lucide-react";
import { Button } from "../ui/Button";

export interface PixPaymentData {
  pixCode: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  expirationDate?: string;
  paymentId?: string;
}

interface PixPaymentStepProps {
  payment: PixPaymentData | null;
  loading: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onCopy: () => void;
  onTrackOrder: () => void;
}

export function PixPaymentStep({
  payment,
  loading,
  onBack,
  onGenerate,
  onCopy,
  onTrackOrder,
}: PixPaymentStepProps) {
  if (payment) {
    return (
      <section className="space-y-6">
        <SectionTitle label="Pagamento Pix" />
        <div className="space-y-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
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

          {payment.expirationDate && (
            <p className="text-center text-xs text-white/40">
              Válido até: {new Date(payment.expirationDate).toLocaleString("pt-BR")}
            </p>
          )}
          <p className="border-t border-white/5 pt-4 text-center text-xs text-white/50">
            Após o pagamento, o status será atualizado automaticamente em Meus Pedidos.
          </p>
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

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary sm:text-xs">
      <QrCode className="h-4 w-4" /> {label}
    </h3>
  );
}
