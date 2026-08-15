import { memo, type FC } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Pencil,
  Plus,
  Printer as PrinterIcon,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import { AdminEmptyState, AdminMetric, AdminSectionHeader } from "./AdminPrimitives";
import { formatBRL, machineHourBreakdown } from "../../../lib/pricing";
import { machineConfigFromPrinter } from "../../../lib/printers";
import type { Printer } from "../../../types/domain";

interface AdminPrintersPanelProps {
  printers: Printer[];
  /** Regras do Firestore ainda não publicadas: a coleção responde negado. */
  blocked?: boolean;
  onAdd: () => void;
  onEdit: (printer: Printer) => void;
  onDelete: (printer: Printer) => void;
  onSetDefault: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
}

const AdminPrintersPanel: FC<AdminPrintersPanelProps> = memo(function AdminPrintersPanel({
  printers,
  blocked = false,
  onAdd,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleActive,
}) {
  const active = printers.filter((printer) => printer.active !== false);
  const defaultPrinter = printers.find((printer) => printer.isDefault);
  const averageHourCost = active.length
    ? active.reduce(
        (sum, printer) => sum + machineHourBreakdown(machineConfigFromPrinter(printer)).total,
        0,
      ) / active.length
    : 0;

  return (
    <motion.div
      key="printers"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <AdminSectionHeader
        eyebrow="Producao"
        title="Impressoras"
        description="Cadastre cada maquina com suas pecas e valores. A calculadora usa esses numeros como base e permite personalizar por orcamento."
        actions={
          <Button
            onClick={onAdd}
            className="h-9 rounded-lg px-3 text-[11px] font-semibold shadow-none"
          >
            <Plus className="h-3.5 w-3.5" /> Nova impressora
          </Button>
        }
      />

      {blocked && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 text-xs leading-relaxed text-amber-100/80">
            <p className="font-bold text-amber-200">Colecao bloqueada pelas regras</p>
            <p className="mt-1">
              Publique as regras para liberar o cadastro:{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px]">
                firebase deploy --only firestore:rules
              </code>
              . Ate la a calculadora continua usando a maquina configurada em Ajustes.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric label="Cadastradas" value={printers.length} hint="Maquinas no parque" />
        <AdminMetric
          label="Ativas"
          value={active.length}
          tone={active.length ? "success" : "default"}
        />
        <AdminMetric
          label="Padrao"
          value={defaultPrinter?.name ?? "—"}
          hint="Usada quando o orcamento nao escolhe"
          tone={defaultPrinter ? "default" : "warning"}
        />
        <AdminMetric
          label="Custo-hora medio"
          value={averageHourCost ? `${formatBRL(averageHourCost)}/h` : "—"}
          hint="Depreciacao + reposicao"
        />
      </div>

      {printers.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((printer) => {
            const breakdown = machineHourBreakdown(machineConfigFromPrinter(printer));
            const isActive = printer.active !== false;
            return (
              <article
                key={printer.id}
                className={cn("admin-panel overflow-hidden", !isActive && "opacity-60")}
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.06] bg-white/[0.02]">
                  {printer.photoUrl ? (
                    <img
                      src={printer.photoUrl}
                      alt={printer.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {printer.isDefault && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200 backdrop-blur">
                      <Star className="h-2.5 w-2.5" /> Padrao
                    </span>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-white">{printer.name}</h3>
                      <p className="mt-1 truncate text-[11px] text-white/38">
                        {printer.model || "Sem modelo informado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] uppercase tracking-wider text-white/38">
                        Custo/hora
                      </span>
                      <strong className="block text-sm font-black tabular-nums text-white">
                        {formatBRL(breakdown.total)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <HourCost label="Depreciacao" value={breakdown.depreciation} />
                    <HourCost label="Reposicao" value={breakdown.replacement} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onEdit(printer)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] text-[11px] font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onToggleActive(printer.id, isActive)}
                      className={cn(
                        "h-9 rounded-lg border px-3 text-[11px] font-semibold transition",
                        isActive
                          ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-300 hover:bg-emerald-400/12"
                          : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white",
                      )}
                    >
                      {isActive ? "Ativa" : "Inativa"}
                    </button>
                    <button
                      onClick={() => onDelete(printer)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-white/30 transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`Excluir ${printer.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!printer.isDefault && (
                    <button
                      onClick={() => onSetDefault(printer.id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2 text-[11px] font-semibold text-white/45 transition hover:border-emerald-400/25 hover:text-emerald-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Tornar padrao
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-panel">
          <AdminEmptyState
            icon={PrinterIcon}
            title="Nenhuma impressora cadastrada"
            description="Cadastre sua maquina com preco, vida util e pecas para a calculadora precificar com os seus numeros reais."
            action={
              <Button onClick={onAdd} className="h-9 rounded-lg px-3 text-[11px]">
                Cadastrar impressora
              </Button>
            }
          />
        </div>
      )}
    </motion.div>
  );
});

function HourCost({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.025] p-2.5">
      <span className="block text-[9px] text-white/38">{label}</span>
      <strong className="mt-1 block text-xs font-semibold tabular-nums text-white">
        {formatBRL(value)}/h
      </strong>
    </div>
  );
}

export default AdminPrintersPanel;
