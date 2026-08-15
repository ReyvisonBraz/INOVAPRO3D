import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { PageSEO } from "../../components/seo/PageSEO";
import {
  AlertTriangle,
  Calculator,
  Coins,
  Cpu,
  Download,
  Factory,
  Gauge,
  ImagePlus,
  Layers3,
  Loader2,
  Package,
  Save,
  Search,
  Settings2,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatBRL, formatHoursToHHMM, HELP } from "../../lib/pricing";
import { BrandMark } from "../../components/brand/BrandLogo";
import { Reveal } from "../../components/ui/Reveal";
import { useCalculatorState } from "./calculator/useCalculatorState";
import type { CalculatorIntent } from "./calculator/useCalculatorState";
import type { Quote } from "../../types/domain";
import { db } from "../../services/firebase";
import { PrintDocumentHost } from "../../components/print/PrintDocumentHost";
import { printDocument } from "../../lib/printing";
import { CalculatorProjectEditor } from "../../components/calculator/CalculatorProjectEditor";
import { PrinterPicker } from "../../components/calculator/PrinterPicker";
import { SlicerPasteBox } from "../../components/calculator/SlicerPasteBox";
import { ScenarioSimulator } from "../../components/calculator/ScenarioSimulator";
import { CalculatorStickyBar } from "../../components/calculator/CalculatorStickyBar";
import { CalculatorTemplatePanel } from "../../components/calculator/CalculatorTemplatePanel";
import {
  AdvancedPanel,
  CollapsibleSection,
  CostBar,
  HelpTip,
  MachineStat,
  NumberField,
  PriceBox,
  ProfitLine,
  SectionCard,
  Toggle,
} from "../../components/calculator/primitives";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

interface FilamentCalculatorProps {
  embedded?: boolean;
  initialQuote?: Quote | null;
  intent?: CalculatorIntent;
  onQuoteSaved?: (result: { id: string; created: boolean }) => void | Promise<void>;
}

export default function FilamentCalculator(props: FilamentCalculatorProps) {
  const [searchParams] = useSearchParams();
  const requestedId = props.embedded ? null : searchParams.get("orcamento");
  const requestedIntent: CalculatorIntent =
    searchParams.get("modo") === "duplicar" ? "DUPLICATE" : "EDIT";
  const [loadedQuote, setLoadedQuote] = useState<Quote | null>(props.initialQuote ?? null);
  const [loadingQuote, setLoadingQuote] = useState(Boolean(requestedId && !props.initialQuote));
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!requestedId || props.initialQuote) return;
    let active = true;
    setLoadingQuote(true);
    setLoadError(false);
    getDoc(doc(db, "quotes", requestedId))
      .then((snapshot) => {
        if (!active) return;
        if (!snapshot.exists()) {
          setLoadError(true);
          return;
        }
        setLoadedQuote({ id: snapshot.id, ...snapshot.data() } as Quote);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoadingQuote(false);
      });
    return () => {
      active = false;
    };
  }, [props.initialQuote, requestedId]);

  if (loadingQuote) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-[#07080d] text-sm font-bold text-white/60">
        <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
        Abrindo orçamento...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#07080d] p-6 text-center text-sm text-red-200">
        Não foi possível abrir este orçamento. Confirme o link e sua sessão de administrador.
      </div>
    );
  }

  return (
    <FilamentCalculatorContent
      {...props}
      initialQuote={loadedQuote}
      intent={requestedId ? requestedIntent : props.intent}
    />
  );
}

