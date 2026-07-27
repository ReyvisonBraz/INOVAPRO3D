// ============================================================================
// MOTOR DE PRECIFICAÇÃO INOVAPRO3D
// ----------------------------------------------------------------------------
// Fonte ÚNICA de verdade para o custo e o preço de qualquer impressão 3D.
// As duas calculadoras (pública /calculadora e admin "Cálculo Maker Rápido")
// importam daqui, garantindo que o mesmo job gere SEMPRE o mesmo número.
//
// Foco: Bambu Lab P2S + AMS, operação B2B/varejo no Pará (tarifa Equatorial).
// ============================================================================

export type MaterialKey = "pla" | "petg";

export interface MaterialPreset {
  key: MaterialKey;
  label: string;
  /** Preço pago por 1 rolo (carretel) em R$. */
  spoolPrice: number;
  /** Peso líquido do rolo em gramas. */
  spoolWeight: number;
  /** Potência média da P2S imprimindo este material (W). */
  steadyPowerWatts: number;
  /** Reserva de falha sugerida (%) — PETG falha mais que PLA. */
  defaultReservePct: number;
  /** Temperatura típica de bico (°C) — apenas informativo. */
  printTempC: number;
}

/**
 * Presets de material com dados reais de mercado (Pará, 2025).
 * O foco é PLA (principal) e PETG (secundário).
 */
export const MATERIAL_PRESETS: Record<MaterialKey, MaterialPreset> = {
  pla: {
    key: "pla",
    label: "PLA",
    // R$100 produto + frete R$119 diluído em ~7 rolos (compra típica 5–10 rolos).
    // Frete/rolo ≈ R$17. Ajuste se comprar menos (5 rolos = R$124) ou mais (10 = R$112).
    spoolPrice: 117,
    spoolWeight: 1000,
    steadyPowerWatts: 200,
    defaultReservePct: 12,
    printTempC: 215,
  },
  petg: {
    key: "petg",
    label: "PETG",
    // R$120 produto + frete R$119 diluído em ~7 rolos ≈ R$17/rolo.
    spoolPrice: 137,
    spoolWeight: 1000,
    steadyPowerWatts: 230,
    defaultReservePct: 20,
    printTempC: 245,
  },
};

// ----------------------------------------------------------------------------
// MÁQUINA & DEPRECIAÇÃO
// ----------------------------------------------------------------------------

export interface MachineConfig {
  /** Quanto você pagou na impressora + AMS (R$). */
  price: number;
  /** Horas de impressão que a máquina deve durar antes de troca/overhaul. */
  lifespanHours: number;
  /** Bico (nozzle): preço e vida útil em horas. */
  nozzlePrice: number;
  nozzleLifeHours: number;
  /** Placa de impressão / PEI: preço e vida útil em horas. */
  platePrice: number;
  plateLifeHours: number;
  /** Correias (par): preço e vida útil em horas. */
  beltsPrice: number;
  beltsLifeHours: number;
  /** Manutenção geral por hora (graxa, PTFE, limpeza, imprevistos) em R$/h. */
  maintPerHour: number;
}

/**
 * Configuração padrão da Bambu Lab P2S + AMS 2 PRO no Brasil.
 * Fonte: mercado BR jun/2026 — Fozit R$9.899, Beehive R$10.999.
 * Você pode editar todos os campos na calculadora detalhada.
 */
export const DEFAULT_MACHINE: MachineConfig = {
  price: 10999,
  lifespanHours: 7000,
  // Hotend completo 0,4mm aço endurecido P1/P2 series (Tecnocubo jun/2026: R$200–220 + margem).
  nozzlePrice: 250,
  nozzleLifeHours: 1300,
  platePrice: 190,
  plateLifeHours: 1500,
  beltsPrice: 100,
  beltsLifeHours: 2500,
  maintPerHour: 0.2,
};

export interface MachineHourBreakdown {
  /** Depreciação da máquina por hora (preço ÷ vida útil). */
  depreciation: number;
  nozzle: number;
  plate: number;
  belts: number;
  maint: number;
  /** Soma do fundo de reposição de peças por hora. */
  replacement: number;
  /** Custo-máquina real por hora (depreciação + reposição). */
  total: number;
}

