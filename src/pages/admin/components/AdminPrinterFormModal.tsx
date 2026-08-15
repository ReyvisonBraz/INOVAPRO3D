import {
  memo,
  useRef,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { motion } from "framer-motion";
import { HelpCircle, ImageIcon, Loader2, Star, Upload, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { NumberField, OptionalNumberField } from "../../../components/ui/NumberField";
import { cn } from "../../../lib/utils";
import { formatBRL, machineHourBreakdown } from "../../../lib/pricing";
import { PRINTER_COST_FIELDS } from "../../../lib/printers";
import type { PrinterFormState } from "../hooks/usePrinterAdmin";

interface AdminPrinterFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: PrinterFormState;
  setForm: Dispatch<SetStateAction<PrinterFormState>>;
  saving: boolean;
  uploadingPhoto: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onUploadPhoto: (file: File | null) => void;
}

const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/35 px-3 py-2.5 text-sm font-medium text-white outline-none placeholder:text-white/25 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-400/10";

function Field({
  label,
  help,
  hint,
  children,
}: {
  label: string;
  help?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/55">
        {label}
        {help && (
          <span className="group/help relative inline-flex cursor-help" tabIndex={0}>
            <HelpCircle className="h-3.5 w-3.5 text-blue-200/70" />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-xl border border-blue-300/25 bg-[#080c15] px-3 py-2.5 text-left text-[12px] font-medium normal-case leading-relaxed tracking-normal text-white/85 shadow-2xl group-hover/help:block group-focus/help:block"
            >
              {help}
            </span>
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-white/32">{hint}</span>}
    </label>
  );
}

const AdminPrinterFormModal = memo(function AdminPrinterFormModal({
  open,
  isEditing,
  form,
  setForm,
  saving,
  uploadingPhoto,
  onSubmit,
  onClose,
  onUploadPhoto,
}: AdminPrinterFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const hourly = machineHourBreakdown(form);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-2xl sm:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0e16] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar impressora" : "Nova impressora"}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-12 font-display text-lg font-black tracking-tight text-white">
          {isEditing ? "Editar impressora" : "Nova impressora"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Estes numeros viram a base de calculo das calculadoras. No orcamento voce ainda pode
          personalizar qualquer valor sem alterar este cadastro.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* IDENTIDADE */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                <div className="relative h-28 w-40 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <ImageIcon className="h-7 w-7" />
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 grid place-items-center bg-black/70">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 text-[11px] font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    <Upload className="h-3.5 w-3.5" /> Foto
                  </button>
                  {form.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((previous) => ({ ...previous, photoUrl: "" }))}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 text-white/40 transition hover:text-red-300"
                      aria-label="Remover foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    onUploadPhoto(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <Field label="Nome">
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, name: event.target.value }))
                    }
                    placeholder="Bambu Lab P2S + AMS"
                    className={inputClass}
                    autoFocus
                  />
                </Field>
                <Field label="Modelo (opcional)">
                  <input
                    value={form.model}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, model: event.target.value }))
                    }
                    placeholder="P2S · bico 0,4 aco endurecido"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* CUSTOS */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
                Maquina e pecas
              </h3>
              <span className="text-xs text-white/45">
                Custo-hora:{" "}
                <strong className="font-black tabular-nums text-emerald-300">
                  {formatBRL(hourly.total)}/h
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PRINTER_COST_FIELDS.map((field) => (
                <Field key={field.key} label={field.label} help={field.help}>
                  <div className="relative">
                    {field.prefix && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/35">
                        {field.prefix}
                      </span>
                    )}
                    <NumberField
                      value={form[field.key]}
                      onChange={(value) =>
                        setForm((previous) => ({ ...previous, [field.key]: value }))
                      }
                      min={field.min}
                      step={field.step}
                      aria-label={field.label}
                      className={cn(inputClass, field.prefix && "pl-9", field.suffix && "pr-12")}
                    />
                    {field.suffix && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/35">
                        {field.suffix}
                      </span>
                    )}
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:grid-cols-4">
              <MiniStat label="Depreciacao" value={`${formatBRL(hourly.depreciation)}/h`} />
              <MiniStat label="Bico" value={`${formatBRL(hourly.nozzle)}/h`} />
              <MiniStat label="Placa" value={`${formatBRL(hourly.plate)}/h`} />
              <MiniStat label="Correias" value={`${formatBRL(hourly.belts)}/h`} />
            </div>
          </section>

          {/* ENERGIA ESPECIFICA */}
          <section>
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
              Energia desta maquina
            </h3>
            <p className="mb-3 text-[11px] leading-relaxed text-white/35">
              Deixe em branco para usar os valores gerais definidos em Ajustes. Preencha somente se
              esta impressora consome diferente das demais.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Potencia media" hint="W · padrao do material">
                <OptionalNumberField
                  value={form.defaultSteadyPowerWatts}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, defaultSteadyPowerWatts: value }))
                  }
                  min={0}
                  step={10}
                  placeholder="usar padrao"
                  aria-label="Potencia media desta impressora"
                  className={inputClass}
                />
              </Field>
              <Field label="Pico de aquecimento" hint="W">
                <OptionalNumberField
                  value={form.startupPowerWatts}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, startupPowerWatts: value }))
                  }
                  min={0}
                  step={10}
                  placeholder="usar padrao"
                  aria-label="Pico de aquecimento desta impressora"
                  className={inputClass}
                />
              </Field>
              <Field label="Duracao do pico" hint="min">
                <OptionalNumberField
                  value={form.startupMinutes}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, startupMinutes: value }))
                  }
                  min={0}
                  step={0.5}
                  placeholder="usar padrao"
                  aria-label="Duracao do pico desta impressora"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <Field label="Observacoes (opcional)">
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, notes: event.target.value }))
              }
              rows={2}
              placeholder="Numero de serie, data de compra, historico de manutencao..."
              className={cn(inputClass, "resize-none")}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, isDefault: !previous.isDefault }))
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition",
                form.isDefault
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-white/12 text-white/50 hover:text-white",
              )}
            >
              <Star className={cn("h-3.5 w-3.5", form.isDefault && "fill-emerald-300")} />
              Impressora padrao
            </button>
            <button
              type="button"
              onClick={() => setForm((previous) => ({ ...previous, active: !previous.active }))}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition",
                form.active
                  ? "border-white/12 text-white/70"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200",
              )}
            >
              {form.active ? "Ativa" : "Inativa"}
            </button>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-white/12 px-5 text-sm font-bold text-white/65 transition hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6 text-sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar alteracoes" : "Cadastrar impressora"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
});

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[9px] uppercase tracking-wider text-white/32">{label}</span>
      <strong className="mt-0.5 block text-[11px] font-semibold tabular-nums text-white/80">
        {value}
      </strong>
    </div>
  );
}

export default AdminPrinterFormModal;
