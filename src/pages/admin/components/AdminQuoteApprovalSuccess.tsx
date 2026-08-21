import { ArrowRight, CheckCircle2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import type { Quote, Ticket } from "../../../types/domain";
import type { QuoteApprovalStatus } from "../hooks/useQuoteAdmin";

interface AdminQuoteApprovalSuccessProps {
  quote: Quote | Ticket;
  approvalStatus: QuoteApprovalStatus;
  onSendWhatsApp: () => void;
  onGoToOrders: () => void;
}

export function AdminQuoteApprovalSuccess({
  quote,
  approvalStatus,
  onSendWhatsApp,
  onGoToOrders,
}: AdminQuoteApprovalSuccessProps) {
  const handleCopyPix = () => {
    const code =
      "00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" +
      approvalStatus.orderId +
      "_" +
      (approvalStatus.finalPrice || 45.9).toFixed(0);
    navigator.clipboard.writeText(code);
    toast.success("Código Pix Copiado com sucesso!");
  };

  return (
    <div className="text-center py-6 space-y-8">
      <div className="relative mb-6 flex justify-center">
        <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
        <div className="w-24 h-24 rounded-[32px] bg-green-500/10 text-green-500 flex items-center justify-center relative border-2 border-green-500/20 shadow-2xl">
          <CheckCircle2 className="w-12 h-12 animate-pulse" />
        </div>
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 italic block mb-1">
          Faturamento Concluído
        </span>
        <h3 className="text-4xl font-black italic tracking-tighter text-white">PEDIDO EMITIDO!</h3>
        <p className="text-xs text-white/40 mt-1 font-medium">
          Ordem de faturamento:{" "}
          <strong className="text-primary font-mono text-sm">
            #{approvalStatus.orderId?.slice(0, 10).toUpperCase()}
          </strong>
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto text-left">
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">
            Resumo da Ordem
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">Geometria:</span>{" "}
              <span
                className="text-white/80 font-bold truncate max-w-[120px]"
                title={quote.fileName}
              >
                {quote.fileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Infill:</span>{" "}
              <span className="text-white/80 font-bold">{approvalStatus.finalInfill}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Tempo Impressão:</span>{" "}
              <span className="text-white/80 font-bold">{approvalStatus.finalTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Peso Estimado:</span>{" "}
              <span className="text-white/80 font-bold">{approvalStatus.finalWeight}g</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
              <span className="text-white/40 text-[10px] uppercase font-black">Investimento:</span>{" "}
              <span className="text-lg font-mono font-black text-primary">
                R$ {approvalStatus.finalPrice?.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>
        <div className="p-6 bg-primary/[0.01] border border-primary/10 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-md">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png"
                  className="w-full object-contain"
                  alt="Pix"
                />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">
                Pix Copia e Cola
              </h4>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed font-medium italic">
              Copie este código para o aplicativo de pagamento do cliente.
            </p>
          </div>
          <button
            onClick={handleCopyPix}
            className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 hover:text-white text-primary text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-primary/20"
          >
            Copiar Chave Pix
          </button>
        </div>
      </div>
      <div className="pt-6 border-t border-white/5 flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          onClick={onSendWhatsApp}
          className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-green-500/20 text-green-400 hover:bg-green-500/10 flex items-center gap-2"
        >
          <Smartphone className="w-4 h-4" /> Enviar por WhatsApp
        </Button>
        <button
          onClick={onGoToOrders}
          className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center transition-all shadow-lg shadow-primary/20"
        >
          Ir para os Pedidos <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