/**
 * Quebra o custo da máquina por hora em partes transparentes.
 * É isto que responde "quanto a P2S me custa por hora de uso?".
 */
export function machineHourBreakdown(m: MachineConfig): MachineHourBreakdown {
  const depreciation = m.price / Math.max(1, m.lifespanHours);
  const nozzle = m.nozzlePrice / Math.max(1, m.nozzleLifeHours);
  const plate = m.platePrice / Math.max(1, m.plateLifeHours);
  const belts = m.beltsPrice / Math.max(1, m.beltsLifeHours);
  const maint = Math.max(0, m.maintPerHour);
  const replacement = nozzle + plate + belts + maint;
  return {
    depreciation,
    nozzle,
    plate,
    belts,
    maint,
    replacement,
    total: depreciation + replacement,
  };
}

// ----------------------------------------------------------------------------
// ENERGIA (tarifa Pará)
// ----------------------------------------------------------------------------

export const DEFAULT_ENERGY = {
  /**
   * Equatorial Pará (CELPA) — RH ANEEL nº 3.507 (ago/2025→ago/2026).
   * Tarifa residencial B1 com ICMS 25% + PIS/COFINS: R$0,97/kWh.
   * Sem bandeira tarifária (verde). Ajuste se estiver em bandeira amarela/vermelha.
   */
  kwhCost: 0.97,
  /** Pico de aquecimento — P2S câmara fechada, medido ~1000 W por ~8 min. */
  startupPowerWatts: 1000,
  /** Tempo no pico (aquecimento). */
  startupMinutes: 8,
};

/** Taxa de falha padrão sugerida (%) — perfil estável de PLA. */
export const DEFAULT_FAILURE_RATE = 5;

// ----------------------------------------------------------------------------
// CONFIGURAÇÃO CENTRAL DE PRECIFICAÇÃO (settings/pricing no Firestore)
// ----------------------------------------------------------------------------
// Estes são os parâmetros de NEGÓCIO (não do job): energia, markups, preço
// mínimo, taxa de falha e os presets de material. O admin edita na aba
// Configurações e AS DUAS calculadoras (pública e do painel) leem daqui,
// garantindo que o mesmo job sempre gere o mesmo preço.

/** Parâmetros de um material editáveis pelo admin. */
export interface MaterialSettings {
  spoolPrice: number;
  spoolWeight: number;
  steadyPowerWatts: number;
  defaultReservePct: number;
}

/** Configuração de negócio compartilhada pelas duas calculadoras. */
export interface PricingSettings {
  /** Tarifa de energia (R$/kWh). */
  kwhCost: number;
  /** Pico de aquecimento (W). */
  startupPowerWatts: number;
  /** Duração do pico (min). */
  startupMinutes: number;
  /** Taxa de falha padrão (%). */
  failureRatePct: number;
  failureImpactPct: number;
  defaultPackagingCost: number;
  targetProfitPerMachineHour: number;
  /** Markup de atacado (multiplicador sobre o custo). */
  wholesaleMarkup: number;
  /** Markup de varejo (multiplicador sobre o custo). */
  retailMarkup: number;
  /** Preço mínimo por pedido (R$). */
  minPrice: number;
  /** Desconto (%) para pagamento à vista no PIX, exibido na vitrine. */
  pixDiscountPct: number;
  /** Nº máximo de parcelas sem juros exibidas no cartão. */
  maxInstallments: number;
  /** Presets de material editáveis. */
  materials: Record<MaterialKey, MaterialSettings>;
}

