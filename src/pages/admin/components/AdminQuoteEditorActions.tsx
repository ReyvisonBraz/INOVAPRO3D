import { CheckCircle2, Factory, FileText, Save, Smartphone, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface QuoteDocumentActions {
  onPrintClientQuote: () => void;
  onPrintProductionSheet: () => void;
}

interface AdminQuoteEditorActionsProps {
  /** Só existe quando o orçamento já foi salvo e pode gerar documentos. */
  documentActions: QuoteDocumentActions | null;
  isApproving: boolean;
  onSendWhatsApp: () => void;
  onSave: () => void;
  onApprove: () => void;
  onDiscard: () => void;
}

export function AdminQuoteEditorActions({
  documentActions,
  isApproving,
  onSendWhatsApp,
  onSave,
  onApprove,
  onDiscard,
}: AdminQuoteEditorActionsProps) {
  return (
    <div className="quote-editor-actions sticky bottom-0 z-20 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#0d121c]/95 p-3 shadow-2xl backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        {documentActions && (
          <>
            <Button
              variant="outline"
              onClick={documentActions.onPrintClientQuote}
              className="h-11 w-full rounded-xl border-blue-400/20 px-3 text-[10px] font-bold uppercase text-blue-300 hover:bg-blue-400/10"
            >
              <FileText className="h-4 w-4" /> Visualizar proposta
            </Button>
            <Button
              variant="outline"
              onClick={documentActions.onPrintProductionSheet}
              className="h-11 w-full rounded-xl border-orange-400/20 px-3 text-[10px] font-bold uppercase text-orange-300 hover:bg-orange-400/10"
            >
              <Factory className="h-4 w-4" /> Ficha de produção
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={onSendWhatsApp}
          className="h-11 w-full rounded-xl border-green-500/25 px-3 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/10 hover:text-green-300"
        >
          <Smartphone className="h-4 w-4" /> WhatsApp
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(90px,1fr)_minmax(150px,1.5fr)_44px] gap-2 lg:grid-cols-[auto_auto_44px]">
        <Button
          variant="outline"
          onClick={onSave}
          className="h-11 w-full rounded-xl border-white/15 px-4 text-[10px] font-bold uppercase text-white/85 hover:bg-white/5 hover:text-white"
        >
          <Save className="h-4 w-4" /> Salvar
        </Button>
        <Button
          disabled={isApproving}
          onClick={onApprove}
          className="h-11 w-full rounded-xl bg-emerald-500 px-5 text-[10px] font-black uppercase text-white shadow-lg shadow-emerald-500/10 hover:bg-emerald-600"
        >
          <CheckCircle2 className="h-4 w-4" /> Aprovar e faturar
        </Button>
        <Button
          variant="outline"
          title="Descartar orçamento"
          aria-label="Descartar orçamento"
          onClick={onDiscard}
          className="h-11 w-11 shrink-0 rounded-xl border-red-500/25 p-0 text-red-400 hover:border-red-500/50 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