function FilamentCalculatorContent({
  embedded = false,
  initialQuote = null,
  intent = "NEW",
  onQuoteSaved,
}: FilamentCalculatorProps) {
  const [printMode, setPrintMode] = useState<"CLIENT" | "PRODUCTION">("CLIENT");
  const {
    project,
    setProject,
    projectIssues,
    setProjectIssues,
    pricingSettings,
    projectPricing,
    spoolPrice,
    setSpoolPrice,
    spoolWeight,
    setSpoolWeight,
    reservePct,
    setReservePct,
    failureRatePct,
    setFailureRatePct,
    failureImpactPct,
    setFailureImpactPct,
    inventoryMaterials,
    materialSettings,
    printers,
    selectedPrinterId,
    setSelectedPrinterId,
    selectedPrinter,
    machine,
    machineOverrides,
    overrideCount,
    setMachineField,
    resetMachineOverrides,
    kwhCost,
    setKwhCost,
    steadyPower,
    setSteadyPower,
    startupPower,
    setStartupPower,
    startupMinutes,
    setStartupMinutes,
    requiresLabor,
    setRequiresLabor,
    laborHours,
    setLaborHours,
    laborRate,
    setLaborRate,
    extraSupplies,
    setExtraSupplies,
    packagingCost,
    setPackagingCost,
    targetProfitPerMachineHour,
    setTargetProfitPerMachineHour,
    wholesaleMarkup,
    retailMarkup,
    minPrice,
    setMinPrice,
    markupMode,
    setMarkupMode,
    wholesaleDisplay,
    retailDisplay,
    markupLabel,
    handleWholesaleMarkup,
    handleRetailMarkup,
    showAdvancedMachine,
    setShowAdvancedMachine,
    showAdvancedEnergy,
    setShowAdvancedEnergy,
    showMachineConfig,
    setShowMachineConfig,
    showMaterialConfig,
    setShowMaterialConfig,
    showEnergyConfig,
    setShowEnergyConfig,
    showLaborConfig,
    setShowLaborConfig,
    calcMode,
    setCalcMode,
    savingCalc,
    handleSaveCalc,
    clientName,
    setClientName,
    clientLastName,
    setClientLastName,
    clientPhone,
    setClientPhone,
    selectedCustomerId,
    customerSearch,
    setCustomerSearch,
    customerMatches,
    selectQuoteCustomer,
    clearQuoteCustomer,
    priceTier,
    setPriceTier,
    quoteImageUrl,
    setQuoteImageUrl,
    quoteId,
    snapshotStale,
    postSave,
    showImageOnQuote,
    setShowImageOnQuote,
    continueEditingSavedQuote,
    duplicateSavedQuote,
    startNewCalculation,
    uploadingImage,
    handleUploadImage,
    draftSavedAt,
    result,
    machineBreak,
    laborTotal,
    quoteDocumentData,
    doubleLotResult,
    inventoryForecast,
    calculatorTemplates,
    templatesLoading,
    templateSaving,
    applyProjectTemplate,
    saveProjectTemplate,
  } = useCalculatorState({ initialQuote, initialQuoteId: initialQuote?.id, intent, onQuoteSaved });

  const quotedTotal = priceTier === "WHOLESALE" ? result.wholesaleTotal : result.retailTotal;
  const negotiationFloor = Math.max(
    result.minimumSustainablePrice,
    result.weightGrams > 0 || result.hours > 0 ? minPrice : 0,
  );
  const maximumSafeDiscountPct =
    quotedTotal > 0 ? Math.max(0, ((quotedTotal - negotiationFloor) / quotedTotal) * 100) : 0;
  const comfortableDiscountPct =
    priceTier === "RETAIL" ? Math.min(pricingSettings.pixDiscountPct, maximumSafeDiscountPct) : 0;
  const comfortableOffer = quotedTotal * (1 - comfortableDiscountPct / 100);
  const selectedReprintProfit =
    priceTier === "WHOLESALE"
      ? result.wholesaleProfitAfterFullReprint
      : result.retailProfitAfterFullReprint;
  const printReport = (mode: "CLIENT" | "PRODUCTION") => printDocument(() => setPrintMode(mode));

  return (
    <>
      <PrintDocumentHost data={quoteDocumentData} mode={printMode} />
      {!embedded && (
        <PageSEO
          title="Calculadora de Custos 3D"
          description="Calcule o custo real de qualquer impressão 3D: material, energia, depreciação da máquina e mão de obra. Motor de precisão com parâmetros da Bambu Lab P2S."
          path="/calculadora"
        />
      )}
      <div
        className={`maker-screen relative overflow-hidden bg-[#07080d] px-4 pb-32 text-white sm:px-6 xl:pb-8 lg:px-8 ${embedded ? "min-h-full pt-5 sm:pt-6" : "min-h-screen pt-8"}`}
      >
        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <BrandMark className="h-8 w-8" />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
                  <Calculator className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  CÁLCULO <span className="text-white">MAKER</span>
                </h1>
              </div>
              <p className="text-sm text-white/40">
                Entenda cada centavo: material, energia, depreciação da máquina e seu lucro real
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                {draftSavedAt && (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200"
                    title={new Date(draftSavedAt).toLocaleString("pt-BR")}
                  >
                    <Save className="h-3 w-3" />
                    Rascunho salvo
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Settings2 className="h-3 w-3" />
                  MOTOR V6.0
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-300">
                  {selectedPrinter?.name ?? "Máquina configurada em Ajustes"}
                </span>
                {quoteId && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-blue-200">
                    Editando #{quoteId.slice(0, 8)}
                  </span>
                )}
              </div>

              {/* MODO RÁPIDO × COMPLETO — Completo é um superconjunto: nenhum
                  dado se perde ao trocar, campos só deixam de ser exibidos. */}
              <div
                role="tablist"
                aria-label="Modo de cálculo"
                className="inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={calcMode === "QUICK"}
                  onClick={() => setCalcMode("QUICK")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition",
                    calcMode === "QUICK"
                      ? "bg-cyan-500/25 text-cyan-200 shadow-[0_0_0_1px_rgba(103,232,249,0.3)]"
                      : "text-white/40 hover:text-white/70",
                  )}
                >
                  Rápido
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={calcMode === "FULL"}
                  onClick={() => setCalcMode("FULL")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition",
                    calcMode === "FULL"
                      ? "bg-cyan-500/25 text-cyan-200 shadow-[0_0_0_1px_rgba(103,232,249,0.3)]"
                      : "text-white/40 hover:text-white/70",
                  )}
                >
                  Completo
                </button>
              </div>
            </div>
          </header>

          {snapshotStale && (
            <div
              className="mb-6 flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-100"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <strong className="block font-black">Confira os valores antes de salvar</strong>
                Este orçamento foi criado antes da ficha técnica completa ou teve campos alterados
                diretamente no painel. As bandejas foram recuperadas, mas os parâmetros atuais
                precisam ser confirmados.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <CalculatorTemplatePanel
                templates={calculatorTemplates}
                loading={templatesLoading}
                saving={templateSaving}
                onApply={applyProjectTemplate}
                onSave={saveProjectTemplate}
              />
              {/* INÍCIO RÁPIDO — sempre visível */}
              <Reveal delay={0}>
                <SectionCard
                  icon={Zap}
                  title="Início Rápido"
                  subtitle="Dados do job atual — copie do Bambu Studio"
                >
                  <SlicerPasteBox
                    materials={inventoryMaterials}
                    fallbackPricePerKg={{
                      pla:
                        (materialSettings.pla.spoolPrice / materialSettings.pla.spoolWeight) * 1000,
                      petg:
                        (materialSettings.petg.spoolPrice / materialSettings.petg.spoolWeight) *
                        1000,
                    }}
                    hasExistingPlates={project.plates.some((plate) => plate.filaments.length > 0)}
                    onApply={(plates, mode) => {
                      setProject((previous) => ({
                        ...previous,
                        plates: mode === "REPLACE" ? plates : [...previous.plates, ...plates],
                      }));
                      if (projectIssues.length) setProjectIssues([]);
                    }}
                  />
                  <div className="my-4 border-t border-white/[0.06]" />
                  <CalculatorProjectEditor
                    project={project}
                    onChange={(next) => {
                      setProject(next);
                      if (projectIssues.length) setProjectIssues([]);
                    }}
                    materials={inventoryMaterials}
                    pricingSettings={pricingSettings}
                    issues={projectIssues}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MachineStat label="Bandejas" value={`${project.plates.length}`} />
                    <MachineStat label="Tempo total" value={formatHoursToHHMM(result.hours)} />
                    <MachineStat
                      label="Peso total"
                      value={`${result.weightGrams.toFixed(2)}g`}
                      highlight
                    />
                  </div>
                </SectionCard>
              </Reveal>

              {/* IMPRESSORA — escolha da máquina base do cálculo */}
              <Reveal delay={0.05}>
                <SectionCard
                  icon={Factory}
                  title="Impressora"
                  subtitle="Base de cálculo desta proposta — personalize valores só para este orçamento se precisar"
                >
                  <PrinterPicker
                    printers={printers}
                    selectedPrinterId={selectedPrinterId || (selectedPrinter?.id ?? "")}
                    onSelect={setSelectedPrinterId}
                    overrideCount={overrideCount}
                    onResetOverrides={resetMachineOverrides}
                  />
                </SectionCard>
              </Reveal>

              {/* MODO RÁPIDO — resumo dos padrões em uso, sem abrir nada */}
              {calcMode === "QUICK" && (
                <Reveal delay={0.08}>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-white/45">
                    Usando seus padrões:{" "}
                    <strong className="font-black text-white/75">{formatBRL(kwhCost)}/kWh</strong> ·
                    falha <strong className="font-black text-white/75">{failureRatePct}%</strong> ·
                    varejo{" "}
                    <strong className="font-black text-white/75">
                      {markupLabel(retailMarkup)}
                    </strong>{" "}
                    · mínimo{" "}
                    <strong className="font-black text-white/75">{formatBRL(minPrice)}</strong>
                    <button
                      type="button"
                      onClick={() => setCalcMode("FULL")}
                      className="ml-2 font-black text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
                    >
                      Ajustar tudo →
                    </button>
                  </div>
                </Reveal>
              )}

              {/* MODO COMPLETO — máquina, filamento, energia e mão de obra
                  detalhados. O modo Rápido não perde nada: só deixa de mostrar. */}
              {calcMode === "FULL" && (
                <>
                  {/* MÁQUINA & DEPRECIAÇÃO — recolhida */}
                  <Reveal delay={0.1}>
                    <CollapsibleSection
                      icon={Cpu}
                      title="Máquina & Depreciação"
                      summary={`Custo: ${formatBRL(machineBreak.total)}/h · Depr. ${formatBRL(machineBreak.depreciation)}/h`}
                      open={showMachineConfig}
                      onToggle={() => setShowMachineConfig((v) => !v)}
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MachineStat
                          label="Depreciação"
                          value={`${formatBRL(machineBreak.depreciation)}/h`}
                          help={HELP.depreciation}
                        />
                        <MachineStat
                          label="Reposição de peças"
                          value={`${formatBRL(machineBreak.replacement)}/h`}
                          help={HELP.replacement}
                        />
                        <MachineStat
                          label="Custo-máquina total"
                          value={`${formatBRL(machineBreak.total)}/h`}
                          highlight
                        />
                      </div>

                      <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-relaxed text-white/50">
                        Cada hora de impressão consome{" "}
                        <span className="font-black text-cyan-300">
                          {formatBRL(machineBreak.total)}/h
                        </span>{" "}
                        da{" "}
                        <span className="font-black text-white/80">
                          {selectedPrinter?.name ?? "máquina configurada"}
                        </span>{" "}
                        —{" "}
                        <span className="font-black text-white/80">
                          {formatBRL(machineBreak.depreciation)}
                        </span>{" "}
                        de desgaste +{" "}
                        <span className="font-black text-white/80">
                          {formatBRL(machineBreak.replacement)}
                        </span>{" "}
                        para repor peças.
                      </div>

                      <AdvancedPanel
                        open={showAdvancedMachine}
                        onToggle={() => setShowAdvancedMachine((v) => !v)}
                        label="Personalizar só este orçamento"
                      >
                        {overrideCount > 0 && (
                          <button
                            type="button"
                            onClick={resetMachineOverrides}
                            className="mb-4 text-[10px] font-bold text-cyan-300/80 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
                          >
                            Restaurar todos os valores da impressora
                          </button>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <NumberField
                            label={`Preço da máquina${machineOverrides?.price !== undefined ? " (personalizado)" : ""}`}
                            prefix="R$"
                            value={machine.price}
                            onChange={(v) => setMachineField("price", v)}
                            step={1}
                            help={HELP.machinePrice}
                          />
                          <NumberField
                            label={`Vida útil da máquina${machineOverrides?.lifespanHours !== undefined ? " (personalizado)" : ""}`}
                            suffix="h"
                            value={machine.lifespanHours}
                            onChange={(v) => setMachineField("lifespanHours", v)}
                            min={1}
                            step={100}
                            help={HELP.lifespan}
                          />
                        </div>
                        <p className="mt-5 mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                          <Wrench className="h-3 w-3" /> Fundo de reposição de peças
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <NumberField
                            label="Bico — preço"
                            prefix="R$"
                            value={machine.nozzlePrice}
                            onChange={(v) => setMachineField("nozzlePrice", v)}
                            step={1}
                            help={HELP.nozzle}
                          />
                          <NumberField
                            label="Bico — vida útil"
                            suffix="h"
                            value={machine.nozzleLifeHours}
                            onChange={(v) => setMachineField("nozzleLifeHours", v)}
                            min={1}
                            step={50}
                            help={HELP.nozzle}
                          />
                          <NumberField
                            label="Placa / PEI — preço"
                            prefix="R$"
                            value={machine.platePrice}
                            onChange={(v) => setMachineField("platePrice", v)}
                            step={1}
                            help={HELP.plate}
                          />
                          <NumberField
                            label="Placa / PEI — vida útil"
                            suffix="h"
                            value={machine.plateLifeHours}
                            onChange={(v) => setMachineField("plateLifeHours", v)}
                            min={1}
                            step={50}
                            help={HELP.plate}
                          />
                          <NumberField
                            label="Correias (par) — preço"
                            prefix="R$"
                            value={machine.beltsPrice}
                            onChange={(v) => setMachineField("beltsPrice", v)}
                            step={1}
                            help={HELP.belts}
                          />
                          <NumberField
                            label="Correias — vida útil"
                            suffix="h"
                            value={machine.beltsLifeHours}
                            onChange={(v) => setMachineField("beltsLifeHours", v)}
                            min={1}
                            step={50}
                            help={HELP.belts}
                          />
                        </div>
                        <div className="mt-4">
                          <NumberField
                            label="Manutenção geral"
                            prefix="R$"
                            suffix="/h"
                            value={machine.maintPerHour}
                            onChange={(v) => setMachineField("maintPerHour", v)}
                            step={0.01}
                            help={HELP.maint}
                          />
                        </div>
                      </AdvancedPanel>
                    </CollapsibleSection>
                  </Reveal>

                  {/* FILAMENTO & CUSTOS — recolhida */}
                  <Reveal delay={0.2}>
                    <CollapsibleSection
                      icon={Package}
                      title="Filamento & Custos"
                      summary={`R$${spoolPrice}/carretel · reserva ${reservePct}% · falha ${failureRatePct}%`}
                      open={showMaterialConfig}
                      onToggle={() => setShowMaterialConfig((v) => !v)}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <NumberField
                          label="Preço do carretel"
                          prefix="R$"
                          value={spoolPrice}
                          onChange={setSpoolPrice}
                          step={0.01}
                          help={HELP.spoolPrice}
                        />
                        <NumberField
                          label="Peso do carretel"
                          suffix="g"
                          value={spoolWeight}
                          onChange={setSpoolWeight}
                          min={1}
                          help={HELP.spoolWeight}
                        />
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <NumberField
                          label="Margem técnica de material"
                          suffix="%"
                          value={reservePct}
                          onChange={setReservePct}
                          step={1}
                          help={HELP.reserve}
                        />
                        <NumberField
                          label="Taxa de falha"
                          suffix="%"
                          value={failureRatePct}
                          onChange={setFailureRatePct}
                          step={1}
                          help={HELP.failureRate}
                        />
                        <NumberField
                          label="Perda média quando falha"
                          suffix="%"
                          value={failureImpactPct}
                          onChange={setFailureImpactPct}
                          step={5}
                          help={HELP.failureImpact}
                        />
                        <NumberField
                          label="Meta por hora ocupada"
                          prefix="R$"
                          suffix="/h"
                          value={targetProfitPerMachineHour}
                          onChange={setTargetProfitPerMachineHour}
                          step={1}
                          help={HELP.targetProfitPerMachineHour}
                        />
                      </div>
                      <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-4 text-xs leading-relaxed text-white/50">
                        Os filamentos e os pesos reais do Bambu Studio são definidos em cada bandeja
                        no início do cálculo. Filamentos manuais entram no custo previsto, mas não
                        movimentam o estoque.
                      </div>
                    </CollapsibleSection>
                  </Reveal>

                  {/* ENERGIA — recolhida */}
                  <Reveal delay={0.3}>
                    <CollapsibleSection
                      icon={Zap}
                      title="Energia"
                      summary={`R$${kwhCost}/kWh · ${decimal.format(result.energyKwh)} kWh estimados`}
                      open={showEnergyConfig}
                      onToggle={() => setShowEnergyConfig((v) => !v)}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <NumberField
                          label="Custo do kWh"
                          prefix="R$"
                          value={kwhCost}
                          onChange={setKwhCost}
                          step={0.01}
                          help={HELP.kwh}
                        />
                        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                            Consumo estimado
                          </p>
                          <p className="mt-1 font-mono text-lg font-black text-cyan-300">
                            {decimal.format(result.energyKwh)} kWh
                          </p>
                          <p className="mt-1 text-[10px] text-white/40">
                            = {formatBRL(result.energyCost)}
                          </p>
                        </div>
                      </div>
                      <AdvancedPanel
                        open={showAdvancedEnergy}
                        onToggle={() => setShowAdvancedEnergy((v) => !v)}
                        label="Ajustes avançados de energia"
                      >
                        <div className="grid gap-4 sm:grid-cols-3">
                          <NumberField
                            label="Potência média"
                            suffix="W"
                            value={steadyPower}
                            onChange={setSteadyPower}
                            help={HELP.steadyPower}
                          />
                          <NumberField
                            label="Pico de aquecimento"
                            suffix="W"
                            value={startupPower}
                            onChange={setStartupPower}
                            help={HELP.startupPower}
                          />
                          <NumberField
                            label="Duração do pico"
                            suffix="min"
                            value={startupMinutes}
                            onChange={setStartupMinutes}
                            step={0.5}
                            help={HELP.startupMinutes}
                          />
                        </div>
                      </AdvancedPanel>
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/40">
                        A energia soma o{" "}
                        <span className="font-black text-white/80">pico de aquecimento</span> nos
                        primeiros minutos com o{" "}
                        <span className="font-black text-white/80">regime estável</span> pelo resto
                        da impressão.
                      </div>
                    </CollapsibleSection>
                  </Reveal>

                  {/* MÃO DE OBRA & INSUMOS — recolhida */}
                  <Reveal delay={0.4}>
                    <CollapsibleSection
                      icon={Wrench}
                      title="Mão de Obra & Insumos"
                      summary={
                        requiresLabor ? `${formatBRL(laborTotal)} computados` : "Não computada"
                      }
                      open={showLaborConfig}
                      onToggle={() => setShowLaborConfig((v) => !v)}
                    >
                      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-white/90">
                            Tem trabalho manual / pós-processamento?
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            Ative para computar fatiar, tirar suportes, lixar, pintar, montar e
                            embalar.
                          </p>
                        </div>
                        <Toggle checked={requiresLabor} onChange={setRequiresLabor} />
                      </div>
                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <NumberField
                          label="Horas de trabalho"
                          suffix="h"
                          value={laborHours}
                          onChange={setLaborHours}
                          step={0.25}
                          disabled={!requiresLabor}
                          help={HELP.laborHours}
                        />
                        <NumberField
                          label="Valor da sua hora"
                          prefix="R$"
                          value={laborRate}
                          onChange={setLaborRate}
                          step={1}
                          help={HELP.laborRate}
                        />
                        <NumberField
                          label="Insumos extras"
                          prefix="R$"
                          value={extraSupplies}
                          onChange={setExtraSupplies}
                          step={0.01}
                          help={HELP.extraSupplies}
                        />
                        <NumberField
                          label="Embalagem"
                          prefix="R$"
                          value={packagingCost}
                          onChange={setPackagingCost}
                          step={0.5}
                          help="Caixa ou envelope, proteção, etiqueta, fita e demais itens usados para entregar o pedido."
                        />
                      </div>
                    </CollapsibleSection>
                  </Reveal>
                </>
              )}
            </div>

            <aside className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:p-6 xl:sticky xl:top-24">
              <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    Custo real de produção
                    <HelpTip text={HELP.totalCost} />
                  </p>
                  <div className="mt-3 flex items-start gap-2">
                    <span className="mt-2 text-xl font-black text-white/40">R$</span>
                    <span className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                      {result.totalCost.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
                  <p className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    Por grama
                    <HelpTip text={HELP.costPerGram} />
                  </p>
                  <p className="mt-1 font-mono text-xl font-black text-cyan-300">
                    R$ {decimal.format(result.costPerGram)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <CostBar
                  label="Material"
                  value={result.materialCost}
                  percent={result.shares.material}
                  color="bg-cyan-400"
                  help={HELP.spoolPrice}
                />
                <CostBar
                  label="Energia"
                  value={result.energyCost}
                  percent={result.shares.energy}
                  color="bg-orange-400"
                  help={HELP.kwh}
                />
                <CostBar
                  label="Máquina"
                  value={result.machineCost}
                  percent={result.shares.machine}
                  color="bg-primary"
                  help={HELP.depreciation}
                />
                <CostBar
                  label="Mão de obra"
                  value={laborTotal}
                  percent={result.shares.labor}
                  color="bg-white/40"
                  help={HELP.laborHours}
                />
                {result.failureLoss > 0 && (
                  <CostBar
                    label="Falhas"
                    value={result.failureLoss}
                    percent={result.shares.failure}
                    color="bg-amber-400"
                    help={HELP.failureRate}
                  />
                )}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-cyan-300" />
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.22em] text-white/90">
                      Preço de venda & lucro
                      <HelpTip text={HELP.sellPrice} />
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/[0.04] p-0.5">
                    <button
                      onClick={() => setMarkupMode("mult")}
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "mult" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
                    >
                      ×
                    </button>
                    <button
                      onClick={() => setMarkupMode("pct")}
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "pct" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <NumberField
                    label={markupMode === "pct" ? "Atacado %" : "Atacado ×"}
                    value={wholesaleDisplay}
                    onChange={handleWholesaleMarkup}
                    step={markupMode === "pct" ? 5 : 0.1}
                    help={HELP.wholesale}
                  />
                  <NumberField
                    label={markupMode === "pct" ? "Varejo %" : "Varejo ×"}
                    value={retailDisplay}
                    onChange={handleRetailMarkup}
                    step={markupMode === "pct" ? 5 : 0.1}
                    help={HELP.retail}
                  />
                  <NumberField
                    label="Preço mínimo"
                    prefix="R$"
                    value={minPrice}
                    onChange={setMinPrice}
                    step={1}
                    help={HELP.minPrice}
                  />
                </div>
                <div className="grid gap-4">
                  <div>
                    <PriceBox
                      title={`Atacado (${markupLabel(wholesaleMarkup)})`}
                      description="Ideal para cliente que revende ou fecha lote recorrente."
                      total={result.wholesaleTotal}
                      unit={result.wholesaleUnit}
                      tone="wholesale"
                    />
                    <ProfitLine
                      profit={result.profitWholesale}
                      marginPct={result.profitWholesalePct}
                      markupPct={result.profitWholesaleMarkupPct}
                    />
                    {result.isBelowMinWholesale && (
                      <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                        preço mínimo aplicado
                      </p>
                    )}
                  </div>
                  <div>
                    <PriceBox
                      title={`Varejo (${markupLabel(retailMarkup)})`}
                      description="Ideal para venda direta ao cliente final, sob demanda."
                      total={result.retailTotal}
                      unit={result.retailUnit}
                      tone="retail"
                    />
                    <ProfitLine
                      profit={result.profitRetail}
                      marginPct={result.profitRetailPct}
                      markupPct={result.profitRetailMarkupPct}
                    />
                    {result.isBelowMinRetail && (
                      <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                        preço mínimo aplicado
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
                    Piso sustentável
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {formatBRL(result.minimumSustainablePrice)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    Menor valor recomendado: custo real de {formatBRL(result.totalCost)} mais{" "}
                    {formatBRL(result.capacityContributionTarget)} pela ocupação da máquina
                    {result.hours > 0 ? ` durante ${formatHoursToHHMM(result.hours)}` : ""}.
                  </p>
                </div>
                <div className="rounded-xl border border-blue-400/25 bg-blue-400/[0.06] p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-200/80">
                    Faixa de negociação
                  </p>
                  <p className="mt-1 text-lg font-black text-blue-200">
                    {comfortableDiscountPct > 0
                      ? `Pode oferecer ${formatBRL(comfortableOffer)}`
                      : priceTier === "WHOLESALE"
                        ? "Atacado já negociado"
                        : "Mantenha o preço sugerido"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {priceTier === "WHOLESALE"
                      ? "Evite desconto adicional sem rever quantidade e custos."
                      : `Desconto confortável de ${comfortableDiscountPct.toFixed(1)}%. Limite máximo seguro: ${maximumSafeDiscountPct.toFixed(1)}%, nunca abaixo de ${formatBRL(negotiationFloor)}.`}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-4 ${selectedReprintProfit >= 0 ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-red-400/25 bg-red-400/[0.06]"}`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
                    Se houver uma reimpressão completa
                  </p>
                  <p
                    className={`mt-1 text-lg font-black ${selectedReprintProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {selectedReprintProfit >= 0 ? "Ainda sobra " : "Prejuízo de "}
                    {formatBRL(Math.abs(selectedReprintProfit))}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {selectedReprintProfit >= 0
                      ? "O preço escolhido suporta uma reimpressão completa."
                      : "Não ofereça desconto; revise o preço ou a provisão de falha."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                  <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
                    Cálculo transparente: depreciação real da máquina diluída na vida útil, fundo de
                    reposição de bico, placa e correias, energia com pico de aquecimento e sua mão
                    de obra. Passe o mouse nos "?" para entender cada campo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => printReport("CLIENT")}
                className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-primary-dark hover:shadow-[0_0_30px_rgba(37,99,235,0.25)] active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                Gerar proposta do cliente
              </button>
              <button
                type="button"
                onClick={() => printReport("PRODUCTION")}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Factory className="h-4 w-4" /> Ficha interna de produção
              </button>

              <div
                id="calculator-save-review"
                className="mt-4 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Save className="h-4 w-4 text-emerald-300" />
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    Salvar orçamento
                    <HelpTip text="Salva este orçamento na aba Orçamentos com o preço comercial escolhido (varejo ou atacado), o cliente vinculado e a ficha técnica interna. Requer login de admin." />
                  </h3>
                </div>
                <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/65">
                    <Search className="h-4 w-4 text-cyan-300" /> Buscar cliente já cadastrado
                  </label>
                  <input
                    type="search"
                    placeholder="Digite nome, sobrenome ou telefone"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
                  />
                  {customerMatches.length > 0 && (
                    <div className="mt-2 grid gap-1.5">
                      {customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectQuoteCustomer(customer)}
                          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.07]"
                        >
                          <span className="min-w-0">
                            <strong className="block truncate text-xs text-white">
                              {(
                                customer.name ||
                                [customer.firstName, customer.lastName].filter(Boolean).join(" ")
                              ).toLocaleUpperCase("pt-BR")}
                            </strong>
                            <span className="block text-[11px] font-mono text-white/45">
                              {customer.phone || customer.whatsapp || "SEM TELEFONE"}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] font-black uppercase text-cyan-300">
                            Selecionar
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCustomerId && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-black text-emerald-200">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {[clientName, clientLastName].filter(Boolean).join(" ")}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={clearQuoteCustomer}
                      className="shrink-0 text-[10px] font-black uppercase text-white/55 hover:text-white"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
                  <button
                    type="button"
                    onClick={() => setPriceTier("RETAIL")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "RETAIL" ? "bg-blue-500 text-white shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    Varejo <span className="block text-[9px] font-medium opacity-75">padrão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceTier("WHOLESALE")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "WHOLESALE" ? "bg-amber-500 text-black shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    Atacado{" "}
                    <span className="block text-[9px] font-medium opacity-75">lote ou revenda</span>
                  </button>
                </div>

                {!selectedCustomerId && (
                  <p className="mb-2 text-[11px] leading-relaxed text-white/45">
                    Cliente novo: será criado um cadastro rápido no CRM ao salvar. Nome obrigatório,
                    sobrenome opcional.
                  </p>
                )}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={clientName}
                    disabled={Boolean(selectedCustomerId)}
                    onChange={(e) => setClientName(e.target.value.toLocaleUpperCase("pt-BR"))}
                    className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome (opcional)"
                    value={clientLastName}
                    disabled={Boolean(selectedCustomerId)}
                    onChange={(e) => setClientLastName(e.target.value.toLocaleUpperCase("pt-BR"))}
                    className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
                  />
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-200">
                      WhatsApp{" "}
                      <span className="normal-case tracking-normal text-amber-200/70">
                        Importante para enviar a proposta
                      </span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="(DDD) número do WhatsApp"
                      value={clientPhone}
                      disabled={Boolean(selectedCustomerId)}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="h-11 w-full min-w-0 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3 text-xs font-mono font-bold text-white placeholder:text-white/30 focus:border-amber-300/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
                {quoteImageUrl ? (
                  <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <img
                      src={quoteImageUrl}
                      alt="Prévia do produto"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/60">
                      Imagem anexada
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteImageUrl("")}
                      className="shrink-0 rounded-lg border border-white/10 p-2 text-white/40 transition hover:border-red-400/30 hover:text-red-300"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2.5 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 text-[11px] font-bold text-white/50 transition hover:border-white/30 hover:text-white/70">
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {uploadingImage ? "Enviando..." : "Anexar imagem do produto (opcional)"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}

                {quoteImageUrl && (
                  <label className="mt-2.5 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/65">
                    <input
                      type="checkbox"
                      checked={showImageOnQuote}
                      onChange={(event) => setShowImageOnQuote(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-400"
                    />
                    Exibir esta imagem na proposta do cliente
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleSaveCalc}
                  disabled={savingCalc || uploadingImage}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingCalc ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {quoteId ? "Salvar alterações" : "Salvar no sistema"}
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Factory className="mx-auto mb-2 h-4 w-4 text-primary" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Lote <HelpTip text={HELP.batch} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {Math.max(1, projectPricing.totalPieces)} un.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Layers3 className="mx-auto mb-2 h-4 w-4 text-cyan-300" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Unitário <HelpTip text={HELP.unitCost} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {formatBRL(result.unitCost)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Gauge className="mx-auto mb-2 h-4 w-4 text-orange-300" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Horas <HelpTip text={HELP.time} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {formatHoursToHHMM(result.hours)}
                  </p>
                </div>
              </div>
            </aside>
          </div>
          {calcMode === "FULL" && (
            <div className="mt-6">
              <ScenarioSimulator
                base={result}
                doubleLot={doubleLotResult}
                tier={priceTier}
                targetProfitPerMachineHour={targetProfitPerMachineHour}
                inventory={inventoryForecast}
              />
            </div>
          )}
        </div>
      </div>
      <CalculatorStickyBar
        result={result}
        tier={priceTier}
        onReview={() =>
          document
            .getElementById("calculator-save-review")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />
      {postSave && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div
            className="w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-[#10151f] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calculator-post-save-title"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <Save className="h-5 w-5" />
            </div>
            <h2 id="calculator-post-save-title" className="mt-4 text-xl font-black text-white">
              {postSave.created ? "Orçamento criado" : "Alterações salvas"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              O cálculo continua disponível. Escolha como quer seguir sem perder as bandejas e os
              parâmetros usados nesta proposta.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={continueEditingSavedQuote}
                className="min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500"
              >
                Continuar editando este
              </button>
              <button
                type="button"
                onClick={duplicateSavedQuote}
                className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/75 hover:bg-white/[0.06]"
              >
                Duplicar como base
              </button>
              <button
                type="button"
                onClick={startNewCalculation}
                className="min-h-12 rounded-xl border border-white/10 px-4 text-sm font-bold text-white/50 hover:border-red-300/25 hover:text-red-200"
              >
                Limpar e começar outro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