/** Defaults usados quando ainda não existe `settings/pricing` no Firestore. */
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  kwhCost: DEFAULT_ENERGY.kwhCost,
  startupPowerWatts: DEFAULT_ENERGY.startupPowerWatts,
  startupMinutes: DEFAULT_ENERGY.startupMinutes,
  failureRatePct: DEFAULT_FAILURE_RATE,
  failureImpactPct: 70,
  defaultPackagingCost: 6,
  targetProfitPerMachineHour: 5,
  wholesaleMarkup: 1.6,
  retailMarkup: 2.5,
  minPrice: 35,
  pixDiscountPct: 5,
  maxInstallments: 6,
  materials: {
    pla: {
      spoolPrice: MATERIAL_PRESETS.pla.spoolPrice,
      spoolWeight: MATERIAL_PRESETS.pla.spoolWeight,
      steadyPowerWatts: MATERIAL_PRESETS.pla.steadyPowerWatts,
      defaultReservePct: MATERIAL_PRESETS.pla.defaultReservePct,
    },
    petg: {
      spoolPrice: MATERIAL_PRESETS.petg.spoolPrice,
      spoolWeight: MATERIAL_PRESETS.petg.spoolWeight,
      steadyPowerWatts: MATERIAL_PRESETS.petg.steadyPowerWatts,
      defaultReservePct: MATERIAL_PRESETS.petg.defaultReservePct,
    },
  },
};

/**
 * Combina um documento bruto do Firestore (que pode estar parcial ou ausente)
 * com os defaults, garantindo um `PricingSettings` sempre válido e completo.
 */
export function mergePricingSettings(raw: unknown): PricingSettings {
  const base = DEFAULT_PRICING_SETTINGS;
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const numOr = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const mergeMaterial = (key: MaterialKey): MaterialSettings => {
    const def = base.materials[key];
    const m = (r.materials as Record<string, unknown> | undefined)?.[key] as
      Record<string, unknown> | undefined;
    if (!m) return def;
    return {
      spoolPrice: numOr(m.spoolPrice, def.spoolPrice),
      spoolWeight: numOr(m.spoolWeight, def.spoolWeight),
      steadyPowerWatts: numOr(m.steadyPowerWatts, def.steadyPowerWatts),
      defaultReservePct: numOr(m.defaultReservePct, def.defaultReservePct),
    };
  };

  return {
    kwhCost: numOr(r.kwhCost, base.kwhCost),
    startupPowerWatts: numOr(r.startupPowerWatts, base.startupPowerWatts),
    startupMinutes: numOr(r.startupMinutes, base.startupMinutes),
    failureRatePct: numOr(r.failureRatePct, base.failureRatePct),
    failureImpactPct: numOr(r.failureImpactPct, base.failureImpactPct),
    defaultPackagingCost: numOr(r.defaultPackagingCost, base.defaultPackagingCost),
    targetProfitPerMachineHour: numOr(
      r.targetProfitPerMachineHour,
      base.targetProfitPerMachineHour,
    ),
    wholesaleMarkup: numOr(r.wholesaleMarkup, base.wholesaleMarkup),
    retailMarkup: numOr(r.retailMarkup, base.retailMarkup),
    minPrice: numOr(r.minPrice, base.minPrice),
    pixDiscountPct: numOr(r.pixDiscountPct, base.pixDiscountPct),
    maxInstallments: numOr(r.maxInstallments, base.maxInstallments),
    materials: { pla: mergeMaterial("pla"), petg: mergeMaterial("petg") },
  };
}

// ----------------------------------------------------------------------------
// CÁLCULO PRINCIPAL
// ----------------------------------------------------------------------------

export interface PricingInputs {
  material: MaterialKey;
  /** Sobrescreve o preço do rolo do preset (opcional). */
  spoolPrice?: number;
  spoolWeight?: number;
  /** Sobrescreve a potência média do preset (opcional). */
  steadyPowerWatts?: number;

  /** Peso do filamento do slicer (g) — já inclui purga/suportes. */
  weightGrams: number;
  /** Tempo de impressão em horas decimais. */
  hours: number;
  /** Peças no lote. */
  quantity: number;
  /** Reserva de material para falhas (%). */
  reservePct: number;

  /** Tarifa de energia (R$/kWh). */
  kwhCost: number;
  startupPowerWatts: number;
  startupMinutes: number;

  machine: MachineConfig;

  /** Mão de obra: horas de trabalho manual (modelagem, pós, embalagem). */
  laborHours: number;
  /** Valor da sua hora de trabalho (R$). */
  laborRate: number;
  /** Insumos extras do job (parafusos, tinta, ímã) em R$. */
  extraSupplies: number;
  packagingCost?: number;

