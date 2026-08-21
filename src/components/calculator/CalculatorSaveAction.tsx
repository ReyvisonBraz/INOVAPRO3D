import { Loader2, Save } from "lucide-react";

interface CalculatorSaveActionProps {
  saving: boolean;
  uploadingImage: boolean;
  editingExistingQuote: boolean;
  onSave: () => void;
}

export function CalculatorSaveAction({
  saving,
  uploadingImage,
  editingExistingQuote,
  onSave,
}: CalculatorSaveActionProps) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving || uploadingImage}
      className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {editingExistingQuote ? "Salvar alterações" : "Salvar no sistema"}
        </>
      )}
    </button>
  );
}
