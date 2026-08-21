import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageSEO } from "../../components/seo/PageSEO";
import { Loader2 } from "lucide-react";
import { formatHoursToHHMM } from "../../lib/pricing";
import { buildPricingGuidance } from "../../lib/scenarios";
import { useCalculatorState } from "./calculator/useCalculatorState";
import type { CalculatorIntent } from "./calculator/useCalculatorState";
import type { CalculatorTemplate, Quote } from "../../types/domain";
import { fetchQuoteById } from "../../services/quotes";
import { PrintDocumentHost } from "../../components/print/PrintDocumentHost";
import { buildPrintDocumentTitle, printDocument } from "../../lib/printing";
import { ScenarioSimulator } from "../../components/calculator/ScenarioSimulator";
import { CalculatorStickyBar } from "../../components/calculator/CalculatorStickyBar";
import { CalculatorTemplatePanel } from "../../components/calculator/CalculatorTemplatePanel";
import { CalculatorMachineConfigSection } from "../../components/calculator/CalculatorMachineConfigSection";
import { CalculatorMaterialCostSection } from "../../components/calculator/CalculatorMaterialCostSection";
import { CalculatorEnergySection } from "../../components/calculator/CalculatorEnergySection";
import { CalculatorLaborSection } from "../../components/calculator/CalculatorLaborSection";
import { CalculatorCostSummary } from "../../components/calculator/CalculatorCostSummary";
import { CalculatorPricingSummary } from "../../components/calculator/CalculatorPricingSummary";
import { CalculatorPricingGuidance } from "../../components/calculator/CalculatorPricingGuidance";
import { CalculatorPrintActions } from "../../components/calculator/CalculatorPrintActions";
import { CalculatorCustomerSelector } from "../../components/calculator/CalculatorCustomerSelector";
import { CalculatorCustomerDetails } from "../../components/calculator/CalculatorCustomerDetails";
import { CalculatorQuoteImageSection } from "../../components/calculator/CalculatorQuoteImageSection";
import { CalculatorSaveAction } from "../../components/calculator/CalculatorSaveAction";
import { CalculatorJobStats } from "../../components/calculator/CalculatorJobStats";
import { CalculatorHeader } from "../../components/calculator/CalculatorHeader";
import { CalculatorPostSaveDialog } from "../../components/calculator/CalculatorPostSaveDialog";
import { CalculatorNotices } from "../../components/calculator/CalculatorNotices";
import { CalculatorProjectSetupSection } from "../../components/calculator/CalculatorProjectSetupSection";
import { CalculatorPrinterSetupSection } from "../../components/calculator/CalculatorPrinterSetupSection";
import { CalculatorSaveReviewSection } from "../../components/calculator/CalculatorSaveReviewSection";