  /**
   * Taxa de falha de impressão (%). Captura o tempo de máquina + energia
   * PERDIDOS quando uma impressão falha e precisa ser refeita. NÃO mexe no
   * material — esse desperdício já é coberto por `reservePct`.
   */
  failureRatePct?: number;
  failureImpactPct?: number;
  targetProfitPerMachineHour?: number;

  /** Multiplicador de atacado (B2B) sobre o custo. */
  wholesaleMarkup: number;
  /** Multiplicador de varejo (cliente final) sobre o custo. */
  retailMarkup: number;
  /** Preço mínimo por pedido (R$). */
  minPrice: number;

  /** Custos já apurados por um cálculo composto por bandejas. */
  materialCostOverride?: number;
  energyKwhOverride?: number;
  energyCostOverride?: number;
}

export interface PricingResult {
  hours: number;
  quantity: number;
  weightGrams: number;
  gramCost: number;

  materialCost: number;
  energyKwh: number;
  energyCost: number;
  machineHourCost: number;
  machineCost: number;
  laborCost: number;
  extraSupplies: number;
  packagingCost: number;
  /** Custo do tempo de máquina + energia perdidos em falhas de impressão. */
  failureLoss: number;
  failureRatePct: number;
  failureImpactPct: number;
  baseProductionCost: number;
  capacityContributionTarget: number;
  minimumSustainablePrice: number;
  fullReprintCost: number;
  wholesaleProfitAfterFullReprint: number;
  retailProfitAfterFullReprint: number;
  totalCost: number;
  unitCost: number;
  costPerGram: number;

  shares: {
    material: number;
    energy: number;
    machine: number;
    labor: number;
    failure: number;
  };

  wholesaleTotal: number;
  wholesaleUnit: number;
  retailTotal: number;
  retailUnit: number;
  isBelowMinWholesale: boolean;
  isBelowMinRetail: boolean;

  profitWholesale: number;
  profitWholesaleUnit: number;
  /** Margem: lucro ÷ preço de venda (%). */
  profitWholesalePct: number;
  /** Markup: lucro ÷ custo (%). Bate com o multiplicador que você digita. */
  profitWholesaleMarkupPct: number;
  profitRetail: number;
  profitRetailUnit: number;
  /** Margem: lucro ÷ preço de venda (%). */
  profitRetailPct: number;
  /** Markup: lucro ÷ custo (%). Bate com o multiplicador que você digita. */
  profitRetailMarkupPct: number;
}

