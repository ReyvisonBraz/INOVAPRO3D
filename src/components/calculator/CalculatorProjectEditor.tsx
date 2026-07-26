import { useMemo, useState, type ReactNode } from "react";
import { Copy, HelpCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Material } from "../../types/domain";
import {
  createEmptyPlate,
  type CalculatorFilament,
  type CalculatorPlate,
  type CalculatorProject,
  type ManualFilament,
  type ProjectValidationIssue,
} from "../../lib/calculatorProject";
import { formatHoursToHHMM, parseTimeToHours, type MaterialKey, type PricingSettings } from "../../lib/pricing";

interface Props {
  project: CalculatorProject;
  onChange: (project: CalculatorProject) => void;
  materials: Material[];
  pricingSettings: PricingSettings;
  issues?: ProjectValidationIssue[];
}

interface FilamentDraft {
  source: "inventory" | "manual";
  materialId: string;
  grams: number;
  color: string;
  brand: string;
  type: ManualFilament["type"];
  pricePerKg: number;
}

const emptyDraft = (): FilamentDraft => ({
  source: "inventory",
  materialId: "",
  grams: 0,
  color: "",
  brand: "",
  type: "PLA",
  pricePerKg: 0,
});

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-400/60";

const FIELD_HELP = {
  projectName: "Nome usado para identificar o cálculo, orçamento e futuro pedido. Exemplo: Ken Kaneki 20 cm.",
  outputQuantity: "Quantidade de produtos completos que poderão ser vendidos. Um boneco dividido em 3 bandejas continua sendo 1 produto final; 20 chaveiros completos são 20.",
  plateName: "Identifique o conteúdo desta placa do Bambu Studio. Exemplo: Corpo preto, Cabelo branco ou Chaveiros.",
  plateType: "Cor única: esta bandeja usa um filamento. Multicolor: a mesma bandeja usa dois ou mais filamentos e pode ter purga e torre.",
  totalTime: "Tempo total desta bandeja no Bambu Studio. Aceita 2h25m, 36m57s, 2:30 ou horas decimais. A tela exibirá horas e minutos.",
  physicalItems: "Quantidade de objetos físicos impressos nesta bandeja. É informativo: partes separadas podem formar um único produto final.",
  repetitions: "Quantas vezes esta mesma bandeja será impressa. Cada repetição multiplica o tempo, o consumo de filamento, energia e máquina.",
  source: "Estoque usa um filamento cadastrado e verifica disponibilidade. Manual permite informar cor, marca, tipo e preço sem movimentar estoque.",
  inventoryFilament: "Selecione o rolo cadastrado que será usado. O custo utiliza o preço desse material e o sistema compara o consumo previsto com o saldo livre.",
  manualColor: "Cor comercial do filamento. Exemplo: Preto, Branco, Vermelho ou Cor de pele.",
  manualBrand: "Fabricante ou marca do filamento. Exemplo: Bambu Lab, Voolt3D ou 3D Fila.",
  manualType: "Tipo exato do material, pois linhas como PLA Silk, PLA High Speed e PETG podem ter preços e consumo de energia diferentes.",
  manualPrice: "Valor pago por 1 kg deste filamento. Exemplo: um rolo de 1 kg que custou R$ 120 deve ser informado como 120.",
  totalGrams: "Peso total deste filamento mostrado pela Bambu para a bandeja. Use a coluna Total, pois ela já inclui modelo, suporte, purga/corado e torre.",
} as const;

