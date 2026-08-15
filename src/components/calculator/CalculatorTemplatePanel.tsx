import { useState } from "react";
import { BookmarkPlus, Layers, Loader2 } from "lucide-react";
import type { CalculatorTemplate } from "../../types/domain";

interface CalculatorTemplatePanelProps {
  templates: CalculatorTemplate[];
  loading: boolean;
  saving: boolean;
  onApply: (template: CalculatorTemplate) => void;
  onSave: (name: string) => Promise<boolean>;
}

export function CalculatorTemplatePanel({
  templates,
  loading,
  saving,
  onApply,
  onSave,
}: CalculatorTemplatePanelProps) {
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
            Reaproveitar
          </p>
          <h2 className="mt-1 text-base font-black text-white">Modelos de projeto</h2>
          <p className="mt-1 text-xs text-white/45">
            Comece de uma configuração usada com frequência sem copiar clientes ou orçamentos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSave((current) => !current)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 text-xs font-black text-violet-200"
        >
          <BookmarkPlus className="h-4 w-4" /> Salvar modelo atual
        </button>
      </div>

      {showSave && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Chaveiros PLA · P2S"
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-violet-300/40 focus:outline-none"
          />
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={async () => {
              if (await onSave(name)) {
                setName("");
                setShowSave(false);
              }
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar modelo
          </button>
        </div>
      )}

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {loading && (
          <div className="flex min-h-20 min-w-56 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs text-white/45">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...
          </div>
        )}
        {!loading && !templates.length && (
          <div className="min-w-full rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
            Nenhum modelo salvo. Preencha um projeto e salve a configuração para reutilizar depois.
          </div>
        )}
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onApply(template)}
            className="min-w-60 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-violet-300/30 hover:bg-violet-300/[0.06]"
          >
            <Layers className="h-4 w-4 text-violet-300" />
            <strong className="mt-3 block truncate text-sm text-white">{template.name}</strong>
            <span className="mt-1 block text-xs text-white/40">
              {template.snapshot.project.plates.length} bandeja(s) · usado{" "}
              {template.usageCount || 0}x
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