const num = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export function computePricing(input: PricingInputs): PricingResult {
  const preset = MATERIAL_PRESETS[input.material];
  const spoolPrice = Math.max(0, num(input.spoolPrice ?? preset.spoolPrice));
  const spoolWeight = Math.max(1, num(input.spoolWeight ?? preset.spoolWeight, 1000));
  const steadyPower = Math.max(0, num(input.steadyPowerWatts ?? preset.steadyPowerWatts));

  const hours = Math.max(0, num(input.hours));
  const quantity = Math.max(1, Math.floor(num(input.quantity, 1)));
  const weightGrams = Math.max(0, num(input.weightGrams));
  const reserveMultiplier = 1 + Math.max(0, num(input.reservePct)) / 100;

  // --- Material ---
  const gramCost = spoolPrice / spoolWeight;
  const materialCost =
    input.materialCostOverride === undefined
      ? weightGrams * gramCost * reserveMultiplier
      : Math.max(0, num(input.materialCostOverride));

  // --- Energia (pico de aquecimento + regime estável) ---
  const startupHours = Math.min(hours, Math.max(0, num(input.startupMinutes)) / 60);
  const steadyHours = Math.max(0, hours - startupHours);
  const calculatedEnergyKwh =
    (startupHours * Math.max(0, num(input.startupPowerWatts)) + steadyHours * steadyPower) / 1000;
  const energyKwh =
    input.energyKwhOverride === undefined
      ? calculatedEnergyKwh
      : Math.max(0, num(input.energyKwhOverride));
  const energyCost =
    input.energyCostOverride === undefined
      ? energyKwh * Math.max(0, num(input.kwhCost))
      : Math.max(0, num(input.energyCostOverride));

  // --- Máquina (depreciação + reposição) ---
  const machineHourCost = machineHourBreakdown(input.machine).total;
  const machineCost = hours * machineHourCost;

  // --- Mão de obra + insumos ---
  const laborCost = Math.max(0, num(input.laborHours)) * Math.max(0, num(input.laborRate));
  const extraSupplies = Math.max(0, num(input.extraSupplies));
  const packagingCost = Math.max(0, num(input.packagingCost ?? 0));

  // --- Taxa de falha: tempo de máquina + energia perdidos numa reimpressão ---
  // (o material desperdiçado já está coberto por reservePct)
  const failureRatePct = Math.min(95, Math.max(0, num(input.failureRatePct ?? 0)));
  const failureImpactPct = Math.min(100, Math.max(0, num(input.failureImpactPct ?? 70)));
  const baseProductionCost = materialCost + energyCost + machineCost;
  const expectedFailedRuns = failureRatePct / 100 / Math.max(0.05, 1 - failureRatePct / 100);
  const failureLoss = baseProductionCost * expectedFailedRuns * (failureImpactPct / 100);

  const totalCost = baseProductionCost + laborCost + extraSupplies + packagingCost + failureLoss;
  const safe = totalCost > 0 ? totalCost : 1;
  const unitCost = totalCost / quantity;
  const costPerGram = weightGrams > 0 ? totalCost / weightGrams : 0;

  // --- Preços (com piso mínimo) ---
  const minPrice = Math.max(0, num(input.minPrice));
  const capacityContributionTarget =
    hours * Math.max(0, num(input.targetProfitPerMachineHour ?? 0));
  const minimumSustainablePrice = totalCost + capacityContributionTarget;
  const wholesaleRaw = totalCost * Math.max(0, num(input.wholesaleMarkup));
  const retailRaw = totalCost * Math.max(0, num(input.retailMarkup));
  const wholesaleTotal = Math.max(wholesaleRaw, minPrice, minimumSustainablePrice);
  const retailTotal = Math.max(retailRaw, minPrice, minimumSustainablePrice);

  const profitWholesale = wholesaleTotal - totalCost;
  const profitRetail = retailTotal - totalCost;

  return {
    hours,
    quantity,
    weightGrams,
    gramCost,
    materialCost,
    energyKwh,
    energyCost,
    machineHourCost,
    machineCost,
    laborCost,
    extraSupplies,
    packagingCost,
    failureLoss,
    failureRatePct,
    failureImpactPct,
    baseProductionCost,
    capacityContributionTarget,
    minimumSustainablePrice,
    fullReprintCost: baseProductionCost,
    wholesaleProfitAfterFullReprint:
      wholesaleTotal - (totalCost - failureLoss + baseProductionCost),
    retailProfitAfterFullReprint: retailTotal - (totalCost - failureLoss + baseProductionCost),
    totalCost,
    unitCost,
    costPerGram,
    shares: {
      material: (materialCost / safe) * 100,
      energy: (energyCost / safe) * 100,
      machine: (machineCost / safe) * 100,
      labor: ((laborCost + extraSupplies + packagingCost) / safe) * 100,
      failure: (failureLoss / safe) * 100,
    },
    wholesaleTotal,
    wholesaleUnit: wholesaleTotal / quantity,
    retailTotal,
    retailUnit: retailTotal / quantity,
    isBelowMinWholesale: wholesaleRaw < minPrice && minPrice > 0,
    isBelowMinRetail: retailRaw < minPrice && minPrice > 0,
    profitWholesale,
    profitWholesaleUnit: profitWholesale / quantity,
    profitWholesalePct: (profitWholesale / (wholesaleTotal || 1)) * 100,
    profitWholesaleMarkupPct: (profitWholesale / safe) * 100,
    profitRetail,
    profitRetailUnit: profitRetail / quantity,
    profitRetailPct: (profitRetail / (retailTotal || 1)) * 100,
    profitRetailMarkupPct: (profitRetail / safe) * 100,
  };
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

export const formatBRL = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** Converte horas decimais (3.47) em "3h 28min" para exibição amigável. */
export function formatHoursToHHMM(hours: number): string {
  const h = Math.max(0, Number.isFinite(hours) ? hours : 0);
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}min`;
}

/** Converte tempos do Bambu ("2h 30m 10s"), decimal ou "2:30" em horas. */
export function parseTimeToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const hMatch = timeStr.match(/(\d+)\s*h/i);
  const mMatch = timeStr.match(/(\d+)\s*m/i);
  const sMatch = timeStr.match(/(\d+)\s*s/i);
  const h = hMatch ? parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? parseInt(mMatch[1], 10) : 0;
  const s = sMatch ? parseInt(sMatch[1], 10) : 0;

  if (!hMatch && !mMatch && !sMatch) {
    if (timeStr.includes(":")) {
      const [hp, mp] = timeStr.split(":").map((p) => parseFloat(p));
      if (!isNaN(hp) && !isNaN(mp)) return hp + mp / 60;
    }
    const n = parseFloat(timeStr);
    return isNaN(n) ? 0 : n;
  }
  return h + m / 60 + s / 3600;
}

// ----------------------------------------------------------------------------
// EXPLICAÇÕES (texto único reaproveitado pelos tooltips "?")
// ----------------------------------------------------------------------------

export const HELP = {
  material:
    "Filamento usado no job. Define o preço por grama e o consumo de energia. PLA é o principal; PETG aquece mais e custa mais.",
  spoolPrice:
    "Preço do carretel usado como referência geral. Nas bandejas do novo projeto, o preço do filamento selecionado no estoque ou informado manualmente por kg tem prioridade.",
  spoolWeight:
    "Peso líquido do carretel de referência, sem o peso do plástico vazio. Normalmente é 1000 g. Nas bandejas com preço informado por kg, esse campo não altera o custo.",
  weight:
    "Use a coluna Total do Bambu Studio para cada filamento. Ela reúne modelo, suporte, material purgado/corado e torre; não use apenas o peso do modelo.",
  time: "Tempo total mostrado pelo Bambu Studio. Aceita 2h30m, 36m57s, 2:30 ou horas decimais. Segundos entram no cálculo, mas a tela resume o resultado em horas e minutos.",
  quantity:
    "Quantidade de produtos completos e vendáveis. Um boneco dividido em várias bandejas continua sendo 1 produto; 20 chaveiros completos são 20.",
  reserve:
    "Margem adicional sobre uma estimativa simples de peso. Quando o novo projeto usa o Total de cada filamento da Bambu, suportes, purga e torre já estão incluídos e o custo exato das bandejas não recebe esta margem novamente.",
  failureRate:
    "Percentual médio de trabalhos que exigem nova tentativa. Zero deixa esse custo desmarcado. Ao informar uma taxa, a calculadora cria uma provisão proporcional para falhas futuras; a baixa real de filamento continua sendo registrada manualmente na produção.",
  kwh: "Preço do kWh na sua conta de luz. Equatorial Pará (CELPA) 2025→2026: R$0,97/kWh na tarifa residencial B1 com ICMS 25% + PIS/COFINS, sem bandeira tarifária.",
  steadyPower: "Potência média da P2S imprimindo. Medida real: ~200 W em PLA e ~230 W em PETG.",
  startupPower:
    "Pico de consumo nos primeiros minutos, quando a câmara e a mesa aquecem. P2S chega a ~1000 W.",
  startupMinutes:
    "Quanto tempo a máquina fica nesse pico de aquecimento antes de estabilizar. Na P2S, cerca de 8 minutos.",
  machinePrice:
    "Valor investido na impressora e acessórios incluídos no cálculo. A depreciação por hora é este preço dividido pela vida útil estimada; o markup não é aplicado diretamente sobre o preço inteiro da máquina.",
  lifespan:
    "Total estimado de horas produtivas antes de uma grande reforma ou troca. Quanto menor a vida útil, maior a depreciação por hora.",
  nozzle:
    "Bico se desgasta com o uso e perde precisão. Preço da peça e quantas horas ela costuma durar.",
  plate: "Placa/PEI perde aderência com o tempo. Preço e vida útil em horas de impressão.",
  belts: "Correias esticam e folgam. Preço do par e horas até a troca.",
  maint:
    "Custo por hora de graxa, tubo PTFE, limpeza e pequenos imprevistos. Um fundo para não ser pego de surpresa.",
  laborHours:
    "Seu tempo de trabalho HUMANO no job: revisar arquivo, fatiar, tirar suportes, lixar, embalar. Mesmo impressão automática tem seu tempo.",
  laborRate:
    "Quanto vale 1 hora do seu trabalho. Não trabalhe de graça: coloque um valor justo para a sua mão de obra.",
  extraSupplies:
    "Insumos específicos deste job que não são filamento: parafusos, ímãs, tinta, cola, embalagem especial.",
  wholesale:
    "Margem sobre o custo para revenda ou lotes recorrentes. 2× equivale a custo + 100%; no modo %, informe 100%. Se esse resultado ficar abaixo do preço mínimo ou do piso por hora de máquina, o maior piso prevalece.",
  retail:
    "Margem sobre o custo para venda direta. 2× equivale a custo + 100%; no modo %, informe 100%. Se esse resultado ficar abaixo do preço mínimo ou do piso por hora de máquina, o maior piso prevalece.",
  minPrice:
    "Menor valor aceito para o trabalho inteiro. A calculadora compara custo × markup, este preço mínimo e o piso sustentável por hora; usa sempre o maior.",
  depreciation:
    "Quanto da máquina 'se gasta' a cada hora de impressão. É o preço da P2S diluído na vida útil dela.",
  replacement:
    "Fundo de reposição: cada hora separa um valor para repor bico, placa, correias e manutenção quando desgastarem.",
  totalCost:
    "Custo real de produção: soma de material, energia, desgaste da máquina, falhas e mão de obra (quando marcada). É o que sai do seu bolso antes de qualquer lucro.",
  costPerGram:
    "Custo total dividido pelo peso da peça. Serve para comparar peças de tamanhos diferentes na mesma base.",
  unitCost:
    "Custo real de um produto completo: custo do trabalho dividido por Produtos finais. Não é dividido pelo número de partes ou objetos físicos das bandejas.",
  gramCost: "Quanto custa 1 grama do filamento já com a reserva para falhas embutida.",
  shares:
    "Como o custo se divide entre material, energia, máquina, mão de obra e falhas. Ajuda a ver onde o dinheiro está indo.",
  sellPrice:
    "A calculadora compara três valores: custo × markup, preço mínimo e piso sustentável (custo + meta por hora ocupada). O preço sugerido é o maior deles; por isso alterar o markup pode não mudar o preço enquanto ele continuar abaixo de um dos pisos.",
  profit:
    "Lucro = preço de venda − custo real. A 'margem' é o lucro sobre o preço de venda; o 'markup' é o lucro sobre o custo (é o mesmo número do multiplicador que você digita).",
  wholesaleBox:
    "Preço de atacado/B2B: para quem revende ou fecha lotes recorrentes. Markup menor porque o volume compensa.",
  retailBox:
    "Preço de varejo: venda direta ao cliente final, sob demanda. Markup maior, cobre atendimento e menor volume.",
  batch:
    "Quantidade de produtos finais deste trabalho. Partes em bandejas diferentes formam o mesmo produto e não aumentam esta quantidade.",
  failureImpact:
    "Ponto médio em que uma falha costuma ser percebida. Exemplo: 70% estima que, numa tentativa com falha, 70% do material, energia e tempo já foram consumidos. É uma provisão; o consumo real deve ser informado na produção.",
  targetProfitPerMachineHour:
    "Valor mínimo que o trabalho deve contribuir por cada hora em que a impressora fica ocupada. Ele cria o piso sustentável: custo real + horas × meta. Enquanto esse piso for maior que custo × markup, mudar a porcentagem pode não alterar o preço.",
};