interface FilamentCalculatorProps {
  embedded?: boolean;
  initialQuote?: Quote | null;
  initialTemplate?: CalculatorTemplate | null;
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
    fetchQuoteById(requestedId)
      .then((quote) => {
        if (!active) return;
        if (!quote) {
          setLoadError(true);
          return;
        }
        setLoadedQuote(quote);
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
  initialTemplate = null,
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
    updateProjectTemplateMetadata,
    updateProjectTemplateFromCurrent,
    cloneProjectTemplate,
    archiveProjectTemplate,
    removeProjectTemplate,
  } = useCalculatorState({
    initialQuote,
    initialTemplate,
    initialQuoteId: initialQuote?.id,
    intent,
    onQuoteSaved,
  });

  const {
    negotiationFloor,
    maximumSafeDiscountPct,
    comfortableDiscountPct,
    comfortableOffer,
    selectedReprintProfit,
  } = buildPricingGuidance(result, {
    tier: priceTier,
    minPrice,
    pixDiscountPct: pricingSettings.pixDiscountPct,
  });
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [imageSectionOpen, setImageSectionOpen] = useState(false);
  const printReport = (mode: "CLIENT" | "PRODUCTION") => {
    return printDocument(
      () => {
        setPrintMode(mode);
        setIsPrintingReport(true);
      },
      () => setIsPrintingReport(false),
      buildPrintDocumentTitle(mode, quoteDocumentData.customer),
    );
  };

  return (
    <>
      <PrintDocumentHost data={isPrintingReport ? quoteDocumentData : null} mode={printMode} />
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
          <CalculatorHeader
            draftSavedAt={draftSavedAt}
            printerName={selectedPrinter?.name}
            quoteId={quoteId}
            mode={calcMode}
            onModeChange={setCalcMode}
          />

          <CalculatorNotices
            snapshotStale={snapshotStale}
            template={initialTemplate}
            onUpdateTemplate={(template) => void updateProjectTemplateFromCurrent(template)}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <CalculatorTemplatePanel
                templates={calculatorTemplates}
                loading={templatesLoading}
                saving={templateSaving}
                onApply={applyProjectTemplate}
                onSave={saveProjectTemplate}
                onEdit={updateProjectTemplateMetadata}
                onUpdateFromCurrent={updateProjectTemplateFromCurrent}
                onClone={cloneProjectTemplate}
                onArchive={archiveProjectTemplate}
                onDelete={removeProjectTemplate}
              />
              <CalculatorProjectSetupSection
                project={project}
                materials={inventoryMaterials}
                pricingSettings={pricingSettings}
                issues={projectIssues}
                fallbackPricePerKg={{
                  pla: (materialSettings.pla.spoolPrice / materialSettings.pla.spoolWeight) * 1000,
                  petg:
                    (materialSettings.petg.spoolPrice / materialSettings.petg.spoolWeight) * 1000,
                }}
                formattedTime={formatHoursToHHMM(result.hours)}
                weightGrams={result.weightGrams}
                onSlicerApply={(plates, mode) => {
                  setProject((previous) => ({
                    ...previous,
                    plates: mode === "REPLACE" ? plates : [...previous.plates, ...plates],
                  }));
                  if (projectIssues.length) setProjectIssues([]);
                }}
                onProjectChange={(next) => {
                  setProject(next);
                  if (projectIssues.length) setProjectIssues([]);
                }}
              />

              <CalculatorPrinterSetupSection
                printers={printers}
                selectedPrinterId={selectedPrinterId || (selectedPrinter?.id ?? "")}
                overrideCount={overrideCount}
                quickMode={calcMode === "QUICK"}
                kwhCost={kwhCost}
                failureRatePct={failureRatePct}
                retailMarkupLabel={markupLabel(retailMarkup)}
                minPrice={minPrice}
                onSelectPrinter={setSelectedPrinterId}
                onResetOverrides={resetMachineOverrides}
                onOpenFullMode={() => setCalcMode("FULL")}
              />

              {/* MODO COMPLETO — máquina, filamento, energia e mão de obra
                  detalhados. O modo Rápido não perde nada: só deixa de mostrar. */}
              {calcMode === "FULL" && (
                <>
                  {/* MÁQUINA & DEPRECIAÇÃO — recolhida */}
                  <CalculatorMachineConfigSection
                    machine={machine}
                    machineBreakdown={machineBreak}
                    machineOverrides={machineOverrides}
                    overrideCount={overrideCount}
                    printerName={selectedPrinter?.name}
                    open={showMachineConfig}
                    advancedOpen={showAdvancedMachine}
                    onToggle={() => setShowMachineConfig((value) => !value)}
                    onToggleAdvanced={() => setShowAdvancedMachine((value) => !value)}
                    onResetOverrides={resetMachineOverrides}
                    onChangeMachineField={setMachineField}
                  />

                  {/* FILAMENTO & CUSTOS — recolhida */}
                  <CalculatorMaterialCostSection
                    spoolPrice={spoolPrice}
                    spoolWeight={spoolWeight}
                    reservePct={reservePct}
                    failureRatePct={failureRatePct}
                    failureImpactPct={failureImpactPct}
                    targetProfitPerMachineHour={targetProfitPerMachineHour}
                    open={showMaterialConfig}
                    onToggle={() => setShowMaterialConfig((value) => !value)}
                    onSpoolPriceChange={setSpoolPrice}
                    onSpoolWeightChange={setSpoolWeight}
                    onReservePctChange={setReservePct}
                    onFailureRatePctChange={setFailureRatePct}
                    onFailureImpactPctChange={setFailureImpactPct}
                    onTargetProfitPerMachineHourChange={setTargetProfitPerMachineHour}
                  />

                  {/* ENERGIA — recolhida */}
                  <CalculatorEnergySection
                    kwhCost={kwhCost}
                    energyKwh={result.energyKwh}
                    energyCost={result.energyCost}
                    steadyPower={steadyPower}
                    startupPower={startupPower}
                    startupMinutes={startupMinutes}
                    open={showEnergyConfig}
                    advancedOpen={showAdvancedEnergy}
                    onToggle={() => setShowEnergyConfig((value) => !value)}
                    onToggleAdvanced={() => setShowAdvancedEnergy((value) => !value)}
                    onKwhCostChange={setKwhCost}
                    onSteadyPowerChange={setSteadyPower}
                    onStartupPowerChange={setStartupPower}
                    onStartupMinutesChange={setStartupMinutes}
                  />

                  {/* MÃO DE OBRA & INSUMOS — recolhida */}
                  <CalculatorLaborSection
                    requiresLabor={requiresLabor}
                    laborTotal={laborTotal}
                    laborHours={laborHours}
                    laborRate={laborRate}
                    extraSupplies={extraSupplies}
                    packagingCost={packagingCost}
                    open={showLaborConfig}
                    onToggle={() => setShowLaborConfig((value) => !value)}
                    onRequiresLaborChange={setRequiresLabor}
                    onLaborHoursChange={setLaborHours}
                    onLaborRateChange={setLaborRate}
                    onExtraSuppliesChange={setExtraSupplies}
                    onPackagingCostChange={setPackagingCost}
                  />
                </>
              )}
            </div>

            <aside className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:p-6 xl:sticky xl:top-24">
              <CalculatorCostSummary result={result} laborTotal={laborTotal} />

              <CalculatorPricingSummary
                result={result}
                markupMode={markupMode}
                wholesaleDisplay={wholesaleDisplay}
                retailDisplay={retailDisplay}
                wholesaleLabel={markupLabel(wholesaleMarkup)}
                retailLabel={markupLabel(retailMarkup)}
                minPrice={minPrice}
                onMarkupModeChange={setMarkupMode}
                onWholesaleMarkupChange={handleWholesaleMarkup}
                onRetailMarkupChange={handleRetailMarkup}
                onMinPriceChange={setMinPrice}
              />

              <CalculatorPricingGuidance
                result={result}
                priceTier={priceTier}
                comfortableDiscountPct={comfortableDiscountPct}
                comfortableOffer={comfortableOffer}
                maximumSafeDiscountPct={maximumSafeDiscountPct}
                negotiationFloor={negotiationFloor}
                selectedReprintProfit={selectedReprintProfit}
              />

              <CalculatorPrintActions
                onPrintClient={() => printReport("CLIENT")}
                onPrintProduction={() => printReport("PRODUCTION")}
              />

              <CalculatorSaveReviewSection>
                <CalculatorCustomerSelector
                  search={customerSearch}
                  matches={customerMatches}
                  selectedCustomerId={selectedCustomerId}
                  selectedCustomerName={[clientName, clientLastName].filter(Boolean).join(" ")}
                  onSearchChange={setCustomerSearch}
                  onSelect={selectQuoteCustomer}
                  onClear={clearQuoteCustomer}
                />

                <CalculatorCustomerDetails
                  priceTier={priceTier}
                  hasSelectedCustomer={Boolean(selectedCustomerId)}
                  clientName={clientName}
                  clientLastName={clientLastName}
                  clientPhone={clientPhone}
                  onPriceTierChange={setPriceTier}
                  onClientNameChange={setClientName}
                  onClientLastNameChange={setClientLastName}
                  onClientPhoneChange={setClientPhone}
                />
                <CalculatorQuoteImageSection
                  imageUrl={quoteImageUrl}
                  open={imageSectionOpen}
                  uploading={uploadingImage}
                  showImageOnQuote={showImageOnQuote}
                  onToggle={() => setImageSectionOpen((current) => !current)}
                  onUpload={handleUploadImage}
                  onRemove={() => setQuoteImageUrl("")}
                  onShowImageOnQuoteChange={setShowImageOnQuote}
                />

                <CalculatorSaveAction
                  saving={savingCalc}
                  uploadingImage={uploadingImage}
                  editingExistingQuote={Boolean(quoteId)}
                  onSave={handleSaveCalc}
                />
              </CalculatorSaveReviewSection>

              <CalculatorJobStats
                totalPieces={projectPricing.totalPieces}
                unitCost={result.unitCost}
                hours={result.hours}
              />
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
        <CalculatorPostSaveDialog
          created={postSave.created}
          onContinueEditing={continueEditingSavedQuote}
          onDuplicate={duplicateSavedQuote}
          onStartNew={startNewCalculation}
        />
      )}
    </>
  );
}
