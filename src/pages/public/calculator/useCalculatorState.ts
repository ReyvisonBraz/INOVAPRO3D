import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAt,
  endAt,
  where,
} from "firebase/firestore";
import { toast } from "sonner";
import { db } from "../../../services/firebase";
import { saveOrUpdateQuoteFromCalc, uploadQuoteImage } from "../../../lib/quotes";
import {
  buildCalcSnapshot,
  mergeCalcSnapshot,
  type QuoteCalcSnapshot,
} from "../../../lib/calculatorSnapshot";
import { buildQuoteDocumentData } from "../../../lib/quoteDocument";
import { DEFAULT_COMPANY_PROFILE } from "../../../lib/company";
import { fetchCompanyProfile } from "../../../services/company";
import { buildInventoryForecast } from "../../../lib/inventoryForecast";
import {
  createCalculatorTemplate,
  fetchCalculatorTemplates,
  registerTemplateUsage,
} from "../../../services/calculatorTemplates";
import { usePrinterOptions } from "../../../hooks/usePrinterOptions";
import {
  applyMachineOverrides,
  countMachineOverrides,
  machineConfigFromPrinter,
} from "../../../lib/printers";
import {
  DEFAULT_ENERGY,
  DEFAULT_PRICING_SETTINGS,
  machineHourBreakdown,
  MATERIAL_PRESETS,
  mergePricingSettings,
  type MachineConfig,
  type MaterialKey,
  type MaterialSettings,
} from "../../../lib/pricing";
import {
  computeProjectPricing,
  createEmptyPlate,
  validateCalculatorProject,
  type CalculatorProject,
} from "../../../lib/calculatorProject";
import type {
  CompanyProfile,
  CalculatorTemplate,
  Material,
  MaterialUsage,
  Quote,
  QuoteStatus,
} from "../../../types/domain";
import {
  customerMatchesSearch,
  normalizeCustomerName,
  normalizeCustomerPhone,
  splitCustomerName,
  uppercaseCustomerName,
} from "../../../lib/customerIdentity";

type QuoteCustomer = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
};

export type CalculatorIntent = "NEW" | "EDIT" | "DUPLICATE";

export interface UseCalculatorStateOptions {
  initialQuote?: Quote | null;
  initialQuoteId?: string;
  intent?: CalculatorIntent;
  onQuoteSaved?: (result: { id: string; created: boolean }) => void | Promise<void>;
}

export interface CalculatorPostSave {
  id: string;
  created: boolean;
}

export const CALCULATOR_DRAFT_STORAGE_KEY = "inovapro3d:calculator-draft:v2";
/** Chave anterior, lida uma última vez para migrar rascunhos em andamento. */
const CALCULATOR_DRAFT_STORAGE_KEY_V1 = "inovapro3d:calculator-draft:v1";
export const CALCULATOR_DRAFT_EVENT = "inovapro3d:calculator-draft-saved";

type CalculatorDraft = {
  version: 2;
  savedAt: string;
  project: CalculatorProject;
  material: MaterialKey;
  spoolPrice: number;
  spoolWeight: number;
  reservePct: number;
  failureRatePct: number;
  failureImpactPct: number;
  /** Impressora escolhida e ajustes feitos só para este orçamento. */
  selectedPrinterId?: string;
  /** Máquina efetiva congelada para o rascunho não mudar após um refresh. */
  machineSnapshot?: MachineConfig;
  machineOverrides?: Partial<MachineConfig> | null;
  kwhCost: number;
  steadyPower: number;
  startupPower: number;
  startupMinutes: number;
  requiresLabor: boolean;
  laborHours: number;
  laborRate: number;
  extraSupplies: number;
  packagingCost: number;
  targetProfitPerMachineHour: number;
  wholesaleMarkup: number;
  retailMarkup: number;
  minPrice: number;
  markupMode: "mult" | "pct";
  clientName: string;
  clientLastName?: string;
  clientPhone: string;
  selectedCustomerId?: string;
  priceTier?: "RETAIL" | "WHOLESALE";
  quoteImageUrl: string;
  quoteId?: string;
  quoteStatus?: QuoteStatus;
  calcMode?: "QUICK" | "FULL";
  showImageOnQuote?: boolean;
};

export type CalculatorDraftSummary = {
  projectName: string;
  savedAt: string;
  quoteId?: string;
};

const MACHINE_KEYS_V1 = [
  ["machinePrice", "price"],
  ["lifespanHours", "lifespanHours"],
  ["nozzlePrice", "nozzlePrice"],
  ["nozzleLifeHours", "nozzleLifeHours"],
  ["platePrice", "platePrice"],
  ["plateLifeHours", "plateLifeHours"],
  ["beltsPrice", "beltsPrice"],
  ["beltsLifeHours", "beltsLifeHours"],
  ["maintPerHour", "maintPerHour"],
] as const;

/**
 * O rascunho v1 guardava os 9 campos de máquina soltos. Agora eles viram
 * ajustes por orçamento sobre a impressora escolhida — o usuário que estava
 * no meio de um cálculo não pode perder o que digitou.
 */