function FieldHelp({ text, label }: { text: string; label: string }) {
  return (
    <span
      className="group/help relative inline-flex shrink-0 cursor-help rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
      tabIndex={0}
      aria-label={`Ajuda sobre ${label}`}
    >
      <HelpCircle className="h-3.5 w-3.5 text-blue-300/60 transition group-hover/help:text-blue-300 group-focus/help:text-blue-300" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 hidden w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-blue-400/20 bg-[#090d18] px-3 py-2.5 text-left text-[11px] font-medium normal-case leading-relaxed tracking-normal text-white/75 shadow-2xl group-hover/help:block group-focus/help:block"
      >
        {text}
      </span>
    </span>
  );
}

function FieldLabel({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex min-h-4 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
        {label}
        <FieldHelp text={help} label={label} />
      </span>
      {children}
    </label>
  );
}

function materialKeyFromType(type?: string): MaterialKey {
  return String(type || "").toLowerCase().includes("petg") ? "petg" : "pla";
}

export function CalculatorProjectEditor({ project, onChange, materials, pricingSettings, issues = [] }: Props) {
  const [drafts, setDrafts] = useState<Record<string, FilamentDraft>>({});
  const [editingFilamentIds, setEditingFilamentIds] = useState<Record<string, string | undefined>>({});
  const issuePaths = useMemo(() => new Set(issues.map((issue) => issue.path)), [issues]);
  const shortages = useMemo(() => {
    const required = new Map<string, number>();
    project.plates.forEach((plate) => {
      plate.filaments.forEach((filament) => {
        if (!filament.materialId) return;
        required.set(
          filament.materialId,
          (required.get(filament.materialId) ?? 0) +
            filament.totalGrams * Math.max(1, plate.repetitions),
        );
      });
    });
    return [...required].flatMap(([materialId, grams]) => {
      const material = materials.find((item) => item.id === materialId);
      if (!material) return [];
      const available = Math.max(0, Number(material.stockGrams || 0) - Number(material.reservedGrams || 0));
      return grams > available ? [{ name: material.name, required: grams, available }] : [];
    });
  }, [materials, project.plates]);

  const updatePlate = (plateId: string, patch: Partial<CalculatorPlate>) => {
    onChange({
      ...project,
      plates: project.plates.map((plate) => plate.id === plateId ? { ...plate, ...patch } : plate),
    });
  };

  const addPlate = () => {
    onChange({ ...project, plates: [...project.plates, createEmptyPlate(project.plates.length + 1)] });
  };

  const duplicatePlate = (plate: CalculatorPlate) => {
    const copyId = globalThis.crypto.randomUUID();
    onChange({
      ...project,
      plates: [
        ...project.plates,
        {
          ...plate,
          id: copyId,
          name: `${plate.name} — cópia`,
          filaments: plate.filaments.map((filament) => ({
            ...filament,
            id: globalThis.crypto.randomUUID(),
          })),
        },
      ],
    });
  };

  const addFilament = (plate: CalculatorPlate) => {
    const draft = drafts[plate.id] ?? emptyDraft();
    if (draft.grams <= 0) return;
    let filament: CalculatorFilament | null = null;
    if (draft.source === "inventory") {
      const selected = materials.find((material) => material.id === draft.materialId);
      if (!selected) return;
      const key = materialKeyFromType(selected.type);
      const pricePerGram =
        Number(selected.pricePerGram ?? 0) ||
        Number(selected.pricePerKg ?? 0) / 1000 ||
        pricingSettings.materials[key].spoolPrice / pricingSettings.materials[key].spoolWeight;
      filament = {
        id: globalThis.crypto.randomUUID(),
        materialId: selected.id,
        materialName: selected.name,
        materialKey: key,
        totalGrams: draft.grams,
        pricePerGram,
        steadyPowerWatts: pricingSettings.materials[key].steadyPowerWatts,
      };
    } else if (draft.color.trim() && draft.brand.trim() && draft.pricePerKg > 0) {
      const key = materialKeyFromType(draft.type);
      const manual = {
        color: draft.color.trim(),
        brand: draft.brand.trim(),
        type: draft.type,
        pricePerKg: draft.pricePerKg,
      };
      filament = {
        id: globalThis.crypto.randomUUID(),
        materialName: `${manual.color} · ${manual.brand} · ${manual.type.replaceAll("_", " ")}`,
        materialKey: key,
        totalGrams: draft.grams,
        pricePerGram: manual.pricePerKg / 1000,
        steadyPowerWatts: pricingSettings.materials[key].steadyPowerWatts,
        manual,
      };
    }
    if (!filament) return;
    const editingId = editingFilamentIds[plate.id];
    updatePlate(plate.id, {
      filaments: editingId
        ? plate.filaments.map((item) => item.id === editingId ? { ...filament, id: editingId } : item)
        : [...plate.filaments, filament],
    });
    setDrafts((current) => ({ ...current, [plate.id]: emptyDraft() }));
    setEditingFilamentIds((current) => ({ ...current, [plate.id]: undefined }));
  };

  const startEditingFilament = (plate: CalculatorPlate, filament: CalculatorFilament) => {
    setDrafts((current) => ({
      ...current,
      [plate.id]: filament.manual
        ? {
            source: "manual",
            materialId: "",
            grams: filament.totalGrams,
            color: filament.manual.color,
            brand: filament.manual.brand,
            type: filament.manual.type,
            pricePerKg: filament.manual.pricePerKg,
          }
        : {
            ...emptyDraft(),
            source: "inventory",
            materialId: filament.materialId ?? "",
            grams: filament.totalGrams,
          },
    }));
    setEditingFilamentIds((current) => ({ ...current, [plate.id]: filament.id }));
  };

  const cancelEditingFilament = (plateId: string) => {
    setDrafts((current) => ({ ...current, [plateId]: emptyDraft() }));
    setEditingFilamentIds((current) => ({ ...current, [plateId]: undefined }));
  };

  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/[0.08] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Revise os campos destacados</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-red-200/80">
            {issues.slice(0, 5).map((issue) => <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>)}
          </ul>
        </div>
      )}
      {shortages.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[11px] text-amber-100/80">
          <p className="font-black uppercase tracking-widest text-amber-300">Estoque abaixo do consumo previsto</p>
          {shortages.map((shortage) => (
            <p key={shortage.name} className="mt-1">
              {shortage.name}: necessário {shortage.required.toFixed(2)} g · disponível {shortage.available.toFixed(2)} g
            </p>
          ))}
          <p className="mt-2 text-amber-100/50">O orçamento pode ser salvo; nenhuma reserva ou baixa será feita agora.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <FieldLabel label="Nome do projeto" help={FIELD_HELP.projectName}>
          <input
            value={project.name}
            onChange={(event) => onChange({ ...project, name: event.target.value })}
            placeholder="Ex.: Satoru Gojo"
            className={`${fieldClass} ${issuePaths.has("project.name") ? "border-red-400/70" : ""}`}
          />
        </FieldLabel>
        <FieldLabel label="Produtos finais" help={FIELD_HELP.outputQuantity}>
          <input
            type="number"
            min={1}
            value={project.outputQuantity}
            onChange={(event) => onChange({ ...project, outputQuantity: Number(event.target.value) || 0 })}
            title="Quantidade de produtos completos e vendáveis"
            className={`${fieldClass} ${issuePaths.has("project.outputQuantity") ? "border-red-400/70" : ""}`}
          />
        </FieldLabel>
      </div>

      {project.plates.map((plate, plateIndex) => {
        const draft = drafts[plate.id] ?? emptyDraft();
        const plateHours = parseTimeToHours(plate.totalTime) * Math.max(1, plate.repetitions);
        const plateGrams = plate.filaments.reduce((sum, filament) => sum + filament.totalGrams, 0) * Math.max(1, plate.repetitions);
        const basePath = `plates.${plate.id}`;
        return (
          <div key={plate.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Bandeja {plateIndex + 1}</p>
                <p className="mt-1 text-[10px] text-white/35">{plateGrams.toFixed(2)} g · {formatHoursToHHMM(plateHours)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => duplicatePlate(plate)} className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-white" aria-label="Duplicar bandeja"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => onChange({ ...project, plates: project.plates.filter((item) => item.id !== plate.id) })} className="rounded-lg border border-red-400/15 p-2 text-red-300/70 hover:text-red-300" aria-label="Excluir bandeja"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldLabel label="Nome da bandeja" help={FIELD_HELP.plateName}>
                <input value={plate.name} onChange={(event) => updatePlate(plate.id, { name: event.target.value })} placeholder="Ex.: Corpo preto" className={`${fieldClass} ${issuePaths.has(`${basePath}.name`) ? "border-red-400/70" : ""}`} />
              </FieldLabel>
              <FieldLabel label="Tipo de impressão" help={FIELD_HELP.plateType}>
                <select value={plate.type} onChange={(event) => updatePlate(plate.id, { type: event.target.value as CalculatorPlate["type"] })} className={fieldClass}>
                  <option value="SINGLE_COLOR">Cor única</option>
                  <option value="MULTICOLOR">Multicolor</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Tempo da bandeja" help={FIELD_HELP.totalTime}>
                <input value={plate.totalTime} onChange={(event) => updatePlate(plate.id, { totalTime: event.target.value })} placeholder="Ex.: 2h25m" className={`${fieldClass} ${issuePaths.has(`${basePath}.totalTime`) ? "border-red-400/70" : ""}`} />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <FieldLabel label="Itens físicos" help={FIELD_HELP.physicalItems}>
                  <input type="number" min={1} value={plate.pieces} onChange={(event) => updatePlate(plate.id, { pieces: Number(event.target.value) || 0 })} className={fieldClass} />
                </FieldLabel>
                <FieldLabel label="Repetições" help={FIELD_HELP.repetitions}>
                  <input type="number" min={1} value={plate.repetitions} onChange={(event) => updatePlate(plate.id, { repetitions: Number(event.target.value) || 0 })} className={fieldClass} />
                </FieldLabel>
              </div>
            </div>

            <div className={`mt-4 rounded-xl border p-3 ${issuePaths.has(`${basePath}.filaments`) ? "border-red-400/50 bg-red-400/[0.03]" : "border-white/[0.07] bg-black/20"}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Filamentos da bandeja</p>
                <p className="text-[9px] text-white/30">{plate.type === "MULTICOLOR" ? "Mínimo 2" : "Peso total do Bambu"}</p>
              </div>
              {plate.filaments.map((filament) => (
                <div key={filament.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-white/70">{filament.materialName}{filament.manual ? " · manual" : ""}</span>
                  <span className="flex shrink-0 items-center gap-2 font-mono">
                    <strong>{filament.totalGrams.toFixed(2)} g</strong>
                    <button type="button" aria-label={`Editar ${filament.materialName}`} onClick={() => startEditingFilament(plate, filament)} className="text-blue-300/60 hover:text-blue-300"><Pencil className="h-3 w-3" /></button>
                    <button type="button" aria-label={`Excluir ${filament.materialName}`} onClick={() => updatePlate(plate.id, { filaments: plate.filaments.filter((item) => item.id !== filament.id) })} className="text-red-300/60 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
                  </span>
                </div>
              ))}

              <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_110px_auto]">
                <FieldLabel label="Origem" help={FIELD_HELP.source}>
                  <select value={draft.source} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, source: event.target.value as FilamentDraft["source"] } }))} className={fieldClass}>
                    <option value="inventory">Estoque</option>
                    <option value="manual">Manual</option>
                  </select>
                </FieldLabel>
                {draft.source === "inventory" ? (
                  <FieldLabel label="Filamento do estoque" help={FIELD_HELP.inventoryFilament}>
                    <select value={draft.materialId} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, materialId: event.target.value } }))} className={fieldClass}>
                      <option value="">Selecionar filamento...</option>
                      {materials.map((material) => <option key={material.id} value={material.id}>{material.name} · {Math.max(0, Number(material.stockGrams || 0) - Number(material.reservedGrams || 0)).toFixed(0)}g livres</option>)}
                    </select>
                  </FieldLabel>
                ) : (
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <FieldLabel label="Cor" help={FIELD_HELP.manualColor}>
                      <input value={draft.color} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, color: event.target.value } }))} placeholder="Ex.: Preto" className={fieldClass} />
                    </FieldLabel>
                    <FieldLabel label="Marca" help={FIELD_HELP.manualBrand}>
                      <input value={draft.brand} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, brand: event.target.value } }))} placeholder="Ex.: Bambu Lab" className={fieldClass} />
                    </FieldLabel>
                    <FieldLabel label="Tipo" help={FIELD_HELP.manualType}>
                      <select value={draft.type} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, type: event.target.value as ManualFilament["type"] } }))} className={fieldClass}>
                        <option value="PLA">PLA</option>
                        <option value="PLA_HIGH_SPEED">PLA High Speed</option>
                        <option value="PLA_SILK">PLA Silk</option>
                        <option value="PETG">PETG</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Preço por kg" help={FIELD_HELP.manualPrice}>
                      <input type="number" min={0} value={draft.pricePerKg || ""} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, pricePerKg: Number(event.target.value) || 0 } }))} placeholder="Ex.: 120" className={fieldClass} />
                    </FieldLabel>
                  </div>
                )}
                <FieldLabel label="Total (g)" help={FIELD_HELP.totalGrams}>
                  <input type="number" min={0} step="0.01" value={draft.grams || ""} onChange={(event) => setDrafts((current) => ({ ...current, [plate.id]: { ...draft, grams: Number(event.target.value) || 0 } }))} placeholder="Ex.: 63,08" className={fieldClass} />
                </FieldLabel>
                <div className="flex items-end gap-2">
                  {editingFilamentIds[plate.id] && (
                    <button type="button" aria-label="Cancelar edição do filamento" onClick={() => cancelEditingFilament(plate.id)} className="rounded-xl border border-white/10 px-3 text-white/50 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => addFilament(plate)} className="rounded-xl bg-blue-500 px-4 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40">
                    {editingFilamentIds[plate.id] ? "Salvar" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addPlate} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400/30 bg-blue-400/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-400/[0.08]">
        <Plus className="h-4 w-4" /> Adicionar bandeja
      </button>
    </div>
  );
}
