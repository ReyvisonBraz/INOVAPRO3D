import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  state: ConfirmDialogState | null;
  onCancel: () => void;
}

export function ConfirmDialog({ state, onCancel }: ConfirmDialogProps) {
  if (!state?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto border transition-all",
            state.isDanger ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20",
          )}
        >
          {state.isDanger ? <AlertCircle className="w-8 h-8 animate-pulse" /> : <CheckCircle2 className="w-8 h-8 animate-pulse" />}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-black text-white italic uppercase tracking-wider">{state.title}</h3>
          <p className="text-xs text-white/50 leading-relaxed font-bold">{state.description}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all border border-white/5 active:scale-95"
          >
            {state.cancelText || "Cancelar"}
          </button>
          <button
            type="button"
            onClick={state.onConfirm}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95",
              state.isDanger ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600",
            )}
          >
            {state.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