function migrateDraftV1(raw: Record<string, unknown>): CalculatorDraft | null {
  if (!raw.project || !Array.isArray((raw.project as CalculatorProject).plates)) return null;
  const machineOverrides: Partial<MachineConfig> = {};
  for (const [oldKey, newKey] of MACHINE_KEYS_V1) {
    const value = raw[oldKey];
    if (typeof value === "number" && Number.isFinite(value)) machineOverrides[newKey] = value;
  }
  return {
    ...(raw as unknown as CalculatorDraft),
    version: 2,
    machineOverrides: Object.keys(machineOverrides).length ? machineOverrides : null,
    selectedPrinterId: undefined,
  };
}

function readCalculatorDraft(): CalculatorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY) || "null",
    ) as CalculatorDraft | null;
    if (parsed?.version === 2 && parsed.project && Array.isArray(parsed.project.plates)) {
      return parsed;
    }
    const legacy = JSON.parse(
      window.localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY_V1) || "null",
    ) as Record<string, unknown> | null;
    if (legacy?.version === 1) {
      window.localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY_V1);
      return migrateDraftV1(legacy);
    }
    return null;
  } catch {
    // Rascunho corrompido não pode derrubar a rota: começa do zero.
    return null;
  }
}

export function getCalculatorDraftSummary(): CalculatorDraftSummary | null {
  const draft = readCalculatorDraft();
  if (!draft) return null;
  return {
    projectName: draft.project.name.trim() || "Cálculo sem nome",
    savedAt: draft.savedAt,
    quoteId: draft.quoteId,
  };
}

export function clearCalculatorDraftStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CALCULATOR_DRAFT_EVENT, { detail: null }));
}

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function useCalculatorState(options: UseCalculatorStateOptions = {}) {
  const { initialQuote = null, initialQuoteId, intent = "NEW", onQuoteSaved } = options;
  const [initialSnapshot] = useState(() => mergeCalcSnapshot(initialQuote?.calcSnapshot));
  const [initialDraft] = useState(() => (initialQuote ? null : readCalculatorDraft()));
  const [initialProject] = useState<CalculatorProject>(() => {
    const source = initialSnapshot?.project ??
      initialQuote?.calculationProject ??
      initialDraft?.project ?? {
        name: "",
        outputQuantity: 1,
        plates: [createEmptyPlate(1)],
      };
    if (intent !== "DUPLICATE") return source;
    return { ...source, name: `${source.name || initialQuote?.fileName || "Projeto"} (cópia)` };
  });
  const skipNextDraftSave = useRef(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(initialDraft?.savedAt || null);
  const [project, setProject] = useState<CalculatorProject>(initialProject);
  const [projectIssues, setProjectIssues] = useState<ReturnType<typeof validateCalculatorProject>>(
    [],
  );
  const [pricingSettings, setPricingSettings] = useState(DEFAULT_PRICING_SETTINGS);
  // --- Parâmetros centrais de material (vindos de settings/pricing) ---
  const [materialSettings, setMaterialSettings] = useState<Record<MaterialKey, MaterialSettings>>(
    DEFAULT_PRICING_SETTINGS.materials,
  );

  // --- Material / job ---
  const [material, setMaterial] = useState<MaterialKey>(
    initialSnapshot?.material.key ?? initialDraft?.material ?? "pla",
  );
  const [spoolPrice, setSpoolPrice] = useState(
    initialSnapshot?.material.spoolPrice ??
      initialDraft?.spoolPrice ??
      MATERIAL_PRESETS.pla.spoolPrice,
  );
  const [spoolWeight, setSpoolWeight] = useState(
    initialSnapshot?.material.spoolWeight ?? initialDraft?.spoolWeight ?? 1000,
  );
  const [reservePct, setReservePct] = useState(
    initialSnapshot?.material.reservePct ??
      initialDraft?.reservePct ??
      MATERIAL_PRESETS.pla.defaultReservePct,
  );
  const [failureRatePct, setFailureRatePct] = useState(
    initialSnapshot?.failure.failureRatePct ?? initialDraft?.failureRatePct ?? 0,
  );
  const [failureImpactPct, setFailureImpactPct] = useState(
    initialSnapshot?.failure.failureImpactPct ??
      initialDraft?.failureImpactPct ??
      DEFAULT_PRICING_SETTINGS.failureImpactPct,
  );
  const [inventoryMaterials, setInventoryMaterials] = useState<Material[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [calculatorTemplates, setCalculatorTemplates] = useState<CalculatorTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);

  // --- Impressora ---
  // Os 9 campos de custo não moram mais em estados soltos: vêm da impressora
  // escolhida e recebem por cima os ajustes feitos SÓ para este orçamento.
  // O cadastro em `printers` nunca é alterado a partir daqui.
  const { printers, defaultPrinter, legacyMachine } = usePrinterOptions();
  const [selectedPrinterId, setSelectedPrinterIdState] = useState(
    initialSnapshot?.printerId ?? initialDraft?.selectedPrinterId ?? "",
  );
  const [snapshotMachineBase, setSnapshotMachineBase] = useState<MachineConfig | null>(
    initialSnapshot?.machine ?? initialDraft?.machineSnapshot ?? null,
  );
  const [machineOverrides, setMachineOverrides] = useState<Partial<MachineConfig> | null>(
    initialSnapshot?.machineOverrides ?? initialDraft?.machineOverrides ?? null,
  );

  const selectedPrinter = useMemo(
    () => printers.find((printer) => printer.id === selectedPrinterId) ?? defaultPrinter,
    [printers, selectedPrinterId, defaultPrinter],
  );
  const basePrinterMachine = useMemo(
    () => (selectedPrinter ? machineConfigFromPrinter(selectedPrinter) : legacyMachine),
    [selectedPrinter, legacyMachine],
  );
  const machine = useMemo(() => {
    // O snapshot é a fonte de verdade ao reabrir: o cadastro da impressora
    // pode ter sido reprecificado desde a emissão do orçamento.
    return applyMachineOverrides(snapshotMachineBase ?? basePrinterMachine, machineOverrides);
  }, [basePrinterMachine, machineOverrides, snapshotMachineBase]);
  const overrideCount = countMachineOverrides(machineOverrides);

  const setSelectedPrinterId = (id: string) => {
    setSelectedPrinterIdState(id);
    setSnapshotMachineBase(null);
    setMachineOverrides(null);
  };

  /** Ajusta um campo só neste orçamento. Limpar volta ao valor do cadastro. */
  const setMachineField = (key: keyof MachineConfig, value: number) => {
    setMachineOverrides((previous) => {
      const next = { ...(previous ?? {}), [key]: safeNumber(value) };
      // Se o valor voltou a ser exatamente o do cadastro, deixa de ser ajuste.
      if (next[key] === basePrinterMachine[key]) delete next[key];
      return Object.keys(next).length ? next : null;
    });
  };

  const resetMachineOverrides = () => {
    setSnapshotMachineBase(null);
    setMachineOverrides(null);
  };

  // --- Energy ---
  const [kwhCost, setKwhCost] = useState(
    initialSnapshot?.energy.kwhCost ?? initialDraft?.kwhCost ?? DEFAULT_ENERGY.kwhCost,
  );
  const [steadyPower, setSteadyPower] = useState(
    initialSnapshot?.material.fallbackSteadyPowerWatts ??
      initialDraft?.steadyPower ??
      MATERIAL_PRESETS.pla.steadyPowerWatts,
  );
  const [startupPower, setStartupPower] = useState(
    initialSnapshot?.energy.startupPowerWatts ?? initialDraft?.startupPower ?? 1000,
  );
  const [startupMinutes, setStartupMinutes] = useState(
    initialSnapshot?.energy.startupMinutes ?? initialDraft?.startupMinutes ?? 8,
  );

  // --- Labor ---
  const [requiresLabor, setRequiresLabor] = useState(
    initialSnapshot?.labor.requiresLabor ?? initialDraft?.requiresLabor ?? false,
  );
  const [laborHours, setLaborHours] = useState(
    initialSnapshot?.labor.laborHours ?? initialDraft?.laborHours ?? 0,
  );
  const [laborRate, setLaborRate] = useState(
    initialSnapshot?.labor.laborRate ?? initialDraft?.laborRate ?? 30,
  );
  const [extraSupplies, setExtraSupplies] = useState(
    initialSnapshot?.labor.extraSupplies ?? initialDraft?.extraSupplies ?? 0,
  );
  const [packagingCost, setPackagingCost] = useState(
    initialSnapshot?.labor.packagingCost ?? initialDraft?.packagingCost ?? 0,
  );
  const [targetProfitPerMachineHour, setTargetProfitPerMachineHour] = useState(
    initialSnapshot?.commercial.targetProfitPerMachineHour ??
      initialDraft?.targetProfitPerMachineHour ??
      DEFAULT_PRICING_SETTINGS.targetProfitPerMachineHour,
  );

  // --- Pricing / markup ---
  const [wholesaleMarkup, setWholesaleMarkup] = useState(
    initialSnapshot?.commercial.wholesaleMarkup ??
      initialDraft?.wholesaleMarkup ??
      DEFAULT_PRICING_SETTINGS.wholesaleMarkup,
  );
  const [retailMarkup, setRetailMarkup] = useState(
    initialSnapshot?.commercial.retailMarkup ??
      initialDraft?.retailMarkup ??
      DEFAULT_PRICING_SETTINGS.retailMarkup,
  );
  const [minPrice, setMinPrice] = useState(
    initialSnapshot?.commercial.minPrice ??
      initialDraft?.minPrice ??
      DEFAULT_PRICING_SETTINGS.minPrice,
  );
  const [markupMode, setMarkupMode] = useState<"mult" | "pct">(
    initialSnapshot?.commercial.markupMode ?? initialDraft?.markupMode ?? "mult",
  );

  // --- UI toggles ---
  const [showAdvancedMachine, setShowAdvancedMachine] = useState(false);
  const [showAdvancedEnergy, setShowAdvancedEnergy] = useState(false);
  const [showMachineConfig, setShowMachineConfig] = useState(false);
  const [showMaterialConfig, setShowMaterialConfig] = useState(false);
  const [showEnergyConfig, setShowEnergyConfig] = useState(false);
  const [showLaborConfig, setShowLaborConfig] = useState(false);
  // Modo Rápido pede só o essencial; Completo é um superconjunto estrito —
  // nenhum campo é perdido ao trocar de modo, só deixa de ser exibido.
  const [calcMode, setCalcMode] = useState<"QUICK" | "FULL">(
    initialSnapshot?.mode ?? initialDraft?.calcMode ?? "QUICK",
  );

  // --- Save calc / orçamento ---
  const [savingCalc, setSavingCalc] = useState(false);
  const [quoteId, setQuoteId] = useState(
    intent === "DUPLICATE"
      ? ""
      : (initialQuoteId ?? initialQuote?.id ?? initialDraft?.quoteId ?? ""),
  );
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>(
    intent === "DUPLICATE"
      ? "PENDING"
      : (initialQuote?.status ?? initialDraft?.quoteStatus ?? "PENDING"),
  );
  const [snapshotStale, setSnapshotStale] = useState(
    Boolean(initialQuote && (!initialSnapshot || initialQuote.calcSnapshotStale)),
  );
  const [postSave, setPostSave] = useState<CalculatorPostSave | null>(null);
  const [showImageOnQuote, setShowImageOnQuote] = useState(
    initialSnapshot?.showImageOnQuote ?? initialDraft?.showImageOnQuote ?? true,
  );
  const [clientName, setClientName] = useState(
    initialSnapshot?.client.name ?? initialDraft?.clientName ?? initialQuote?.userName ?? "",
  );
  const [clientLastName, setClientLastName] = useState(
    initialSnapshot?.client.lastName ?? initialDraft?.clientLastName ?? "",
  );
  const [clientPhone, setClientPhone] = useState(
    initialSnapshot?.client.phone ?? initialDraft?.clientPhone ?? initialQuote?.phone ?? "",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialSnapshot?.client.customerId ??
      initialDraft?.selectedCustomerId ??
      initialQuote?.customerId ??
      "",
  );
  const [priceTier, setPriceTier] = useState<"RETAIL" | "WHOLESALE">(
    initialSnapshot?.commercial.priceTier ??
      initialDraft?.priceTier ??
      initialQuote?.priceTier ??
      "RETAIL",
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<QuoteCustomer[]>([]);
  const [quoteImageUrl, setQuoteImageUrl] = useState(
    initialSnapshot?.imageUrl ?? initialDraft?.quoteImageUrl ?? initialQuote?.imageUrl ?? "",
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      toast.info("Rascunho da calculadora recuperado.", {
        duration: 2600,
        position: "bottom-center",
      });
    }
  }, [initialDraft]);

  // --- Material preset selector (usa os parâmetros centrais do admin) ---
  function selectMaterial(key: MaterialKey) {
    const preset = materialSettings[key];
    setMaterial(key);
    setSpoolPrice(preset.spoolPrice);
    setSpoolWeight(preset.spoolWeight);
    setSteadyPower(preset.steadyPowerWatts);
    setReservePct(preset.defaultReservePct);
  }

  // --- Markup helpers (mult ↔ %) ---
  const markupLabel = (mult: number) =>
    markupMode === "pct" ? `${((mult - 1) * 100).toFixed(0)}%` : `${mult.toFixed(1)}×`;

  const wholesaleDisplay =
    markupMode === "pct" ? Math.round((wholesaleMarkup - 1) * 10000) / 100 : wholesaleMarkup;
  const retailDisplay =
    markupMode === "pct" ? Math.round((retailMarkup - 1) * 10000) / 100 : retailMarkup;

  function handleWholesaleMarkup(val: number) {
    setWholesaleMarkup(markupMode === "pct" ? 1 + val / 100 : val);
  }
  function handleRetailMarkup(val: number) {
    setRetailMarkup(markupMode === "pct" ? 1 + val / 100 : val);
  }

  // --- Load central pricing config from Firestore (admin é a fonte de verdade) ---
  // Sobrescreve os defaults: energia, markups, falha e material.
  useEffect(() => {
    getDoc(doc(db, "settings", "pricing"))
      .then((snap) => {
        if (!snap.exists()) return;
        const cfg = mergePricingSettings(snap.data());
        setPricingSettings(cfg);
        setMaterialSettings(cfg.materials);
        if (!initialDraft && !initialSnapshot) {
          setKwhCost(cfg.kwhCost);
          setStartupPower(cfg.startupPowerWatts);
          setStartupMinutes(cfg.startupMinutes);
          setFailureImpactPct(cfg.failureImpactPct);
          setTargetProfitPerMachineHour(cfg.targetProfitPerMachineHour);
          setWholesaleMarkup(cfg.wholesaleMarkup);
          setRetailMarkup(cfg.retailMarkup);
          setMinPrice(cfg.minPrice);
        }
        // Aplica o preset do material atualmente selecionado.
        if (!initialDraft && !initialSnapshot) {
          setMaterial((cur) => {
            const mat = cfg.materials[cur];
            setSpoolPrice(mat.spoolPrice);
            setSpoolWeight(mat.spoolWeight);
            setSteadyPower(mat.steadyPowerWatts);
            setReservePct(mat.defaultReservePct);
            return cur;
          });
        }
      })
      .catch((err) => {
        // Visitante sem sessão de admin: a leitura é negada pelas regras.
        // A calculadora segue funcionando com os defaults hardcoded.
        console.error("[calculadora] falha ao carregar settings/pricing:", err);
      });
  }, [initialDraft, initialSnapshot]);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
  }, []);

  useEffect(() => {
    fetchCalculatorTemplates()
      .then(setCalculatorTemplates)
      .catch(() => setCalculatorTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: CalculatorDraft = {
        version: 2,
        savedAt,
        project,
        material,
        spoolPrice,
        spoolWeight,
        reservePct,
        failureRatePct,
        failureImpactPct,
        selectedPrinterId: selectedPrinterId || undefined,
        machineSnapshot: machine,
        machineOverrides,
        kwhCost,
        steadyPower,
        startupPower,
        startupMinutes,
        requiresLabor,
        laborHours,
        laborRate,
        extraSupplies,
        packagingCost,
        targetProfitPerMachineHour,
        wholesaleMarkup,
        retailMarkup,
        minPrice,
        markupMode,
        clientName,
        clientLastName,
        clientPhone,
        selectedCustomerId,
        priceTier,
        quoteImageUrl,
        quoteId: quoteId || undefined,
        quoteStatus,
        calcMode,
        showImageOnQuote,
      };
      try {
        window.localStorage.setItem(CALCULATOR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
        window.dispatchEvent(
          new CustomEvent(CALCULATOR_DRAFT_EVENT, {
            detail: { projectName: project.name.trim() || "Cálculo sem nome", savedAt },
          }),
        );
      } catch {
        // A calculadora continua funcionando mesmo se o navegador bloquear o armazenamento local.
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    project,
    material,
    spoolPrice,
    spoolWeight,
    reservePct,
    failureRatePct,
    failureImpactPct,
    selectedPrinterId,
    machine,
    machineOverrides,
    kwhCost,
    steadyPower,
    startupPower,
    startupMinutes,
    requiresLabor,
    laborHours,
    laborRate,
    extraSupplies,
    packagingCost,
    targetProfitPerMachineHour,
    wholesaleMarkup,
    retailMarkup,
    minPrice,
    markupMode,
    clientName,
    clientLastName,
    clientPhone,
    selectedCustomerId,
    priceTier,
    quoteImageUrl,
    quoteId,
    quoteStatus,
    calcMode,
    showImageOnQuote,
  ]);

  // Filamentos reais cadastrados no painel. O orçamento apenas registra a
  // previsão; a reserva/baixa acontece nas transições do pedido.
  useEffect(() => {
    getDocs(query(collection(db, "materials"), limit(300)))
      .then((snapshot) =>
        setInventoryMaterials(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }) as Material)
            .filter((item) => item.active !== false),
        ),
      )
      .catch(() => setInventoryMaterials([]));
  }, []);

  useEffect(() => {
    const normalized = normalizeCustomerName(customerSearch);
    if (normalized.length < 2) {
      setCustomers([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const customerQuery = query(
        collection(db, "customers"),
        orderBy("nameNormalized"),
        startAt(normalized),
        endAt(`${normalized}\uf8ff`),
        limit(8),
      );
      getDocs(customerQuery)
        .then((snapshot) =>
          setCustomers(
            snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as QuoteCustomer),
          ),
        )
        .catch(() => setCustomers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const customerMatches = useMemo(
    () =>
      customerSearch.trim()
        ? customers
            .filter((customer) => customerMatchesSearch(customer, customerSearch))
            .slice(0, 6)
        : [],
    [customerSearch, customers],
  );

  const selectQuoteCustomer = (customer: QuoteCustomer) => {
    const rawName =
      customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    const parts = uppercaseCustomerName(rawName || "")
      .trim()
      .split(/\s+/);
    setClientName(parts.shift() || "");
    setClientLastName(parts.join(" "));
    setClientPhone(customer.phone || customer.whatsapp || "");
    setSelectedCustomerId(customer.id);
    setCustomerSearch("");
  };

  const clearQuoteCustomer = () => {
    setSelectedCustomerId("");
    setClientName("");
    setClientLastName("");
    setClientPhone("");
  };

  // --- Computed values ---
  const machineBreak = machineHourBreakdown(machine);

  const projectPricingSettings = useMemo(
    () => ({
      ...pricingSettings,
      kwhCost,
      startupPowerWatts: startupPower,
      startupMinutes,
      failureRatePct,
      failureImpactPct,
      targetProfitPerMachineHour,
    }),
    [
      pricingSettings,
      kwhCost,
      startupPower,
      startupMinutes,
      failureRatePct,
      failureImpactPct,
      targetProfitPerMachineHour,
    ],
  );
  const projectPricing = useMemo(
    () =>
      computeProjectPricing(project, machine, projectPricingSettings, {
        laborHours: requiresLabor ? laborHours : 0,
        laborRate,
        extraSupplies,
        packagingCost,
        wholesaleMarkup,
        retailMarkup,
        minPrice,
        reservePct,
        fallbackSteadyPowerWatts: steadyPower,
      }),
    [
      project,
      machine,
      projectPricingSettings,
      requiresLabor,
      laborHours,
      laborRate,
      extraSupplies,
      packagingCost,
      wholesaleMarkup,
      retailMarkup,
      minPrice,
      reservePct,
      steadyPower,
    ],
  );
  const result = projectPricing.result;
  const doubleLotResult = useMemo(() => {
    const doubleProject: CalculatorProject = {
      ...project,
      outputQuantity: Math.max(1, project.outputQuantity) * 2,
      plates: project.plates.map((plate) => ({
        ...plate,
        repetitions: Math.max(1, plate.repetitions) * 2,
      })),
    };
    return computeProjectPricing(doubleProject, machine, projectPricingSettings, {
      laborHours: requiresLabor ? laborHours * 2 : 0,
      laborRate,
      extraSupplies: extraSupplies * 2,
      packagingCost: packagingCost * 2,
      wholesaleMarkup,
      retailMarkup,
      minPrice,
      reservePct,
      fallbackSteadyPowerWatts: steadyPower,
    }).result;
  }, [
    project,
    machine,
    projectPricingSettings,
    requiresLabor,
    laborHours,
    laborRate,
    extraSupplies,
    packagingCost,
    wholesaleMarkup,
    retailMarkup,
    minPrice,
    reservePct,
    steadyPower,
  ]);
  const inventoryForecast = useMemo(
    () => buildInventoryForecast(project, inventoryMaterials),
    [project, inventoryMaterials],
  );

  const printableSnapshot = useMemo(
    () =>
      buildCalcSnapshot({
        mode: calcMode,
        project,
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        machine,
        machineOverrides: machineOverrides ?? undefined,
        energy: { kwhCost, startupPowerWatts: startupPower, startupMinutes },
        failure: { failureRatePct, failureImpactPct },
        labor: {
          requiresLabor,
          laborHours,
          laborRate,
          extraSupplies,
          packagingCost,
        },
        commercial: {
          wholesaleMarkup,
          retailMarkup,
          minPrice,
          targetProfitPerMachineHour,
          markupMode,
          priceTier,
        },
        material: {
          key: material,
          spoolPrice,
          spoolWeight,
          reservePct,
          fallbackSteadyPowerWatts: steadyPower,
        },
        client: {
          name: clientName,
          lastName: clientLastName,
          phone: clientPhone || undefined,
          customerId: selectedCustomerId || undefined,
        },
        imageUrl: quoteImageUrl || undefined,
        showImageOnQuote,
      }),
    [
      calcMode,
      project,
      selectedPrinter,
      machine,
      machineOverrides,
      kwhCost,
      startupPower,
      startupMinutes,
      failureRatePct,
      failureImpactPct,
      requiresLabor,
      laborHours,
      laborRate,
      extraSupplies,
      packagingCost,
      wholesaleMarkup,
      retailMarkup,
      minPrice,
      targetProfitPerMachineHour,
      markupMode,
      priceTier,
      material,
      spoolPrice,
      spoolWeight,
      reservePct,
      steadyPower,
      clientName,
      clientLastName,
      clientPhone,
      selectedCustomerId,
      quoteImageUrl,
      showImageOnQuote,
    ],
  );

  const applySnapshotToCalculator = (snapshot: QuoteCalcSnapshot) => {
    setProject(snapshot.project);
    setProjectIssues([]);
    setCalcMode(snapshot.mode);
    setSelectedPrinterIdState(snapshot.printerId ?? "");
    setSnapshotMachineBase(snapshot.machine);
    setMachineOverrides(snapshot.machineOverrides ?? null);
    setKwhCost(snapshot.energy.kwhCost);
    setStartupPower(snapshot.energy.startupPowerWatts);
    setStartupMinutes(snapshot.energy.startupMinutes);
    setFailureRatePct(snapshot.failure.failureRatePct);
    setFailureImpactPct(snapshot.failure.failureImpactPct);
    setRequiresLabor(snapshot.labor.requiresLabor);
    setLaborHours(snapshot.labor.laborHours);
    setLaborRate(snapshot.labor.laborRate);
    setExtraSupplies(snapshot.labor.extraSupplies);
    setPackagingCost(snapshot.labor.packagingCost);
    setWholesaleMarkup(snapshot.commercial.wholesaleMarkup);
    setRetailMarkup(snapshot.commercial.retailMarkup);
    setMinPrice(snapshot.commercial.minPrice);
    setTargetProfitPerMachineHour(snapshot.commercial.targetProfitPerMachineHour);
    setMarkupMode(snapshot.commercial.markupMode);
    setPriceTier(snapshot.commercial.priceTier);
    setMaterial(snapshot.material.key);
    setSpoolPrice(snapshot.material.spoolPrice);
    setSpoolWeight(snapshot.material.spoolWeight);
    setReservePct(snapshot.material.reservePct);
    setSteadyPower(snapshot.material.fallbackSteadyPowerWatts);
    setQuoteId("");
    setQuoteStatus("PENDING");
    setSnapshotStale(false);
    setPostSave(null);
  };

  const applyProjectTemplate = (template: CalculatorTemplate) => {
    applySnapshotToCalculator(template.snapshot);
    setCalculatorTemplates((current) =>
      current
        .map((item) =>
          item.id === template.id ? { ...item, usageCount: (item.usageCount ?? 0) + 1 } : item,
        )
        .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)),
    );
    void registerTemplateUsage(template.id).catch(() => undefined);
    toast.success(`Modelo “${template.name}” aplicado.`, { position: "bottom-center" });
  };

  const saveProjectTemplate = async (name: string): Promise<boolean> => {
    const issues = validateCalculatorProject(project);
    if (issues.length) {
      setProjectIssues(issues);
      toast.error(`Complete o projeto antes de salvar o modelo: ${issues[0].message}`, {
        position: "bottom-center",
      });
      return false;
    }
    setTemplateSaving(true);
    try {
      const templateSnapshot = buildCalcSnapshot({
        ...printableSnapshot,
        client: { name: "" },
        imageUrl: undefined,
        showImageOnQuote: true,
      });
      const id = await createCalculatorTemplate({
        name,
        snapshot: templateSnapshot,
      });
      setCalculatorTemplates((current) => [
        { id, name: name.trim(), usageCount: 0, snapshot: templateSnapshot },
        ...current,
      ]);
      toast.success("Modelo de projeto salvo.", { position: "bottom-center" });
      return true;
    } catch {
      toast.error("Não foi possível salvar o modelo. Confira as regras do Firebase.", {
        position: "bottom-center",
      });
      return false;
    } finally {
      setTemplateSaving(false);
    }
  };

  const quoteDocumentData = useMemo(() => {
    const selectedTotal = priceTier === "WHOLESALE" ? result.wholesaleTotal : result.retailTotal;
    const selectedUnit = priceTier === "WHOLESALE" ? result.wholesaleUnit : result.retailUnit;
    const quote: Quote = {
      id: quoteId || "draft",
      userId: "calculator",
      userName: [clientName, clientLastName].filter(Boolean).join(" ") || "Cliente",
      status: quoteStatus,
      fileName: project.name || "Peça personalizada",
      materialId: project.plates.some((plate) => plate.type === "MULTICOLOR")
        ? "Multicolor"
        : "Cor única",
      infill: initialQuote?.infill ?? 0,
      quantity: project.outputQuantity,
      total: selectedTotal,
      unitPrice: selectedUnit,
      costTotal: result.totalCost,
      phone: clientPhone,
      imageUrl: quoteImageUrl || undefined,
      priceTier,
      printerId: selectedPrinter?.id,
      printerName: selectedPrinter?.name,
      showImageOnQuote,
      calculationProject: project,
      calcSnapshot: printableSnapshot,
    };
    return buildQuoteDocumentData(quote, companyProfile, {
      materials: inventoryMaterials,
      printerPhotoUrl: selectedPrinter?.photoUrl,
    });
  }, [
    priceTier,
    result,
    quoteId,
    clientName,
    clientLastName,
    quoteStatus,
    project,
    initialQuote?.infill,
    clientPhone,
    quoteImageUrl,
    selectedPrinter,
    showImageOnQuote,
    printableSnapshot,
    companyProfile,
    inventoryMaterials,
  ]);

  const laborTotal = result.laborCost + result.extraSupplies + result.packagingCost;
  const discardCalculatorDraft = () => {
    skipNextDraftSave.current = true;
    clearCalculatorDraftStorage();
    setDraftSavedAt(null);
    setProject({ name: "", outputQuantity: 1, plates: [createEmptyPlate(1)] });
    setProjectIssues([]);
    setFailureRatePct(0);
    setRequiresLabor(false);
    setLaborHours(0);
    setExtraSupplies(0);
    setPackagingCost(0);
    setClientName("");
    setClientLastName("");
    setClientPhone("");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setPriceTier("RETAIL");
    setQuoteImageUrl("");
    setMachineOverrides(null);
    setSnapshotMachineBase(null);
    setQuoteId("");
    setQuoteStatus("PENDING");
    setSnapshotStale(false);
    setPostSave(null);
    setShowImageOnQuote(true);
  };

  const continueEditingSavedQuote = () => setPostSave(null);

  const duplicateSavedQuote = () => {
    setQuoteId("");
    setQuoteStatus("PENDING");
    setSnapshotStale(false);
    setPostSave(null);
    setProject((current) => ({
      ...current,
      name: `${current.name.replace(/\s+\(cópia\)$/i, "")} (cópia)`,
    }));
    toast.info("Cópia criada. O próximo salvamento gerará um novo orçamento.", {
      position: "bottom-center",
    });
  };

  // --- Upload da imagem opcional do produto ---
  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.", { position: "bottom-center" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8 MB).", { position: "bottom-center" });
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadQuoteImage(file);
      setQuoteImageUrl(url);
      toast.success("Imagem anexada.", { duration: 2200, position: "bottom-center" });
    } catch (err) {
      console.error("[quote-image-upload]", err);
      const code = (err as { code?: string })?.code || "";
      if (code === "storage/unauthenticated") {
        toast.error("Faça login como admin para anexar imagem.", { position: "bottom-center" });
      } else if (code === "storage/unauthorized") {
        toast.error(
          "Upload bloqueado: publique as regras do Storage (firebase deploy --only storage).",
          { duration: 5000, position: "bottom-center" },
        );
      } else {
        toast.error("Falha ao enviar imagem.", { position: "bottom-center" });
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // --- Salvar orçamento no sistema (aba Orçamentos) ---
  const handleSaveCalc = async () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do cliente para salvar.", { position: "bottom-center" });
      return;
    }
    const issues = validateCalculatorProject(project);
    setProjectIssues(issues);
    if (issues.length) {
      toast.error(issues[0].message, { position: "bottom-center" });
      return;
    }
    const predictedUsages: MaterialUsage[] = project.plates.flatMap((plate) =>
      plate.filaments.map((filament) => ({
        materialId: filament.materialId || `manual:${filament.id}`,
        materialName: filament.materialName,
        plateId: plate.id,
        plateName: plate.name,
        inventoryTracked: Boolean(filament.materialId),
        ...(filament.manual
          ? {
              manualColor: filament.manual.color,
              manualBrand: filament.manual.brand,
              manualType: filament.manual.type,
              pricePerKg: filament.manual.pricePerKg,
            }
          : {}),
        estimatedGrams: filament.totalGrams * Math.max(1, plate.repetitions),
      })),
    );
    setSavingCalc(true);
    try {
      const identity = splitCustomerName(clientName, clientLastName);
      const phoneClean = normalizeCustomerPhone(clientPhone);
      let customerId = selectedCustomerId;
      if (!customerId) {
        const duplicateSnapshot = phoneClean
          ? await getDocs(
              query(
                collection(db, "customers"),
                where("phoneNormalized", "==", phoneClean),
                limit(1),
              ),
            )
          : null;
        const duplicate = duplicateSnapshot?.docs[0];
        if (duplicate) {
          customerId = duplicate.id;
        } else {
          const customerRef = await addDoc(collection(db, "customers"), {
            name: identity.fullName,
            firstName: identity.firstName,
            lastName: identity.lastName,
            ...(phoneClean ? { phone: phoneClean, whatsapp: phoneClean } : {}),
            nameNormalized: normalizeCustomerName(identity.fullName),
            phoneNormalized: phoneClean,
            source: "CALCULATOR",
            profileStatus: "DRAFT",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          customerId = customerRef.id;
        }
      }
      const selectedTotal = priceTier === "WHOLESALE" ? result.wholesaleTotal : result.retailTotal;
      const selectedUnit = priceTier === "WHOLESALE" ? result.wholesaleUnit : result.retailUnit;
      const calcSnapshot = buildCalcSnapshot({
        mode: calcMode,
        project,
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        machine,
        machineOverrides: machineOverrides ?? undefined,
        energy: { kwhCost, startupPowerWatts: startupPower, startupMinutes },
        failure: { failureRatePct, failureImpactPct },
        labor: {
          requiresLabor,
          laborHours,
          laborRate,
          extraSupplies,
          packagingCost,
        },
        commercial: {
          wholesaleMarkup,
          retailMarkup,
          minPrice,
          targetProfitPerMachineHour,
          markupMode,
          priceTier,
        },
        material: {
          key: material,
          spoolPrice,
          spoolWeight,
          reservePct,
          fallbackSteadyPowerWatts: steadyPower,
        },
        client: {
          name: identity.firstName,
          lastName: identity.lastName,
          phone: phoneClean || undefined,
          customerId,
        },
        imageUrl: quoteImageUrl || undefined,
        showImageOnQuote,
      });
      const saved = await saveOrUpdateQuoteFromCalc({
        quoteId: quoteId || undefined,
        clientName: identity.fullName,
        phone: clientPhone,
        customerId,
        priceTier,
        pieceName: project.name,
        materialLabel: project.plates.some((plate) => plate.type === "MULTICOLOR")
          ? "Multicolor"
          : "Cor única",
        weight: result.weightGrams,
        printTime: `${result.hours.toFixed(2)}h`,
        quantity: projectPricing.totalPieces,
        price: selectedTotal,
        unitPrice: selectedUnit,
        costTotal: result.totalCost,
        retailReference: result.retailTotal,
        wholesaleReference: result.wholesaleTotal,
        sustainableFloor: result.minimumSustainablePrice,
        imageUrl: quoteImageUrl || undefined,
        materialUsages: predictedUsages,
        calculationProject: project,
        calcSnapshot,
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        showImageOnQuote,
        notes: `Custo previsto ${result.totalCost.toFixed(2)} · atacado ${result.wholesaleTotal.toFixed(2)} · varejo ${result.retailTotal.toFixed(2)} · ${project.plates.length} bandeja(s) · ${result.weightGrams.toFixed(2)}g · ${result.hours.toFixed(2)}h`,
      });
      setQuoteId(saved.id);
      setSnapshotStale(false);
      setPostSave(saved);
      await onQuoteSaved?.(saved);
      toast.success(saved.created ? "Orçamento criado com sucesso!" : "Alterações salvas!", {
        duration: 2800,
        position: "bottom-center",
      });
    } catch {
      toast.error("Erro ao salvar. É preciso estar logado como admin.", {
        position: "bottom-center",
      });
    } finally {
      setSavingCalc(false);
    }
  };

  return {
    project,
    setProject,
    projectIssues,
    setProjectIssues,
    pricingSettings: projectPricingSettings,
    projectPricing,
    // material
    material,
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
    selectMaterial,
    materialSettings,
    inventoryMaterials,
    // impressora
    printers,
    selectedPrinterId,
    setSelectedPrinterId,
    selectedPrinter,
    machine,
    machineOverrides,
    overrideCount,
    setMachineField,
    resetMachineOverrides,
    // energy
    kwhCost,
    setKwhCost,
    steadyPower,
    setSteadyPower,
    startupPower,
    setStartupPower,
    startupMinutes,
    setStartupMinutes,
    // labor
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
    // pricing
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
    // ui toggles
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
    // save
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
    quoteId,
    quoteStatus,
    snapshotStale,
    postSave,
    showImageOnQuote,
    setShowImageOnQuote,
    continueEditingSavedQuote,
    duplicateSavedQuote,
    startNewCalculation: discardCalculatorDraft,
    setQuoteImageUrl,
    uploadingImage,
    handleUploadImage,
    draftSavedAt,
    discardCalculatorDraft,
    // computed
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
  };
}

export { safeNumber };
